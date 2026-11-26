-- Migration 0007: Food & Grocery Batch/Expiry (FEFO), Warehouse Stock Transfers, and CMS Version History
-- Non-destructive, idempotent PostgreSQL 16+ schema

CREATE TABLE IF NOT EXISTS inventory_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  batch_number TEXT NOT NULL,
  expiry_date DATE,
  received_qty INTEGER NOT NULL DEFAULT 0 CHECK (received_qty >= 0),
  remaining_qty INTEGER NOT NULL DEFAULT 0 CHECK (remaining_qty >= 0),
  unit_cost NUMERIC(14, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (variant_id, warehouse_id, batch_number)
);

CREATE INDEX IF NOT EXISTS idx_inventory_batches_expiry ON inventory_batches (expiry_date ASC NULLS LAST) WHERE remaining_qty > 0;

CREATE TABLE IF NOT EXISTS stock_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_number TEXT NOT NULL UNIQUE,
  variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
  from_warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  to_warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'in_transit', 'completed', 'cancelled')),
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cms_homepage_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_number INTEGER NOT NULL,
  label TEXT,
  snapshot JSONB NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
