import { Hono } from "hono";
import { z } from "zod";
import { getDb } from "../../db/client.js";
import { getEnv } from "../../config/env.js";
import { requireAdminAuth } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/rbac.js";
import { getPagination, parseJsonBody, recordAuditLog } from "../../middleware/validate.js";
import { verifyWebhookSignature } from "../../integrations/webhooks.js";
import { sha256Hex } from "../../utils/crypto.js";
import { createAdminNotification } from "../notifications/service.js";

export const paymentAdminRoutes = new Hono();
paymentAdminRoutes.use("*", requireAdminAuth);

paymentAdminRoutes.get("/methods", requirePermission("payments.read", "settings.read"), async (c) => {
  const db = await getDb();
  const res = await db.query("SELECT * FROM payment_methods ORDER BY sort_order ASC");
  return c.json({ data: res.rows });
});

paymentAdminRoutes.patch("/methods/:id", requirePermission("settings.manage", "payments.manage"), async (c) => {
  const parsed = await parseJsonBody(
    c,
    z.object({
      isEnabled: z.boolean().optional(),
      isTestMode: z.boolean().optional(),
      feeAmount: z.coerce.number().min(0).optional(),
      description: z.string().optional(),
    })
  );
  if ("error" in parsed) return parsed.error;
  const d = parsed.data;
  const db = await getDb();
  const res = await db.query(
    `UPDATE payment_methods SET
      is_enabled = COALESCE($1, is_enabled),
      is_test_mode = COALESCE($2, is_test_mode),
      fee_amount = COALESCE($3, fee_amount),
      description = COALESCE($4, description),
      updated_at = NOW()
     WHERE id = $5 RETURNING *`,
    [d.isEnabled ?? null, d.isTestMode ?? null, d.feeAmount ?? null, d.description ?? null, c.req.param("id")]
  );
  return c.json({ data: res.rows[0] });
});

paymentAdminRoutes.get("/transactions", requirePermission("payments.read"), async (c) => {
  const { page, limit, offset, search } = getPagination(c);
  const status = c.req.query("status");
  const db = await getDb();

  const conds: string[] = [];
  const params: unknown[] = [];
  if (status && status !== "all") {
    params.push(status);
    conds.push(`pt.status = $${params.length}`);
  }
  if (search) {
    params.push(`%${search.toLowerCase()}%`);
    conds.push(`(LOWER(o.order_number) LIKE $${params.length} OR LOWER(COALESCE(pt.gateway_reference,'')) LIKE $${params.length})`);
  }
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";

  const countRes = await db.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM payment_transactions pt JOIN orders o ON o.id = pt.order_id ${where}`,
    params
  );
  const total = Number(countRes.rows[0]?.count || 0);

  const rowsRes = await db.query(
    `SELECT pt.*, o.order_number, o.customer_name, o.payment_status AS order_payment_status
     FROM payment_transactions pt
     JOIN orders o ON o.id = pt.order_id
     ${where}
     ORDER BY pt.created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  return c.json({
    data: rowsRes.rows,
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  });
});

paymentAdminRoutes.post("/transactions/record", requirePermission("payments.manage"), async (c) => {
  const parsed = await parseJsonBody(
    c,
    z.object({
      orderId: z.string().uuid(),
      amount: z.coerce.number().positive(),
      paymentMethodCode: z.string().min(1),
      gatewayReference: z.string().optional(),
      idempotencyKey: z.string().optional(),
    })
  );
  if ("error" in parsed) return parsed.error;
  const d = parsed.data;
  const actor = c.get("authUser");
  const db = await getDb();

  const txRow = await db.transaction(async (tx) => {
    if (d.idempotencyKey) {
      const dup = await tx.query("SELECT * FROM payment_transactions WHERE idempotency_key = $1", [d.idempotencyKey]);
      if (dup.rows[0]) return dup.rows[0];
    }

    const oRes = await tx.query<{ id: string; total_amount: string; paid_amount: string }>(
      "SELECT id, total_amount, paid_amount FROM orders WHERE id = $1 FOR UPDATE",
      [d.orderId]
    );
    const order = oRes.rows[0];
    if (!order) throw new Error("Order not found");

    const inserted = await tx.query(
      `INSERT INTO payment_transactions (
        order_id, payment_method_code, provider, transaction_type, status, amount,
        gateway_reference, idempotency_key, reconciled, reconciled_at, reconciled_by, recorded_by
      ) VALUES ($1, $2, 'manual', 'manual_payment', 'succeeded', $3, $4, $5, TRUE, NOW(), $6, $6)
      RETURNING *`,
      [d.orderId, d.paymentMethodCode, d.amount, d.gatewayReference || null, d.idempotencyKey || null, actor.id]
    );

    const newPaid = Number(order.paid_amount) + d.amount;
    const totalAmt = Number(order.total_amount);
    const nextPayStatus = newPaid >= totalAmt ? "paid" : "partially_paid";

    await tx.query("UPDATE orders SET paid_amount = $1, payment_status = $2, updated_at = NOW() WHERE id = $3", [
      newPaid,
      nextPayStatus,
      d.orderId,
    ]);

    return inserted.rows[0];
  });

  await recordAuditLog({
    actorUserId: actor.id,
    actorEmail: actor.email,
    action: "payment.recorded",
    entityType: "payment_transaction",
    entityId: txRow.id as string,
    afterData: { orderId: d.orderId, amount: d.amount },
  });

  return c.json({ data: txRow }, 201);
});

