-- Migration 0004: Customers, Configurable Shipping Hierarchy, Orders, Payments, Shipments, Returns & Refunds
-- Non-destructive, idempotent PostgreSQL 16+ schema

-- ============================================================================
-- 1. CUSTOMERS & CUSTOMER GROUPS
-- ============================================================================
CREATE TABLE IF NOT EXISTS customer_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  customer_group_id UUID REFERENCES customer_groups(id) ON DELETE SET NULL,
  customer_code TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  name_kana TEXT,
  phone TEXT,
  locale TEXT NOT NULL DEFAULT 'JA',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked', 'anonymized')),
  accepts_marketing BOOLEAN NOT NULL DEFAULT FALSE,
  internal_notes TEXT,
  total_orders_count INTEGER NOT NULL DEFAULT 0,
  total_spent_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  currency_code CHAR(3) NOT NULL DEFAULT 'JPY',
  last_order_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_customers_email ON customers (LOWER(email)) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_customers_group ON customers (customer_group_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  label TEXT DEFAULT 'Default',
  recipient_name TEXT NOT NULL,
  recipient_kana TEXT,
  phone TEXT NOT NULL,
  country_code TEXT NOT NULL DEFAULT 'JP',
  region_name TEXT NOT NULL,
  city_name TEXT NOT NULL,
  area_name TEXT,
  postal_code TEXT NOT NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  is_default_shipping BOOLEAN NOT NULL DEFAULT FALSE,
  is_default_billing BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer ON customer_addresses (customer_id);

-- ============================================================================
-- 2. CONFIGURABLE GEOGRAPHIC & SHIPPING MANAGEMENT (NO HARDCODED COUNTRIES)
-- ============================================================================
CREATE TABLE IF NOT EXISTS shipping_countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code CHAR(2) NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_i18n JSONB NOT NULL DEFAULT '{}'::jsonb,
  currency_code CHAR(3) NOT NULL DEFAULT 'JPY',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shipping_regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id UUID NOT NULL REFERENCES shipping_countries(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  name_i18n JSONB NOT NULL DEFAULT '{}'::jsonb,
  division_type TEXT NOT NULL DEFAULT 'region', -- 'prefecture', 'state', 'division', 'province'
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (country_id, code)
);

CREATE TABLE IF NOT EXISTS shipping_cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id UUID NOT NULL REFERENCES shipping_regions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_i18n JSONB NOT NULL DEFAULT '{}'::jsonb,
  postal_code_prefix TEXT,
  area_name TEXT,
  cod_allowed BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_shipping_cities_region ON shipping_cities (region_id);

CREATE TABLE IF NOT EXISTS shipping_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  cod_allowed BOOLEAN NOT NULL DEFAULT TRUE,
  estimated_min_days INTEGER NOT NULL DEFAULT 1,
  estimated_max_days INTEGER NOT NULL DEFAULT 3,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shipping_zone_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES shipping_zones(id) ON DELETE CASCADE,
  country_id UUID REFERENCES shipping_countries(id) ON DELETE CASCADE,
  region_id UUID REFERENCES shipping_regions(id) ON DELETE CASCADE,
  city_id UUID REFERENCES shipping_cities(id) ON DELETE CASCADE,
  postal_code_pattern TEXT -- e.g. '100-*' or regex
);

CREATE INDEX IF NOT EXISTS idx_shipping_zone_loc_zone ON shipping_zone_locations (zone_id);

