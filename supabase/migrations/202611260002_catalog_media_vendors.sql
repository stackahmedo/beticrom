-- Migration 0002: Vendors, Catalog Taxonomy, Media Library, Products & Variants
-- Non-destructive, idempotent PostgreSQL 16+ schema

-- ============================================================================
-- 1. OPTIONAL MULTI-VENDOR MARKETPLACE ENTITIES
-- ============================================================================
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  slug TEXT NOT NULL UNIQUE,
  business_name TEXT NOT NULL,
  legal_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  logo_url TEXT,
  banner_url TEXT,
  description TEXT,
  tax_registration_number TEXT,
  commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 10.00 CHECK (commission_rate >= 0 AND commission_rate <= 100),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive', 'suspended', 'rejected')),
  verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'under_review', 'verified', 'rejected')),
  payout_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_vendors_owner ON vendors (owner_user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vendors_status ON vendors (status) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS vendor_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  applicant_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  business_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  business_type TEXT,
  documents JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'approved', 'rejected')),
  review_notes TEXT,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendor_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
  payout_number TEXT NOT NULL UNIQUE,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  gross_amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (gross_amount >= 0),
  commission_amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (commission_amount >= 0),
  adjustments_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  currency_code CHAR(3) NOT NULL DEFAULT 'JPY',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'cancelled')),
  reference_number TEXT,
  paid_at TIMESTAMPTZ,
  processed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_payouts_vendor ON vendor_payouts (vendor_id, created_at DESC);

