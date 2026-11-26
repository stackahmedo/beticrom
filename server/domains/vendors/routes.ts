import { Hono } from "hono";
import { z } from "zod";
import { getDb } from "../../db/client.js";
import { requireAdminAuth } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/rbac.js";
import { getPagination, parseJsonBody, recordAuditLog } from "../../middleware/validate.js";

const vendorRoutes = new Hono();
vendorRoutes.use("*", requireAdminAuth);

vendorRoutes.get("/", requirePermission("vendors.read"), async (c) => {
  const { page, limit, offset, search } = getPagination(c);
  const status = c.req.query("status");
  const db = await getDb();

  const conds = ["v.deleted_at IS NULL"];
  const params: unknown[] = [];
  if (status && status !== "all") {
    params.push(status);
    conds.push(`v.status = $${params.length}`);
  }
  if (search) {
    params.push(`%${search.toLowerCase()}%`);
    conds.push(`(LOWER(v.business_name) LIKE $${params.length} OR LOWER(v.email) LIKE $${params.length})`);
  }
  const where = `WHERE ${conds.join(" AND ")}`;

  const countRes = await db.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM vendors v ${where}`, params);
  const total = Number(countRes.rows[0]?.count || 0);

  const rowsRes = await db.query(
    `SELECT v.*,
            (SELECT COUNT(*)::int FROM products p WHERE p.vendor_id = v.id AND p.deleted_at IS NULL) AS product_count,
            COALESCE((SELECT SUM(oi.line_total) FROM order_items oi WHERE oi.vendor_id = v.id), 0) AS total_sales,
            COALESCE((SELECT SUM(oi.commission_amount) FROM order_items oi WHERE oi.vendor_id = v.id), 0) AS total_commission
     FROM vendors v
     ${where}
     ORDER BY v.created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  return c.json({
    data: rowsRes.rows,
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  });
});

vendorRoutes.post("/", requirePermission("vendors.manage"), async (c) => {
  const parsed = await parseJsonBody(
    c,
    z.object({
      businessName: z.string().min(2),
      slug: z.string().min(2),
      email: z.string().email(),
      phone: z.string().optional(),
      commissionRate: z.coerce.number().min(0).max(100).default(10),
      status: z.enum(["pending", "active", "inactive", "suspended"]).default("active"),
      ownerUserId: z.string().uuid().nullable().optional(),
    })
  );
  if ("error" in parsed) return parsed.error;
  const d = parsed.data;
  const db = await getDb();
  const res = await db.query(
    `INSERT INTO vendors (business_name, slug, email, phone, commission_rate, status, verification_status, owner_user_id)
     VALUES ($1, $2, $3, $4, $5, $6, 'verified', $7) RETURNING *`,
    [d.businessName, d.slug.toLowerCase(), d.email, d.phone ?? null, d.commissionRate, d.status, d.ownerUserId ?? null]
  );
  return c.json({ data: res.rows[0] }, 201);
});

vendorRoutes.patch("/:id", requirePermission("vendors.manage"), async (c) => {
  const parsed = await parseJsonBody(
    c,
    z.object({
      status: z.enum(["pending", "active", "inactive", "suspended", "rejected"]).optional(),
      verificationStatus: z.enum(["unverified", "under_review", "verified", "rejected"]).optional(),
      commissionRate: z.coerce.number().min(0).max(100).optional(),
    })
  );
  if ("error" in parsed) return parsed.error;
  const d = parsed.data;
  const db = await getDb();
  const res = await db.query(
    `UPDATE vendors SET
      status = COALESCE($1, status),
      verification_status = COALESCE($2, verification_status),
      commission_rate = COALESCE($3, commission_rate),
      updated_at = NOW()
     WHERE id = $4 RETURNING *`,
    [d.status ?? null, d.verificationStatus ?? null, d.commissionRate ?? null, c.req.param("id")]
  );
  return c.json({ data: res.rows[0] });
});

