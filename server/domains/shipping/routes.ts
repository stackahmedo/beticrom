import { Hono } from "hono";
import { z } from "zod";
import { getDb } from "../../db/client.js";
import { requireAdminAuth } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/rbac.js";
import { getPagination, parseJsonBody } from "../../middleware/validate.js";

const shippingRoutes = new Hono();
shippingRoutes.use("*", requireAdminAuth);

// ─── Configurable Geographic Hierarchy ────────────────────────────────────────
shippingRoutes.get("/countries", requirePermission("shipping.read"), async (c) => {
  const db = await getDb();
  const res = await db.query("SELECT * FROM shipping_countries ORDER BY sort_order, name");
  return c.json({ data: res.rows });
});

shippingRoutes.post("/countries", requirePermission("shipping.write"), async (c) => {
  const parsed = await parseJsonBody(
    c,
    z.object({ code: z.string().length(2), name: z.string().min(2), currencyCode: z.string().length(3).default("JPY") })
  );
  if ("error" in parsed) return parsed.error;
  const db = await getDb();
  const res = await db.query(
    `INSERT INTO shipping_countries (code, name, currency_code) VALUES ($1, $2, $3) RETURNING *`,
    [parsed.data.code.toUpperCase(), parsed.data.name, parsed.data.currencyCode.toUpperCase()]
  );
  return c.json({ data: res.rows[0] }, 201);
});

shippingRoutes.get("/regions", requirePermission("shipping.read"), async (c) => {
  const countryId = c.req.query("countryId");
  const db = await getDb();
  const res = countryId
    ? await db.query(
        "SELECT sr.*, sc.name AS country_name FROM shipping_regions sr JOIN shipping_countries sc ON sc.id = sr.country_id WHERE sr.country_id = $1 ORDER BY sr.sort_order, sr.name",
        [countryId]
      )
    : await db.query(
        "SELECT sr.*, sc.name AS country_name FROM shipping_regions sr JOIN shipping_countries sc ON sc.id = sr.country_id ORDER BY sc.name, sr.sort_order, sr.name"
      );
  return c.json({ data: res.rows });
});

shippingRoutes.post("/regions", requirePermission("shipping.write"), async (c) => {
  const parsed = await parseJsonBody(
    c,
    z.object({
      countryId: z.string().uuid(),
      code: z.string().min(1),
      name: z.string().min(1),
      divisionType: z.string().default("region"),
    })
  );
  if ("error" in parsed) return parsed.error;
  const d = parsed.data;
  const db = await getDb();
  const res = await db.query(
    `INSERT INTO shipping_regions (country_id, code, name, division_type) VALUES ($1, $2, $3, $4) RETURNING *`,
    [d.countryId, d.code.toUpperCase(), d.name, d.divisionType]
  );
  return c.json({ data: res.rows[0] }, 201);
});

shippingRoutes.get("/cities", requirePermission("shipping.read"), async (c) => {
  const regionId = c.req.query("regionId");
  const db = await getDb();
  const res = regionId
    ? await db.query(
        "SELECT sc.*, sr.name AS region_name FROM shipping_cities sc JOIN shipping_regions sr ON sr.id = sc.region_id WHERE sc.region_id = $1 ORDER BY sc.sort_order, sc.name",
        [regionId]
      )
    : await db.query(
        "SELECT sc.*, sr.name AS region_name FROM shipping_cities sc JOIN shipping_regions sr ON sr.id = sc.region_id ORDER BY sr.name, sc.name"
      );
  return c.json({ data: res.rows });
});

shippingRoutes.post("/cities", requirePermission("shipping.write"), async (c) => {
  const parsed = await parseJsonBody(
    c,
    z.object({
      regionId: z.string().uuid(),
      name: z.string().min(1),
      postalCodePrefix: z.string().optional(),
      areaName: z.string().optional(),
      codAllowed: z.boolean().default(true),
    })
  );
  if ("error" in parsed) return parsed.error;
  const d = parsed.data;
  const db = await getDb();
  const res = await db.query(
    `INSERT INTO shipping_cities (region_id, name, postal_code_prefix, area_name, cod_allowed)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [d.regionId, d.name, d.postalCodePrefix ?? null, d.areaName ?? null, d.codAllowed]
  );
  return c.json({ data: res.rows[0] }, 201);
});

// ─── Shipping Zones & Rates ───────────────────────────────────────────────────
shippingRoutes.get("/zones", requirePermission("shipping.read"), async (c) => {
  const db = await getDb();
  const res = await db.query("SELECT * FROM shipping_zones ORDER BY sort_order, name");
  return c.json({ data: res.rows });
});

shippingRoutes.post("/zones", requirePermission("shipping.write"), async (c) => {
  const parsed = await parseJsonBody(
    c,
    z.object({
      code: z.string().min(2),
      name: z.string().min(2),
      description: z.string().optional(),
      codAllowed: z.boolean().default(true),
      estimatedMinDays: z.coerce.number().int().min(0).default(1),
      estimatedMaxDays: z.coerce.number().int().min(1).default(3),
    })
  );
  if ("error" in parsed) return parsed.error;
  const d = parsed.data;
  const db = await getDb();
  const res = await db.query(
    `INSERT INTO shipping_zones (code, name, description, cod_allowed, estimated_min_days, estimated_max_days)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [d.code.toLowerCase(), d.name, d.description ?? null, d.codAllowed, d.estimatedMinDays, d.estimatedMaxDays]
  );
  return c.json({ data: res.rows[0] }, 201);
});

