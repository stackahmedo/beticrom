import { Hono } from "hono";
import { cors } from "hono/cors";
import { getEnv } from "./config/env.js";
import { getDb } from "./db/client.js";
import { requireAdminAuth } from "./middleware/auth.js";
import authRoutes from "./domains/auth/routes.js";
import rbacRoutes from "./domains/rbac/routes.js";
import catalogRoutes from "./domains/catalog/routes.js";
import mediaRoutes from "./domains/media/routes.js";
import inventoryRoutes from "./domains/inventory/routes.js";
import orderRoutes from "./domains/orders/routes.js";
import { paymentAdminRoutes, webhookRoutes } from "./domains/payments/routes.js";
import returnRoutes from "./domains/returns/routes.js";
import customerRoutes from "./domains/customers/routes.js";
import shippingRoutes from "./domains/shipping/routes.js";
import vendorRoutes from "./domains/vendors/routes.js";
import marketingRoutes from "./domains/marketing/routes.js";
import cmsRoutes from "./domains/cms/routes.js";
import supportRoutes from "./domains/support/routes.js";
import dashboardRoutes from "./domains/dashboard/routes.js";
import settingsRoutes from "./domains/settings/routes.js";
import storefrontRoutes from "./domains/storefront/routes.js";

export function createApp() {
  const app = new Hono();
  const env = getEnv();

  app.use(
    "/api/*",
    cors({
      origin: (origin) => origin || env.APP_ORIGIN,
      allowHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      credentials: true,
    })
  );

  app.get("/api/health", async (c) => {
    const db = await getDb();
    await db.query("SELECT 1");
    return c.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Public & Storefront endpoints
  app.route("/api/v1/auth", authRoutes);
  app.route("/api/v1/storefront", storefrontRoutes);
  app.route("/api/v1/webhooks", webhookRoutes);
  app.route("/api/v1/media", mediaRoutes);

  // Admin Global Search
  app.get("/api/v1/admin/search", requireAdminAuth, async (c) => {
    const q = (c.req.query("q") || "").trim().toLowerCase();
    if (q.length < 2) return c.json({ data: { products: [], orders: [], customers: [] } });
    const like = `%${q}%`;
    const db = await getDb();
    const [products, orders, customers] = await Promise.all([
      db.query(
        "SELECT id, sku, name, status FROM products WHERE deleted_at IS NULL AND (LOWER(name) LIKE $1 OR LOWER(sku) LIKE $1) LIMIT 6",
        [like]
      ),
      db.query(
        "SELECT id, order_number, customer_name, status, total_amount FROM orders WHERE LOWER(order_number) LIKE $1 OR LOWER(customer_name) LIKE $1 LIMIT 6",
        [like]
      ),
      db.query(
        "SELECT id, customer_code, full_name, email FROM customers WHERE deleted_at IS NULL AND (LOWER(full_name) LIKE $1 OR LOWER(email) LIKE $1) LIMIT 6",
        [like]
      ),
    ]);
    return c.json({
      data: { products: products.rows, orders: orders.rows, customers: customers.rows },
    });
  });

  // Protected Admin Domain Routes
  app.route("/api/v1/admin/rbac", rbacRoutes);
  app.route("/api/v1/admin/catalog", catalogRoutes);
  app.route("/api/v1/admin/inventory", inventoryRoutes);
  app.route("/api/v1/admin/orders", orderRoutes);
  app.route("/api/v1/admin/payments", paymentAdminRoutes);
  app.route("/api/v1/admin/returns", returnRoutes);
  app.route("/api/v1/admin/customers", customerRoutes);
  app.route("/api/v1/admin/shipping", shippingRoutes);
  app.route("/api/v1/admin/vendors", vendorRoutes);
  app.route("/api/v1/admin/marketing", marketingRoutes);
  app.route("/api/v1/admin/cms", cmsRoutes);
  app.route("/api/v1/admin/support", supportRoutes);
  app.route("/api/v1/admin/analytics", dashboardRoutes);
  app.route("/api/v1/admin/settings", settingsRoutes);

  app.onError((err, c) => {
    console.error("[API Error]", err);
    return c.json(
      { error: { code: "INTERNAL_ERROR", message: err.message || "Unexpected server error" } },
      500
    );
  });

  return app;
}
