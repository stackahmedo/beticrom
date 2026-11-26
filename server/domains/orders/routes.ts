import { Hono } from "hono";
import { z } from "zod";
import { getDb } from "../../db/client.js";
import { requireAdminAuth } from "../../middleware/auth.js";
import { isVendorScoped, requirePermission } from "../../middleware/rbac.js";
import { getPagination, parseJsonBody, recordAuditLog } from "../../middleware/validate.js";
import { canTransitionOrder, type OrderStatus } from "./stateMachine.js";
import { createAdminNotification } from "../notifications/service.js";

const orderRoutes = new Hono();
orderRoutes.use("*", requireAdminAuth);

orderRoutes.get("/summary", requirePermission("orders.read"), async (c) => {
  const db = await getDb();
  const vendorCond = isVendorScoped(c) ? "WHERE vendor_id = $1" : "";
  const params = isVendorScoped(c) ? [c.get("authUser").vendorId] : [];
  const res = await db.query(
    `SELECT
       COUNT(*)::int AS total_orders,
       COUNT(*) FILTER (WHERE status = 'pending')::int AS awaiting_confirmation,
       COUNT(*) FILTER (WHERE status IN ('confirmed', 'processing', 'packed'))::int AS to_fulfill,
       COUNT(*) FILTER (WHERE status = 'pending' AND created_at < NOW() - INTERVAL '24 hours')::int AS overdue_pending
     FROM orders ${vendorCond}`,
    params
  );
  return c.json({ data: res.rows[0] });
});

orderRoutes.post("/bulk-transition", requirePermission("orders.update", "orders.fulfill"), async (c) => {
  const parsed = await parseJsonBody(
    c,
    z.object({
      ids: z.array(z.string().uuid()).min(1),
      toStatus: z.enum(["confirmed", "processing", "packed", "cancelled"]),
    })
  );
  if ("error" in parsed) return parsed.error;
  const actor = c.get("authUser");
  const db = await getDb();
  let updatedCount = 0;

  await db.transaction(async (tx) => {
    for (const id of parsed.data.ids) {
      const oRes = await tx.query<{ id: string; status: OrderStatus; vendor_id: string | null }>(
        "SELECT id, status, vendor_id FROM orders WHERE id = $1 FOR UPDATE",
        [id]
      );
      const order = oRes.rows[0];
      if (!order || !canTransitionOrder(order.status, parsed.data.toStatus)) continue;
      if (isVendorScoped(c) && order.vendor_id !== actor.vendorId) continue;

      if (parsed.data.toStatus === "cancelled") {
        await tx.query("SELECT release_inventory_reservation($1, 'Bulk cancelled by admin', $2)", [id, actor.id]);
      }
      await tx.query("UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2", [parsed.data.toStatus, id]);
      await tx.query(
        `INSERT INTO order_status_history (order_id, from_status, to_status, field_changed, reason, actor_user_id, actor_label)
         VALUES ($1, $2, $3, 'status', 'Bulk status update', $4, $5)`,
        [id, order.status, parsed.data.toStatus, actor.id, actor.email]
      );
      updatedCount++;
    }
  });

  return c.json({ data: { updatedCount } });
});

orderRoutes.get("/", requirePermission("orders.read"), async (c) => {
  const { page, limit, offset, search } = getPagination(c);
  const status = c.req.query("status");
  const paymentStatus = c.req.query("paymentStatus");
  const db = await getDb();

  const conds: string[] = [];
  const params: unknown[] = [];

  if (isVendorScoped(c)) {
    params.push(c.get("authUser").vendorId);
    conds.push(`o.vendor_id = $${params.length}`);
  }
  if (status && status !== "all") {
    params.push(status);
    conds.push(`o.status = $${params.length}`);
  }
  if (paymentStatus && paymentStatus !== "all") {
    params.push(paymentStatus);
    conds.push(`o.payment_status = $${params.length}`);
  }
  if (search) {
    params.push(`%${search.toLowerCase()}%`);
    conds.push(
      `(LOWER(o.order_number) LIKE $${params.length} OR LOWER(COALESCE(o.invoice_number,'')) LIKE $${params.length} OR LOWER(o.customer_name) LIKE $${params.length} OR LOWER(o.customer_email) LIKE $${params.length})`
    );
  }
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";

  const countRes = await db.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM orders o ${where}`, params);
  const total = Number(countRes.rows[0]?.count || 0);

  const rowsRes = await db.query(
    `SELECT o.*,
            COALESCE((SELECT SUM(oi.quantity)::int FROM order_items oi WHERE oi.order_id = o.id), 0) AS items_count,
            s.tracking_number,
            s.courier_name,
            u.full_name AS assigned_admin_name
     FROM orders o
     LEFT JOIN LATERAL (
       SELECT tracking_number, courier_name FROM shipments WHERE order_id = o.id ORDER BY created_at DESC LIMIT 1
     ) s ON TRUE
     LEFT JOIN users u ON u.id = o.assigned_admin_id
     ${where}
     ORDER BY o.created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  return c.json({
    data: rowsRes.rows,
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  });
});

