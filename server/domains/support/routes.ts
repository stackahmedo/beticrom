import { Hono } from "hono";
import { z } from "zod";
import { getDb } from "../../db/client.js";
import { requireAdminAuth } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/rbac.js";
import { getPagination, parseJsonBody } from "../../middleware/validate.js";

const supportRoutes = new Hono();
supportRoutes.use("*", requireAdminAuth);

// ─── Contact Messages ─────────────────────────────────────────────────────────
supportRoutes.get("/contact-messages", requirePermission("support.read"), async (c) => {
  const { page, limit, offset } = getPagination(c);
  const status = c.req.query("status");
  const db = await getDb();
  const where = status && status !== "all" ? "WHERE status = $1" : "";
  const params = status && status !== "all" ? [status] : [];
  const countRes = await db.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM contact_messages ${where}`, params);
  const total = Number(countRes.rows[0]?.count || 0);
  const res = await db.query(
    `SELECT * FROM contact_messages ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  return c.json({ data: res.rows, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });
});

supportRoutes.patch("/contact-messages/:id", requirePermission("support.manage"), async (c) => {
  const parsed = await parseJsonBody(
    c,
    z.object({
      status: z.enum(["new", "in_progress", "replied", "archived", "spam"]).optional(),
      priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
      internalNotes: z.string().optional(),
    })
  );
  if ("error" in parsed) return parsed.error;
  const d = parsed.data;
  const db = await getDb();
  const res = await db.query(
    `UPDATE contact_messages SET
      status = COALESCE($1, status),
      priority = COALESCE($2, priority),
      internal_notes = COALESCE($3, internal_notes),
      replied_at = CASE WHEN $1 = 'replied' THEN NOW() ELSE replied_at END,
      updated_at = NOW()
     WHERE id = $4 RETURNING *`,
    [d.status ?? null, d.priority ?? null, d.internalNotes ?? null, c.req.param("id")]
  );
  return c.json({ data: res.rows[0] });
});

// ─── Support Tickets ──────────────────────────────────────────────────────────
supportRoutes.get("/tickets", requirePermission("support.read"), async (c) => {
  const { page, limit, offset } = getPagination(c);
  const status = c.req.query("status");
  const db = await getDb();
  const where = status && status !== "all" ? "WHERE t.status = $1" : "";
  const params = status && status !== "all" ? [status] : [];
  const countRes = await db.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM support_tickets t ${where}`, params);
  const total = Number(countRes.rows[0]?.count || 0);
  const res = await db.query(
    `SELECT t.*, u.full_name AS assigned_name
     FROM support_tickets t LEFT JOIN users u ON u.id = t.assigned_to
     ${where} ORDER BY t.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  return c.json({ data: res.rows, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });
});

supportRoutes.post("/tickets", requirePermission("support.manage"), async (c) => {
  const parsed = await parseJsonBody(
    c,
    z.object({
      requesterName: z.string().min(1),
      requesterEmail: z.string().email(),
      subject: z.string().min(2),
      category: z.string().default("general"),
      priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
      body: z.string().min(1),
    })
  );
  if ("error" in parsed) return parsed.error;
  const d = parsed.data;
  const actor = c.get("authUser");
  const db = await getDb();
  const ticketNumber = `TKT-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

  const ticket = await db.transaction(async (tx) => {
    const tRes = await tx.query<{ id: string }>(
      `INSERT INTO support_tickets (ticket_number, requester_name, requester_email, subject, category, priority, assigned_to)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [ticketNumber, d.requesterName, d.requesterEmail, d.subject, d.category, d.priority, actor.id]
    );
    await tx.query(
      `INSERT INTO support_ticket_messages (ticket_id, sender_type, sender_user_id, sender_name, body)
       VALUES ($1, 'admin', $2, $3, $4)`,
      [tRes.rows[0].id, actor.id, actor.fullName, d.body]
    );
    return tRes.rows[0];
  });

  return c.json({ data: ticket }, 201);
});

supportRoutes.get("/tickets/:id", requirePermission("support.read"), async (c) => {
  const id = c.req.param("id");
  const db = await getDb();
  const tRes = await db.query("SELECT * FROM support_tickets WHERE id = $1", [id]);
  if (!tRes.rows[0]) return c.json({ error: { code: "NOT_FOUND", message: "Ticket not found" } }, 404);
  const msgs = await db.query("SELECT * FROM support_ticket_messages WHERE ticket_id = $1 ORDER BY created_at ASC", [id]);
  return c.json({ data: { ...tRes.rows[0], messages: msgs.rows } });
});

supportRoutes.post("/tickets/:id/messages", requirePermission("support.manage"), async (c) => {
  const parsed = await parseJsonBody(
    c,
    z.object({ body: z.string().min(1), isInternalNote: z.boolean().default(false), status: z.string().optional() })
  );
  if ("error" in parsed) return parsed.error;
  const actor = c.get("authUser");
  const id = c.req.param("id");
  const db = await getDb();

  const msg = await db.transaction(async (tx) => {
    const mRes = await tx.query(
      `INSERT INTO support_ticket_messages (ticket_id, sender_type, sender_user_id, sender_name, is_internal_note, body)
       VALUES ($1, 'admin', $2, $3, $4, $5) RETURNING *`,
      [id, actor.id, actor.fullName, parsed.data.isInternalNote, parsed.data.body]
    );
    if (parsed.data.status) {
      await tx.query("UPDATE support_tickets SET status = $1, updated_at = NOW() WHERE id = $2", [parsed.data.status, id]);
    }
    return mRes.rows[0];
  });

  return c.json({ data: msg }, 201);
});

// ─── Notifications Center ─────────────────────────────────────────────────────
supportRoutes.get("/notifications", requirePermission("notifications.read"), async (c) => {
  const { page, limit, offset } = getPagination(c);
  const unreadOnly = c.req.query("unreadOnly") === "true";
  const eventType = c.req.query("eventType");
  const actor = c.get("authUser");
  const db = await getDb();

  const conds = [`(recipient_user_id IS NULL OR recipient_user_id = $1)`];
  const params: unknown[] = [actor.id];
  if (unreadOnly) conds.push("is_read = FALSE");
  if (eventType && eventType !== "all") {
    params.push(eventType);
    conds.push(`event_type = $${params.length}`);
  }
  const where = `WHERE ${conds.join(" AND ")}`;

  const [countRes, unreadRes, rowsRes] = await Promise.all([
    db.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM notifications ${where}`, params),
    db.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM notifications WHERE (recipient_user_id IS NULL OR recipient_user_id = $1) AND is_read = FALSE",
      [actor.id]
    ),
    db.query(
      `SELECT * FROM notifications ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    ),
  ]);

  const total = Number(countRes.rows[0]?.count || 0);
  return c.json({
    data: rowsRes.rows,
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)), unreadCount: Number(unreadRes.rows[0]?.count || 0) },
  });
});

supportRoutes.post("/notifications/:id/read", requirePermission("notifications.read"), async (c) => {
  const db = await getDb();
  await db.query("UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE id = $1", [c.req.param("id")]);
  return c.json({ data: { read: true } });
});

supportRoutes.post("/notifications/read-all", requirePermission("notifications.read"), async (c) => {
  const actor = c.get("authUser");
  const db = await getDb();
  await db.query(
    "UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE (recipient_user_id IS NULL OR recipient_user_id = $1) AND is_read = FALSE",
    [actor.id]
  );
  return c.json({ data: { readAll: true } });
});

export default supportRoutes;
