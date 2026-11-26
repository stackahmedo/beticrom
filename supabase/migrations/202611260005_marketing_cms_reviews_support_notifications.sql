-- Migration 0005: Marketing & Promotions, Storefront CMS, Reviews, Support & Notifications
-- Non-destructive, idempotent PostgreSQL 16+ schema

-- ============================================================================
-- 1. MARKETING: PROMOTIONS, COUPONS, FLASH SALES & CAMPAIGNS
-- ============================================================================
CREATE TABLE IF NOT EXISTS promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  promotion_type TEXT NOT NULL CHECK (
    promotion_type IN ('percentage', 'fixed', 'product_offer', 'category_offer', 'cart_discount', 'free_shipping', 'buy_x_get_y')
  ),
  discount_value NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (discount_value >= 0),
  max_discount_amount NUMERIC(14, 2) CHECK (max_discount_amount IS NULL OR max_discount_amount >= 0),
  min_purchase_amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (min_purchase_amount >= 0),
  buy_quantity INTEGER,
  get_quantity INTEGER,
  applies_to_category_ids UUID[] NOT NULL DEFAULT '{}',
  applies_to_product_ids UUID[] NOT NULL DEFAULT '{}',
  eligible_customer_group_ids UUID[] NOT NULL DEFAULT '{}',
  is_stackable BOOLEAN NOT NULL DEFAULT FALSE,
  priority INTEGER NOT NULL DEFAULT 0,
  usage_limit_total INTEGER,
  usage_limit_per_customer INTEGER,
  usage_count INTEGER NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'scheduled', 'expired', 'paused')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID REFERENCES promotions(id) ON DELETE SET NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed', 'free_shipping', 'buy_x_get_y')),
  discount_value NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (discount_value >= 0),
  min_purchase_amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (min_purchase_amount >= 0),
  max_discount_amount NUMERIC(14, 2) CHECK (max_discount_amount IS NULL OR max_discount_amount >= 0),
  usage_limit_total INTEGER,
  usage_limit_per_customer INTEGER DEFAULT 1,
  usage_count INTEGER NOT NULL DEFAULT 0,
  eligible_customer_group_ids UUID[] NOT NULL DEFAULT '{}',
  applies_to_category_ids UUID[] NOT NULL DEFAULT '{}',
  applies_to_product_ids UUID[] NOT NULL DEFAULT '{}',
  is_stackable BOOLEAN NOT NULL DEFAULT FALSE,
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons (UPPER(code)) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE RESTRICT,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_email TEXT,
  discount_applied NUMERIC(14, 2) NOT NULL DEFAULT 0,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon ON coupon_redemptions (coupon_id, customer_email);

CREATE TABLE IF NOT EXISTS flash_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  banner_image_url TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'active', 'ended', 'cancelled')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS flash_sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flash_sale_id UUID NOT NULL REFERENCES flash_sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  flash_price NUMERIC(14, 2) NOT NULL CHECK (flash_price >= 0),
  stock_limit INTEGER,
  sold_qty INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (flash_sale_id, product_id)
);

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'storefront' CHECK (channel IN ('storefront', 'email', 'social', 'push', 'sms')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'active', 'completed', 'paused')),
  budget_amount NUMERIC(14, 2) DEFAULT 0,
  spent_amount NUMERIC(14, 2) DEFAULT 0,
  currency_code CHAR(3) NOT NULL DEFAULT 'JPY',
  target_customer_group_id UUID REFERENCES customer_groups(id) ON DELETE SET NULL,
  promotion_id UUID REFERENCES promotions(id) ON DELETE SET NULL,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. STOREFRONT CMS (DRAFT / PUBLISHED / SCHEDULED + LIVE STOREFRONT SYNC)
