import { Hono } from "hono";
import { z } from "zod";
import * as XLSX from "xlsx";
import { getDb } from "../../db/client.js";
import { requireAdminAuth } from "../../middleware/auth.js";
import { isVendorScoped, requirePermission } from "../../middleware/rbac.js";
import { getPagination, parseJsonBody, recordAuditLog } from "../../middleware/validate.js";

const catalogRoutes = new Hono();
catalogRoutes.use("*", requireAdminAuth);

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// ─── PRODUCTS CRUD ────────────────────────────────────────────────────────────
catalogRoutes.get("/products", requirePermission("products.read"), async (c) => {
  const { page, limit, offset, search } = getPagination(c);
  const status = c.req.query("status");
  const categoryId = c.req.query("categoryId");
  const brandId = c.req.query("brandId");
  const storageType = c.req.query("storageType");
  const stockFilter = c.req.query("stockFilter"); // 'low', 'out', 'in'
  const db = await getDb();

  const conds: string[] = ["p.deleted_at IS NULL"];
  const params: unknown[] = [];

  if (isVendorScoped(c)) {
    params.push(c.get("authUser").vendorId);
    conds.push(`p.vendor_id = $${params.length}`);
  }
  if (search) {
    params.push(`%${search.toLowerCase()}%`);
    conds.push(
      `(LOWER(p.name) LIKE $${params.length} OR LOWER(p.sku) LIKE $${params.length} OR LOWER(COALESCE(p.barcode,'')) LIKE $${params.length} OR LOWER(p.slug) LIKE $${params.length})`
    );
  }
  if (status && status !== "all") {
    params.push(status);
    conds.push(`p.status = $${params.length}`);
  }
  if (categoryId && categoryId !== "all") {
    params.push(categoryId);
    conds.push(`(p.category_id = $${params.length} OR p.subcategory_id = $${params.length})`);
  }
  if (brandId && brandId !== "all") {
    params.push(brandId);
    conds.push(`p.brand_id = $${params.length}`);
  }
  if (storageType && storageType !== "all") {
    params.push(storageType);
    conds.push(`p.storage_type = $${params.length}`);
  }

  const where = `WHERE ${conds.join(" AND ")}`;

  const stockHaving =
    stockFilter === "out"
      ? "HAVING COALESCE(SUM(inv.available_qty), 0) <= 0"
      : stockFilter === "low"
        ? "HAVING COALESCE(SUM(inv.available_qty), 0) > 0 AND COALESCE(SUM(inv.available_qty), 0) <= MIN(COALESCE(inv.low_stock_threshold, 10))"
        : "";

  const countRes = await db.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM (
       SELECT p.id FROM products p
       LEFT JOIN product_variants pv ON pv.product_id = p.id AND pv.deleted_at IS NULL
       LEFT JOIN inventory_items inv ON inv.variant_id = pv.id
       ${where}
       GROUP BY p.id
       ${stockHaving}
     ) sub`,
    params
  );
  const total = Number(countRes.rows[0]?.count || 0);

  const rowsRes = await db.query(
    `SELECT p.*,
            c.name AS category_name,
            sc.name AS subcategory_name,
            b.name AS brand_name,
            co.name AS country_name,
            COALESCE(SUM(inv.physical_qty), 0)::int AS physical_stock,
            COALESCE(SUM(inv.reserved_qty), 0)::int AS reserved_stock,
            COALESCE(SUM(inv.available_qty), 0)::int AS available_stock,
            COUNT(DISTINCT pv.id)::int AS variant_count
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN categories sc ON sc.id = p.subcategory_id
     LEFT JOIN brands b ON b.id = p.brand_id
     LEFT JOIN countries_of_origin co ON co.id = p.origin_country_id
     LEFT JOIN product_variants pv ON pv.product_id = p.id AND pv.deleted_at IS NULL
     LEFT JOIN inventory_items inv ON inv.variant_id = pv.id
     ${where}
     GROUP BY p.id, c.name, sc.name, b.name, co.name
     ${stockHaving}
     ORDER BY p.created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  return c.json({
    data: rowsRes.rows,
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  });
});

