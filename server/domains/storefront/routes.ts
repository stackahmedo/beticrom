import { Hono } from "hono";
import { z } from "zod";
import { getDb } from "../../db/client.js";
import { parseJsonBody } from "../../middleware/validate.js";
import { rateLimit } from "../../middleware/rateLimit.js";
import { evaluateCouponDiscount } from "../marketing/routes.js";
import { createAdminNotification } from "../notifications/service.js";

const storefrontRoutes = new Hono();

/**
 * Live storefront bootstrap: returns public store settings, published CMS content,
 * active payment methods, and active catalog summary.
 */
storefrontRoutes.get("/bootstrap", async (c) => {
  const db = await getDb();
  const [settingsRes, announcementsRes, slidersRes, bannersRes, sectionsRes, pagesRes, menusRes, paymentMethodsRes] =
    await Promise.all([
      db.query<{ key: string; value: unknown }>("SELECT key, value FROM store_settings WHERE is_public = TRUE"),
      db.query(
        "SELECT * FROM cms_announcements WHERE status = 'published' AND (starts_at IS NULL OR starts_at <= NOW()) AND (ends_at IS NULL OR ends_at >= NOW()) ORDER BY sort_order ASC"
      ),
      db.query(
        "SELECT * FROM cms_sliders WHERE status = 'published' AND (starts_at IS NULL OR starts_at <= NOW()) AND (ends_at IS NULL OR ends_at >= NOW()) ORDER BY sort_order ASC"
      ),
      db.query(
        "SELECT * FROM cms_banners WHERE status = 'published' AND (starts_at IS NULL OR starts_at <= NOW()) AND (ends_at IS NULL OR ends_at >= NOW()) ORDER BY sort_order ASC"
      ),
      db.query("SELECT * FROM cms_homepage_sections WHERE status = 'published' ORDER BY sort_order ASC"),
      db.query("SELECT id, slug, title, title_i18n, content_markdown, seo_title, seo_description FROM cms_pages WHERE status = 'published' AND deleted_at IS NULL"),
      db.query<{ location: string; items: unknown }>(
        `SELECT m.location, COALESCE(json_agg(mi.* ORDER BY mi.sort_order) FILTER (WHERE mi.id IS NOT NULL), '[]') AS items
         FROM cms_menus m LEFT JOIN cms_menu_items mi ON mi.menu_id = m.id AND mi.is_active = TRUE
         WHERE m.is_active = TRUE GROUP BY m.id`
      ),
      db.query("SELECT code, name, name_i18n, description, fee_amount, is_test_mode FROM payment_methods WHERE is_enabled = TRUE ORDER BY sort_order"),
    ]);

  const settings = Object.fromEntries(settingsRes.rows.map((r) => [r.key, r.value]));

  return c.json({
    data: {
      settings,
      cms: {
        announcements: announcementsRes.rows,
        sliders: slidersRes.rows,
        banners: bannersRes.rows,
        homepageSections: sectionsRes.rows,
        pages: pagesRes.rows,
        menus: Object.fromEntries(menusRes.rows.map((m: { location: string; items: unknown }) => [m.location, m.items])),
      },
      paymentMethods: paymentMethodsRes.rows,
    },
  });
});

storefrontRoutes.get("/products", async (c) => {
  const db = await getDb();
  const res = await db.query(
    `SELECT p.id, p.legacy_id, p.name, p.name_i18n, p.slug, p.sku, p.regular_price::float8,
            p.sale_price::float8, p.featured_image_url, p.storage_type, p.halal_tier,
            p.unit_label, p.is_new, p.is_best_seller, p.is_featured, p.short_description,
            c.name AS category_name, sc.name AS subcategory_name, b.name AS brand_name, co.name AS country_name,
            COALESCE(SUM(inv.available_qty), 0)::int AS available_stock
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN categories sc ON sc.id = p.subcategory_id
     LEFT JOIN brands b ON b.id = p.brand_id
     LEFT JOIN countries_of_origin co ON co.id = p.origin_country_id
     LEFT JOIN product_variants pv ON pv.product_id = p.id AND pv.deleted_at IS NULL
     LEFT JOIN inventory_items inv ON inv.variant_id = pv.id
     WHERE p.status = 'active' AND p.deleted_at IS NULL
     GROUP BY p.id, c.name, sc.name, b.name, co.name
     ORDER BY p.legacy_id ASC NULLS LAST, p.created_at DESC`
  );
  return c.json({ data: res.rows });
});

