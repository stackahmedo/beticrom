import { Hono } from "hono";
import { z } from "zod";
import { getDb } from "../../db/client.js";
import { requireAdminAuth } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/rbac.js";
import { getPagination, parseJsonBody, recordAuditLog } from "../../middleware/validate.js";
import { canTransitionReturn, type ReturnStatus } from "../orders/stateMachine.js";

const returnRoutes = new Hono();
returnRoutes.use("*", requireAdminAuth);

returnRoutes.get("/", requirePermission("returns.read"), async (c) => {
  const { page, limit, offset } = getPagination(c);
  const status = c.req.query("status");
  const db = await getDb();

  const where = status && status !== "all" ? "WHERE r.status = $1" : "";
  const params = status && status !== "all" ? [status] : [];

  const countRes = await db.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM returns r ${where}`, params);
  const total = Number(countRes.rows[0]?.count || 0);

  const rowsRes = await db.query(
    `SELECT r.*, o.order_number, o.customer_name, o.total_amount AS order_total, o.paid_amount
     FROM returns r
     JOIN orders o ON o.id = r.order_id
     ${where}
     ORDER BY r.created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  return c.json({
    data: rowsRes.rows,
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  });
});

returnRoutes.get("/:id", requirePermission("returns.read"), async (c) => {
  const id = c.req.param("id");
  const db = await getDb();
  const rRes = await db.query(
    `SELECT r.*, o.order_number, o.customer_name, o.paid_amount, o.refunded_amount
     FROM returns r JOIN orders o ON o.id = r.order_id WHERE r.id = $1`,
    [id]
  );
  if (!rRes.rows[0]) return c.json({ error: { code: "NOT_FOUND", message: "Return not found" } }, 404);
  const items = await db.query(
    `SELECT ri.*, oi.product_name, oi.sku, oi.unit_price
     FROM return_items ri JOIN order_items oi ON oi.id = ri.order_item_id WHERE ri.return_id = $1`,
    [id]
  );
  const refunds = await db.query("SELECT * FROM refunds WHERE return_id = $1 ORDER BY created_at DESC", [id]);
  return c.json({ data: { ...rRes.rows[0], items: items.rows, refunds: refunds.rows } });
});

const createReturnSchema = z.object({
  orderId: z.string().uuid(),
  returnType: z.enum(["partial", "full"]).default("partial"),
  reason: z.string().min(3),
  customerNotes: z.string().optional(),
  evidenceImages: z.array(z.string()).default([]),
  items: z
    .array(
      z.object({
        orderItemId: z.string().uuid(),
        quantity: z.coerce.number().int().positive(),
        condition: z.enum(["unopened", "opened", "damaged", "expired", "wrong_item"]).default("unopened"),
      })
    )
    .min(1),
});

returnRoutes.post("/", requirePermission("returns.manage"), async (c) => {
  const parsed = await parseJsonBody(c, createReturnSchema);
  if ("error" in parsed) return parsed.error;
  const d = parsed.data;
  const db = await getDb();

  const created = await db.transaction(async (tx) => {
    const oRes = await tx.query<{ id: string; customer_id: string | null }>(
      "SELECT id, customer_id FROM orders WHERE id = $1",
      [d.orderId]
    );
    if (!oRes.rows[0]) throw new Error("Order not found");

    const retNumber = `RET-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    let requestedRefund = 0;

    const rRes = await tx.query<{ id: string }>(
      `INSERT INTO returns (return_number, order_id, customer_id, status, return_type, reason, customer_notes, evidence_images)
       VALUES ($1, $2, $3, 'return_requested', $4, $5, $6, $7::jsonb) RETURNING *`,
      [retNumber, d.orderId, oRes.rows[0].customer_id, d.returnType, d.reason, d.customerNotes || null, JSON.stringify(d.evidenceImages)]
    );
    const returnId = rRes.rows[0].id;

    for (const item of d.items) {
      const oiRes = await tx.query<{ variant_id: string | null; quantity: number; returned_qty: number; unit_price: string }>(
        "SELECT variant_id, quantity, returned_qty, unit_price FROM order_items WHERE id = $1 AND order_id = $2",
        [item.orderItemId, d.orderId]
      );
      const oi = oiRes.rows[0];
      if (!oi) throw new Error("Order item does not belong to order");
      if (oi.returned_qty + item.quantity > oi.quantity) {
        throw new Error("Return quantity exceeds remaining item quantity");
      }
      const lineRefund = Number(oi.unit_price) * item.quantity;
      requestedRefund += lineRefund;

      await tx.query(
        `INSERT INTO return_items (return_id, order_item_id, variant_id, quantity, condition, refund_amount)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [returnId, item.orderItemId, oi.variant_id, item.quantity, item.condition, lineRefund]
      );
    }

    const upd = await tx.query("UPDATE returns SET requested_refund_amount = $1 WHERE id = $2 RETURNING *", [
      requestedRefund,
      returnId,
    ]);
    await tx.query("UPDATE orders SET return_status = 'requested', updated_at = NOW() WHERE id = $1", [d.orderId]);
    return upd.rows[0];
  });

  return c.json({ data: created }, 201);
});