catalogRoutes.get("/products/:id", requirePermission("products.read"), async (c) => {
  const id = c.req.param("id");
  const db = await getDb();
  const prodRes = await db.query("SELECT * FROM products WHERE id = $1 AND deleted_at IS NULL", [id]);
  const product = prodRes.rows[0] as Record<string, unknown> | undefined;
  if (!product) {
    return c.json({ error: { code: "NOT_FOUND", message: "Product not found" } }, 404);
  }
  if (isVendorScoped(c) && product.vendor_id !== c.get("authUser").vendorId) {
    return c.json({ error: { code: "FORBIDDEN", message: "Access denied for this vendor product" } }, 403);
  }

  const imagesRes = await db.query("SELECT * FROM product_images WHERE product_id = $1 ORDER BY sort_order", [id]);
  const variantsRes = await db.query(
    `SELECT pv.*, COALESCE(SUM(inv.physical_qty), 0)::int AS physical_qty,
            COALESCE(SUM(inv.reserved_qty), 0)::int AS reserved_qty,
            COALESCE(SUM(inv.available_qty), 0)::int AS available_qty,
            MIN(COALESCE(inv.low_stock_threshold, 10))::int AS low_stock_threshold
     FROM product_variants pv
     LEFT JOIN inventory_items inv ON inv.variant_id = pv.id
     WHERE pv.product_id = $1 AND pv.deleted_at IS NULL
     GROUP BY pv.id
     ORDER BY pv.is_default DESC, pv.created_at ASC`,
    [id]
  );

  return c.json({
    data: {
      ...product,
      images: imagesRes.rows,
      variants: variantsRes.rows,
    },
  });
});

const productUpsertSchema = z.object({
  name: z.string().min(2).max(200),
  nameI18n: z.record(z.string(), z.string()).optional(),
  slug: z.string().min(2).max(200).optional(),
  sku: z.string().min(2).max(80),
  barcode: z.string().max(80).nullable().optional(),
  shortDescription: z.string().max(500).nullable().optional(),
  fullDescription: z.string().nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  subcategoryId: z.string().uuid().nullable().optional(),
  brandId: z.string().uuid().nullable().optional(),
  originCountryId: z.string().uuid().nullable().optional(),
  taxClassId: z.string().uuid().nullable().optional(),
  shippingClassId: z.string().uuid().nullable().optional(),
  vendorId: z.string().uuid().nullable().optional(),
  supplierName: z.string().max(150).nullable().optional(),
  regularPrice: z.coerce.number().min(0),
  salePrice: z.coerce.number().min(0).nullable().optional(),
  costPrice: z.coerce.number().min(0).default(0),
  stockQuantity: z.coerce.number().int().min(0).default(0),
  lowStockThreshold: z.coerce.number().int().min(0).default(10),
  featuredImageUrl: z.string().nullable().optional(),
  galleryUrls: z.array(z.string()).default([]),
  videoUrl: z.string().nullable().optional(),
  weightGrams: z.coerce.number().min(0).default(0),
  lengthCm: z.coerce.number().min(0).nullable().optional(),
  widthCm: z.coerce.number().min(0).nullable().optional(),
  heightCm: z.coerce.number().min(0).nullable().optional(),
  storageType: z.enum(["dry", "cool", "frozen"]).default("dry"),
  halalTier: z.enum(["certified", "supplier", "nopork", "not_halal"]).default("certified"),
  tags: z.array(z.string()).default([]),
  isFeatured: z.boolean().default(false),
  status: z.enum(["draft", "active", "inactive", "archived"]).default("draft"),
  seoTitle: z.string().max(200).nullable().optional(),
  seoDescription: z.string().max(400).nullable().optional(),
  variants: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        sku: z.string().min(2),
        barcode: z.string().nullable().optional(),
        title: z.string().min(1),
        regularPrice: z.coerce.number().min(0),
        salePrice: z.coerce.number().min(0).nullable().optional(),
        costPrice: z.coerce.number().min(0).default(0),
        weightGrams: z.coerce.number().min(0).default(0),
        stockQuantity: z.coerce.number().int().min(0).default(0),
        lowStockThreshold: z.coerce.number().int().min(0).default(10),
        isDefault: z.boolean().default(false),
      })
    )
    .optional(),
});