orderRoutes.get("/invoices", requirePermission("invoices.read", "orders.read"), async (c) => {
  const { page, limit, offset, search } = getPagination(c);
  const db = await getDb();
  const where = search
    ? "WHERE LOWER(i.invoice_number) LIKE $1 OR LOWER(o.order_number) LIKE $1 OR LOWER(o.customer_name) LIKE $1"
    : "";
  const params = search ? [`%${search.toLowerCase()}%`] : [];

  const countRes = await db.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM invoices i JOIN orders o ON o.id = i.order_id ${where}`,
    params
  );
  const total = Number(countRes.rows[0]?.count || 0);

  const rowsRes = await db.query(
    `SELECT i.*, o.order_number, o.customer_name, o.customer_email, o.payment_status, o.status AS order_status
     FROM invoices i
     JOIN orders o ON o.id = i.order_id
     ${where}
     ORDER BY i.issued_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  return c.json({
    data: rowsRes.rows,
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  });
});

orderRoutes.get("/:id", requirePermission("orders.read"), async (c) => {
  const id = c.req.param("id");
  const db = await getDb();

  const oRes = await db.query<Record<string, unknown>>(
    `SELECT o.*, u.full_name AS assigned_admin_name
     FROM orders o
     LEFT JOIN users u ON u.id = o.assigned_admin_id
     WHERE o.id = $1`,
    [id]
  );
  const order = oRes.rows[0];
  if (!order) return c.json({ error: { code: "NOT_FOUND", message: "Order not found" } }, 404);
  if (isVendorScoped(c) && order.vendor_id !== c.get("authUser").vendorId) {
    return c.json({ error: { code: "FORBIDDEN", message: "Access denied" } }, 403);
  }

  const [items, history, notes, payments, shipments, returns, refunds, invoice] = await Promise.all([
    db.query("SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at", [id]),
    db.query("SELECT * FROM order_status_history WHERE order_id = $1 ORDER BY created_at DESC", [id]),
    db.query(
      `SELECT n.*, u.full_name AS author_name FROM order_notes n
       LEFT JOIN users u ON u.id = n.author_user_id
       WHERE n.order_id = $1 ORDER BY n.created_at DESC`,
      [id]
    ),
    db.query("SELECT * FROM payment_transactions WHERE order_id = $1 ORDER BY created_at DESC", [id]),
    db.query("SELECT * FROM shipments WHERE order_id = $1 ORDER BY created_at DESC", [id]),
    db.query("SELECT * FROM returns WHERE order_id = $1 ORDER BY created_at DESC", [id]),
    db.query("SELECT * FROM refunds WHERE order_id = $1 ORDER BY created_at DESC", [id]),
    db.query("SELECT * FROM invoices WHERE order_id = $1 ORDER BY issued_at DESC LIMIT 1", [id]),
  ]);

  return c.json({
    data: {
      ...order,
      items: items.rows,
      statusHistory: history.rows,
      notes: notes.rows,
      payments: payments.rows,
      shipments: shipments.rows,
      returns: returns.rows,
      refunds: refunds.rows,
      invoice: invoice.rows[0] || null,
    },
  });
});

const statusTransitionSchema = z.object({
  toStatus: z.enum([
    "pending",
    "confirmed",
    "processing",
    "packed",
    "shipped",
    "out_for_delivery",
    "delivered",
    "completed",
    "cancelled",
    "delivery_failed",
    "returned",
  ]),
  reason: z.string().max(300).optional(),
  courierId: z.string().uuid().optional(),
  courierName: z.string().optional(),
  trackingNumber: z.string().optional(),
});