vendorRoutes.get("/applications", requirePermission("vendors.read"), async (c) => {
  const db = await getDb();
  const res = await db.query("SELECT * FROM vendor_applications ORDER BY created_at DESC");
  return c.json({ data: res.rows });
});

vendorRoutes.post("/applications/:id/decision", requirePermission("vendors.manage"), async (c) => {
  const parsed = await parseJsonBody(
    c,
    z.object({
      decision: z.enum(["approved", "rejected"]),
      reviewNotes: z.string().optional(),
      commissionRate: z.coerce.number().min(0).max(100).default(10),
    })
  );
  if ("error" in parsed) return parsed.error;
  const actor = c.get("authUser");
  const id = c.req.param("id");
  const db = await getDb();

  const result = await db.transaction(async (tx) => {
    const appRes = await tx.query<{
      id: string;
      business_name: string;
      email: string;
      phone: string | null;
      applicant_user_id: string | null;
    }>("SELECT * FROM vendor_applications WHERE id = $1 FOR UPDATE", [id]);
    const app = appRes.rows[0];
    if (!app) throw new Error("Application not found");

    let vendorId: string | null = null;
    if (parsed.data.decision === "approved") {
      const slug = `${app.business_name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${String(Date.now()).slice(-4)}`;
      const vRes = await tx.query<{ id: string }>(
        `INSERT INTO vendors (owner_user_id, slug, business_name, email, phone, commission_rate, status, verification_status)
         VALUES ($1, $2, $3, $4, $5, $6, 'active', 'verified') RETURNING id`,
        [app.applicant_user_id, slug, app.business_name, app.email, app.phone, parsed.data.commissionRate]
      );
      vendorId = vRes.rows[0].id;
    }

    const upd = await tx.query(
      `UPDATE vendor_applications SET
        status = $1, review_notes = $2, reviewed_by = $3, reviewed_at = NOW(), vendor_id = COALESCE($4, vendor_id), updated_at = NOW()
       WHERE id = $5 RETURNING *`,
      [parsed.data.decision, parsed.data.reviewNotes ?? null, actor.id, vendorId, id]
    );
    return upd.rows[0];
  });

  await recordAuditLog({
    actorUserId: actor.id,
    actorEmail: actor.email,
    action: `vendor_application.${parsed.data.decision}`,
    entityType: "vendor_application",
    entityId: id,
  });

  return c.json({ data: result });
});

vendorRoutes.get("/payouts", requirePermission("vendors.read"), async (c) => {
  const db = await getDb();
  const res = await db.query(
    `SELECT vp.*, v.business_name FROM vendor_payouts vp JOIN vendors v ON v.id = vp.vendor_id ORDER BY vp.created_at DESC`
  );
  return c.json({ data: res.rows });
});

vendorRoutes.post("/payouts", requirePermission("vendors.manage"), async (c) => {
  const parsed = await parseJsonBody(
    c,
    z.object({
      vendorId: z.string().uuid(),
      periodStart: z.string(),
      periodEnd: z.string(),
      grossAmount: z.coerce.number().min(0),
      commissionAmount: z.coerce.number().min(0),
      notes: z.string().optional(),
    })
  );
  if ("error" in parsed) return parsed.error;
  const d = parsed.data;
  const actor = c.get("authUser");
  const db = await getDb();
  const payoutNum = `PAY-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
  const netAmount = Math.max(0, d.grossAmount - d.commissionAmount);
  const res = await db.query(
    `INSERT INTO vendor_payouts (vendor_id, payout_number, period_start, period_end, gross_amount, commission_amount, net_amount, status, paid_at, processed_by, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'paid', NOW(), $8, $9) RETURNING *`,
    [d.vendorId, payoutNum, d.periodStart, d.periodEnd, d.grossAmount, d.commissionAmount, netAmount, actor.id, d.notes ?? null]
  );
  return c.json({ data: res.rows[0] }, 201);
});

export default vendorRoutes;
