-- Migration 0006: Default RBAC Roles & Permissions, Baseline Store Settings & RLS Isolation Policies
-- Strictly idempotent (ON CONFLICT DO NOTHING) - safe for repeated runs and production databases

-- ============================================================================
-- 1. DEFAULT 8 SYSTEM ROLES
-- ============================================================================
INSERT INTO roles (slug, name, description, is_system) VALUES
  ('super_admin', 'Super Admin', 'Unrestricted access to all modules, security, RBAC, and settings', TRUE),
  ('store_manager', 'Store Manager', 'Full operational management of catalog, orders, inventory, marketing, and CMS', TRUE),
  ('order_manager', 'Order Manager', 'Manage orders, fulfillment, shipments, invoices, and returns', TRUE),
  ('inventory_manager', 'Inventory Manager', 'Manage stock levels, movements, warehouses, suppliers, and purchase orders', TRUE),
  ('finance_manager', 'Finance Manager', 'Manage payments, transactions, refunds, invoices, vendor payouts, and financial reports', TRUE),
  ('content_manager', 'Content Manager', 'Manage storefront CMS, sliders, banners, pages, menus, blog, media, and SEO', TRUE),
  ('customer_support', 'Customer Support', 'Manage customers, contact messages, support tickets, order notes, and reviews', TRUE),
  ('vendor', 'Vendor', 'Vendor-isolated access to own store profile, products, inventory, orders, and payouts', TRUE)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- 2. GRANULAR PERMISSION MATRIX
