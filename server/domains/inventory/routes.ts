import { Hono } from "hono";
import { z } from "zod";
import { getDb } from "../../db/client.js";
import { requireAdminAuth } from "../../middleware/auth.js";
import { isVendorScoped, requirePermission } from "../../middleware/rbac.js";
import { getPagination, parseJsonBody, recordAuditLog } from "../../middleware/validate.js";
import { createAdminNotification } from "../notifications/service.js";

const inventoryRoutes = new Hono();
inventoryRoutes.use("*", requireAdminAuth);

inventoryRoutes.get("/stock", requirePermission("inventory.read"), async (c) => {
  const { page, limit, offset, search } = getPagination(c);
  const filter = c.req.query("filter"); // 'all', 'low', 'out'
  const warehouseId = c.req.query("warehouseId");
  const db = await getDb();

  const conds: string[] = ["p.deleted_at IS NULL", "pv.deleted_at IS NULL"];
  const params: unknown[] = [];

  if (isVendorScoped(c)) {
    params.push(c.get("authUser").vendorId);
    conds.push(`p.vendor_id = $${params.length}`);
  }
  if (search) {
    params.push(`%${search.toLowerCase()}%`);
    conds.push(`(LOWER(p.name) LIKE $${params.length} OR LOWER(pv.sku) LIKE $${params.length})`);
  }
  if (warehouseId && warehouseId !== "all") {
    params.push(warehouseId);
    conds.push(`inv.warehouse_id = $${params.length}`);
  }
  if (filter === "out") {
    conds.push("inv.available_qty <= 0");
  } else if (filter === "low") {
    conds.push("inv.available_qty > 0 AND inv.available_qty <= inv.low_stock_threshold");
  } else if (filter === "expiring") {
    conds.push(
      `EXISTS (SELECT 1 FROM inventory_batches ib WHERE ib.variant_id = inv.variant_id AND ib.warehouse_id = inv.warehouse_id AND ib.remaining_qty > 0 AND ib.expiry_date IS NOT NULL AND ib.expiry_date <= CURRENT_DATE + INTERVAL '30 days')`
    );
  }

  const where = `WHERE ${conds.join(" AND ")}`;

  const countRes = await db.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM inventory_items inv
     JOIN product_variants pv ON pv.id = inv.variant_id
     JOIN products p ON p.id = pv.product_id
     ${where}`,
    params
  );
  const total = Number(countRes.rows[0]?.count || 0);

  const rowsRes = await db.query(
    `SELECT inv.*, pv.sku, pv.barcode, pv.cost_price::float8, pv.title AS variant_title,
            p.id AS product_id, p.name AS product_name, p.storage_type,
            w.name AS warehouse_name, w.code AS warehouse_code,
            (inv.physical_qty * pv.cost_price)::float8 AS stock_valuation,
            (SELECT MIN(ib.expiry_date) FROM inventory_batches ib
             WHERE ib.variant_id = inv.variant_id AND ib.warehouse_id = inv.warehouse_id AND ib.remaining_qty > 0) AS nearest_expiry_date
     FROM inventory_items inv
     JOIN product_variants pv ON pv.id = inv.variant_id
     JOIN products p ON p.id = pv.product_id
     JOIN warehouses w ON w.id = inv.warehouse_id
     ${where}
     ORDER BY inv.available_qty ASC, p.name ASC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  return c.json({
    data: rowsRes.rows,
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  });
});

inventoryRoutes.get("/valuation", requirePermission("inventory.read"), async (c) => {
  const db = await getDb();
  const res = await db.query(
    `SELECT
       COUNT(*)::int AS total_skus,
       COALESCE(SUM(inv.available_qty), 0)::int AS total_available_units,
       COALESCE(SUM(inv.reserved_qty), 0)::int AS total_reserved_units,
       COALESCE(SUM(inv.incoming_qty), 0)::int AS total_incoming_units,
       COALESCE(SUM(inv.physical_qty * pv.cost_price), 0)::float8 AS total_valuation,
       (SELECT COUNT(*)::int FROM inventory_batches WHERE remaining_qty > 0 AND expiry_date IS NOT NULL AND expiry_date <= CURRENT_DATE + INTERVAL '30 days') AS expiring_batches_count
     FROM inventory_items inv
     JOIN product_variants pv ON pv.id = inv.variant_id`
  );
  return c.json({ data: res.rows[0] });
});