-- ============================================================================
CREATE TABLE IF NOT EXISTS cms_homepage_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key TEXT NOT NULL UNIQUE, -- e.g. 'hero_slider', 'weekly_deals', 'featured_categories', 'featured_products'
  title TEXT NOT NULL,
  title_i18n JSONB NOT NULL DEFAULT '{}'::jsonb,
  subtitle TEXT,
  subtitle_i18n JSONB NOT NULL DEFAULT '{}'::jsonb,
  section_type TEXT NOT NULL CHECK (
    section_type IN ('hero_slider', 'banner_grid', 'featured_categories', 'featured_products', 'deal_carousel', 'custom_html', 'trust_strip', 'blog_highlights')
  ),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
  published_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cms_sliders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  title_i18n JSONB NOT NULL DEFAULT '{}'::jsonb,
  subtitle TEXT,
  subtitle_i18n JSONB NOT NULL DEFAULT '{}'::jsonb,
  cta_label TEXT,
  cta_label_i18n JSONB NOT NULL DEFAULT '{}'::jsonb,
  cta_url TEXT,
  desktop_image_url TEXT NOT NULL,
  mobile_image_url TEXT,
  placement TEXT NOT NULL DEFAULT 'homepage_hero',
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cms_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  title_i18n JSONB NOT NULL DEFAULT '{}'::jsonb,
  subtitle TEXT,
  image_url TEXT NOT NULL,
  mobile_image_url TEXT,
  link_url TEXT,
  placement TEXT NOT NULL DEFAULT 'homepage_mid' CHECK (placement IN ('homepage_top', 'homepage_mid', 'homepage_bottom', 'category_top', 'sidebar', 'popup')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cms_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  title_i18n JSONB NOT NULL DEFAULT '{}'::jsonb,
  content_markdown TEXT NOT NULL DEFAULT '',
  content_i18n JSONB NOT NULL DEFAULT '{}'::jsonb,
  template TEXT NOT NULL DEFAULT 'default',
  seo_title TEXT,
  seo_description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
  published_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  author_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS cms_menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location TEXT NOT NULL UNIQUE, -- 'header_primary', 'header_utility', 'footer_shop', 'footer_support', 'footer_legal'
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cms_menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id UUID NOT NULL REFERENCES cms_menus(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES cms_menu_items(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  label_i18n JSONB NOT NULL DEFAULT '{}'::jsonb,
  url TEXT NOT NULL,
  target TEXT NOT NULL DEFAULT '_self',
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS cms_blog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_i18n JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cms_blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES cms_blog_categories(id) ON DELETE SET NULL,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  title_i18n JSONB NOT NULL DEFAULT '{}'::jsonb,
  excerpt TEXT,
  content_markdown TEXT NOT NULL DEFAULT '',
  featured_image_url TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  seo_title TEXT,
  seo_description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
  published_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  author_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS cms_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_text TEXT,
  badge_i18n JSONB NOT NULL DEFAULT '{}'::jsonb,
  message TEXT NOT NULL,
  message_i18n JSONB NOT NULL DEFAULT '{}'::jsonb,
  link_url TEXT,
  bg_color TEXT DEFAULT '#12633D',
  text_color TEXT DEFAULT '#FFFFFF',
  is_dismissible BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  role_title TEXT NOT NULL,
  department TEXT,
  bio TEXT,
  avatar_url TEXT,
  email TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. PRODUCT REVIEWS & MODERATION
-- ============================================================================
CREATE TABLE IF NOT EXISTS product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  reviewer_name TEXT NOT NULL,
  reviewer_email TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  review_text TEXT NOT NULL,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_verified_purchase BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'rejected', 'hidden')),
  moderation_reason TEXT,
  moderated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  moderated_at TIMESTAMPTZ,
  merchant_reply TEXT,
  merchant_replied_by UUID REFERENCES users(id) ON DELETE SET NULL,
  merchant_replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_reviews_product ON product_reviews (product_id, status);

-- ============================================================================
-- 4. SUPPORT: CONTACT MESSAGES, TICKETS, NOTIFICATIONS & EMAIL OUTBOX
-- ============================================================================
CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_name TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  sender_phone TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'replied', 'archived', 'spam')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  internal_notes TEXT,
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  requester_name TEXT NOT NULL,
  requester_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_customer', 'resolved', 'closed')),
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'admin', 'system')),
  sender_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  sender_name TEXT NOT NULL,
  is_internal_note BOOLEAN NOT NULL DEFAULT FALSE,
  body TEXT NOT NULL,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL means broadcast to admins with permission
  required_permission TEXT,
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'new_order', 'new_registration', 'low_stock', 'out_of_stock',
      'payment_failed', 'return_requested', 'vendor_application',
      'delivery_failed', 'support_ticket', 'contact_message', 'system'
    )
  ),
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'success')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  action_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications (recipient_user_id, is_read, created_at DESC);

CREATE TABLE IF NOT EXISTS email_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  text_body TEXT,
  provider TEXT NOT NULL DEFAULT 'outbox',
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed')),
  provider_message_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);
