-- Migration 0003: Multi-Warehouse Inventory, Atomic Reservations, Suppliers & Purchase Orders
-- Non-destructive, idempotent PostgreSQL 16+ schema

-- ============================================================================
-- 1. WAREHOUSES & SUPPLIERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  address_line1 TEXT,
  city TEXT,
  region TEXT,
  postal_code TEXT,
  country_code TEXT NOT NULL DEFAULT 'JP',
  contact_phone TEXT,
  supports_cold_chain BOOLEAN NOT NULL DEFAULT TRUE,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  country TEXT,
  payment_terms TEXT,
  lead_time_days INTEGER NOT NULL DEFAULT 7,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- ============================================================================
-- 2. SKU/VARIANT-LEVEL INVENTORY & MOVEMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  physical_qty INTEGER NOT NULL DEFAULT 0 CHECK (physical_qty >= 0),
  reserved_qty INTEGER NOT NULL DEFAULT 0 CHECK (reserved_qty >= 0),
  incoming_qty INTEGER NOT NULL DEFAULT 0 CHECK (incoming_qty >= 0),
  damaged_qty INTEGER NOT NULL DEFAULT 0 CHECK (damaged_qty >= 0),
  available_qty INTEGER GENERATED ALWAYS AS (GREATEST(0, physical_qty - reserved_qty - damaged_qty)) STORED,
  low_stock_threshold INTEGER NOT NULL DEFAULT 10 CHECK (low_stock_threshold >= 0),
  bin_location TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (variant_id, warehouse_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_low_stock ON inventory_items (available_qty, low_stock_threshold);
CREATE INDEX IF NOT EXISTS idx_inventory_variant ON inventory_items (variant_id);

CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  movement_type TEXT NOT NULL CHECK (
    movement_type IN (
      'initial_seed', 'manual_adjustment', 'order_reserved', 'order_reservation_released',
      'order_fulfilled', 'return_restocked', 'return_damaged', 'purchase_received',
      'transfer_in', 'transfer_out', 'damage_writeoff'
    )
  ),
  qty_delta INTEGER NOT NULL,
  physical_after INTEGER NOT NULL,
  reserved_after INTEGER NOT NULL,
  available_after INTEGER NOT NULL,
  reason TEXT NOT NULL,
  reference_type TEXT, -- 'order', 'return', 'purchase_order', 'manual'
  reference_id TEXT,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON stock_movements (inventory_item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_ref ON stock_movements (reference_type, reference_id);

CREATE TABLE IF NOT EXISTS inventory_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
  order_id UUID NOT NULL, -- FK added logically to orders(id)
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'fulfilled', 'released', 'expired')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_reservations_order ON inventory_reservations (order_id, status);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_expiry ON inventory_reservations (expires_at) WHERE status = 'active';

-- ============================================================================
-- 3. PURCHASE ORDERS & RECEIVING
-- ============================================================================
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number TEXT NOT NULL UNIQUE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ordered', 'partially_received', 'received', 'cancelled')),
  expected_date DATE,
  received_at TIMESTAMPTZ,
  subtotal_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  shipping_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  currency_code CHAR(3) NOT NULL DEFAULT 'JPY',
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
  ordered_qty INTEGER NOT NULL CHECK (ordered_qty > 0),
  received_qty INTEGER NOT NULL DEFAULT 0 CHECK (received_qty >= 0 AND received_qty <= ordered_qty),
  unit_cost NUMERIC(14, 2) NOT NULL CHECK (unit_cost >= 0),
  line_total NUMERIC(14, 2) NOT NULL CHECK (line_total >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 4. ATOMIC INVENTORY RESERVATION / RELEASE / DEDUCTION / RESTOCK FUNCTIONS
-- ============================================================================
CREATE OR REPLACE FUNCTION reserve_inventory(
  p_variant_id UUID,
  p_warehouse_id UUID,
  p_order_id UUID,
  p_quantity INTEGER,
  p_actor_id UUID DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_item inventory_items%ROWTYPE;
  v_res_id UUID;
BEGIN
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Reservation quantity must be positive';
  END IF;

  SELECT * INTO v_item
  FROM inventory_items
  WHERE variant_id = p_variant_id AND warehouse_id = p_warehouse_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory record not found for variant % in warehouse %', p_variant_id, p_warehouse_id;
  END IF;

  IF (v_item.physical_qty - v_item.reserved_qty - v_item.damaged_qty) < p_quantity THEN
    RAISE EXCEPTION 'Insufficient available stock for variant % (available: %, requested: %)',
      p_variant_id, (v_item.physical_qty - v_item.reserved_qty - v_item.damaged_qty), p_quantity;
  END IF;

  UPDATE inventory_items
  SET reserved_qty = reserved_qty + p_quantity, updated_at = NOW()
  WHERE id = v_item.id
  RETURNING * INTO v_item;

  INSERT INTO inventory_reservations (inventory_item_id, variant_id, order_id, quantity, status, expires_at)
  VALUES (v_item.id, p_variant_id, p_order_id, p_quantity, 'active', p_expires_at)
  RETURNING id INTO v_res_id;

  INSERT INTO stock_movements (
    inventory_item_id, variant_id, warehouse_id, movement_type, qty_delta,
    physical_after, reserved_after, available_after, reason, reference_type, reference_id, actor_user_id
  ) VALUES (
    v_item.id, p_variant_id, p_warehouse_id, 'order_reserved', -p_quantity,
    v_item.physical_qty, v_item.reserved_qty, v_item.available_qty,
    'Reserved for order placement', 'order', p_order_id::text, p_actor_id
  );

  RETURN v_res_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION release_inventory_reservation(
  p_order_id UUID,
  p_reason TEXT DEFAULT 'Order cancelled or reservation expired',
  p_actor_id UUID DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  v_res RECORD;
  v_item inventory_items%ROWTYPE;
  v_released_count INTEGER := 0;
BEGIN
  FOR v_res IN
    SELECT * FROM inventory_reservations
    WHERE order_id = p_order_id AND status = 'active'
    FOR UPDATE
  LOOP
    SELECT * INTO v_item FROM inventory_items WHERE id = v_res.inventory_item_id FOR UPDATE;

    UPDATE inventory_items
    SET reserved_qty = GREATEST(0, reserved_qty - v_res.quantity), updated_at = NOW()
    WHERE id = v_item.id
    RETURNING * INTO v_item;

    UPDATE inventory_reservations
    SET status = 'released', updated_at = NOW()
    WHERE id = v_res.id;

    INSERT INTO stock_movements (
      inventory_item_id, variant_id, warehouse_id, movement_type, qty_delta,
      physical_after, reserved_after, available_after, reason, reference_type, reference_id, actor_user_id
    ) VALUES (
      v_item.id, v_item.variant_id, v_item.warehouse_id, 'order_reservation_released', v_res.quantity,
      v_item.physical_qty, v_item.reserved_qty, v_item.available_qty,
      p_reason, 'order', p_order_id::text, p_actor_id
    );

    v_released_count := v_released_count + 1;
  END LOOP;

  RETURN v_released_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION deduct_fulfilled_inventory(
  p_order_id UUID,
  p_actor_id UUID DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  v_res RECORD;
  v_item inventory_items%ROWTYPE;
  v_fulfilled_count INTEGER := 0;
BEGIN
  FOR v_res IN
    SELECT * FROM inventory_reservations
    WHERE order_id = p_order_id AND status = 'active'
    FOR UPDATE
  LOOP
    SELECT * INTO v_item FROM inventory_items WHERE id = v_res.inventory_item_id FOR UPDATE;

    IF v_item.physical_qty < v_res.quantity THEN
      RAISE EXCEPTION 'Insufficient physical stock during fulfillment for variant %', v_item.variant_id;
    END IF;

    UPDATE inventory_items
    SET physical_qty = physical_qty - v_res.quantity,
        reserved_qty = GREATEST(0, reserved_qty - v_res.quantity),
        updated_at = NOW()
    WHERE id = v_item.id
    RETURNING * INTO v_item;

    UPDATE inventory_reservations
    SET status = 'fulfilled', updated_at = NOW()
    WHERE id = v_res.id;

    INSERT INTO stock_movements (
      inventory_item_id, variant_id, warehouse_id, movement_type, qty_delta,
      physical_after, reserved_after, available_after, reason, reference_type, reference_id, actor_user_id
    ) VALUES (
      v_item.id, v_item.variant_id, v_item.warehouse_id, 'order_fulfilled', -v_res.quantity,
      v_item.physical_qty, v_item.reserved_qty, v_item.available_qty,
      'Deducted on order fulfillment/shipment', 'order', p_order_id::text, p_actor_id
    );

    v_fulfilled_count := v_fulfilled_count + 1;
  END LOOP;

  RETURN v_fulfilled_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION restock_returned_inventory(
  p_variant_id UUID,
  p_warehouse_id UUID,
  p_return_id UUID,
  p_quantity INTEGER,
  p_is_sellable BOOLEAN,
  p_actor_id UUID DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_item inventory_items%ROWTYPE;
BEGIN
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Restock quantity must be positive';
  END IF;

  SELECT * INTO v_item
  FROM inventory_items
  WHERE variant_id = p_variant_id AND warehouse_id = p_warehouse_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory record not found for variant %', p_variant_id;
  END IF;

  IF p_is_sellable THEN
    UPDATE inventory_items
    SET physical_qty = physical_qty + p_quantity, updated_at = NOW()
    WHERE id = v_item.id
    RETURNING * INTO v_item;

    INSERT INTO stock_movements (
      inventory_item_id, variant_id, warehouse_id, movement_type, qty_delta,
      physical_after, reserved_after, available_after, reason, reference_type, reference_id, actor_user_id
    ) VALUES (
      v_item.id, p_variant_id, p_warehouse_id, 'return_restocked', p_quantity,
      v_item.physical_qty, v_item.reserved_qty, v_item.available_qty,
      'Restocked after return inspection passed', 'return', p_return_id::text, p_actor_id
    );
  ELSE
    UPDATE inventory_items
    SET physical_qty = physical_qty + p_quantity,
        damaged_qty = damaged_qty + p_quantity,
        updated_at = NOW()
    WHERE id = v_item.id
    RETURNING * INTO v_item;

    INSERT INTO stock_movements (
      inventory_item_id, variant_id, warehouse_id, movement_type, qty_delta,
      physical_after, reserved_after, available_after, reason, reference_type, reference_id, actor_user_id
    ) VALUES (
      v_item.id, p_variant_id, p_warehouse_id, 'return_damaged', 0,
      v_item.physical_qty, v_item.reserved_qty, v_item.available_qty,
      'Returned item inspected as unsellable/damaged', 'return', p_return_id::text, p_actor_id
    );
  END IF;
END;
$$ LANGUAGE plpgsql;