-- ============================================================================
-- 2. TAXONOMY: CATEGORIES, BRANDS, COUNTRIES, TAX/SHIPPING CLASSES, ATTRIBUTES
-- ============================================================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES categories(id) ON DELETE RESTRICT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_i18n JSONB NOT NULL DEFAULT '{}'::jsonb, -- {"JA": "...", "EN": "...", "BN": "..."}
  description TEXT,
  description_i18n JSONB NOT NULL DEFAULT '{}'::jsonb,
  image_url TEXT,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  seo_title TEXT,
  seo_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories (parent_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_categories_sort ON categories (sort_order, name) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  website_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS countries_of_origin (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE, -- ISO alpha-2 or region slug e.g. 'JP', 'BD', 'IN', 'SOUTH_ASIA'
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_i18n JSONB NOT NULL DEFAULT '{}'::jsonb,
  flag_emoji TEXT,
  image_url TEXT,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tax_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE, -- e.g. 'food_reduced_8', 'standard_10', 'zero_rated'
  name TEXT NOT NULL,
  rate_percent NUMERIC(6, 3) NOT NULL DEFAULT 0 CHECK (rate_percent >= 0 AND rate_percent <= 100),
  is_tax_inclusive BOOLEAN NOT NULL DEFAULT TRUE,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shipping_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE, -- e.g. 'dry', 'cool', 'frozen', 'bulky'
  name TEXT NOT NULL,
  description TEXT,
  surcharge_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  currency_code CHAR(3) NOT NULL DEFAULT 'JPY',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  input_type TEXT NOT NULL DEFAULT 'select' CHECK (input_type IN ('select', 'color', 'text', 'number')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attribute_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attribute_id UUID NOT NULL REFERENCES attributes(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  value TEXT NOT NULL,
  swatch_hex TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (attribute_id, slug)
);

-- ============================================================================
-- 3. MEDIA LIBRARY
-- ============================================================================
CREATE TABLE IF NOT EXISTS media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_provider TEXT NOT NULL DEFAULT 'local' CHECK (storage_provider IN ('local', 'r2', 'external')),
  storage_key TEXT NOT NULL,
  url TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL DEFAULT 0 CHECK (size_bytes >= 0),
  width INTEGER,
  height INTEGER,
  alt_text TEXT,
  folder TEXT NOT NULL DEFAULT 'general',
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_media_assets_folder ON media_assets (folder, created_at DESC) WHERE deleted_at IS NULL;

-- ============================================================================
-- 4. PRODUCTS, GALLERY IMAGES, VARIANTS & IMPORT JOBS
-- ============================================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id TEXT UNIQUE,        -- Maps to existing products.json "0001".."0948"
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  category_id UUID REFERENCES categories(id) ON DELETE RESTRICT,
  subcategory_id UUID REFERENCES categories(id) ON DELETE RESTRICT,
  brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
  origin_country_id UUID REFERENCES countries_of_origin(id) ON DELETE SET NULL,
  tax_class_id UUID REFERENCES tax_classes(id) ON DELETE SET NULL,
  shipping_class_id UUID REFERENCES shipping_classes(id) ON DELETE SET NULL,
  supplier_name TEXT,

  name TEXT NOT NULL,
  name_i18n JSONB NOT NULL DEFAULT '{}'::jsonb,
  slug TEXT NOT NULL UNIQUE,
  sku TEXT NOT NULL UNIQUE,
  barcode TEXT,
  short_description TEXT,
  full_description TEXT,

  regular_price NUMERIC(14, 2) NOT NULL CHECK (regular_price >= 0),
  sale_price NUMERIC(14, 2) CHECK (sale_price IS NULL OR sale_price >= 0),
  cost_price NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
  currency_code CHAR(3) NOT NULL DEFAULT 'JPY',

  featured_image_url TEXT,
  video_url TEXT,
  weight_grams NUMERIC(12, 2) DEFAULT 0 CHECK (weight_grams >= 0),
  length_cm NUMERIC(10, 2),
  width_cm NUMERIC(10, 2),
  height_cm NUMERIC(10, 2),

  -- Domain-specific grocery metadata (preserved from Beticrom storefront)
  storage_type TEXT NOT NULL DEFAULT 'dry' CHECK (storage_type IN ('dry', 'cool', 'frozen')),
  halal_tier TEXT NOT NULL DEFAULT 'certified' CHECK (halal_tier IN ('certified', 'supplier', 'nopork', 'not_halal')),
  unit_label TEXT,

  tags TEXT[] NOT NULL DEFAULT '{}',
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  is_new BOOLEAN NOT NULL DEFAULT FALSE,
  is_best_seller BOOLEAN NOT NULL DEFAULT FALSE,
  has_variants BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'inactive', 'archived')),

  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT,

  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_products_status ON products (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category_id, subcategory_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_vendor ON products (vendor_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_brand ON products (brand_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_tags ON products USING GIN (tags);

CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  media_asset_id UUID REFERENCES media_assets(id) ON DELETE SET NULL,
  url TEXT NOT NULL,
  alt_text TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images (product_id, sort_order);

CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku TEXT NOT NULL UNIQUE,
  barcode TEXT,
  title TEXT NOT NULL DEFAULT 'Default',
  regular_price NUMERIC(14, 2) NOT NULL CHECK (regular_price >= 0),
  sale_price NUMERIC(14, 2) CHECK (sale_price IS NULL OR sale_price >= 0),
  cost_price NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
  currency_code CHAR(3) NOT NULL DEFAULT 'JPY',
  weight_grams NUMERIC(12, 2) DEFAULT 0 CHECK (weight_grams >= 0),
  image_url TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants (product_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS product_variant_attributes (
  variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  attribute_id UUID NOT NULL REFERENCES attributes(id) ON DELETE CASCADE,
  attribute_value_id UUID NOT NULL REFERENCES attribute_values(id) ON DELETE CASCADE,
  PRIMARY KEY (variant_id, attribute_id)
);

CREATE TABLE IF NOT EXISTS product_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  background_job_id UUID REFERENCES background_jobs(id) ON DELETE SET NULL,
  filename TEXT NOT NULL,
  file_format TEXT NOT NULL CHECK (file_format IN ('csv', 'xlsx')),
  duplicate_policy TEXT NOT NULL DEFAULT 'skip' CHECK (duplicate_policy IN ('skip', 'update')),
  column_mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'validating', 'processing', 'completed', 'completed_with_errors', 'failed')),
  total_rows INTEGER NOT NULL DEFAULT 0,
  processed_rows INTEGER NOT NULL DEFAULT 0,
  created_count INTEGER NOT NULL DEFAULT 0,
  updated_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  error_report JSONB NOT NULL DEFAULT '[]'::jsonb,
  idempotency_key TEXT UNIQUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
