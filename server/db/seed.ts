import fs from "node:fs";
import path from "node:path";
import type { DbClient } from "./client.js";
import { getEnv, isDevSeedEnabled } from "../config/env.js";
import { hashPassword } from "../utils/crypto.js";

interface RawJsonProduct {
  id: string;
  listingId?: string;
  nameEN: string;
  nameJA?: string;
  nameBN?: string;
  price: number;
  comparePrice?: number | null;
  category?: string;
  subcategory?: string;
  brand?: string;
  storage?: "dry" | "cool" | "frozen";
  halalTier?: "certified" | "supplier" | "nopork" | "not_halal";
  country?: string;
  img?: string;
  gallery?: string[];
  supplier?: string;
  stock?: number;
  isNew?: boolean;
  isBestSeller?: boolean;
  description?: string;
  weight?: string;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

/**
 * Seeds the 948 real catalog products from src/data/products.json if the products table is empty.
 * Strictly idempotent and non-destructive.
 */
export async function seedCatalogIfEmpty(db: DbClient): Promise<void> {
  const countRes = await db.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM products");
  if (Number(countRes.rows[0]?.count || 0) > 0) return;

  const jsonPath = path.resolve(process.cwd(), "src/data/products.json");
  if (!fs.existsSync(jsonPath)) return;

  const rawProducts: RawJsonProduct[] = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

  await db.transaction(async (tx) => {
    const whRes = await tx.query<{ id: string }>("SELECT id FROM warehouses WHERE is_default = TRUE LIMIT 1");
    const warehouseId = whRes.rows[0]?.id;
    const taxFoodRes = await tx.query<{ id: string }>("SELECT id FROM tax_classes WHERE code = 'food_reduced_8' LIMIT 1");
    const taxFoodId = taxFoodRes.rows[0]?.id || null;

    const shipClassRes = await tx.query<{ id: string; code: string }>("SELECT id, code FROM shipping_classes");
    const shipMap = new Map(shipClassRes.rows.map((r) => [r.code, r.id]));

    const categoryMap = new Map<string, string>();
    const subcategoryMap = new Map<string, string>();
    const brandMap = new Map<string, string>();
    const countryMap = new Map<string, string>();

    const normalizeCategory = (cat?: string) => {
      if (!cat || !cat.trim()) return "Grocery";
      const c = cat.trim();
      if (c.toLowerCase() === "frozen food" || c.toLowerCase() === "frozen foods") return "Frozen Foods";
      return c;
    };

    for (const p of rawProducts) {
      const catName = normalizeCategory(p.category);
      if (!categoryMap.has(catName)) {
        const catSlug = slugify(catName) || "grocery";
        const res = await tx.query<{ id: string }>(
          `INSERT INTO categories (slug, name, name_i18n, is_active)
           VALUES ($1, $2, $3::jsonb, TRUE)
           ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
           RETURNING id`,
          [catSlug, catName, JSON.stringify({ EN: catName, JA: catName })]
        );
        categoryMap.set(catName, res.rows[0].id);
      }

      const subName = (p.subcategory || "").trim();
      if (subName) {
        const subKey = `${catName}::${subName}`;
        if (!subcategoryMap.has(subKey)) {
          const subSlug = `${slugify(catName)}-${slugify(subName)}`;
          const res = await tx.query<{ id: string }>(
            `INSERT INTO categories (parent_id, slug, name, name_i18n, is_active)
             VALUES ($1, $2, $3, $4::jsonb, TRUE)
             ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
             RETURNING id`,
            [categoryMap.get(catName), subSlug, subName, JSON.stringify({ EN: subName, JA: subName })]
          );
          subcategoryMap.set(subKey, res.rows[0].id);
        }
      }

      const brandName = (p.brand || "Beticrom").trim();
      if (!brandMap.has(brandName)) {
        const brandSlug = slugify(brandName) || "beticrom";
        const res = await tx.query<{ id: string }>(
          `INSERT INTO brands (slug, name, is_active)
           VALUES ($1, $2, TRUE)
           ON CONFLICT (name) DO UPDATE SET slug = EXCLUDED.slug
           RETURNING id`,
          [brandSlug, brandName]
        );
        brandMap.set(brandName, res.rows[0].id);
      }

      const countryName = (p.country || "Japan").trim();
      if (!countryMap.has(countryName)) {
        const cSlug = slugify(countryName) || "japan";
        const cCode = cSlug.toUpperCase().slice(0, 12);
        const res = await tx.query<{ id: string }>(
          `INSERT INTO countries_of_origin (code, slug, name, name_i18n, is_active)
           VALUES ($1, $2, $3, $4::jsonb, TRUE)
           ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
           RETURNING id`,
          [cCode, cSlug, countryName, JSON.stringify({ EN: countryName, JA: countryName })]
        );
        countryMap.set(countryName, res.rows[0].id);
      }
    }

    const seenLegacyIds = new Set<string>();
    for (let idx = 0; idx < rawProducts.length; idx++) {
      const p = rawProducts[idx];
      const catName = normalizeCategory(p.category);
      const catId = categoryMap.get(catName) || null;
      const subName = (p.subcategory || "").trim();
      const subId = subName ? subcategoryMap.get(`${catName}::${subName}`) || null : null;
      const brandId = brandMap.get((p.brand || "Beticrom").trim()) || null;
      const countryId = countryMap.get((p.country || "Japan").trim()) || null;

      const uniqueLegacyId = seenLegacyIds.has(p.id) ? `${p.id}-${idx}` : p.id;
      seenLegacyIds.add(uniqueLegacyId);

      const hasDiscount = p.comparePrice && p.comparePrice > p.price;
      const regularPrice = hasDiscount ? Number(p.comparePrice) : Number(p.price);
      const salePrice = hasDiscount ? Number(p.price) : null;
      const costPrice = Math.round(Number(p.price) * 0.68);
      const sku = `BTC-${uniqueLegacyId}`;
      const slug = `${slugify(p.nameEN) || "product"}-${uniqueLegacyId}`;
      const storageType = p.storage === "cool" || p.storage === "frozen" ? p.storage : "dry";
      const halalTier = p.halalTier || "certified";
      const stockQty = Math.max(0, Number(p.stock ?? 20));

      const prodRes = await tx.query<{ id: string }>(
        `INSERT INTO products (
          legacy_id, category_id, subcategory_id, brand_id, origin_country_id,
          tax_class_id, shipping_class_id, supplier_name,
          name, name_i18n, slug, sku, short_description, full_description,
          regular_price, sale_price, cost_price, currency_code,
          featured_image_url, storage_type, halal_tier, unit_label,
          is_new, is_best_seller, is_featured, status
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8,
          $9, $10::jsonb, $11, $12, $13, $14,
          $15, $16, $17, 'JPY',
          $18, $19, $20, $21,
          $22, $23, $24, 'active'
        ) RETURNING id`,
        [
          uniqueLegacyId,
          catId,
          subId,
          brandId,
          countryId,
          taxFoodId,
          shipMap.get(storageType) || null,
          p.supplier || "Beticrom Halal Market",
          p.nameEN,
          JSON.stringify({ EN: p.nameEN, JA: p.nameJA || p.nameEN, BN: p.nameBN || p.nameEN }),
          slug,
          sku,
          p.description || "",
          p.description || "",
          regularPrice,
          salePrice,
          costPrice,
          p.img || null,
          storageType,
          halalTier,
          p.weight || null,
          Boolean(p.isNew),
          Boolean(p.isBestSeller),
          Boolean(p.isBestSeller),
        ]
      );
      const productId = prodRes.rows[0].id;

      const gallery = Array.isArray(p.gallery) && p.gallery.length > 0 ? p.gallery : p.img ? [p.img] : [];
      for (let i = 0; i < gallery.length; i++) {
        await tx.query(
          `INSERT INTO product_images (product_id, url, sort_order, is_featured)
           VALUES ($1, $2, $3, $4)`,
          [productId, gallery[i], i, i === 0]
        );
      }

      const varRes = await tx.query<{ id: string }>(
        `INSERT INTO product_variants (
          product_id, sku, title, regular_price, sale_price, cost_price, currency_code, image_url, is_default, is_active
        ) VALUES ($1, $2, 'Default', $3, $4, $5, 'JPY', $6, TRUE, TRUE)
        RETURNING id`,
        [productId, sku, regularPrice, salePrice, costPrice, p.img || null]
      );
      const variantId = varRes.rows[0].id;

      if (warehouseId) {
        await tx.query(
          `INSERT INTO inventory_items (variant_id, warehouse_id, physical_qty, reserved_qty, incoming_qty, damaged_qty, low_stock_threshold)
           VALUES ($1, $2, $3, 0, 0, 0, 10)`,
          [variantId, warehouseId, stockQty]
        );
      }
    }
  });
}

/**
 * Ensures at least one Super Admin account exists in development (when ENABLE_DEV_SEED=true).
 * Also seeds dev-only sample coupon/CMS/supplier records if empty.
 */
export async function seedDevEnvironment(db: DbClient): Promise<void> {
  if (!isDevSeedEnabled()) return;

  const env = getEnv();
  const adminCheck = await db.query<{ id: string }>(
    `SELECT u.id FROM users u
     JOIN user_roles ur ON ur.user_id = u.id
     JOIN roles r ON r.id = ur.role_id
     WHERE r.slug = 'super_admin' AND u.deleted_at IS NULL LIMIT 1`
  );

  if (adminCheck.rows.length === 0) {
    const passHash = await hashPassword(env.DEV_ADMIN_PASSWORD);
    await db.transaction(async (tx) => {
      const userRes = await tx.query<{ id: string }>(
        `INSERT INTO users (email, password_hash, full_name, status, locale)
         VALUES ($1, $2, 'Beticrom Super Admin', 'active', 'EN')
         ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, status = 'active'
         RETURNING id`,
        [env.DEV_ADMIN_EMAIL.toLowerCase(), passHash]
      );
      const roleRes = await tx.query<{ id: string }>("SELECT id FROM roles WHERE slug = 'super_admin' LIMIT 1");
      if (roleRes.rows[0]) {
        await tx.query(
          `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [userRes.rows[0].id, roleRes.rows[0].id]
        );
      }
    });
  }

  // Dev-only baseline coupon (matches storefront BETICROM500)
  await db.query(
    `INSERT INTO coupons (code, description, discount_type, discount_value, min_purchase_amount, usage_limit_per_customer, is_active)
     VALUES ('BETICROM500', 'Welcome ¥500 discount coupon', 'fixed', 500, 1500, 5, TRUE)
     ON CONFLICT (code) DO NOTHING`
  );

  // Dev-only baseline CMS announcement & homepage sections if empty
  const annCount = await db.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM cms_announcements");
  if (Number(annCount.rows[0]?.count || 0) === 0) {
    await db.query(
      `INSERT INTO cms_announcements (badge_text, badge_i18n, message, message_i18n, bg_color, text_color, status, sort_order)
       VALUES (
         'Japan-wide',
         '{"JA":"全国配送","EN":"Japan-wide","BN":"দেশব্যাপী ডেলিভারি"}'::jsonb,
         'Free dry shipping on orders over ¥6,500 · Yamato Cool TA-Q-BIN available',
         '{"JA":"常温品 ¥6,500以上で送料無料 · ヤマトクール便（冷凍・冷蔵）対応","EN":"Free dry shipping on orders over ¥6,500 · Yamato Cool TA-Q-BIN available","BN":"¥৬,৫০০+ ড্রাই অর্ডারে ফ্রি ডেলিভারি · ইয়ামাতো কুল ও ফ্রোজেন ডেলিভারি"}'::jsonb,
         '#12633D', '#FFFFFF', 'published', 1
       )`
    );
  }

  // Dev-only default supplier
  await db.query(
    `INSERT INTO suppliers (code, name, contact_name, email, country, payment_terms, lead_time_days)
     VALUES ('SUP-TYO-01', 'Beticrom Direct Imports', 'Supply Desk', 'supply@beticrom.jp', 'Japan', 'Net 30', 5)
     ON CONFLICT (code) DO NOTHING`
  );
}