CREATE TABLE IF NOT EXISTS shipping_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES shipping_zones(id) ON DELETE CASCADE,
  shipping_class_id UUID REFERENCES shipping_classes(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  rate_type TEXT NOT NULL CHECK (rate_type IN ('flat', 'weight_based', 'price_based', 'free_threshold')),
  base_rate NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (base_rate >= 0),
  per_kg_rate NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (per_kg_rate >= 0),
  min_weight_grams NUMERIC(12, 2) DEFAULT 0,
  max_weight_grams NUMERIC(12, 2),
  free_shipping_threshold NUMERIC(14, 2),
  cold_surcharge NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (cold_surcharge >= 0),
  currency_code CHAR(3) NOT NULL DEFAULT 'JPY',
  cod_allowed BOOLEAN NOT NULL DEFAULT TRUE,
  estimated_delivery_label TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pickup_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  address_line1 TEXT NOT NULL,
  city TEXT NOT NULL,
  region TEXT,
  postal_code TEXT,
  country_code CHAR(2) NOT NULL DEFAULT 'JP',
  phone TEXT,
  opening_hours TEXT,
  instructions TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS couriers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE, -- e.g. 'yamato', 'sagawa', 'japan_post'
  name TEXT NOT NULL,
  tracking_url_template TEXT, -- e.g. 'https://jizen.kuronekoyamato.co.jp/jizen/servlet/crjz.b.NQ0010?id={tracking_number}'
  supports_cod BOOLEAN NOT NULL DEFAULT TRUE,
  supports_cold_chain BOOLEAN NOT NULL DEFAULT TRUE,
  contact_phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. ORDERS, SNAPSHOTS, STATUS HISTORY, NOTES & INVOICES
-- ============================================================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  invoice_number TEXT UNIQUE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL, -- NULL for single-vendor or parent marketplace order
  parent_order_id UUID REFERENCES orders(id) ON DELETE SET NULL, -- For multi-vendor sub-orders
  assigned_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Separate independent lifecycles per specification Section 10
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN (
      'pending', 'confirmed', 'processing', 'packed', 'shipped',
      'out_for_delivery', 'delivered', 'completed',
      'cancelled', 'delivery_failed', 'returned'
    )
  ),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    payment_status IN ('pending', 'authorized', 'paid', 'partially_paid', 'failed', 'partially_refunded', 'refunded', 'voided')
  ),
  fulfillment_status TEXT NOT NULL DEFAULT 'unfulfilled' CHECK (
    fulfillment_status IN ('unfulfilled', 'partially_fulfilled', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'delivery_failed', 'returned')
  ),
  return_status TEXT NOT NULL DEFAULT 'none' CHECK (
    return_status IN ('none', 'requested', 'partially_returned', 'returned', 'rejected')
  ),

  -- Customer & Address Snapshots at order time
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  shipping_address JSONB NOT NULL,
  billing_address JSONB NOT NULL,

  -- Logistics & Payment Selection
  payment_method_code TEXT NOT NULL,
  shipping_method_name TEXT,
  delivery_time_slot TEXT,
  delivery_date_preference TEXT,
  customer_notes TEXT,
  coupon_code TEXT,

  -- Monetary Breakdown (exact NUMERIC + explicit currency)
  subtotal_amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (subtotal_amount >= 0),
  discount_amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  tax_amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  tax_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  shipping_amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (shipping_amount >= 0),
  payment_fee_amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (payment_fee_amount >= 0),
  total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  paid_amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  refunded_amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (refunded_amount >= 0),
  currency_code CHAR(3) NOT NULL DEFAULT 'JPY',

  -- Operational timestamps
  due_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  source_channel TEXT NOT NULL DEFAULT 'storefront',
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_vendor ON orders (vendor_id, created_at DESC) WHERE vendor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders (created_at DESC);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,

  -- Order-time immutable snapshots
  product_name TEXT NOT NULL,
  variant_title TEXT,
  sku TEXT NOT NULL,
  image_url TEXT,
  storage_type TEXT DEFAULT 'dry',
  halal_tier TEXT,

  quantity INTEGER NOT NULL CHECK (quantity > 0),
  fulfilled_qty INTEGER NOT NULL DEFAULT 0 CHECK (fulfilled_qty >= 0 AND fulfilled_qty <= quantity),
  returned_qty INTEGER NOT NULL DEFAULT 0 CHECK (returned_qty >= 0 AND returned_qty <= quantity),
  unit_price NUMERIC(14, 2) NOT NULL CHECK (unit_price >= 0),
  cost_price NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
  discount_amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  tax_rate_percent NUMERIC(6, 3) NOT NULL DEFAULT 8.000,
  tax_amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  line_total NUMERIC(14, 2) NOT NULL CHECK (line_total >= 0),
  commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
  commission_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  currency_code CHAR(3) NOT NULL DEFAULT 'JPY',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items (product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_vendor ON order_items (vendor_id) WHERE vendor_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  field_changed TEXT NOT NULL DEFAULT 'status', -- 'status', 'payment_status', 'fulfillment_status', 'return_status'
  reason TEXT,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON order_status_history (order_id, created_at DESC);

CREATE TABLE IF NOT EXISTS order_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  author_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  is_customer_visible BOOLEAN NOT NULL DEFAULT FALSE,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('draft', 'issued', 'paid', 'partially_refunded', 'refunded', 'void')),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_at TIMESTAMPTZ,
  subtotal_amount NUMERIC(14, 2) NOT NULL,
  discount_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  shipping_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(14, 2) NOT NULL,
  currency_code CHAR(3) NOT NULL DEFAULT 'JPY',
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 4. PAYMENTS, TRANSACTIONS & WEBHOOK REPLAY PROTECTION
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE, -- 'cod', 'card', 'bank', 'paypay', 'konbini'
  name TEXT NOT NULL,
  name_i18n JSONB NOT NULL DEFAULT '{}'::jsonb,
  provider TEXT NOT NULL, -- 'manual', 'stripe', 'paypay', 'bank_transfer', 'cod'
  method_type TEXT NOT NULL CHECK (method_type IN ('cod', 'card', 'bank_transfer', 'digital_wallet', 'gateway')),
  description TEXT,
  fee_amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (fee_amount >= 0),
  currency_code CHAR(3) NOT NULL DEFAULT 'JPY',
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  is_test_mode BOOLEAN NOT NULL DEFAULT TRUE,
  public_config JSONB NOT NULL DEFAULT '{}'::jsonb, -- Never store raw secrets here
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  payment_method_code TEXT NOT NULL,
  provider TEXT NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('authorization', 'capture', 'charge', 'manual_payment', 'void')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'cancelled')),
  amount NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
  currency_code CHAR(3) NOT NULL DEFAULT 'JPY',
  gateway_reference TEXT,
  idempotency_key TEXT UNIQUE,
  reconciled BOOLEAN NOT NULL DEFAULT FALSE,
  reconciled_at TIMESTAMPTZ,
  reconciled_by UUID REFERENCES users(id) ON DELETE SET NULL,
  failure_code TEXT,
  failure_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb, -- Tokenized/safe metadata only, NEVER raw PAN/CVV
  recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_tx_order ON payment_transactions (order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_tx_ref ON payment_transactions (gateway_reference);

CREATE TABLE IF NOT EXISTS payment_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  signature_verified BOOLEAN NOT NULL DEFAULT FALSE,
  payload_hash TEXT NOT NULL,
  payload JSONB NOT NULL,
  processing_status TEXT NOT NULL DEFAULT 'received' CHECK (processing_status IN ('received', 'processed', 'ignored', 'failed')),
  error_message TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  UNIQUE (provider, event_id) -- Replay protection at DB layer
);