-- ============================================================================
INSERT INTO permissions (key, module, name, description) VALUES
  -- Overview
  ('dashboard.read', 'overview', 'View Dashboard', 'View admin KPI dashboard and operational alerts'),
  ('analytics.read', 'overview', 'View Analytics', 'View detailed sales and performance analytics'),
  -- Sales & Orders
  ('orders.read', 'sales', 'View Orders', 'View orders and order details'),
  ('orders.update', 'sales', 'Manage Orders', 'Confirm, process, cancel, assign, and update order status'),
  ('orders.fulfill', 'sales', 'Fulfill Orders', 'Pack, ship, assign couriers, and print packing slips'),
  ('returns.read', 'sales', 'View Returns', 'View return requests and inspection details'),
  ('returns.manage', 'sales', 'Manage Returns', 'Approve, reject, inspect, and restock returns'),
  ('payments.read', 'sales', 'View Payments', 'View payment transactions and reconciliation records'),
  ('payments.manage', 'sales', 'Manage Payments', 'Record manual payments and reconcile transactions'),
  ('refunds.create', 'sales', 'Process Refunds', 'Issue full or partial refunds'),
  ('invoices.read', 'sales', 'View Invoices', 'View and print customer invoices'),
  -- Catalog
  ('products.read', 'catalog', 'View Products', 'View product catalog and variants'),
  ('products.write', 'catalog', 'Create & Edit Products', 'Create, update, duplicate, and bulk-edit products'),
  ('products.delete', 'catalog', 'Archive & Delete Products', 'Archive or soft-delete products'),
  ('products.import_export', 'catalog', 'Import & Export Products', 'Run CSV/XLSX product imports and filtered exports'),
  ('taxonomy.read', 'catalog', 'View Taxonomy', 'View categories, brands, countries, and attributes'),
  ('taxonomy.write', 'catalog', 'Manage Taxonomy', 'Create, update, and safely reassign categories, brands, countries, and attributes'),
  -- Inventory
  ('inventory.read', 'inventory', 'View Inventory', 'View SKU stock levels and movements'),
  ('inventory.adjust', 'inventory', 'Adjust Inventory', 'Adjust stock quantities, damage write-offs, and thresholds'),
  ('warehouses.manage', 'inventory', 'Manage Warehouses', 'Create and edit warehouses'),
  ('suppliers.manage', 'inventory', 'Manage Suppliers', 'Create and edit suppliers'),
  ('purchase_orders.manage', 'inventory', 'Manage Purchase Orders', 'Create purchase orders and receive stock'),
  -- People & Vendors
  ('customers.read', 'people', 'View Customers', 'View customer profiles, addresses, and history'),
  ('customers.write', 'people', 'Manage Customers', 'Edit customer details, groups, status, and GDPR actions'),
  ('vendors.read', 'people', 'View Vendors', 'View vendor profiles, applications, and payouts'),
  ('vendors.manage', 'people', 'Manage Vendors', 'Approve/reject vendor applications, set commissions, and manage payouts'),
  ('vendor.self', 'people', 'Vendor Self-Service', 'Manage own vendor store, products, inventory, and orders'),
  ('team.manage', 'people', 'Manage Team Members', 'Manage public team member directory'),
  -- Marketing
  ('marketing.read', 'marketing', 'View Marketing', 'View offers, coupons, flash sales, and campaigns'),
  ('marketing.write', 'marketing', 'Manage Marketing', 'Create and edit offers, coupons, flash sales, and campaigns'),
  ('reviews.moderate', 'marketing', 'Moderate Reviews', 'Approve, reject, hide, and reply to product reviews'),
  -- Storefront CMS & Media
  ('cms.read', 'cms', 'View CMS', 'View homepage sections, sliders, banners, pages, menus, blog, and announcements'),
  ('cms.write', 'cms', 'Manage CMS', 'Create, edit, schedule, and publish storefront CMS content'),
  ('media.read', 'cms', 'View Media Library', 'Browse uploaded media assets'),
  ('media.write', 'cms', 'Manage Media Library', 'Upload and delete media assets'),
  -- Logistics
  ('shipping.read', 'logistics', 'View Shipping', 'View geographic hierarchy, zones, rates, couriers, and shipments'),
  ('shipping.write', 'logistics', 'Manage Shipping', 'Configure countries, regions, cities, zones, rates, pickup, couriers, and shipments'),
  -- Support & Notifications
  ('support.read', 'support', 'View Support', 'View contact messages and support tickets'),
  ('support.manage', 'support', 'Manage Support', 'Assign, reply, add internal notes, and resolve tickets/messages'),
  ('notifications.read', 'support', 'View Notifications', 'View and mark admin notifications as read'),
  -- System
  ('reports.read', 'system', 'View & Export Reports', 'Access financial, sales, inventory, tax, and customer reports'),
  ('users.read', 'system', 'View Admin Users', 'View admin user accounts'),
  ('users.manage', 'system', 'Manage Admin Users', 'Create, update, deactivate, and assign roles to admin users'),
  ('roles.manage', 'system', 'Manage Roles & Permissions', 'Create custom roles and modify permission assignments'),
  ('audit.read', 'system', 'View Audit Logs', 'Inspect system and financial audit trails'),
  ('settings.read', 'system', 'View Settings', 'View store, SEO, payment, email, and integration settings'),
  ('settings.manage', 'system', 'Manage Settings', 'Modify store settings, feature flags, and maintenance mode')
ON CONFLICT (key) DO NOTHING;

-- Assign ALL permissions to super_admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.slug = 'super_admin'
ON CONFLICT DO NOTHING;

-- Store Manager permissions (all operational except RBAC role mutation)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.key NOT IN ('roles.manage', 'users.manage')
WHERE r.slug = 'store_manager'
ON CONFLICT DO NOTHING;

-- Order Manager permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.key IN (
  'dashboard.read', 'orders.read', 'orders.update', 'orders.fulfill',
  'returns.read', 'returns.manage', 'invoices.read', 'shipping.read', 'shipping.write',
  'customers.read', 'notifications.read'
)
WHERE r.slug = 'order_manager'
ON CONFLICT DO NOTHING;