storefrontRoutes.post("/coupons/validate", async (c) => {
  const parsed = await parseJsonBody(
    c,
    z.object({
      code: z.string().min(1),
      subtotal: z.coerce.number().min(0),
      shippingAmount: z.coerce.number().min(0).default(0),
      customerEmail: z.string().optional(),
    })
  );
  if ("error" in parsed) return parsed.error;
  const db = await getDb();
  const result = await evaluateCouponDiscount(db, parsed.data);
  if (!result.valid) {
    return c.json({ error: { code: "INVALID_COUPON", message: result.reason || "Invalid coupon" } }, 400);
  }
  return c.json({ data: result });
});

const checkoutSchema = z.object({
  idempotencyKey: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string(), // accepts UUID or legacy 4-digit id like "0023"
        variantId: z.string().uuid().optional(),
        quantity: z.coerce.number().int().positive().max(100),
      })
    )
    .min(1),
  shippingAddress: z.object({
    fullName: z.string().min(1),
    kana: z.string().optional(),
    email: z.string().email(),
    phone: z.string().min(8),
    postalCode: z.string().min(3),
    prefecture: z.string().min(1),
    city: z.string().min(1),
    addressLine1: z.string().min(1),
    addressLine2: z.string().optional(),
  }),
  delivery: z
    .object({
      timeSlot: z.string().default("none"),
      notes: z.string().optional(),
      deliveryDate: z.string().default("fastest"),
    })
    .optional(),
  paymentMethodCode: z.string().min(1),
  couponCode: z.string().optional(),
});

/**
 * Atomic transactional storefront checkout:
 * - Resolves products & authoritative prices from DB (never trusts client prices)
 * - Calculates cold-chain shipping & Japan 8%/10% consumption tax
 * - Validates coupon server-side
 * - Atomically reserves SKU inventory with row locks (SELECT ... FOR UPDATE)
 * - Creates customer, order, order_items snapshots, invoice, status history & admin notification
 */