inventoryRoutes.get("/batches", requirePermission("inventory.read"), async (c) => {
  const db = await getDb();
  const res = await db.query(
    `SELECT ib.*, pv.sku, p.name AS product_name, w.name AS warehouse_name
     FROM inventory_batches ib
     JOIN product_variants pv ON pv.id = ib.variant_id
     JOIN products p ON p.id = pv.product_id
     JOIN warehouses w ON w.id = ib.warehouse_id
     ORDER BY ib.expiry_date ASC NULLS LAST, ib.created_at DESC LIMIT 100`
  );
  return c.json({ data: res.rows });
});

inventoryRoutes.post("/batches", requirePermission("inventory.adjust"), async (c) => {
  const parsed = await parseJsonBody(
    c,
    z.object({
      variantId: z.string().uuid(),
      warehouseId: z.string().uuid(),
      batchNumber: z.string().min(1),
      expiryDate: z.string().nullable().optional(),
      quantity: z.coerce.number().int().positive(),
      unitCost: z.coerce.number().min(0).default(0),
      notes: z.string().optional(),
    })
  );
  if ("error" in parsed) return parsed.error;
  const d = parsed.data;
  const actor = c.get("authUser");
  const db = await getDb();

  const created = await db.transaction(async (tx) => {
    const bRes = await tx.query(
      `INSERT INTO inventory_batches (variant_id, warehouse_id, batch_number, expiry_date, received_qty, remaining_qty, unit_cost, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $5, $6, $7, $8)
       ON CONFLICT (variant_id, warehouse_id, batch_number) DO UPDATE SET
         received_qty = inventory_batches.received_qty + EXCLUDED.received_qty,
         remaining_qty = inventory_batches.remaining_qty + EXCLUDED.remaining_qty,
         expiry_date = COALESCE(EXCLUDED.expiry_date, inventory_batches.expiry_date)
       RETURNING *`,
      [d.variantId, d.warehouseId, d.batchNumber, d.expiryDate || null, d.quantity, d.unitCost, d.notes || null, actor.id]
    );
    await tx.query(
      `INSERT INTO inventory_items (variant_id, warehouse_id, physical_qty)
       VALUES ($1, $2, $3)
       ON CONFLICT (variant_id, warehouse_id) DO UPDATE SET physical_qty = inventory_items.physical_qty + $3, updated_at = NOW()`,
      [d.variantId, d.warehouseId, d.quantity]
    );
    return bRes.rows[0];
  });

  return c.json({ data: created }, 201);
});

inventoryRoutes.get("/transfers", requirePermission("inventory.read"), async (c) => {
  const db = await getDb();
  const res = await db.query(
    `SELECT st.*, pv.sku, p.name AS product_name, wf.name AS from_warehouse, wt.name AS to_warehouse
     FROM stock_transfers st
     JOIN product_variants pv ON pv.id = st.variant_id
     JOIN products p ON p.id = pv.product_id
     JOIN warehouses wf ON wf.id = st.from_warehouse_id
     JOIN warehouses wt ON wt.id = st.to_warehouse_id
     ORDER BY st.created_at DESC LIMIT 50`
  );
  return c.json({ data: res.rows });
});