-- Inventory Manager permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.key IN (
  'dashboard.read', 'products.read', 'inventory.read', 'inventory.adjust',
  'warehouses.manage', 'suppliers.manage', 'purchase_orders.manage',
  'reports.read', 'notifications.read'
)
WHERE r.slug = 'inventory_manager'
ON CONFLICT DO NOTHING;

-- Finance Manager permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.key IN (
  'dashboard.read', 'analytics.read', 'orders.read', 'payments.read', 'payments.manage',
  'refunds.create', 'invoices.read', 'returns.read', 'vendors.read', 'vendors.manage',
  'reports.read', 'audit.read', 'notifications.read'
)
WHERE r.slug = 'finance_manager'
ON CONFLICT DO NOTHING;

-- Content Manager permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.key IN (
  'dashboard.read', 'cms.read', 'cms.write', 'media.read', 'media.write',
  'products.read', 'taxonomy.read', 'marketing.read', 'marketing.write',
  'team.manage', 'settings.read', 'notifications.read'
)
WHERE r.slug = 'content_manager'
ON CONFLICT DO NOTHING;

-- Customer Support permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.key IN (
  'dashboard.read', 'orders.read', 'returns.read', 'customers.read', 'customers.write',
  'support.read', 'support.manage', 'reviews.moderate', 'notifications.read'
)
WHERE r.slug = 'customer_support'
ON CONFLICT DO NOTHING;

-- Vendor permissions (scoped strictly by vendor_id in API & RLS)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.key IN (
  'dashboard.read', 'vendor.self', 'products.read', 'products.write',
  'inventory.read', 'inventory.adjust', 'orders.read', 'orders.fulfill',
  'media.read', 'media.write', 'notifications.read'
)
WHERE r.slug = 'vendor'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 3. BASELINE CONFIGURABLE STORE SETTINGS, TAX, SHIPPING & PAYMENT METHODS
-- ============================================================================
INSERT INTO store_settings (key, category, value, is_public) VALUES
  ('store.profile', 'general', '{"name":"Beticrom Halal Market","tagline":"Halal Food, Spices & World Groceries","logoUrl":"/beticrom-logo.png","contactEmail":"contact@beticrom.jp","contactPhone":"03-5654-6417","address":"Tokyo, Japan","currency":"JPY","currencySymbol":"¥","defaultLocale":"JA","supportedLocales":["JA","EN","BN"],"timezone":"Asia/Tokyo"}'::jsonb, TRUE),
  ('store.seo', 'seo', '{"metaTitle":"Beticrom Halal Market | Halal Food, Spices & World Groceries in Japan","metaDescription":"Verified halal groceries, fresh meats, frozen foods, spices, and pantry essentials delivered nationwide in Japan.","ogImage":"/beticrom-logo.png","robotsIndex":true}'::jsonb, TRUE),
  ('store.tax', 'general', '{"enabled":true,"pricesIncludeTax":true,"defaultFoodRate":8,"defaultServiceRate":10}'::jsonb, TRUE),
  ('store.invoice', 'order', '{"prefix":"INV","nextSequence":1001,"footerNote":"Thank you for shopping with Beticrom Halal Market."}'::jsonb, FALSE),
  ('store.order_policy', 'order', '{"orderPrefix":"BC","reservationExpiryMinutes":60,"autoCompleteAfterDeliveredDays":7,"overduePendingHours":24}'::jsonb, FALSE),
  ('store.return_policy', 'return', '{"returnWindowDays":14,"allowPerishableReturns":false,"requireEvidencePhotos":true,"autoRestockAfterInspection":true}'::jsonb, TRUE),
  ('store.email', 'email', '{"provider":"outbox","fromName":"Beticrom Halal Market","fromEmail":"noreply@beticrom.jp","replyTo":"contact@beticrom.jp"}'::jsonb, FALSE),
  ('store.social', 'general', '{"facebook":"","instagram":"","line":"","youtube":""}'::jsonb, TRUE),
  ('store.maintenance', 'general', '{"enabled":false,"message":"We are performing scheduled maintenance. Please check back shortly."}'::jsonb, TRUE),
  ('feature_flags', 'feature_flags', '{"multi_vendor_enabled":false,"reviews_enabled":true,"blog_enabled":true,"flash_sales_enabled":true,"mfa_optional":true}'::jsonb, TRUE),
  ('store.integrations', 'integrations', '{"storageProvider":"local","r2Bucket":"","resendConfigured":false,"stripeConfigured":false,"paypayConfigured":false}'::jsonb, FALSE)