catalogRoutes.post("/products", requirePermission("products.write"), async (c) => {
  const parsed = await parseJsonBody(c, productUpsertSchema);
  if ("error" in parsed) return parsed.error;
  const d = parsed.data;
  const actor = c.get("authUser");
  const db = await getDb();

  const slug = (d.slug ? slugify(d.slug) : slugify(d.name)) || `product-${Date.now()}`;
  const vendorId = isVendorScoped(c) ? actor.vendorId : d.vendorId ?? null;

  try {
    const created = await db.transaction(async (tx) => {
      const pRes = await tx.query<{ id: string }>(
        `INSERT INTO products (
          vendor_id, category_id, subcategory_id, brand_id, origin_country_id,
          tax_class_id, shipping_class_id, supplier_name,
          name, name_i18n, slug, sku, barcode, short_description, full_description,
          regular_price, sale_price, cost_price, currency_code,
          featured_image_url, video_url, weight_grams, length_cm, width_cm, height_cm,
          storage_type, halal_tier, tags, is_featured, has_variants, status,
          seo_title, seo_description, created_by, updated_by
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8,
          $9, $10::jsonb, $11, $12, $13, $14, $15,
          $16, $17, $18, 'JPY',
          $19, $20, $21, $22, $23, $24,
          $25, $26, $27::text[], $28, $29, $30,
          $31, $32, $33, $33
        ) RETURNING *`,
        [
          vendorId,
          d.categoryId ?? null,
          d.subcategoryId ?? null,
          d.brandId ?? null,
          d.originCountryId ?? null,
          d.taxClassId ?? null,
          d.shippingClassId ?? null,
          d.supplierName ?? null,
          d.name,
          JSON.stringify(d.nameI18n ?? { EN: d.name, JA: d.name }),
          slug,
          d.sku.trim(),
          d.barcode ?? null,
          d.shortDescription ?? null,
          d.fullDescription ?? null,
          d.regularPrice,
          d.salePrice ?? null,
          d.costPrice,
          d.featuredImageUrl ?? null,
          d.videoUrl ?? null,
          d.weightGrams,
          d.lengthCm ?? null,
          d.widthCm ?? null,
          d.heightCm ?? null,
          d.storageType,
          d.halalTier,
          d.tags,
          d.isFeatured,
          Boolean(d.variants && d.variants.length > 0),
          d.status,
          d.seoTitle ?? null,
          d.seoDescription ?? null,
          actor.id,
        ]
      );
      const productId = pRes.rows[0].id;

      for (let i = 0; i < d.galleryUrls.length; i++) {
        await tx.query(
          "INSERT INTO product_images (product_id, url, sort_order, is_featured) VALUES ($1, $2, $3, $4)",
          [productId, d.galleryUrls[i], i, i === 0]
        );
      }

      const whRes = await tx.query<{ id: string }>("SELECT id FROM warehouses WHERE is_default = TRUE LIMIT 1");
      const warehouseId = whRes.rows[0]?.id;

      const variantsToCreate =
        d.variants && d.variants.length > 0
          ? d.variants
          : [
              {
                sku: d.sku.trim(),
                barcode: d.barcode ?? null,
                title: "Default",
                regularPrice: d.regularPrice,
                salePrice: d.salePrice ?? null,
                costPrice: d.costPrice,
                weightGrams: d.weightGrams,
                stockQuantity: d.stockQuantity,
                lowStockThreshold: d.lowStockThreshold,
                isDefault: true,
              },
            ];

      for (const v of variantsToCreate) {
        const vRes = await tx.query<{ id: string }>(
          `INSERT INTO product_variants (
            product_id, sku, barcode, title, regular_price, sale_price, cost_price, weight_grams, is_default
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
          [
            productId,
            v.sku.trim(),
            v.barcode ?? null,
            v.title,
            v.regularPrice,
            v.salePrice ?? null,
            v.costPrice,
            v.weightGrams,
            v.isDefault,
          ]
        );
        if (warehouseId) {
          await tx.query(
            `INSERT INTO inventory_items (variant_id, warehouse_id, physical_qty, low_stock_threshold)
             VALUES ($1, $2, $3, $4)`,
            [vRes.rows[0].id, warehouseId, v.stockQuantity, v.lowStockThreshold]
          );
        }
      }

      return pRes.rows[0];
    });

    await recordAuditLog({
      actorUserId: actor.id,
      actorEmail: actor.email,
      action: "product.created",
      entityType: "product",
      entityId: created.id,
      afterData: { sku: d.sku, name: d.name, status: d.status },
    });

    return c.json({ data: created }, 201);
  } catch (err) {
    return c.json(
      { error: { code: "CONFLICT", message: err instanceof Error ? err.message : "Failed to create product" } },
      400
    );
  }
});

catalogRoutes.patch("/products/:id", requirePermission("products.write"), async (c) => {
  const id = c.req.param("id");
  const parsed = await parseJsonBody(c, productUpsertSchema.partial());
  if ("error" in parsed) return parsed.error;
  const d = parsed.data;
  const actor = c.get("authUser");
  const db = await getDb();

  const existingRes = await db.query<Record<string, unknown>>(
    "SELECT * FROM products WHERE id = $1 AND deleted_at IS NULL",
    [id]
  );
  const existing = existingRes.rows[0];
  if (!existing) {
    return c.json({ error: { code: "NOT_FOUND", message: "Product not found" } }, 404);
  }
  if (isVendorScoped(c) && existing.vendor_id !== actor.vendorId) {
    return c.json({ error: { code: "FORBIDDEN", message: "Access denied" } }, 403);
  }

  try {
    const updated = await db.transaction(async (tx) => {
      const res = await tx.query(
        `UPDATE products SET
          name = COALESCE($1, name),
          name_i18n = COALESCE($2::jsonb, name_i18n),
          slug = COALESCE($3, slug),
          sku = COALESCE($4, sku),
          barcode = COALESCE($5, barcode),
          short_description = COALESCE($6, short_description),
          full_description = COALESCE($7, full_description),
          category_id = COALESCE($8, category_id),
          subcategory_id = COALESCE($9, subcategory_id),
          brand_id = COALESCE($10, brand_id),
          origin_country_id = COALESCE($11, origin_country_id),
          regular_price = COALESCE($12, regular_price),
          sale_price = $13,
          cost_price = COALESCE($14, cost_price),
          featured_image_url = COALESCE($15, featured_image_url),
          storage_type = COALESCE($16, storage_type),
          halal_tier = COALESCE($17, halal_tier),
          is_featured = COALESCE($18, is_featured),
          status = COALESCE($19, status),
          seo_title = COALESCE($20, seo_title),
          seo_description = COALESCE($21, seo_description),
          updated_by = $22,
          updated_at = NOW()
         WHERE id = $23 RETURNING *`,
        [
          d.name ?? null,
          d.nameI18n ? JSON.stringify(d.nameI18n) : null,
          d.slug ? slugify(d.slug) : null,
          d.sku ?? null,
          d.barcode ?? null,
          d.shortDescription ?? null,
          d.fullDescription ?? null,
          d.categoryId ?? null,
          d.subcategoryId ?? null,
          d.brandId ?? null,
          d.originCountryId ?? null,
          d.regularPrice ?? null,
          d.salePrice !== undefined ? d.salePrice : existing.sale_price,
          d.costPrice ?? null,
          d.featuredImageUrl ?? null,
          d.storageType ?? null,
          d.halalTier ?? null,
          d.isFeatured ?? null,
          d.status ?? null,
          d.seoTitle ?? null,
          d.seoDescription ?? null,
          actor.id,
          id,
        ]
      );

      if (d.stockQuantity !== undefined) {
        await tx.query(
          `UPDATE inventory_items SET physical_qty = $1, updated_at = NOW()
           WHERE variant_id IN (SELECT id FROM product_variants WHERE product_id = $2 AND is_default = TRUE)`,
          [d.stockQuantity, id]
        );
      }

      return res.rows[0];
    });

    await recordAuditLog({
      actorUserId: actor.id,
      actorEmail: actor.email,
      action: "product.updated",
      entityType: "product",
      entityId: id,
      beforeData: { name: existing.name, sku: existing.sku, status: existing.status },
      afterData: { name: updated.name, sku: updated.sku, status: updated.status },
    });

    return c.json({ data: updated });
  } catch (err) {
    return c.json(
      { error: { code: "CONFLICT", message: err instanceof Error ? err.message : "Failed to update product" } },
      400
    );
  }
});

catalogRoutes.post("/products/:id/duplicate", requirePermission("products.write"), async (c) => {
  const id = c.req.param("id");
  const actor = c.get("authUser");
  const db = await getDb();

  const origRes = await db.query<Record<string, unknown>>("SELECT * FROM products WHERE id = $1 AND deleted_at IS NULL", [id]);
  const orig = origRes.rows[0];
  if (!orig) return c.json({ error: { code: "NOT_FOUND", message: "Product not found" } }, 404);

  const suffix = String(Date.now()).slice(-5);
  const dupRes = await db.query(
    `INSERT INTO products (
      vendor_id, category_id, subcategory_id, brand_id, origin_country_id, tax_class_id, shipping_class_id,
      name, name_i18n, slug, sku, short_description, full_description,
      regular_price, sale_price, cost_price, currency_code, featured_image_url,
      storage_type, halal_tier, status, created_by
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7,
      $8, $9::jsonb, $10, $11, $12, $13,
      $14, $15, $16, $17, $18,
      $19, $20, 'draft', $21
    ) RETURNING *`,
    [
      orig.vendor_id,
      orig.category_id,
      orig.subcategory_id,
      orig.brand_id,
      orig.origin_country_id,
      orig.tax_class_id,
      orig.shipping_class_id,
      `${orig.name} (Copy)`,
      JSON.stringify(orig.name_i18n || {}),
      `${orig.slug}-copy-${suffix}`,
      `${orig.sku}-COPY-${suffix}`,
      orig.short_description,
      orig.full_description,
      orig.regular_price,
      orig.sale_price,
      orig.cost_price,
      orig.currency_code,
      orig.featured_image_url,
      orig.storage_type,
      orig.halal_tier,
      actor.id,
    ]
  );

  return c.json({ data: dupRes.rows[0] }, 201);
});

catalogRoutes.post("/products/bulk", requirePermission("products.write"), async (c) => {
  const schema = z.object({
    ids: z.array(z.string().uuid()).min(1),
    action: z.enum(["publish", "draft", "archive", "price_adjust_percent"]),
    value: z.coerce.number().optional(),
  });
  const parsed = await parseJsonBody(c, schema);
  if ("error" in parsed) return parsed.error;
  const { ids, action, value } = parsed.data;
  const actor = c.get("authUser");
  const db = await getDb();

  if (action === "publish" || action === "draft" || action === "archive") {
    const statusMap = { publish: "active", draft: "draft", archive: "archived" };
    await db.query("UPDATE products SET status = $1, updated_by = $2, updated_at = NOW() WHERE id = ANY($3::uuid[])", [
      statusMap[action],
      actor.id,
      ids,
    ]);
  } else if (action === "price_adjust_percent" && value !== undefined) {
    const factor = 1 + value / 100;
    await db.query(
      "UPDATE products SET regular_price = GREATEST(0, ROUND(regular_price * $1, 0)), updated_by = $2, updated_at = NOW() WHERE id = ANY($3::uuid[])",
      [factor, actor.id, ids]
    );
  }

  await recordAuditLog({
    actorUserId: actor.id,
    actorEmail: actor.email,
    action: `product.bulk_${action}`,
    entityType: "product",
    metadata: { count: ids.length, value },
  });

  return c.json({ data: { updatedCount: ids.length } });
});

catalogRoutes.delete("/products/:id", requirePermission("products.delete"), async (c) => {
  const id = c.req.param("id");
  const actor = c.get("authUser");
  const db = await getDb();
  await db.query("UPDATE products SET deleted_at = NOW(), status = 'archived' WHERE id = $1", [id]);
  await recordAuditLog({
    actorUserId: actor.id,
    actorEmail: actor.email,
    action: "product.archived",
    entityType: "product",
    entityId: id,
  });
  return c.json({ data: { deleted: true } });
});

// ─── CATEGORIES & SUBCATEGORIES (HIERARCHICAL + SAFE REASSIGNMENT) ───────────
catalogRoutes.get("/categories", requirePermission("taxonomy.read", "products.read"), async (c) => {
  const db = await getDb();
  const res = await db.query(
    `SELECT c.*, p.name AS parent_name,
            (SELECT COUNT(*)::int FROM products pr WHERE (pr.category_id = c.id OR pr.subcategory_id = c.id) AND pr.deleted_at IS NULL) AS product_count
     FROM categories c
     LEFT JOIN categories p ON p.id = c.parent_id
     WHERE c.deleted_at IS NULL
     ORDER BY c.sort_order ASC, c.name ASC`
  );
  return c.json({ data: res.rows });
});

const categorySchema = z.object({
  parentId: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(120),
  nameI18n: z.record(z.string(), z.string()).optional(),
  slug: z.string().min(1).max(120).optional(),
  description: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
});

catalogRoutes.post("/categories", requirePermission("taxonomy.write"), async (c) => {
  const parsed = await parseJsonBody(c, categorySchema);
  if ("error" in parsed) return parsed.error;
  const d = parsed.data;
  const db = await getDb();
  const slug = d.slug ? slugify(d.slug) : slugify(d.name);

  const res = await db.query(
    `INSERT INTO categories (parent_id, slug, name, name_i18n, description, image_url, icon, sort_order, is_active, is_featured)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [
      d.parentId ?? null,
      slug,
      d.name,
      JSON.stringify(d.nameI18n ?? { EN: d.name, JA: d.name }),
      d.description ?? null,
      d.imageUrl ?? null,
      d.icon ?? null,
      d.sortOrder,
      d.isActive,
      d.isFeatured,
    ]
  );
  return c.json({ data: res.rows[0] }, 201);
});

catalogRoutes.patch("/categories/:id", requirePermission("taxonomy.write"), async (c) => {
  const parsed = await parseJsonBody(c, categorySchema.partial());
  if ("error" in parsed) return parsed.error;
  const d = parsed.data;
  const db = await getDb();
  const res = await db.query(
    `UPDATE categories SET
      parent_id = COALESCE($1, parent_id),
      name = COALESCE($2, name),
      description = COALESCE($3, description),
      image_url = COALESCE($4, image_url),
      icon = COALESCE($5, icon),
      sort_order = COALESCE($6, sort_order),
      is_active = COALESCE($7, is_active),
      is_featured = COALESCE($8, is_featured),
      updated_at = NOW()
     WHERE id = $9 AND deleted_at IS NULL RETURNING *`,
    [
      d.parentId ?? null,
      d.name ?? null,
      d.description ?? null,
      d.imageUrl ?? null,
      d.icon ?? null,
      d.sortOrder ?? null,
      d.isActive ?? null,
      d.isFeatured ?? null,
      c.req.param("id"),
    ]
  );
  if (!res.rows[0]) return c.json({ error: { code: "NOT_FOUND", message: "Category not found" } }, 404);
  return c.json({ data: res.rows[0] });
});

catalogRoutes.delete("/categories/:id", requirePermission("taxonomy.write"), async (c) => {
  const id = c.req.param("id");
  const reassignToId = c.req.query("reassignToId");
  const db = await getDb();

  const childRes = await db.query<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM categories WHERE parent_id = $1 AND deleted_at IS NULL",
    [id]
  );
  if (Number(childRes.rows[0]?.count || 0) > 0 && !reassignToId) {
    return c.json(
      { error: { code: "REFERENCED", message: "Category has child subcategories. Reassign or delete children first." } },
      409
    );
  }

  const prodRes = await db.query<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM products WHERE (category_id = $1 OR subcategory_id = $1) AND deleted_at IS NULL",
    [id]
  );
  const referencedCount = Number(prodRes.rows[0]?.count || 0);
  if (referencedCount > 0 && !reassignToId) {
    return c.json(
      {
        error: {
          code: "REFERENCED",
          message: `Category is referenced by ${referencedCount} products. Provide reassignToId to safely reassign before deletion.`,
        },
      },
      409
    );
  }

  await db.transaction(async (tx) => {
    if (reassignToId) {
      await tx.query("UPDATE products SET category_id = $1 WHERE category_id = $2", [reassignToId, id]);
      await tx.query("UPDATE products SET subcategory_id = $1 WHERE subcategory_id = $2", [reassignToId, id]);
      await tx.query("UPDATE categories SET parent_id = $1 WHERE parent_id = $2", [reassignToId, id]);
    }
    await tx.query("UPDATE categories SET deleted_at = NOW(), is_active = FALSE WHERE id = $1", [id]);
  });

  return c.json({ data: { deleted: true, reassignedTo: reassignToId || null } });
});

// ─── BRANDS, COUNTRIES, ATTRIBUTES, VARIANTS ─────────────────────────────────
catalogRoutes.get("/brands", requirePermission("taxonomy.read", "products.read"), async (c) => {
  const db = await getDb();
  const res = await db.query(
    `SELECT b.*, (SELECT COUNT(*)::int FROM products p WHERE p.brand_id = b.id AND p.deleted_at IS NULL) AS product_count
     FROM brands b WHERE b.deleted_at IS NULL ORDER BY b.sort_order, b.name`
  );
  return c.json({ data: res.rows });
});

catalogRoutes.post("/brands", requirePermission("taxonomy.write"), async (c) => {
  const parsed = await parseJsonBody(
    c,
    z.object({
      name: z.string().min(1),
      slug: z.string().optional(),
      description: z.string().optional(),
      logoUrl: z.string().optional(),
      websiteUrl: z.string().optional(),
      isActive: z.boolean().default(true),
    })
  );
  if ("error" in parsed) return parsed.error;
  const d = parsed.data;
  const db = await getDb();
  const res = await db.query(
    `INSERT INTO brands (slug, name, description, logo_url, website_url, is_active)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [d.slug ? slugify(d.slug) : slugify(d.name), d.name, d.description ?? null, d.logoUrl ?? null, d.websiteUrl ?? null, d.isActive]
  );
  return c.json({ data: res.rows[0] }, 201);
});

catalogRoutes.get("/countries", requirePermission("taxonomy.read", "products.read"), async (c) => {
  const db = await getDb();
  const res = await db.query("SELECT * FROM countries_of_origin ORDER BY sort_order, name");
  return c.json({ data: res.rows });
});

catalogRoutes.post("/countries", requirePermission("taxonomy.write"), async (c) => {
  const parsed = await parseJsonBody(
    c,
    z.object({
      code: z.string().min(2).max(12),
      name: z.string().min(2),
      flagEmoji: z.string().optional(),
      isActive: z.boolean().default(true),
    })
  );
  if ("error" in parsed) return parsed.error;
  const d = parsed.data;
  const db = await getDb();
  const res = await db.query(
    `INSERT INTO countries_of_origin (code, slug, name, flag_emoji, is_active)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [d.code.toUpperCase(), slugify(d.name), d.name, d.flagEmoji ?? null, d.isActive]
  );
  return c.json({ data: res.rows[0] }, 201);
});

catalogRoutes.get("/attributes", requirePermission("taxonomy.read", "products.read"), async (c) => {
  const db = await getDb();
  const res = await db.query(
    `SELECT a.*, COALESCE(json_agg(av.*) FILTER (WHERE av.id IS NOT NULL), '[]') AS values
     FROM attributes a
     LEFT JOIN attribute_values av ON av.attribute_id = a.id
     GROUP BY a.id ORDER BY a.sort_order, a.name`
  );
  return c.json({ data: res.rows });
});

catalogRoutes.post("/attributes", requirePermission("taxonomy.write"), async (c) => {
  const parsed = await parseJsonBody(
    c,
    z.object({
      name: z.string().min(1),
      inputType: z.enum(["select", "color", "text", "number"]).default("select"),
      values: z.array(z.string().min(1)).default([]),
    })
  );
  if ("error" in parsed) return parsed.error;
  const db = await getDb();
  const created = await db.transaction(async (tx) => {
    const aRes = await tx.query<{ id: string }>(
      "INSERT INTO attributes (slug, name, input_type) VALUES ($1, $2, $3) RETURNING *",
      [slugify(parsed.data.name), parsed.data.name, parsed.data.inputType]
    );
    for (let i = 0; i < parsed.data.values.length; i++) {
      const val = parsed.data.values[i];
      await tx.query(
        "INSERT INTO attribute_values (attribute_id, slug, value, sort_order) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING",
        [aRes.rows[0].id, slugify(val) || `val-${i}`, val, i]
      );
    }
    return aRes.rows[0];
  });
  return c.json({ data: created }, 201);
});

catalogRoutes.get("/variants", requirePermission("products.read"), async (c) => {
  const { page, limit, offset, search } = getPagination(c);
  const db = await getDb();
  const where = search
    ? "WHERE pv.deleted_at IS NULL AND p.deleted_at IS NULL AND (LOWER(pv.sku) LIKE $1 OR LOWER(p.name) LIKE $1)"
    : "WHERE pv.deleted_at IS NULL AND p.deleted_at IS NULL";
  const params = search ? [`%${search.toLowerCase()}%`] : [];

  const countRes = await db.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM product_variants pv JOIN products p ON p.id = pv.product_id ${where}`,
    params
  );
  const total = Number(countRes.rows[0]?.count || 0);

  const rowsRes = await db.query(
    `SELECT pv.*, p.name AS product_name, p.status AS product_status,
            COALESCE(SUM(inv.physical_qty), 0)::int AS physical_qty,
            COALESCE(SUM(inv.reserved_qty), 0)::int AS reserved_qty,
            COALESCE(SUM(inv.available_qty), 0)::int AS available_qty
     FROM product_variants pv
     JOIN products p ON p.id = pv.product_id
     LEFT JOIN inventory_items inv ON inv.variant_id = pv.id
     ${where}
     GROUP BY pv.id, p.name, p.status
     ORDER BY pv.created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  return c.json({
    data: rowsRes.rows,
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  });
});

// ─── PRODUCT IMPORT & EXPORT (CSV & XLSX) ─────────────────────────────────────
catalogRoutes.get("/products-export", requirePermission("products.import_export"), async (c) => {
  const format = c.req.query("format") === "xlsx" ? "xlsx" : "csv";
  const status = c.req.query("status");
  const db = await getDb();
  const params: unknown[] = [];
  let where = "WHERE p.deleted_at IS NULL";
  if (status && status !== "all") {
    params.push(status);
    where += ` AND p.status = $${params.length}`;
  }

  const res = await db.query<Record<string, unknown>>(
    `SELECT p.sku, p.name, p.slug, c.name AS category, b.name AS brand,
            p.regular_price, p.sale_price, p.cost_price, p.storage_type, p.halal_tier, p.status,
            COALESCE(SUM(inv.available_qty), 0)::int AS available_stock
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN brands b ON b.id = p.brand_id
     LEFT JOIN product_variants pv ON pv.product_id = p.id
     LEFT JOIN inventory_items inv ON inv.variant_id = pv.id
     ${where}
     GROUP BY p.id, c.name, b.name
     ORDER BY p.sku ASC`,
    params
  );

  const ws = XLSX.utils.json_to_sheet(res.rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Products");

  if (format === "xlsx") {
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="beticrom-products-export.xlsx"',
      },
    });
  }

  const csv = XLSX.utils.sheet_to_csv(ws);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="beticrom-products-export.csv"',
    },
  });
});