const returnTransitionSchema = z.object({
  toStatus: z.enum([
    "under_review",
    "approved",
    "rejected",
    "product_received",
    "inspected",
    "refund_or_replacement",
    "completed",
  ]),
  rejectionReason: z.string().optional(),
  inspectionResult: z.enum(["sellable", "damaged", "partial_sellable"]).optional(),
  inspectionNotes: z.string().optional(),
  restockItems: z
    .array(
      z.object({
        returnItemId: z.string().uuid(),
        isSellable: z.boolean(),
      })
    )
    .optional(),
  refundAmount: z.coerce.number().min(0).optional(),
  resolution: z.enum(["refund", "partial_refund", "replacement", "rejected"]).optional(),
});

returnRoutes.post("/:id/transition", requirePermission("returns.manage"), async (c) => {
  const id = c.req.param("id");
  const parsed = await parseJsonBody(c, returnTransitionSchema);
  if ("error" in parsed) return parsed.error;
  const d = parsed.data;
  const actor = c.get("authUser");
  const db = await getDb();

  try {
    const result = await db.transaction(async (tx) => {
      const rRes = await tx.query<{
        id: string;
        return_number: string;
        order_id: string;
        status: ReturnStatus;
        requested_refund_amount: string;
      }>("SELECT * FROM returns WHERE id = $1 FOR UPDATE", [id]);
      const ret = rRes.rows[0];
      if (!ret) throw new Error("NOT_FOUND");
      if (!canTransitionReturn(ret.status, d.toStatus)) {
        throw new Error(`Invalid return transition: ${ret.status} -> ${d.toStatus}`);
      }

      if (d.toStatus === "inspected" && d.restockItems && d.restockItems.length > 0) {
        const whRes = await tx.query<{ id: string }>("SELECT id FROM warehouses WHERE is_default = TRUE LIMIT 1");
        const warehouseId = whRes.rows[0]?.id;
        for (const item of d.restockItems) {
          const riRes = await tx.query<{ variant_id: string | null; quantity: number; restocked: boolean }>(
            "SELECT variant_id, quantity, restocked FROM return_items WHERE id = $1 AND return_id = $2 FOR UPDATE",
            [item.returnItemId, id]
          );
          const ri = riRes.rows[0];
          if (ri && !ri.restocked && ri.variant_id && warehouseId) {
            await tx.query("SELECT restock_returned_inventory($1, $2, $3, $4, $5, $6)", [
              ri.variant_id,
              warehouseId,
              id,
              ri.quantity,
              item.isSellable,
              actor.id,
            ]);
            await tx.query("UPDATE return_items SET is_sellable = $1, restocked = TRUE WHERE id = $2", [
              item.isSellable,
              item.returnItemId,
            ]);
          }
        }
      }

      if (d.toStatus === "refund_or_replacement" && d.refundAmount && d.refundAmount > 0) {
        const refNum = `REF-${ret.return_number}-${String(Date.now()).slice(-4)}`;
        // DB trigger enforce_refund_balance_limit() guarantees refund <= paid - already_refunded
        await tx.query(
          `INSERT INTO refunds (refund_number, order_id, return_id, amount, status, reason, processed_by, processed_at)
           VALUES ($1, $2, $3, $4, 'completed', $5, $6, NOW())`,
          [refNum, ret.order_id, id, d.refundAmount, `Refund for ${ret.return_number}`, actor.id]
        );
        await tx.query(
          `UPDATE orders SET
            refunded_amount = refunded_amount + $1,
            payment_status = CASE WHEN (refunded_amount + $1) >= paid_amount THEN 'refunded' ELSE 'partially_refunded' END,
            return_status = 'partially_returned',
            updated_at = NOW()
           WHERE id = $2`,
          [d.refundAmount, ret.order_id]
        );
      }

      const updRes = await tx.query(
        `UPDATE returns SET
          status = $1,
          rejection_reason = COALESCE($2, rejection_reason),
          inspection_result = COALESCE($3, inspection_result),
          inspection_notes = COALESCE($4, inspection_notes),
          resolution = COALESCE($5, resolution),
          approved_refund_amount = COALESCE($6, approved_refund_amount),
          reviewed_by = CASE WHEN $1 IN ('approved','rejected') THEN $7 ELSE reviewed_by END,
          inspected_by = CASE WHEN $1 = 'inspected' THEN $7 ELSE inspected_by END,
          updated_at = NOW()
         WHERE id = $8 RETURNING *`,
        [
          d.toStatus,
          d.rejectionReason ?? null,
          d.inspectionResult ?? null,
          d.inspectionNotes ?? null,
          d.resolution ?? null,
          d.refundAmount ?? null,
          actor.id,
          id,
        ]
      );

      return updRes.rows[0];
    });

    await recordAuditLog({
      actorUserId: actor.id,
      actorEmail: actor.email,
      action: "return.transitioned",
      entityType: "return",
      entityId: id,
      afterData: { status: d.toStatus, refundAmount: d.refundAmount },
    });

    return c.json({ data: result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Return transition failed";
    if (msg === "NOT_FOUND") return c.json({ error: { code: "NOT_FOUND", message: "Return not found" } }, 404);
    return c.json({ error: { code: "BAD_REQUEST", message: msg } }, 400);
  }
});

// Direct refund endpoint (also protected by DB balance limit trigger)
returnRoutes.post("/refunds", requirePermission("refunds.create"), async (c) => {
  const parsed = await parseJsonBody(
    c,
    z.object({
      orderId: z.string().uuid(),
      amount: z.coerce.number().positive(),
      reason: z.string().min(3),
      idempotencyKey: z.string().optional(),
    })
  );
  if ("error" in parsed) return parsed.error;
  const d = parsed.data;
  const actor = c.get("authUser");
  const db = await getDb();

  try {
    const refund = await db.transaction(async (tx) => {
      if (d.idempotencyKey) {
        const dup = await tx.query("SELECT * FROM refunds WHERE idempotency_key = $1", [d.idempotencyKey]);
        if (dup.rows[0]) return dup.rows[0];
      }
      const refNum = `REF-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      const res = await tx.query(
        `INSERT INTO refunds (refund_number, order_id, amount, status, reason, idempotency_key, processed_by, processed_at)
         VALUES ($1, $2, $3, 'completed', $4, $5, $6, NOW()) RETURNING *`,
        [refNum, d.orderId, d.amount, d.reason, d.idempotencyKey || null, actor.id]
      );
      await tx.query(
        `UPDATE orders SET
          refunded_amount = refunded_amount + $1,
          payment_status = CASE WHEN (refunded_amount + $1) >= paid_amount THEN 'refunded' ELSE 'partially_refunded' END,
          updated_at = NOW()
         WHERE id = $2`,
        [d.amount, d.orderId]
      );
      return res.rows[0];
    });

    await recordAuditLog({
      actorUserId: actor.id,
      actorEmail: actor.email,
      action: "refund.created",
      entityType: "refund",
      entityId: refund.id as string,
      afterData: { orderId: d.orderId, amount: d.amount, reason: d.reason },
    });

    return c.json({ data: refund }, 201);
  } catch (err) {
    return c.json(
      { error: { code: "REFUND_REJECTED", message: err instanceof Error ? err.message : "Refund failed" } },
      400
    );
  }
});

export default returnRoutes;