ON CONFLICT (key) DO NOTHING;

INSERT INTO tax_classes (code, name, rate_percent, is_tax_inclusive, is_default) VALUES
  ('food_reduced_8', 'Reduced Food Tax (8%)', 8.000, TRUE, TRUE),
  ('standard_10', 'Standard Consumption Tax (10%)', 10.000, TRUE, FALSE),
  ('zero_rated', 'Zero Rated / Exempt (0%)', 0.000, TRUE, FALSE)
ON CONFLICT (code) DO NOTHING;

INSERT INTO shipping_classes (code, name, description, surcharge_amount, currency_code) VALUES
  ('dry', 'Ambient / Dry Parcel', 'Standard room-temperature parcel', 0, 'JPY'),
  ('cool', 'Chilled / Cool Parcel', 'Temperature-controlled chilled delivery', 330, 'JPY'),
  ('frozen', 'Frozen Cold-Chain Parcel', 'Sub-zero frozen cold-chain delivery', 330, 'JPY')
ON CONFLICT (code) DO NOTHING;

INSERT INTO warehouses (code, name, address_line1, city, region, postal_code, country_code, supports_cold_chain, is_default) VALUES
  ('TYO-MAIN', 'Tokyo Main Fulfillment Center', 'Nishi-Shinkoiwa 1-2-11', 'Katsushika-ku', 'Tokyo', '124-0025', 'JP', TRUE, TRUE)
ON CONFLICT (code) DO NOTHING;

INSERT INTO customer_groups (slug, name, description, discount_percent, is_default) VALUES
  ('retail', 'Retail Customers', 'Standard retail shoppers', 0, TRUE),
  ('vip', 'VIP Members', 'Repeat high-value customers', 5, FALSE),
  ('wholesale', 'Restaurant & Wholesale', 'Bulk B2B halal buyers', 10, FALSE)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO payment_methods (code, name, name_i18n, provider, method_type, description, fee_amount, is_enabled, is_test_mode, sort_order) VALUES
  ('card', 'Credit Card (Stripe)', '{"JA":"クレジットカード","EN":"Credit Card (Stripe)","BN":"ক্রেডিট কার্ড"}'::jsonb, 'stripe', 'card', 'Visa, Mastercard, JCB, Amex', 0, TRUE, TRUE, 1),
  ('paypay', 'PayPay', '{"JA":"PayPay（ペイペイ）","EN":"PayPay","BN":"পেপে"}'::jsonb, 'paypay', 'digital_wallet', 'Instant smartphone QR payment', 0, TRUE, TRUE, 2),
  ('konbini', 'Convenience Store (Konbini)', '{"JA":"コンビニ決済","EN":"Convenience Store (Konbini)","BN":"কনভিনি পেমেন্ট"}'::jsonb, 'stripe', 'gateway', '7-Eleven, Lawson, FamilyMart', 110, TRUE, TRUE, 3),
  ('bank', 'Bank Transfer', '{"JA":"銀行振込（前払い）","EN":"Bank Transfer (Pre-payment)","BN":"ব্যাংক ট্রান্সফার"}'::jsonb, 'bank_transfer', 'bank_transfer', 'Direct bank transfer prior to dispatch', 0, TRUE, FALSE, 4),
  ('cod', 'Cash on Delivery (COD)', '{"JA":"代金引換（着払い）","EN":"Cash on Delivery (COD)","BN":"ক্যাশ অন ডেলিভারি"}'::jsonb, 'cod', 'cod', 'Pay cash to courier upon delivery', 330, TRUE, FALSE, 5)