catalogRoutes.get("/products-import/template", requirePermission("products.import_export"), (c) => {
  const sample = [
    {
      sku: "BTC-NEW-001",
      name: "Sample Basmati Rice 5kg",
      regular_price: 2480,
      sale_price: 2180,
      cost_price: 1650,
      stock_quantity: 40,
      category: "Grocery",
      brand: "Kaalar",
      storage_type: "dry",
      halal_tier: "certified",
      status: "active",
    },
  ];
  const ws = XLSX.utils.json_to_sheet(sample);
  const csv = XLSX.utils.sheet_to_csv(ws);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="product-import-template.csv"',
    },
  });
});

catalogRoutes.get("/products-import/jobs", requirePermission("products.import_export"), async (c) => {
  const db = await getDb();
  const res = await db.query("SELECT * FROM product_import_jobs ORDER BY created_at DESC LIMIT 50");
  return c.json({ data: res.rows });
});

const importRunSchema = z.object({
  filename: z.string().min(1),
  fileFormat: z.enum(["csv", "xlsx"]),
  duplicatePolicy: z.enum(["skip", "update"]).default("skip"),
  idempotencyKey: z.string().optional(),
  rows: z.array(z.record(z.string(), z.unknown())).min(1).max(2000),
});

catalogRoutes.post("/products-import/run", requirePermission("products.import_export"), async (c) => {
  const parsed = await parseJsonBody(c, importRunSchema);
  if ("error" in parsed) return parsed.error;
  const { filename, fileFormat, duplicatePolicy, idempotencyKey, rows } = parsed.data;
  const actor = c.get("authUser");
  const db = await getDb();

  if (idempotencyKey) {
    const existing = await db.query("SELECT * FROM product_import_jobs WHERE idempotency_key = $1", [idempotencyKey]);
    if (existing.rows[0]) {
      return c.json({ data: existing.rows[0] });
    }
  }

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  const errors: Array<{ row: number; sku?: string; error: string }> = [];

  const whRes = await db.query<{ id: string }>("SELECT id FROM warehouses WHERE is_default = TRUE LIMIT 1");
  const warehouseId = whRes.rows[0]?.id;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const sku = String(r.sku || "").trim();
    const name = String(r.name || "").trim();
    const regularPrice = Number(r.regular_price);

    if (!sku || !name || !Number.isFinite(regularPrice) || regularPrice < 0) {
      errors.push({ row: i + 1, sku, error: "Missing or invalid required fields (sku, name, regular_price)" });
      continue;
    }

    try {
      const existingProd = await db.query<{ id: string }>("SELECT id FROM products WHERE sku = $1", [sku]);
      if (existingProd.rows[0]) {
        if (duplicatePolicy === "skip") {
          skippedCount++;
          continue;
        }
        await db.query(
          `UPDATE products SET
            name = $1,
            regular_price = $2,
            sale_price = $3,
            cost_price = $4,
            status = COALESCE($5, status),
            updated_at = NOW()
           WHERE id = $6`,
          [
            name,
            regularPrice,
            r.sale_price ? Number(r.sale_price) : null,
            r.cost_price ? Number(r.cost_price) : 0,
            r.status ? String(r.status) : null,
            existingProd.rows[0].id,
          ]
        );
        updatedCount++;
      } else {
        const slug = `${slugify(name) || "item"}-${slugify(sku)}-${Date.now().toString().slice(-4)}`;
        const pRes = await db.query<{ id: string }>(
          `INSERT INTO products (name, slug, sku, regular_price, sale_price, cost_price, storage_type, halal_tier, status, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
          [
            name,
            slug,
            sku,
            regularPrice,
            r.sale_price ? Number(r.sale_price) : null,
            r.cost_price ? Number(r.cost_price) : 0,
            ["dry", "cool", "frozen"].includes(String(r.storage_type)) ? String(r.storage_type) : "dry",
            ["certified", "supplier", "nopork", "not_halal"].includes(String(r.halal_tier))
              ? String(r.halal_tier)
              : "certified",
            ["draft", "active", "inactive", "archived"].includes(String(r.status)) ? String(r.status) : "draft",
            actor.id,
          ]
        );
        const vRes = await db.query<{ id: string }>(
          `INSERT INTO product_variants (product_id, sku, title, regular_price, sale_price, cost_price, is_default)
           VALUES ($1, $2, 'Default', $3, $4, $5, TRUE) RETURNING id`,
          [
            pRes.rows[0].id,
            sku,
            regularPrice,
            r.sale_price ? Number(r.sale_price) : null,
            r.cost_price ? Number(r.cost_price) : 0,
          ]
        );
        if (warehouseId) {
          await db.query(
            `INSERT INTO inventory_items (variant_id, warehouse_id, physical_qty, low_stock_threshold)
             VALUES ($1, $2, $3, 10)`,
            [vRes.rows[0].id, warehouseId, Math.max(0, Number(r.stock_quantity || 0))]
          );
        }
        createdCount++;
      }
    } catch (err) {
      errors.push({ row: i + 1, sku, error: err instanceof Error ? err.message : "Database error" });
    }
  }

  const finalStatus = errors.length > 0 ? "completed_with_errors" : "completed";
  const jobRes = await db.query(
    `INSERT INTO product_import_jobs (
      filename, file_format, duplicate_policy, status, total_rows, processed_rows,
      created_count, updated_count, skipped_count, error_count, error_report, idempotency_key, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13)
    RETURNING *`,
    [
      filename,
      fileFormat,
      duplicatePolicy,
      finalStatus,
      rows.length,
      rows.length,
      createdCount,
      updatedCount,
      skippedCount,
      errors.length,
      JSON.stringify(errors),
      idempotencyKey || null,
      actor.id,
    ]
  );

  return c.json({ data: jobRes.rows[0] }, 201);
});

export default catalogRoutes;