storefrontRoutes.post("/checkout", rateLimit({ windowMs: 60_000, max: 30, keyPrefix: "checkout" }), async (c) => {
  const parsed = await parseJsonBody(c, checkoutSchema);
  if ("error" in parsed) return parsed.error;
  const d = parsed.data;
  const db = await getDb();

  try {
    const orderResult = await db.transaction(async (tx) => {
      if (d.idempotencyKey) {
        const dup = await tx.query<{ id: string; order_number: string }>("SELECT * FROM orders WHERE idempotency_key = $1", [d.idempotencyKey]);
        if (dup.rows[0]) return dup.rows[0];
      }

      const whRes = await tx.query<{ id: string }>("SELECT id FROM warehouses WHERE is_default = TRUE LIMIT 1");
      const warehouseId = whRes.rows[0]?.id;
      if (!warehouseId) throw new Error("No active fulfillment warehouse configured");

      const pmRes = await tx.query<{ code: string; fee_amount: string; is_enabled: boolean }>(
        "SELECT code, fee_amount, is_enabled FROM payment_methods WHERE code = $1 LIMIT 1",
        [d.paymentMethodCode]
      );
      const pm = pmRes.rows[0];
      if (!pm || !pm.is_enabled) throw new Error("Selected payment method is unavailable");

      // Upsert customer
      const emailLower = d.shippingAddress.email.trim().toLowerCase();
      let customerId: string;
      const custRes = await tx.query<{ id: string }>("SELECT id FROM customers WHERE LOWER(email) = $1 LIMIT 1", [emailLower]);
      if (custRes.rows[0]) {
        customerId = custRes.rows[0].id;
      } else {
        const custCode = `CUST-${String(Date.now()).slice(-6)}`;
        const insCust = await tx.query<{ id: string }>(
          `INSERT INTO customers (customer_code, email, full_name, name_kana, phone)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [custCode, emailLower, d.shippingAddress.fullName, d.shippingAddress.kana || null, d.shippingAddress.phone]
        );
        customerId = insCust.rows[0].id;
      }

      let drySubtotal = 0;
      let coolSubtotal = 0;
      let frozenSubtotal = 0;
      let hasDry = false;
      let hasCool = false;
      let hasFrozen = false;

      const resolvedItems: Array<{
        productId: string;
        variantId: string;
        vendorId: string | null;
        productName: string;
        variantTitle: string;
        sku: string;
        imageUrl: string | null;
        storageType: string;
        halalTier: string;
        quantity: number;
        unitPrice: number;
        costPrice: number;
        lineTotal: number;
      }> = [];

      for (const item of d.items) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.productId);
        const pRes = await tx.query<{
          id: string;
          vendor_id: string | null;
          name: string;
          sku: string;
          regular_price: string;
          sale_price: string | null;
          cost_price: string;
          featured_image_url: string | null;
          storage_type: string;
          halal_tier: string;
          status: string;
        }>(
          isUuid
            ? "SELECT * FROM products WHERE id = $1 AND deleted_at IS NULL LIMIT 1"
            : "SELECT * FROM products WHERE legacy_id = $1 AND deleted_at IS NULL LIMIT 1",
          [item.productId]
        );
        const prod = pRes.rows[0];
        if (!prod || prod.status !== "active") {
          throw new Error(`Product ${item.productId} is unavailable`);
        }

        const vRes = await tx.query<{ id: string; sku: string; title: string; regular_price: string; sale_price: string | null; cost_price: string }>(
          item.variantId
            ? "SELECT * FROM product_variants WHERE id = $1 AND product_id = $2 AND deleted_at IS NULL LIMIT 1"
            : "SELECT * FROM product_variants WHERE product_id = $1 AND deleted_at IS NULL ORDER BY is_default DESC LIMIT 1",
          item.variantId ? [item.variantId, prod.id] : [prod.id]
        );
        const variant = vRes.rows[0];
        if (!variant) throw new Error(`No active variant for ${prod.name}`);

        const unitPrice = Number(variant.sale_price ?? variant.regular_price ?? prod.sale_price ?? prod.regular_price);
        const costPrice = Number(variant.cost_price ?? prod.cost_price ?? 0);
        const lineTotal = unitPrice * item.quantity;

        if (prod.storage_type === "cool") {
          hasCool = true;
          coolSubtotal += lineTotal;
        } else if (prod.storage_type === "frozen") {
          hasFrozen = true;
          frozenSubtotal += lineTotal;
        } else {
          hasDry = true;
          drySubtotal += lineTotal;
        }

        resolvedItems.push({
          productId: prod.id,
          variantId: variant.id,
          vendorId: prod.vendor_id,
          productName: prod.name,
          variantTitle: variant.title,
          sku: variant.sku,
          imageUrl: prod.featured_image_url,
          storageType: prod.storage_type,
          halalTier: prod.halal_tier,
          quantity: item.quantity,
          unitPrice,
          costPrice,
          lineTotal,
        });
      }

      const subtotal = drySubtotal + coolSubtotal + frozenSubtotal;
      const dryFee = hasDry ? (drySubtotal >= 6500 ? 0 : 880) : 0;
      const coolFee = hasCool ? (hasDry ? 0 : 880) + 330 : 0;
      const frozenFee = hasFrozen ? (hasDry || hasCool ? 0 : 880) + 330 : 0;
      let shippingAmount = dryFee + coolFee + frozenFee;
      const paymentFeeAmount = Number(pm.fee_amount || 0);

      let discountAmount = 0;
      let appliedCouponId: string | undefined;
      if (d.couponCode) {
        const evalRes = await evaluateCouponDiscount(tx, {
          code: d.couponCode,
          subtotal,
          shippingAmount,
          customerEmail: emailLower,
        });
        if (!evalRes.valid) throw new Error(evalRes.reason || "Invalid coupon");
        discountAmount = evalRes.discountAmount;
        if (evalRes.freeShipping) shippingAmount = 0;
        appliedCouponId = evalRes.couponId;
      }

      const foodPortion = Math.max(0, subtotal - discountAmount);
      const servicePortion = shippingAmount + paymentFeeAmount;
      const foodTax = Math.round(foodPortion * (8 / 108));
      const serviceTax = Math.round(servicePortion * (10 / 110));
      const totalTax = foodTax + serviceTax;
      const totalAmount = Math.max(0, foodPortion + servicePortion);

      const orderNumber = `BC-${new Date().getFullYear()}-${String(Math.floor(100000 + Math.random() * 900000))}`;
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Math.floor(100000 + Math.random() * 900000))}`;

      const oRes = await tx.query<{ id: string; order_number: string }>(
        `INSERT INTO orders (
          order_number, invoice_number, customer_id, status, payment_status, fulfillment_status, return_status,
          customer_email, customer_name, customer_phone, shipping_address, billing_address,
          payment_method_code, shipping_method_name, delivery_time_slot, delivery_date_preference, customer_notes,
          coupon_code, subtotal_amount, discount_amount, tax_amount, tax_breakdown, shipping_amount, payment_fee_amount,
          total_amount, currency_code, due_at, idempotency_key
        ) VALUES (
          $1, $2, $3, 'pending', 'pending', 'unfulfilled', 'none',
          $4, $5, $6, $7::jsonb, $7::jsonb,
          $8, 'Yamato Transport', $9, $10, $11,
          $12, $13, $14, $15, $16::jsonb, $17, $18,
          $19, 'JPY', NOW() + INTERVAL '24 hours', $20
        ) RETURNING *`,
        [
          orderNumber,
          invoiceNumber,
          customerId,
          emailLower,
          d.shippingAddress.fullName,
          d.shippingAddress.phone,
          JSON.stringify(d.shippingAddress),
          d.paymentMethodCode,
          d.delivery?.timeSlot || "none",
          d.delivery?.deliveryDate || "fastest",
          d.delivery?.notes || null,
          d.couponCode ? d.couponCode.trim().toUpperCase() : null,
          subtotal,
          discountAmount,
          totalTax,
          JSON.stringify({ foodTax, serviceTax, totalTax }),
          shippingAmount,
          paymentFeeAmount,
          totalAmount,
          d.idempotencyKey || null,
        ]
      );
      const order = oRes.rows[0];

      for (const item of resolvedItems) {
        await tx.query(
          `INSERT INTO order_items (
            order_id, product_id, variant_id, vendor_id, warehouse_id,
            product_name, variant_title, sku, image_url, storage_type, halal_tier,
            quantity, unit_price, cost_price, tax_rate_percent, line_total
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 8.000, $15)`,
          [
            order.id,
            item.productId,
            item.variantId,
            item.vendorId,
            warehouseId,
            item.productName,
            item.variantTitle,
            item.sku,
            item.imageUrl,
            item.storageType,
            item.halalTier,
            item.quantity,
            item.unitPrice,
            item.costPrice,
            item.lineTotal,
          ]
        );

        // Atomic row-locked inventory reservation
        await tx.query("SELECT reserve_inventory($1, $2, $3, $4, NULL, NOW() + INTERVAL '60 minutes')", [
          item.variantId,
          warehouseId,
          order.id,
          item.quantity,
        ]);
      }

      if (appliedCouponId) {
        await tx.query(
          "INSERT INTO coupon_redemptions (coupon_id, order_id, customer_id, customer_email, discount_applied) VALUES ($1, $2, $3, $4, $5)",
          [appliedCouponId, order.id, customerId, emailLower, discountAmount]
        );
        await tx.query("UPDATE coupons SET usage_count = usage_count + 1 WHERE id = $1", [appliedCouponId]);
      }

      await tx.query(
        `INSERT INTO order_status_history (order_id, from_status, to_status, field_changed, reason, actor_label)
         VALUES ($1, NULL, 'pending', 'status', 'Order placed via storefront checkout', 'customer')`,
        [order.id]
      );

      await tx.query(
        `INSERT INTO invoices (invoice_number, order_id, status, subtotal_amount, discount_amount, tax_amount, shipping_amount, total_amount)
         VALUES ($1, $2, 'issued', $3, $4, $5, $6, $7)`,
        [invoiceNumber, order.id, subtotal, discountAmount, totalTax, shippingAmount, totalAmount]
      );

      await tx.query(
        `UPDATE customers SET total_orders_count = total_orders_count + 1, total_spent_amount = total_spent_amount + $1, last_order_at = NOW() WHERE id = $2`,
        [totalAmount, customerId]
      );

      return order;
    });

    await createAdminNotification({
      eventType: "new_order",
      severity: "success",
      title: `New order ${orderResult.order_number}`,
      message: `${d.shippingAddress.fullName} placed a new order (${d.paymentMethodCode}).`,
      entityType: "order",
      entityId: orderResult.id,
      actionUrl: `/admin/orders/${orderResult.id}`,
      requiredPermission: "orders.read",
    });

    return c.json({ data: orderResult }, 201);
  } catch (err) {
    return c.json(
      { error: { code: "CHECKOUT_FAILED", message: err instanceof Error ? err.message : "Checkout failed" } },
      400
    );
  }
});

// Public Contact Form Submission -> Creates real Contact Message & Notification
storefrontRoutes.post("/contact", rateLimit({ windowMs: 60_000, max: 10, keyPrefix: "contact" }), async (c) => {
  const parsed = await parseJsonBody(
    c,
    z.object({
      senderName: z.string().min(2),
      senderEmail: z.string().email(),
      senderPhone: z.string().optional(),
      subject: z.string().min(2),
      message: z.string().min(5),
    })
  );
  if ("error" in parsed) return parsed.error;
  const d = parsed.data;
  const db = await getDb();
  const res = await db.query<{ id: string }>(
    `INSERT INTO contact_messages (sender_name, sender_email, sender_phone, subject, message)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [d.senderName, d.senderEmail, d.senderPhone ?? null, d.subject, d.message]
  );
  await createAdminNotification({
    eventType: "contact_message",
    severity: "info",
    title: "New contact message",
    message: `${d.senderName}: ${d.subject}`,
    entityType: "contact_message",
    entityId: res.rows[0].id,
    actionUrl: "/admin/support/messages",
    requiredPermission: "support.read",
  });
  return c.json({ data: res.rows[0] }, 201);
});

export default storefrontRoutes;