shippingRoutes.get("/rates", requirePermission("shipping.read"), async (c) => {
  const db = await getDb();
  const res = await db.query(
    `SELECT sr.*, sz.name AS zone_name, sc.name AS shipping_class_name
     FROM shipping_rates sr
     JOIN shipping_zones sz ON sz.id = sr.zone_id
     LEFT JOIN shipping_classes sc ON sc.id = sr.shipping_class_id
     ORDER BY sz.name, sr.name`
  );
  return c.json({ data: res.rows });
});

shippingRoutes.post("/rates", requirePermission("shipping.write"), async (c) => {
  const parsed = await parseJsonBody(
    c,
    z.object({
      zoneId: z.string().uuid(),
      shippingClassId: z.string().uuid().nullable().optional(),
      name: z.string().min(2),
      rateType: z.enum(["flat", "weight_based", "price_based", "free_threshold"]),
      baseRate: z.coerce.number().min(0),
      perKgRate: z.coerce.number().min(0).default(0),
      freeShippingThreshold: z.coerce.number().min(0).nullable().optional(),
      coldSurcharge: z.coerce.number().min(0).default(0),
      codAllowed: z.boolean().default(true),
    })
  );
  if ("error" in parsed) return parsed.error;
  const d = parsed.data;
  const db = await getDb();
  const res = await db.query(
    `INSERT INTO shipping_rates (zone_id, shipping_class_id, name, rate_type, base_rate, per_kg_rate, free_shipping_threshold, cold_surcharge, cod_allowed)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [d.zoneId, d.shippingClassId ?? null, d.name, d.rateType, d.baseRate, d.perKgRate, d.freeShippingThreshold ?? null, d.coldSurcharge, d.codAllowed]
  );
  return c.json({ data: res.rows[0] }, 201);
});

// ─── Couriers & Shipments ─────────────────────────────────────────────────────
shippingRoutes.get("/couriers", requirePermission("shipping.read"), async (c) => {
  const db = await getDb();
  const res = await db.query("SELECT * FROM couriers ORDER BY name");
  return c.json({ data: res.rows });
});

shippingRoutes.post("/couriers", requirePermission("shipping.write"), async (c) => {
  const parsed = await parseJsonBody(
    c,
    z.object({
      code: z.string().min(2),
      name: z.string().min(2),
      trackingUrlTemplate: z.string().optional(),
      supportsCod: z.boolean().default(true),
      supportsColdChain: z.boolean().default(true),
      contactPhone: z.string().optional(),
    })
  );
  if ("error" in parsed) return parsed.error;
  const d = parsed.data;
  const db = await getDb();
  const res = await db.query(
    `INSERT INTO couriers (code, name, tracking_url_template, supports_cod, supports_cold_chain, contact_phone)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [d.code.toLowerCase(), d.name, d.trackingUrlTemplate ?? null, d.supportsCod, d.supportsColdChain, d.contactPhone ?? null]
  );
  return c.json({ data: res.rows[0] }, 201);
});

shippingRoutes.get("/shipments", requirePermission("shipping.read", "orders.read"), async (c) => {
  const { page, limit, offset } = getPagination(c);
  const db = await getDb();
  const countRes = await db.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM shipments");
  const total = Number(countRes.rows[0]?.count || 0);
  const rowsRes = await db.query(
    `SELECT s.*, o.order_number, o.customer_name
     FROM shipments s
     JOIN orders o ON o.id = s.order_id
     ORDER BY s.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return c.json({
    data: rowsRes.rows,
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  });
});

shippingRoutes.patch("/shipments/:id", requirePermission("shipping.write", "orders.fulfill"), async (c) => {
  const parsed = await parseJsonBody(
    c,
    z.object({
      status: z.enum(["pending", "packed", "label_created", "shipped", "in_transit", "out_for_delivery", "delivered", "delivery_failed", "returned"]).optional(),
      trackingNumber: z.string().optional(),
      courierName: z.string().optional(),
      failureReason: z.string().optional(),
    })
  );
  if ("error" in parsed) return parsed.error;
  const d = parsed.data;
  const db = await getDb();
  const res = await db.query(
    `UPDATE shipments SET
      status = COALESCE($1, status),
      tracking_number = COALESCE($2, tracking_number),
      courier_name = COALESCE($3, courier_name),
      failure_reason = COALESCE($4, failure_reason),
      delivered_at = CASE WHEN $1 = 'delivered' THEN NOW() ELSE delivered_at END,
      updated_at = NOW()
     WHERE id = $5 RETURNING *`,
    [d.status ?? null, d.trackingNumber ?? null, d.courierName ?? null, d.failureReason ?? null, c.req.param("id")]
  );
  return c.json({ data: res.rows[0] });
});

export default shippingRoutes;