paymentAdminRoutes.post("/transactions/:id/reconcile", requirePermission("payments.manage"), async (c) => {
  const actor = c.get("authUser");
  const db = await getDb();
  const res = await db.query(
    `UPDATE payment_transactions SET reconciled = TRUE, reconciled_at = NOW(), reconciled_by = $1
     WHERE id = $2 RETURNING *`,
    [actor.id, c.req.param("id")]
  );
  return c.json({ data: res.rows[0] });
});

// ─── Server-Verified Payment Webhooks (Stripe / PayPay) ───────────────────────
export const webhookRoutes = new Hono();

webhookRoutes.post("/:provider", async (c) => {
  const provider = c.req.param("provider").toLowerCase();
  const rawBody = await c.req.text();
  const env = getEnv();

  const secret =
    provider === "stripe"
      ? env.STRIPE_WEBHOOK_SECRET
      : provider === "paypay"
        ? env.PAYPAY_WEBHOOK_SECRET
        : "";

  const sigHeader = c.req.header("Stripe-Signature") || c.req.header("X-Webhook-Signature");
  const tsHeader = c.req.header("X-Webhook-Timestamp");

  const verification = verifyWebhookSignature({
    rawBody,
    signatureHeader: sigHeader,
    timestampHeader: tsHeader,
    secret,
  });

  if (!verification.valid) {
    return c.json({ error: { code: "INVALID_SIGNATURE", message: verification.reason || "Invalid signature" } }, 401);
  }

  let event: {
    id: string;
    type: string;
    data?: { orderId?: string; orderNumber?: string; amount?: number; reference?: string; paymentMethod?: string };
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return c.json({ error: { code: "INVALID_JSON", message: "Invalid webhook JSON" } }, 400);
  }

  if (!event.id || !event.type) {
    return c.json({ error: { code: "INVALID_EVENT", message: "Missing event id or type" } }, 400);
  }

  const db = await getDb();
  const payloadHash = sha256Hex(rawBody);

  // Replay protection via unique (provider, event_id)
  const existing = await db.query("SELECT id, processing_status FROM payment_webhooks WHERE provider = $1 AND event_id = $2", [
    provider,
    event.id,
  ]);
  if (existing.rows[0]) {
    return c.json({ data: { received: true, replay: true, eventId: event.id } });
  }

  await db.transaction(async (tx) => {
    await tx.query(
      `INSERT INTO payment_webhooks (provider, event_id, event_type, signature_verified, payload_hash, payload, processing_status, processed_at)
       VALUES ($1, $2, $3, TRUE, $4, $5::jsonb, 'processed', NOW())`,
      [provider, event.id, event.type, payloadHash, rawBody]
    );

    const orderId = event.data?.orderId;
    if (orderId && (event.type === "payment.succeeded" || event.type === "payment_intent.succeeded")) {
      const amount = Number(event.data?.amount || 0);
      await tx.query(
        `INSERT INTO payment_transactions (
          order_id, payment_method_code, provider, transaction_type, status, amount, gateway_reference, idempotency_key, reconciled, reconciled_at
        ) VALUES ($1, $2, $3, 'charge', 'succeeded', $4, $5, $6, TRUE, NOW())
        ON CONFLICT (idempotency_key) DO NOTHING`,
        [orderId, event.data?.paymentMethod || "card", provider, amount, event.data?.reference || event.id, `wh:${provider}:${event.id}`]
      );
      await tx.query(
        `UPDATE orders SET paid_amount = paid_amount + $1, payment_status = 'paid', updated_at = NOW() WHERE id = $2`,
        [amount, orderId]
      );
    } else if (orderId && event.type === "payment.failed") {
      await tx.query(
        `INSERT INTO payment_transactions (
          order_id, payment_method_code, provider, transaction_type, status, amount, gateway_reference, idempotency_key
        ) VALUES ($1, $2, $3, 'charge', 'failed', $4, $5, $6)
        ON CONFLICT (idempotency_key) DO NOTHING`,
        [orderId, event.data?.paymentMethod || "card", provider, Number(event.data?.amount || 0), event.data?.reference || event.id, `wh:${provider}:${event.id}`]
      );
      await tx.query("UPDATE orders SET payment_status = 'failed', updated_at = NOW() WHERE id = $1", [orderId]);
      await createAdminNotification({
        eventType: "payment_failed",
        severity: "error",
        title: "Payment webhook failed",
        message: `Payment failed for order ${orderId} via ${provider}`,
        entityType: "order",
        entityId: orderId,
        actionUrl: `/admin/orders/${orderId}`,
        requiredPermission: "payments.read",
      });
    }
  });

  return c.json({ data: { received: true, replay: false, eventId: event.id } });
});