ON CONFLICT (code) DO NOTHING;

INSERT INTO couriers (code, name, tracking_url_template, supports_cod, supports_cold_chain, contact_phone) VALUES
  ('yamato', 'Yamato Transport (Cool TA-Q-BIN)', 'https://jizen.kuronekoyamato.co.jp/jizen/servlet/crjz.b.NQ0010?id={tracking_number}', TRUE, TRUE, '0120-01-9625'),
  ('sagawa', 'Sagawa Express', 'https://k2k.sagawa-exp.co.jp/p/web/okurijosearch.do?okurijoNo={tracking_number}', TRUE, TRUE, '0120-18-9595'),
  ('japan_post', 'Japan Post (Yu-Pack)', 'https://trackings.post.japanpost.jp/services/srv/search/?requestNo1={tracking_number}', TRUE, TRUE, '0120-23-2886')
ON CONFLICT (code) DO NOTHING;

INSERT INTO shipping_countries (code, name, name_i18n, currency_code, sort_order) VALUES
  ('JP', 'Japan', '{"JA":"日本","EN":"Japan","BN":"জাপান"}'::jsonb, 'JPY', 1)
ON CONFLICT (code) DO NOTHING;

INSERT INTO shipping_zones (code, name, description, cod_allowed, estimated_min_days, estimated_max_days, sort_order) VALUES
  ('jp-mainland', 'Japan Mainland (Honshu / Shikoku / Kyushu)', 'Standard domestic delivery across mainland Japan', TRUE, 1, 2, 1),
  ('jp-remote', 'Hokkaido & Okinawa', 'Extended transit zone for northern & southern islands', TRUE, 2, 4, 2)
ON CONFLICT (code) DO NOTHING;

INSERT INTO cms_menus (location, name) VALUES
  ('header_primary', 'Header Main Navigation'),
  ('footer_shop', 'Footer Shop Links'),
  ('footer_support', 'Footer Customer Support'),
  ('footer_legal', 'Footer Legal & Policies')
ON CONFLICT (location) DO NOTHING;

-- ============================================================================
-- 4. ROW-LEVEL SECURITY (RLS) FOR VENDOR DATA ISOLATION
-- Uses PostgreSQL session variables app.current_vendor_id / app.is_global_admin
-- Compatible with both Supabase PostgreSQL and standalone PostgreSQL/PGlite
-- ============================================================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS products_vendor_isolation ON products;
CREATE POLICY products_vendor_isolation ON products
  USING (
    current_setting('app.current_vendor_id', true) IS NULL
    OR current_setting('app.current_vendor_id', true) = ''
    OR vendor_id::text = current_setting('app.current_vendor_id', true)
  );

DROP POLICY IF EXISTS orders_vendor_isolation ON orders;
CREATE POLICY orders_vendor_isolation ON orders
  USING (
    current_setting('app.current_vendor_id', true) IS NULL
    OR current_setting('app.current_vendor_id', true) = ''
    OR vendor_id::text = current_setting('app.current_vendor_id', true)
  );

DROP POLICY IF EXISTS order_items_vendor_isolation ON order_items;
CREATE POLICY order_items_vendor_isolation ON order_items
  USING (
    current_setting('app.current_vendor_id', true) IS NULL
    OR current_setting('app.current_vendor_id', true) = ''
    OR vendor_id::text = current_setting('app.current_vendor_id', true)
  );

DROP POLICY IF EXISTS vendor_payouts_vendor_isolation ON vendor_payouts;
CREATE POLICY vendor_payouts_vendor_isolation ON vendor_payouts
  USING (
    current_setting('app.current_vendor_id', true) IS NULL
    OR current_setting('app.current_vendor_id', true) = ''
    OR vendor_id::text = current_setting('app.current_vendor_id', true)
  );