inventoryRoutes.post("/transfers", requirePermission("inventory.adjust"), async (c) => {
  const parsed = await parseJsonBody(
    c,
    z.object({
      variantId: z.string().uuid(),
      fromWarehouseId: z.string().uuid(),
      toWarehouseId: z.string().uuid(),
      quantity: z.coerce.number().int().positive(),
      notes: z.string().optional(),
    })
  );
  if ("error" in parsed) return parsed.error;
  const d = parsed.data;
  if (d.fromWarehouseId === d.toWarehouseId) {
    return c.json({ error: { code: "INVALID_TRANSFER", message: "Source and destination warehouses must differ" } }, 400);
  }
  const actor = c.get("authUser");
  const db = await getDb();

  try {
    const transfer = await db.transaction(async (tx) => {
      const srcRes = await tx.query<{ id: string; available_qty: number }>(
        "SELECT id, available_qty FROM inventory_items WHERE variant_id = $1 AND warehouse_id = $2 FOR UPDATE",
        [d.variantId, d.fromWarehouseId]
      );
      if (!srcRes.rows[0] || srcRes.rows[0].available_qty < d.quantity) {
        throw new Error("Insufficient available stock in source warehouse");
      }

      const srcUpd = await tx.query<{ id: string; physical_qty: number; reserved_qty: number; available_qty: number }>(
        "UPDATE inventory_items SET physical_qty = physical_qty - $1, updated_at = NOW() WHERE id = $2 RETURNING *",
        [d.quantity, srcRes.rows[0].id]
      );
      const dstUpd = await tx.query<{ id: string; physical_qty: number; reserved_qty: number; available_qty: number }>(
        `INSERT INTO inventory_items (variant_id, warehouse_id, physical_qty)
         VALUES ($1, $2, $3)
         ON CONFLICT (variant_id, warehouse_id) DO UPDATE SET physical_qty = inventory_items.physical_qty + $3, updated_at = NOW()
         RETURNING *`,
        [d.variantId, d.toWarehouseId, d.quantity]
      );

      const tNum = `TRF-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      const tRes = await tx.query(
        `INSERT INTO stock_transfers (transfer_number, variant_id, from_warehouse_id, to_warehouse_id, quantity, status, notes, created_by)
         VALUES ($1, $2, $3, $4, $5, 'completed', $6, $7) RETURNING *`,
        [tNum, d.variantId, d.fromWarehouseId, d.toWarehouseId, d.quantity, d.notes || null, actor.id]
      );

      await tx.query(
        `INSERT INTO stock_movements (inventory_item_id, variant_id, warehouse_id, movement_type, qty_delta, physical_after, reserved_after, available_after, reason, reference_type, reference_id, actor_user_id)
         VALUES ($1, $2, $3, 'transfer_out', $4, $5, $6, $7, $8, 'transfer', $9, $10)`,
        [srcUpd.rows[0].id, d.variantId, d.fromWarehouseId, -d.quantity, srcUpd.rows[0].physical_qty, srcUpd.rows[0].reserved_qty, srcUpd.rows[0].available_qty, `Transfer ${tNum}`, tNum, actor.id]
      );
      await tx.query(
        `INSERT INTO stock_movements (inventory_item_id, variant_id, warehouse_id, movement_type, qty_delta, physical_after, reserved_after, available_after, reason, reference_type, reference_id, actor_user_id)
         VALUES ($1, $2, $3, 'transfer_in', $4, $5, $6, $7, $8, 'transfer', $9, $10)`,
        [dstUpd.rows[0].id, d.variantId, d.toWarehouseId, d.quantity, dstUpd.rows[0].physical_qty, dstUpd.rows[0].reserved_qty, dstUpd.rows[0].available_qty, `Transfer ${tNum}`, tNum, actor.id]
      );

      return tRes.rows[0];
    });
    return c.json({ data: transfer }, 201);
  } catch (err) {
    return c.json({ error: { code: "TRANSFER_FAILED", message: err instanceof Error ? err.message : "Transfer failed" } }, 400);
  }
});

const adjustSchema = z.object({
  inventoryItemId: z.string().uuid(),
  adjustmentType: z.enum(["add", "subtract", "set_physical", "mark_damaged", "set_threshold"]),
  quantity: z.coerce.number().int().min(0),
  reason: z.string().min(3).max(300),
});

inventoryRoutes.post("/adjust", requirePermission("inventory.adjust"), async (c) => {
  const parsed = await parseJsonBody(c, adjustSchema);
  if ("error" in parsed) return parsed.error;
  const { inventoryItemId, adjustmentType, quantity, reason } = parsed.data;
  const actor = c.get("authUser");
  const db = await getDb();

  try {
    const updated = await db.transaction(async (tx) => {
      const itemRes = await tx.query<{
        id: string;
        variant_id: string;
        warehouse_id: string;
        physical_qty: number;
        reserved_qty: number;
        damaged_qty: number;
        available_qty: number;
        low_stock_threshold: number;
      }>("SELECT * FROM inventory_items WHERE id = $1 FOR UPDATE", [inventoryItemId]);
      const item = itemRes.rows[0];
      if (!item) throw new Error("Inventory item not found");

      let nextPhysical = item.physical_qty;
      let nextDamaged = item.damaged_qty;
      let nextThreshold = item.low_stock_threshold;
      let delta = 0;
      let movementType = "manual_adjustment";

      if (adjustmentType === "add") {
        nextPhysical += quantity;
        delta = quantity;
      } else if (adjustmentType === "subtract") {
        nextPhysical = Math.max(item.reserved_qty, item.physical_qty - quantity);
        delta = nextPhysical - item.physical_qty;
      } else if (adjustmentType === "set_physical") {
        nextPhysical = Math.max(item.reserved_qty, quantity);
        delta = nextPhysical - item.physical_qty;
      } else if (adjustmentType === "mark_damaged") {
        nextDamaged += quantity;
        movementType = "damage_writeoff";
        delta = -quantity;
      } else if (adjustmentType === "set_threshold") {
        nextThreshold = quantity;
      }

      const updRes = await tx.query<{
        id: string;
        physical_qty: number;
        reserved_qty: number;
        available_qty: number;
        low_stock_threshold: number;
      }>(
        `UPDATE inventory_items
         SET physical_qty = $1, damaged_qty = $2, low_stock_threshold = $3, updated_at = NOW()
         WHERE id = $4 RETURNING *`,
        [nextPhysical, nextDamaged, nextThreshold, item.id]
      );
      const after = updRes.rows[0];

      await tx.query(
        `INSERT INTO stock_movements (
          inventory_item_id, variant_id, warehouse_id, movement_type, qty_delta,
          physical_after, reserved_after, available_after, reason, reference_type, reference_id, actor_user_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'manual', $10, $11)`,
        [
          item.id,
          item.variant_id,
          item.warehouse_id,
          movementType,
          delta,
          after.physical_qty,
          after.reserved_qty,
          after.available_qty,
          reason,
          actor.id,
          actor.id,
        ]
      );

      return after;
    });

    if (updated.available_qty <= 0) {
      await createAdminNotification({
        eventType: "out_of_stock",
        severity: "error",
        title: "Out of stock alert",
        message: `Inventory item ${inventoryItemId} reached 0 available units.`,
        entityType: "inventory_item",
        entityId: inventoryItemId,
        actionUrl: "/admin/inventory/out-of-stock",
        requiredPermission: "inventory.read",
      });
    } else if (updated.available_qty <= updated.low_stock_threshold) {
      await createAdminNotification({
        eventType: "low_stock",
        severity: "warning",
        title: "Low stock alert",
        message: `Inventory item ${inventoryItemId} has ${updated.available_qty} units left.`,
        entityType: "inventory_item",
        entityId: inventoryItemId,
        actionUrl: "/admin/inventory/low-stock",
        requiredPermission: "inventory.read",
      });
    }

    await recordAuditLog({
      actorUserId: actor.id,
      actorEmail: actor.email,
      action: `inventory.${adjustmentType}`,
      entityType: "inventory_item",
      entityId: inventoryItemId,
      afterData: updated,
      metadata: { reason },
    });

    return c.json({ data: updated });
  } catch (err) {
    return c.json(
      { error: { code: "BAD_REQUEST", message: err instanceof Error ? err.message : "Adjustment failed" } },
      400
    );
  }
});

inventoryRoutes.get("/movements", requirePermission("inventory.read"), async (c) => {
  const { page, limit, offset } = getPagination(c);
  const db = await getDb();

  const countRes = await db.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM stock_movements");
  const total = Number(countRes.rows[0]?.count || 0);

  const rowsRes = await db.query(
    `SELECT sm.*, pv.sku, p.name AS product_name, w.name AS warehouse_name, u.email AS actor_email
     FROM stock_movements sm
     JOIN product_variants pv ON pv.id = sm.variant_id
     JOIN products p ON p.id = pv.product_id
     JOIN warehouses w ON w.id = sm.warehouse_id
     LEFT JOIN users u ON u.id = sm.actor_user_id
     ORDER BY sm.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  return c.json({
    data: rowsRes.rows,
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  });
});

// ─── WAREHOUSES & SUPPLIERS & PURCHASE ORDERS ─────────────────────────────────
inventoryRoutes.get("/warehouses", requirePermission("inventory.read", "warehouses.manage"), async (c) => {
  const db = await getDb();
  const res = await db.query("SELECT * FROM warehouses ORDER BY is_default DESC, name ASC");
  return c.json({ data: res.rows });
});

inventoryRoutes.post("/warehouses", requirePermission("warehouses.manage"), async (c) => {
  const parsed = await parseJsonBody(
    c,
    z.object({
      code: z.string().min(2),
      name: z.string().min(2),
      addressLine1: z.string().optional(),
      city: z.string().optional(),
      region: z.string().optional(),
      postalCode: z.string().optional(),
      countryCode: z.string().length(2).default("JP"),
      supportsColdChain: z.boolean().default(true),
    })
  );
  if ("error" in parsed) return parsed.error;
  const d = parsed.data;
  const db = await getDb();
  const res = await db.query(
    `INSERT INTO warehouses (code, name, address_line1, city, region, postal_code, country_code, supports_cold_chain)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [d.code.toUpperCase(), d.name, d.addressLine1 ?? null, d.city ?? null, d.region ?? null, d.postalCode ?? null, d.countryCode, d.supportsColdChain]
  );
  return c.json({ data: res.rows[0] }, 201);
});

inventoryRoutes.get("/suppliers", requirePermission("inventory.read", "suppliers.manage"), async (c) => {
  const db = await getDb();
  const res = await db.query("SELECT * FROM suppliers WHERE deleted_at IS NULL ORDER BY name ASC");
  return c.json({ data: res.rows });
});

inventoryRoutes.post("/suppliers", requirePermission("suppliers.manage"), async (c) => {
  const parsed = await parseJsonBody(
    c,
    z.object({
      code: z.string().min(2),
      name: z.string().min(2),
      contactName: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      country: z.string().optional(),
      paymentTerms: z.string().optional(),
      leadTimeDays: z.coerce.number().int().min(0).default(7),
    })
  );
  if ("error" in parsed) return parsed.error;
  const d = parsed.data;
  const db = await getDb();
  const res = await db.query(
    `INSERT INTO suppliers (code, name, contact_name, email, phone, country, payment_terms, lead_time_days)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [d.code.toUpperCase(), d.name, d.contactName ?? null, d.email ?? null, d.phone ?? null, d.country ?? null, d.paymentTerms ?? null, d.leadTimeDays]
  );
  return c.json({ data: res.rows[0] }, 201);
});

inventoryRoutes.get("/purchase-orders", requirePermission("purchase_orders.manage", "inventory.read"), async (c) => {
  const db = await getDb();
  const res = await db.query(
    `SELECT po.*, s.name AS supplier_name, w.name AS warehouse_name,
            COALESCE(json_agg(json_build_object(
              'id', poi.id, 'variant_id', poi.variant_id, 'ordered_qty', poi.ordered_qty,
              'received_qty', poi.received_qty, 'unit_cost', poi.unit_cost, 'line_total', poi.line_total
            )) FILTER (WHERE poi.id IS NOT NULL), '[]') AS items
     FROM purchase_orders po
     JOIN suppliers s ON s.id = po.supplier_id
     JOIN warehouses w ON w.id = po.warehouse_id
     LEFT JOIN purchase_order_items poi ON poi.purchase_order_id = po.id
     GROUP BY po.id, s.name, w.name
     ORDER BY po.created_at DESC`
  );
  return c.json({ data: res.rows });
});

inventoryRoutes.post("/purchase-orders", requirePermission("purchase_orders.manage"), async (c) => {
  const parsed = await parseJsonBody(
    c,
    z.object({
      supplierId: z.string().uuid(),
      warehouseId: z.string().uuid(),
      expectedDate: z.string().optional(),
      notes: z.string().optional(),
      items: z
        .array(
          z.object({
            variantId: z.string().uuid(),
            orderedQty: z.coerce.number().int().positive(),
            unitCost: z.coerce.number().min(0),
          })
        )
        .min(1),
    })
  );
  if ("error" in parsed) return parsed.error;
  const d = parsed.data;
  const actor = c.get("authUser");
  const db = await getDb();

  const poNumber = `PO-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
  const subtotal = d.items.reduce((acc, i) => acc + i.orderedQty * i.unitCost, 0);

  const created = await db.transaction(async (tx) => {
    const poRes = await tx.query<{ id: string }>(
      `INSERT INTO purchase_orders (po_number, supplier_id, warehouse_id, status, expected_date, subtotal_amount, total_amount, notes, created_by)
       VALUES ($1, $2, $3, 'ordered', $4, $5, $5, $6, $7) RETURNING *`,
      [poNumber, d.supplierId, d.warehouseId, d.expectedDate || null, subtotal, d.notes || null, actor.id]
    );
    const poId = poRes.rows[0].id;
    for (const item of d.items) {
      await tx.query(
        `INSERT INTO purchase_order_items (purchase_order_id, variant_id, ordered_qty, unit_cost, line_total)
         VALUES ($1, $2, $3, $4, $5)`,
        [poId, item.variantId, item.orderedQty, item.unitCost, item.orderedQty * item.unitCost]
      );
      await tx.query(
        `UPDATE inventory_items SET incoming_qty = incoming_qty + $1, updated_at = NOW()
         WHERE variant_id = $2 AND warehouse_id = $3`,
        [item.orderedQty, item.variantId, d.warehouseId]
      );
    }
    return poRes.rows[0];
  });

  return c.json({ data: created }, 201);
});

inventoryRoutes.post("/purchase-orders/:id/receive", requirePermission("purchase_orders.manage"), async (c) => {
  const poId = c.req.param("id");
  const actor = c.get("authUser");
  const db = await getDb();

  await db.transaction(async (tx) => {
    const poRes = await tx.query<{ id: string; po_number: string; warehouse_id: string; status: string }>(
      "SELECT * FROM purchase_orders WHERE id = $1 FOR UPDATE",
      [poId]
    );
    const po = poRes.rows[0];
    if (!po) throw new Error("Purchase order not found");
    if (po.status === "received" || po.status === "cancelled") {
      throw new Error(`Purchase order is already ${po.status}`);
    }

    const itemsRes = await tx.query<{ id: string; variant_id: string; ordered_qty: number; received_qty: number }>(
      "SELECT * FROM purchase_order_items WHERE purchase_order_id = $1 FOR UPDATE",
      [poId]
    );

    for (const item of itemsRes.rows) {
      const remaining = item.ordered_qty - item.received_qty;
      if (remaining <= 0) continue;

      await tx.query("UPDATE purchase_order_items SET received_qty = ordered_qty WHERE id = $1", [item.id]);

      const invRes = await tx.query<{
        id: string;
        physical_qty: number;
        reserved_qty: number;
        available_qty: number;
      }>(
        `UPDATE inventory_items
         SET physical_qty = physical_qty + $1,
             incoming_qty = GREATEST(0, incoming_qty - $1),
             updated_at = NOW()
         WHERE variant_id = $2 AND warehouse_id = $3
         RETURNING *`,
        [remaining, item.variant_id, po.warehouse_id]
      );
      if (invRes.rows[0]) {
        const inv = invRes.rows[0];
        await tx.query(
          `INSERT INTO stock_movements (
            inventory_item_id, variant_id, warehouse_id, movement_type, qty_delta,
            physical_after, reserved_after, available_after, reason, reference_type, reference_id, actor_user_id
          ) VALUES ($1, $2, $3, 'purchase_received', $4, $5, $6, $7, $8, 'purchase_order', $9, $10)`,
          [
            inv.id,
            item.variant_id,
            po.warehouse_id,
            remaining,
            inv.physical_qty,
            inv.reserved_qty,
            inv.available_qty,
            `Received from PO ${po.po_number}`,
            po.id,
            actor.id,
          ]
        );
      }
    }

    await tx.query("UPDATE purchase_orders SET status = 'received', received_at = NOW(), updated_at = NOW() WHERE id = $1", [poId]);
  });

  return c.json({ data: { received: true } });
});

export default inventoryRoutes;
