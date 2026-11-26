import { Hono } from "hono";
import { z } from "zod";
import { getDb, type DbClient } from "../../db/client.js";
import { requireAdminAuth } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/rbac.js";
import { parseJsonBody, recordAuditLog } from "../../middleware/validate.js";

/**
 * Authoritative server-side coupon & promotion validator used by both Checkout and Storefront API.
 */
export async function evaluateCouponDiscount(
  db: DbClient,
  params: { code: string; subtotal: number; shippingAmount: number; customerEmail?: string }
): Promise<{ valid: boolean; discountAmount: number; freeShipping: boolean; couponId?: string; reason?: string }> {
  const code = params.code.trim().toUpperCase();
  if (!code) return { valid: false, discountAmount: 0, freeShipping: false, reason: "Coupon code is empty" };

  const res = await db.query<{
    id: string;
    code: string;
    discount_type: string;
    discount_value: string;
    min_purchase_amount: string;
    max_discount_amount: string | null;
    usage_limit_total: number | null;
    usage_limit_per_customer: number | null;
    usage_count: number;
    starts_at: string | null;
    expires_at: string | null;
    is_active: boolean;
  }>("SELECT * FROM coupons WHERE UPPER(code) = $1 AND deleted_at IS NULL LIMIT 1", [code]);

  const coupon = res.rows[0];
  if (!coupon || !coupon.is_active) {
    return { valid: false, discountAmount: 0, freeShipping: false, reason: "Invalid or inactive coupon code" };
  }

  const now = new Date();
  if (coupon.starts_at && new Date(coupon.starts_at) > now) {
    return { valid: false, discountAmount: 0, freeShipping: false, reason: "Coupon is not yet active" };
  }
  if (coupon.expires_at && new Date(coupon.expires_at) < now) {
    return { valid: false, discountAmount: 0, freeShipping: false, reason: "Coupon has expired" };
  }
  if (coupon.usage_limit_total !== null && coupon.usage_count >= coupon.usage_limit_total) {
    return { valid: false, discountAmount: 0, freeShipping: false, reason: "Coupon usage limit reached" };
  }
  if (params.subtotal < Number(coupon.min_purchase_amount)) {
    return {
      valid: false,
      discountAmount: 0,
      freeShipping: false,
      reason: `Minimum purchase of ¥${Number(coupon.min_purchase_amount).toLocaleString()} required`,
    };
  }

  if (params.customerEmail && coupon.usage_limit_per_customer !== null) {
    const uRes = await db.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM coupon_redemptions WHERE coupon_id = $1 AND LOWER(customer_email) = $2",
      [coupon.id, params.customerEmail.trim().toLowerCase()]
    );
    if (Number(uRes.rows[0]?.count || 0) >= coupon.usage_limit_per_customer) {
      return { valid: false, discountAmount: 0, freeShipping: false, reason: "You have already used this coupon" };
    }
  }

  let discountAmount = 0;
  let freeShipping = false;
  const val = Number(coupon.discount_value);

  if (coupon.discount_type === "fixed") {
    discountAmount = Math.min(params.subtotal, val);
  } else if (coupon.discount_type === "percentage") {
    discountAmount = Math.round((params.subtotal * val) / 100);
    if (coupon.max_discount_amount !== null) {
      discountAmount = Math.min(discountAmount, Number(coupon.max_discount_amount));
    }
  } else if (coupon.discount_type === "free_shipping") {
    freeShipping = true;
    discountAmount = 0;
  }

  return { valid: true, discountAmount, freeShipping, couponId: coupon.id };
}

const marketingRoutes = new Hono();
marketingRoutes.use("*", requireAdminAuth);

// ─── Offers / Promotions ──────────────────────────────────────────────────────
marketingRoutes.get("/offers", requirePermission("marketing.read"), async (c) => {
  const db = await getDb();
  const res = await db.query("SELECT * FROM promotions ORDER BY created_at DESC");
  return c.json({ data: res.rows });
});

