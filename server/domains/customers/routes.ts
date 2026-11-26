import { Hono } from "hono";
import { z } from "zod";
import { getDb } from "../../db/client.js";
import { requireAdminAuth } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/rbac.js";
import { getPagination, parseJsonBody, recordAuditLog } from "../../middleware/validate.js";

const customerRoutes = new Hono();
customerRoutes.use("*", requireAdminAuth);

customerRoutes.get("/groups", requirePermission("customers.read"), async (c) => {
  const db = await getDb();
  const res = await db.query(
    `SELECT cg.*, (SELECT COUNT(*)::int FROM customers cu WHERE cu.customer_group_id = cg.id AND cu.deleted_at IS NULL) AS member_count
     FROM customer_groups cg ORDER BY cg.is_default DESC, cg.name ASC`
  );
  return c.json({ data: res.rows });
});

customerRoutes.post("/groups", requirePermission("customers.write"), async (c) => {
  const parsed = await parseJsonBody(
    c,
    z.object({
      slug: z.string().min(2),
      name: z.string().min(2),
      description: z.string().optional(),
      discountPercent: z.coerce.number().min(0).max(100).default(0),
    })
  );
  if ("error" in parsed) return parsed.error;
  const d = parsed.data;
  const db = await getDb();
  const res = await db.query(
    `INSERT INTO customer_groups (slug, name, description, discount_percent) VALUES ($1, $2, $3, $4) RETURNING *`,
    [d.slug.toLowerCase(), d.name, d.description ?? null, d.discountPercent]
  );
  return c.json({ data: res.rows[0] }, 201);
});

customerRoutes.get("/", requirePermission("customers.read"), async (c) => {
  const { page, limit, offset, search } = getPagination(c);
  const groupId = c.req.query("groupId");
  const status = c.req.query("status");
  const db = await getDb();

  const conds = ["c.deleted_at IS NULL"];
  const params: unknown[] = [];
  if (search) {
    params.push(`%${search.toLowerCase()}%`);
    conds.push(
      `(LOWER(c.full_name) LIKE $${params.length} OR LOWER(c.email) LIKE $${params.length} OR LOWER(c.customer_code) LIKE $${params.length})`
    );
  }
  if (groupId && groupId !== "all") {
    params.push(groupId);
    conds.push(`c.customer_group_id = $${params.length}`);
  }
  if (status && status !== "all") {
    params.push(status);
    conds.push(`c.status = $${params.length}`);
  }
  const where = `WHERE ${conds.join(" AND ")}`;

  const countRes = await db.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM customers c ${where}`, params);
  const total = Number(countRes.rows[0]?.count || 0);

  const rowsRes = await db.query(
    `SELECT c.*, cg.name AS group_name
     FROM customers c
     LEFT JOIN customer_groups cg ON cg.id = c.customer_group_id
     ${where}
     ORDER BY c.created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  return c.json({
    data: rowsRes.rows,
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  });
});

customerRoutes.get("/:id", requirePermission("customers.read"), async (c) => {
  const id = c.req.param("id");
  const db = await getDb();
  const cRes = await db.query(
    `SELECT c.*, cg.name AS group_name FROM customers c LEFT JOIN customer_groups cg ON cg.id = c.customer_group_id WHERE c.id = $1`,
    [id]
  );
  if (!cRes.rows[0]) return c.json({ error: { code: "NOT_FOUND", message: "Customer not found" } }, 404);

  const [addresses, orders, returns] = await Promise.all([
    db.query("SELECT * FROM customer_addresses WHERE customer_id = $1 ORDER BY is_default_shipping DESC", [id]),
    db.query("SELECT id, order_number, status, payment_status, total_amount, created_at FROM orders WHERE customer_id = $1 ORDER BY created_at DESC", [id]),
    db.query("SELECT id, return_number, status, approved_refund_amount, created_at FROM returns WHERE customer_id = $1 ORDER BY created_at DESC", [id]),
  ]);

  return c.json({
    data: { ...cRes.rows[0], addresses: addresses.rows, orders: orders.rows, returns: returns.rows },
  });
});

customerRoutes.patch("/:id", requirePermission("customers.write"), async (c) => {
  const parsed = await parseJsonBody(
    c,
    z.object({
      fullName: z.string().min(2).optional(),
      phone: z.string().nullable().optional(),
      customerGroupId: z.string().uuid().nullable().optional(),
      status: z.enum(["active", "inactive", "blocked"]).optional(),
      internalNotes: z.string().nullable().optional(),
    })
  );
  if ("error" in parsed) return parsed.error;
  const d = parsed.data;
  const db = await getDb();
  const res = await db.query(
    `UPDATE customers SET
      full_name = COALESCE($1, full_name),
      phone = COALESCE($2, phone),
      customer_group_id = COALESCE($3, customer_group_id),
      status = COALESCE($4, status),
      internal_notes = COALESCE($5, internal_notes),
      updated_at = NOW()
     WHERE id = $6 RETURNING *`,
    [d.fullName ?? null, d.phone ?? null, d.customerGroupId ?? null, d.status ?? null, d.internalNotes ?? null, c.req.param("id")]
  );
  return c.json({ data: res.rows[0] });
});

// GDPR Personal Data Export
customerRoutes.get("/:id/gdpr-export", requirePermission("customers.read"), async (c) => {
  const id = c.req.param("id");
  const db = await getDb();
  const [customer, addresses, orders] = await Promise.all([
    db.query("SELECT * FROM customers WHERE id = $1", [id]),
    db.query("SELECT * FROM customer_addresses WHERE customer_id = $1", [id]),
    db.query("SELECT order_number, status, total_amount, shipping_address, created_at FROM orders WHERE customer_id = $1", [id]),
  ]);
  return c.json({ data: { exportedAt: new Date().toISOString(), customer: customer.rows[0], addresses: addresses.rows, orders: orders.rows } });
});

// GDPR Anonymize / Delete Workflow (preserves financial order ledger integrity)
customerRoutes.post("/:id/gdpr-anonymize", requirePermission("customers.write"), async (c) => {
  const id = c.req.param("id");
  const actor = c.get("authUser");
  const db = await getDb();

  await db.transaction(async (tx) => {
    await tx.query(
      `UPDATE customers SET
        full_name = 'Anonymized Customer',
        name_kana = NULL,
        email = $1,
        phone = NULL,
        status = 'anonymized',
        deleted_at = NOW(),
        updated_at = NOW()
       WHERE id = $2`,
      [`anonymized-${id}@redacted.local`, id]
    );
    await tx.query("DELETE FROM customer_addresses WHERE customer_id = $1", [id]);
  });

  await recordAuditLog({
    actorUserId: actor.id,
    actorEmail: actor.email,
    action: "customer.gdpr_anonymized",
    entityType: "customer",
    entityId: id,
  });

  return c.json({ data: { anonymized: true } });
});

export default customerRoutes;