orderRoutes.post("/:id/transition", requirePermission("orders.update", "orders.fulfill"), async (c) => {
  const id = c.req.param("id");
  const parsed = await parseJsonBody(c, statusTransitionSchema);
  if ("error" in parsed) return parsed.error;
  const { toStatus, reason, courierId, courierName, trackingNumber } = parsed.data;
  const actor = c.get("authUser");
  const db = await getDb();

  try {
    const updated = await db.transaction(async (tx) => {
      const oRes = await tx.query<{
        id: string;
        order_number: string;
        status: OrderStatus;
        fulfillment_status: string;
        vendor_id: string | null;
      }>("SELECT * FROM orders WHERE id = $1 FOR UPDATE", [id]);
      const order = oRes.rows[0];
      if (!order) throw new Error("NOT_FOUND");
      if (isVendorScoped(c) && order.vendor_id !== actor.vendorId) throw new Error("FORBIDDEN");

      if (!canTransitionOrder(order.status, toStatus)) {
        throw new Error(`Invalid order state transition: ${order.status} -> ${toStatus}`);
      }

      let nextFulfillment = order.fulfillment_status;
      if (toStatus === "packed") nextFulfillment = "packed";
      if (toStatus === "shipped") nextFulfillment = "shipped";
      if (toStatus === "out_for_delivery") nextFulfillment = "out_for_delivery";
      if (toStatus === "delivered" || toStatus === "completed") nextFulfillment = "delivered";
      if (toStatus === "delivery_failed") nextFulfillment = "delivery_failed";
      if (toStatus === "returned") nextFulfillment = "returned";

      // Inventory side-effects inside same transaction
      if (toStatus === "cancelled") {
        await tx.query("SELECT release_inventory_reservation($1, $2, $3)", [
          id,
          reason || "Order cancelled by admin",
          actor.id,
        ]);
      } else if (toStatus === "shipped" && order.status !== "delivery_failed") {
        await tx.query("SELECT deduct_fulfilled_inventory($1, $2)", [id, actor.id]);
        await tx.query("UPDATE order_items SET fulfilled_qty = quantity WHERE order_id = $1", [id]);
      }

      const updRes = await tx.query(
        `UPDATE orders SET
          status = $1,
          fulfillment_status = $2,
          confirmed_at = CASE WHEN $1 = 'confirmed' AND confirmed_at IS NULL THEN NOW() ELSE confirmed_at END,
          shipped_at = CASE WHEN $1 = 'shipped' AND shipped_at IS NULL THEN NOW() ELSE shipped_at END,
          delivered_at = CASE WHEN $1 = 'delivered' AND delivered_at IS NULL THEN NOW() ELSE delivered_at END,
          completed_at = CASE WHEN $1 = 'completed' AND completed_at IS NULL THEN NOW() ELSE completed_at END,
          cancelled_at = CASE WHEN $1 = 'cancelled' AND cancelled_at IS NULL THEN NOW() ELSE cancelled_at END,
          cancellation_reason = CASE WHEN $1 = 'cancelled' THEN COALESCE($3, cancellation_reason) ELSE cancellation_reason END,
          updated_at = NOW()
         WHERE id = $4 RETURNING *`,
        [toStatus, nextFulfillment, reason || null, id]
      );

      await tx.query(
        `INSERT INTO order_status_history (order_id, from_status, to_status, field_changed, reason, actor_user_id, actor_label)
         VALUES ($1, $2, $3, 'status', $4, $5, $6)`,
        [id, order.status, toStatus, reason || null, actor.id, actor.email]
      );

      if (toStatus === "shipped" || trackingNumber || courierId) {
        const shipNum = `SHP-${order.order_number}-${String(Date.now()).slice(-4)}`;
        await tx.query(
          `INSERT INTO shipments (shipment_number, order_id, courier_id, courier_name, tracking_number, status, shipped_at, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, CASE WHEN $6 = 'shipped' THEN NOW() ELSE NULL END, $7)`,
          [
            shipNum,
            id,
            courierId || null,
            courierName || "Yamato Transport",
            trackingNumber || null,
            toStatus === "shipped" ? "shipped" : "packed",
            actor.id,
          ]
        );
      }

      return { before: order.status, after: updRes.rows[0] };
    });

    if (toStatus === "delivery_failed") {
      await createAdminNotification({
        eventType: "delivery_failed",
        severity: "error",
        title: "Delivery failed",
        message: `Order ${updated.after.order_number} reported delivery failure.`,
        entityType: "order",
        entityId: id,
        actionUrl: `/admin/orders/${id}`,
        requiredPermission: "orders.read",
      });
    }

    await recordAuditLog({
      actorUserId: actor.id,
      actorEmail: actor.email,
      action: "order.status_changed",
      entityType: "order",
      entityId: id,
      beforeData: { status: updated.before },
      afterData: { status: toStatus, reason },
    });

    return c.json({ data: updated.after });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Transition failed";
    if (msg === "NOT_FOUND") return c.json({ error: { code: "NOT_FOUND", message: "Order not found" } }, 404);
    if (msg === "FORBIDDEN") return c.json({ error: { code: "FORBIDDEN", message: "Access denied" } }, 403);
    return c.json({ error: { code: "INVALID_TRANSITION", message: msg } }, 400);
  }
});

orderRoutes.post("/:id/notes", requirePermission("orders.update"), async (c) => {
  const parsed = await parseJsonBody(
    c,
    z.object({ note: z.string().min(1).max(2000), isCustomerVisible: z.boolean().default(false) })
  );
  if ("error" in parsed) return parsed.error;
  const actor = c.get("authUser");
  const db = await getDb();
  const res = await db.query(
    `INSERT INTO order_notes (order_id, author_user_id, is_customer_visible, note)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [c.req.param("id"), actor.id, parsed.data.isCustomerVisible, parsed.data.note]
  );
  return c.json({ data: res.rows[0] }, 201);
});

orderRoutes.patch("/:id/assign", requirePermission("orders.update"), async (c) => {
  const parsed = await parseJsonBody(c, z.object({ adminUserId: z.string().uuid().nullable() }));
  if ("error" in parsed) return parsed.error;
  const db = await getDb();
  const res = await db.query("UPDATE orders SET assigned_admin_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *", [
    parsed.data.adminUserId,
    c.req.param("id"),
  ]);
  return c.json({ data: res.rows[0] });
});

export default orderRoutes;