marketingRoutes.post("/offers", requirePermission("marketing.write"), async (c) => {
  const parsed = await parseJsonBody(
    c,
    z.object({
      name: z.string().min(2),
      slug: z.string().optional(),
      promotionType: z.enum(["percentage", "fixed", "product_offer", "category_offer", "cart_discount", "free_shipping", "buy_x_get_y"]),
      discountValue: z.coerce.number().min(0),
      minPurchaseAmount: z.coerce.number().min(0).default(0),
      maxDiscountAmount: z.coerce.number().min(0).nullable().optional(),
      isStackable: z.boolean().default(false),
      startsAt: z.string().nullable().optional(),
      endsAt: z.string().nullable().optional(),
      status: z.enum(["draft", "active", "scheduled", "expired", "paused"]).default("active"),
    })
  );
  if ("error" in parsed) return parsed.error;
  const d = parsed.data;
  const actor = c.get("authUser");
  const db = await getDb();
  const slug = d.slug || `${d.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString().slice(-4)}`;
  const res = await db.query(
    `INSERT INTO promotions (name, slug, promotion_type, discount_value, min_purchase_amount, max_discount_amount, is_stackable, starts_at, ends_at, status, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
    [d.name, slug, d.promotionType, d.discountValue, d.minPurchaseAmount, d.maxDiscountAmount ?? null, d.isStackable, d.startsAt ?? null, d.endsAt ?? null, d.status, actor.id]
  );
  return c.json({ data: res.rows[0] }, 201);
});

// ─── Coupons ──────────────────────────────────────────────────────────────────
marketingRoutes.get("/coupons", requirePermission("marketing.read"), async (c) => {
  const db = await getDb();
  const res = await db.query("SELECT * FROM coupons WHERE deleted_at IS NULL ORDER BY created_at DESC");
  return c.json({ data: res.rows });
});

marketingRoutes.post("/coupons", requirePermission("marketing.write"), async (c) => {
  const parsed = await parseJsonBody(
    c,
    z.object({
      code: z.string().min(3).max(40),
      description: z.string().optional(),
      discountType: z.enum(["percentage", "fixed", "free_shipping", "buy_x_get_y"]),
      discountValue: z.coerce.number().min(0),
      minPurchaseAmount: z.coerce.number().min(0).default(0),
      maxDiscountAmount: z.coerce.number().min(0).nullable().optional(),
      usageLimitTotal: z.coerce.number().int().positive().nullable().optional(),
      usageLimitPerCustomer: z.coerce.number().int().positive().default(1),
      startsAt: z.string().nullable().optional(),
      expiresAt: z.string().nullable().optional(),
      isActive: z.boolean().default(true),
    })
  );
  if ("error" in parsed) return parsed.error;
  const d = parsed.data;
  const actor = c.get("authUser");
  const db = await getDb();
  const res = await db.query(
    `INSERT INTO coupons (code, description, discount_type, discount_value, min_purchase_amount, max_discount_amount, usage_limit_total, usage_limit_per_customer, starts_at, expires_at, is_active, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
    [d.code.trim().toUpperCase(), d.description ?? null, d.discountType, d.discountValue, d.minPurchaseAmount, d.maxDiscountAmount ?? null, d.usageLimitTotal ?? null, d.usageLimitPerCustomer, d.startsAt ?? null, d.expiresAt ?? null, d.isActive, actor.id]
  );
  return c.json({ data: res.rows[0] }, 201);
});

marketingRoutes.patch("/coupons/:id", requirePermission("marketing.write"), async (c) => {
  const parsed = await parseJsonBody(c, z.object({ isActive: z.boolean().optional() }));
  if ("error" in parsed) return parsed.error;
  const db = await getDb();
  const res = await db.query("UPDATE coupons SET is_active = COALESCE($1, is_active), updated_at = NOW() WHERE id = $2 RETURNING *", [
    parsed.data.isActive ?? null,
    c.req.param("id"),
  ]);
  return c.json({ data: res.rows[0] });
});

// ─── Flash Sales & Campaigns ──────────────────────────────────────────────────
marketingRoutes.get("/flash-sales", requirePermission("marketing.read"), async (c) => {
  const db = await getDb();
  const res = await db.query("SELECT * FROM flash_sales ORDER BY starts_at DESC");
  return c.json({ data: res.rows });
});

marketingRoutes.post("/flash-sales", requirePermission("marketing.write"), async (c) => {
  const parsed = await parseJsonBody(
    c,
    z.object({
      name: z.string().min(2),
      startsAt: z.string(),
      endsAt: z.string(),
      status: z.enum(["draft", "scheduled", "active", "ended", "cancelled"]).default("scheduled"),
    })
  );
  if ("error" in parsed) return parsed.error;
  const d = parsed.data;
  const actor = c.get("authUser");
  const db = await getDb();
  const slug = `${d.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString().slice(-4)}`;
  const res = await db.query(
    `INSERT INTO flash_sales (name, slug, starts_at, ends_at, status, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [d.name, slug, d.startsAt, d.endsAt, d.status, actor.id]
  );
  return c.json({ data: res.rows[0] }, 201);
});

marketingRoutes.get("/campaigns", requirePermission("marketing.read"), async (c) => {
  const db = await getDb();
  const res = await db.query("SELECT * FROM campaigns ORDER BY created_at DESC");
  return c.json({ data: res.rows });
});

marketingRoutes.post("/campaigns", requirePermission("marketing.write"), async (c) => {
  const parsed = await parseJsonBody(
    c,
    z.object({
      name: z.string().min(2),
      channel: z.enum(["storefront", "email", "social", "push", "sms"]).default("storefront"),
      status: z.enum(["draft", "scheduled", "active", "completed", "paused"]).default("draft"),
      budgetAmount: z.coerce.number().min(0).default(0),
      startsAt: z.string().nullable().optional(),
      endsAt: z.string().nullable().optional(),
    })
  );
  if ("error" in parsed) return parsed.error;
  const d = parsed.data;
  const actor = c.get("authUser");
  const db = await getDb();
  const res = await db.query(
    `INSERT INTO campaigns (name, channel, status, budget_amount, starts_at, ends_at, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [d.name, d.channel, d.status, d.budgetAmount, d.startsAt ?? null, d.endsAt ?? null, actor.id]
  );
  return c.json({ data: res.rows[0] }, 201);
});

// ─── Product Reviews Moderation ───────────────────────────────────────────────
marketingRoutes.get("/reviews", requirePermission("reviews.moderate", "marketing.read"), async (c) => {
  const status = c.req.query("status");
  const db = await getDb();
  const where = status && status !== "all" ? "WHERE pr.status = $1" : "";
  const params = status && status !== "all" ? [status] : [];
  const res = await db.query(
    `SELECT pr.*, p.name AS product_name, p.sku
     FROM product_reviews pr
     JOIN products p ON p.id = pr.product_id
     ${where}
     ORDER BY pr.created_at DESC`,
    params
  );
  return c.json({ data: res.rows });
});

marketingRoutes.patch("/reviews/:id", requirePermission("reviews.moderate"), async (c) => {
  const parsed = await parseJsonBody(
    c,
    z.object({
      status: z.enum(["pending", "published", "rejected", "hidden"]).optional(),
      moderationReason: z.string().optional(),
      merchantReply: z.string().optional(),
    })
  );
  if ("error" in parsed) return parsed.error;
  const d = parsed.data;
  const actor = c.get("authUser");
  const db = await getDb();

  const res = await db.query(
    `UPDATE product_reviews SET
      status = COALESCE($1, status),
      moderation_reason = COALESCE($2, moderation_reason),
      moderated_by = CASE WHEN $1 IS NOT NULL THEN $3 ELSE moderated_by END,
      moderated_at = CASE WHEN $1 IS NOT NULL THEN NOW() ELSE moderated_at END,
      merchant_reply = COALESCE($4, merchant_reply),
      merchant_replied_by = CASE WHEN $4 IS NOT NULL THEN $3 ELSE merchant_replied_by END,
      merchant_replied_at = CASE WHEN $4 IS NOT NULL THEN NOW() ELSE merchant_replied_at END,
      updated_at = NOW()
     WHERE id = $5 RETURNING *`,
    [d.status ?? null, d.moderationReason ?? null, actor.id, d.merchantReply ?? null, c.req.param("id")]
  );

  await recordAuditLog({
    actorUserId: actor.id,
    actorEmail: actor.email,
    action: "review.moderated",
    entityType: "product_review",
    entityId: c.req.param("id"),
    afterData: d,
  });

  return c.json({ data: res.rows[0] });
});

export default marketingRoutes;