-- ============================================================================
-- 5. SHIPMENTS & TRACKING EVENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_number TEXT NOT NULL UNIQUE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  courier_id UUID REFERENCES couriers(id) ON DELETE SET NULL,
  courier_name TEXT,
  tracking_number TEXT,
  tracking_url TEXT,
  temperature_zone TEXT NOT NULL DEFAULT 'dry' CHECK (temperature_zone IN ('dry', 'cool', 'frozen')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'packed', 'label_created', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'delivery_failed', 'returned')
  ),
  attempt_count INTEGER NOT NULL DEFAULT 1,
  shipping_cost NUMERIC(14, 2) NOT NULL DEFAULT 0,
  weight_grams NUMERIC(12, 2) DEFAULT 0,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failure_reason TEXT,
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipments_order ON shipments (order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking ON shipments (tracking_number);

CREATE TABLE IF NOT EXISTS shipment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  location TEXT,
  description TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================================
-- 6. RETURNS & REFUNDS (WITH REFUND BALANCE GUARD TRIGGER)
-- ============================================================================
CREATE TABLE IF NOT EXISTS returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_number TEXT NOT NULL UNIQUE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'return_requested' CHECK (
    status IN (
      'return_requested', 'under_review', 'approved', 'rejected',
      'product_received', 'inspected', 'refund_or_replacement', 'completed'
    )
  ),
  return_type TEXT NOT NULL DEFAULT 'partial' CHECK (return_type IN ('partial', 'full')),
  resolution TEXT CHECK (resolution IN ('refund', 'partial_refund', 'replacement', 'rejected')),
  reason TEXT NOT NULL,
  customer_notes TEXT,
  evidence_images JSONB NOT NULL DEFAULT '[]'::jsonb,
  rejection_reason TEXT,
  inspection_notes TEXT,
  inspection_result TEXT CHECK (inspection_result IN ('sellable', 'damaged', 'partial_sellable')),
  requested_refund_amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (requested_refund_amount >= 0),
  approved_refund_amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (approved_refund_amount >= 0),
  replacement_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  currency_code CHAR(3) NOT NULL DEFAULT 'JPY',
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  inspected_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_returns_order ON returns (order_id);
CREATE INDEX IF NOT EXISTS idx_returns_status ON returns (status, created_at DESC);

CREATE TABLE IF NOT EXISTS return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE RESTRICT,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  condition TEXT CHECK (condition IN ('unopened', 'opened', 'damaged', 'expired', 'wrong_item')),
  is_sellable BOOLEAN,
  restocked BOOLEAN NOT NULL DEFAULT FALSE,
  refund_amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (refund_amount >= 0)
);

CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_number TEXT NOT NULL UNIQUE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  return_id UUID REFERENCES returns(id) ON DELETE SET NULL,
  payment_transaction_id UUID REFERENCES payment_transactions(id) ON DELETE RESTRICT,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  currency_code CHAR(3) NOT NULL DEFAULT 'JPY',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  reason TEXT NOT NULL,
  gateway_reference TEXT,
  idempotency_key TEXT UNIQUE,
  processed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refunds_order ON refunds (order_id);

-- Enforce that total non-failed refunds for an order NEVER exceed remaining refundable payment balance
CREATE OR REPLACE FUNCTION enforce_refund_balance_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_paid_total NUMERIC(14, 2);
  v_existing_refunded NUMERIC(14, 2);
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_paid_total
  FROM payment_transactions
  WHERE order_id = NEW.order_id
    AND status = 'succeeded'
    AND transaction_type IN ('capture', 'charge', 'manual_payment');

  SELECT COALESCE(SUM(amount), 0) INTO v_existing_refunded
  FROM refunds
  WHERE order_id = NEW.order_id
    AND status IN ('pending', 'processing', 'completed')
    AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF (v_existing_refunded + NEW.amount) > v_paid_total THEN
    RAISE EXCEPTION 'Refund amount (%) exceeds remaining refundable balance (% paid - % already refunded)',
      NEW.amount, v_paid_total, v_existing_refunded;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_refund_balance ON refunds;
CREATE TRIGGER trg_enforce_refund_balance
BEFORE INSERT OR UPDATE OF amount, status ON refunds
FOR EACH ROW
WHEN (NEW.status IN ('pending', 'processing', 'completed'))
EXECUTE FUNCTION enforce_refund_balance_limit();

-- Prevent deleting immutable financial/stock ledger entries
CREATE OR REPLACE FUNCTION prevent_immutable_ledger_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Immutable financial or audit ledger rows cannot be deleted from %', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_no_delete_payment_tx ON payment_transactions;
CREATE TRIGGER trg_no_delete_payment_tx
BEFORE DELETE ON payment_transactions
FOR EACH ROW EXECUTE FUNCTION prevent_immutable_ledger_delete();

DROP TRIGGER IF EXISTS trg_no_delete_refunds ON refunds;
CREATE TRIGGER trg_no_delete_refunds
BEFORE DELETE ON refunds
FOR EACH ROW EXECUTE FUNCTION prevent_immutable_ledger_delete();

DROP TRIGGER IF EXISTS trg_no_delete_stock_movements ON stock_movements;
CREATE TRIGGER trg_no_delete_stock_movements
BEFORE DELETE ON stock_movements
FOR EACH ROW EXECUTE FUNCTION prevent_immutable_ledger_delete();
