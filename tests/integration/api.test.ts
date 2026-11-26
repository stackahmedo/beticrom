import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createInMemoryTestDb, setDbForTests, type DbClient } from "../../server/db/client";
import { runMigrations } from "../../server/db/migrate";
import { seedDevEnvironment } from "../../server/db/seed";
import { createApp } from "../../server/app";
import { hashPassword, hmacSha256Hex } from "../../server/utils/crypto";

let db: DbClient;
let app: ReturnType<typeof createApp>;
let adminToken = "";
let adminCsrf = "";

describe("Full-Stack Admin & Storefront API Integration Tests", () => {
  beforeAll(async () => {
    process.env.NODE_ENV = "development";
    process.env.ENABLE_DEV_SEED = "true";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_integration_test";

    db = await createInMemoryTestDb();
    setDbForTests(db);
    await runMigrations(db);
    await seedDevEnvironment(db);
    app = createApp();
  });

  afterAll(async () => {
    setDbForTests(null);
    await db.close();
  });

  it("rejects unauthenticated admin requests and authenticates Super Admin", async () => {
    const unauthRes = await app.request("/api/v1/admin/analytics/dashboard");
    expect(unauthRes.status).toBe(401);

    const badLogin = await app.request("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@beticrom.jp", password: "wrong-password" }),
    });
    expect(badLogin.status).toBe(401);

    const okLogin = await app.request("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@beticrom.jp", password: "ChangeMe!2026" }),
    });
    expect(okLogin.status).toBe(200);
    const json = (await okLogin.json()) as { data: { sessionToken: string; csrfToken: string } };
    adminToken = json.data.sessionToken;
    adminCsrf = json.data.csrfToken;
    expect(adminToken).toBeTruthy();
  });

  it("enforces RBAC permissions and protects last Super Admin", async () => {
    // Create a Content Manager user
    const roleRes = await db.query<{ id: string }>("SELECT id FROM roles WHERE slug = 'content_manager'");
    const contentUserRes = await app.request("/api/v1/admin/rbac/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
        "X-CSRF-Token": adminCsrf,
      },
      body: JSON.stringify({
        email: "content@beticrom.jp",
        fullName: "Content Editor",
        password: "Password!123",
        roleIds: [roleRes.rows[0].id],
      }),
    });
    expect(contentUserRes.status).toBe(201);

    const cmLogin = await app.request("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "content@beticrom.jp", password: "Password!123" }),
    });
    const cmJson = (await cmLogin.json()) as { data: { sessionToken: string } };

    // Content Manager cannot view orders or manage users
    const deniedOrders = await app.request("/api/v1/admin/orders", {
      headers: { Authorization: `Bearer ${cmJson.data.sessionToken}` },
    });
    expect(deniedOrders.status).toBe(403);

    // Last Super Admin cannot be deleted
    const superRes = await db.query<{ id: string }>("SELECT id FROM users WHERE email = 'admin@beticrom.jp'");
    const delSuper = await app.request(`/api/v1/admin/rbac/users/${superRes.rows[0].id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(delSuper.status).toBe(400);
  });

  it("supports Product CRUD, duplicate SKU rejection, and Product Import", async () => {
    const createRes = await app.request("/api/v1/admin/catalog/products", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: "Halal Mutton Curry Cut 1kg",
        sku: "TEST-MUTTON-1",
        regularPrice: 1580,
        costPrice: 1000,
        stockQuantity: 1,
        storageType: "frozen",
        halalTier: "certified",
        status: "active",
      }),
    });
    expect(createRes.status).toBe(201);

    // Duplicate SKU must fail
    const dupRes = await app.request("/api/v1/admin/catalog/products", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: "Duplicate Mutton",
        sku: "TEST-MUTTON-1",
        regularPrice: 1580,
        status: "active",
      }),
    });
    expect(dupRes.status).toBe(400);

    // Import CSV rows
    const impRes = await app.request("/api/v1/admin/catalog/products-import/run", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        filename: "test.csv",
        fileFormat: "csv",
        duplicatePolicy: "skip",
        rows: [
          { sku: "IMP-001", name: "Imported Spice", regular_price: 450, stock_quantity: 25, status: "active" },
          { sku: "BAD-ROW", name: "", regular_price: -10 },
        ],
      }),
    });
    expect(impRes.status).toBe(201);
    const impJson = (await impRes.json()) as { data: { created_count: number; error_count: number } };
    expect(impJson.data.created_count).toBe(1);
    expect(impJson.data.error_count).toBe(1);
  });

  it("prevents overselling under concurrent order placement and releases stock on cancellation", async () => {
    const prodRes = await db.query<{ id: string }>("SELECT id FROM products WHERE sku = 'TEST-MUTTON-1'");
    const productId = prodRes.rows[0].id;

    const makeCheckout = (email: string) =>
      app.request("/api/v1/storefront/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ productId, quantity: 1 }],
          shippingAddress: {
            fullName: "Concurrent Buyer",
            email,
            phone: "09012345678",
            postalCode: "124-0025",
            prefecture: "Tokyo",
            city: "Katsushika",
            addressLine1: "1-2-11",
          },
          paymentMethodCode: "cod",
        }),
      });

    // Race two concurrent orders for the last 1 unit in stock
    const [r1, r2] = await Promise.all([makeCheckout("a@test.jp"), makeCheckout("b@test.jp")]);
    const statuses = [r1.status, r2.status].sort();
    expect(statuses).toEqual([201, 400]);

    const winnerRes = r1.status === 201 ? r1 : r2;
    const winner = (await winnerRes.json()) as { data: { id: string } };

    // Cancel winning order -> reservation released -> available stock returns to 1
    const cancelRes = await app.request(`/api/v1/admin/orders/${winner.data.id}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ toStatus: "cancelled", reason: "Customer requested cancel" }),
    });
    expect(cancelRes.status).toBe(200);

    const invCheck = await db.query<{ available_qty: number }>(
      "SELECT inv.available_qty FROM inventory_items inv JOIN product_variants pv ON pv.id = inv.variant_id WHERE pv.product_id = $1",
      [productId]
    );
    expect(invCheck.rows[0].available_qty).toBe(1);
  });

  it("handles webhook replay protection, partial returns, and refund balance limits", async () => {
    const prodRes = await db.query<{ id: string }>("SELECT id FROM products WHERE sku = 'IMP-001'");
    const checkoutRes = await app.request("/api/v1/storefront/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ productId: prodRes.rows[0].id, quantity: 4 }],
        shippingAddress: {
          fullName: "Webhook Buyer",
          email: "wh@test.jp",
          phone: "09012345678",
          postalCode: "124-0025",
          prefecture: "Tokyo",
          city: "Katsushika",
          addressLine1: "1-2-11",
        },
        paymentMethodCode: "card",
        couponCode: "BETICROM500",
      }),
    });
    expect(checkoutRes.status).toBe(201);
    const order = (await checkoutRes.json()) as { data: { id: string; total_amount: string } };

    // Signed Stripe webhook
    const payload = JSON.stringify({
      id: "evt_unique_001",
      type: "payment_intent.succeeded",
      data: { orderId: order.data.id, amount: Number(order.data.total_amount), paymentMethod: "card" },
    });
    const ts = Math.floor(Date.now() / 1000);
    const sig = hmacSha256Hex("whsec_integration_test", `${ts}.${payload}`);

    const wh1 = await app.request("/api/v1/webhooks/stripe", {
      method: "POST",
      headers: { "Stripe-Signature": `t=${ts},v1=${sig}` },
      body: payload,
    });
    expect(wh1.status).toBe(200);
    const wh1Json = (await wh1.json()) as { data: { replay: boolean } };
    expect(wh1Json.data.replay).toBe(false);

    // Replay same event -> detected and ignored
    const wh2 = await app.request("/api/v1/webhooks/stripe", {
      method: "POST",
      headers: { "Stripe-Signature": `t=${ts},v1=${sig}` },
      body: payload,
    });
    const wh2Json = (await wh2.json()) as { data: { replay: boolean } };
    expect(wh2Json.data.replay).toBe(true);

    // Refund exceeding paid balance must be rejected by DB trigger
    const badRefund = await app.request("/api/v1/admin/returns/refunds", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ orderId: order.data.id, amount: 999999, reason: "Over-refund attempt" }),
    });
    expect(badRefund.status).toBe(400);

    // Partial refund within balance succeeds
    const okRefund = await app.request("/api/v1/admin/returns/refunds", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ orderId: order.data.id, amount: 200, reason: "Partial item refund" }),
    });
    expect(okRefund.status).toBe(201);
  });

  it("enforces vendor data isolation and live CMS publishing", async () => {
    // Create Vendor A user + Vendor A record + Vendor B record
    const passHash = await hashPassword("VendorPass!123");
    const vRole = await db.query<{ id: string }>("SELECT id FROM roles WHERE slug = 'vendor'");
    const uA = await db.query<{ id: string }>(
      "INSERT INTO users (email, password_hash, full_name, status) VALUES ('va@test.jp', $1, 'Vendor A', 'active') RETURNING id",
      [passHash]
    );
    await db.query("INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)", [uA.rows[0].id, vRole.rows[0].id]);
    const vA = await db.query<{ id: string }>(
      "INSERT INTO vendors (owner_user_id, slug, business_name, email, status) VALUES ($1, 'va', 'Vendor A Co', 'va@test.jp', 'active') RETURNING id",
      [uA.rows[0].id]
    );
    const vB = await db.query<{ id: string }>(
      "INSERT INTO vendors (slug, business_name, email, status) VALUES ('vb', 'Vendor B Co', 'vb@test.jp', 'active') RETURNING id"
    );
    const pB = await db.query<{ id: string }>(
      "INSERT INTO products (vendor_id, name, slug, sku, regular_price, status) VALUES ($1, 'Vendor B Secret', 'vb-secret', 'VB-1', 500, 'active') RETURNING id",
      [vB.rows[0].id]
    );
    void vA;

    const vALogin = await app.request("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "va@test.jp", password: "VendorPass!123" }),
    });
    const vAToken = ((await vALogin.json()) as { data: { sessionToken: string } }).data.sessionToken;

    // Vendor A cannot access Vendor B's product
    const crossRead = await app.request(`/api/v1/admin/catalog/products/${pB.rows[0].id}`, {
      headers: { Authorization: `Bearer ${vAToken}` },
    });
    expect(crossRead.status).toBe(403);

    // CMS draft vs published sync
    await app.request("/api/v1/admin/cms/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ title: "Draft Page", slug: "draft-page", status: "draft" }),
    });
    await app.request("/api/v1/admin/cms/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ title: "Live Halal Guide", slug: "live-guide", status: "published" }),
    });
    const bs = await app.request("/api/v1/storefront/bootstrap");
    const bsJson = (await bs.json()) as { data: { cms: { pages: Array<{ slug: string }> } } };
    const slugs = bsJson.data.cms.pages.map((p) => p.slug);
    expect(slugs).toContain("live-guide");
    expect(slugs).not.toContain("draft-page");
  });
});
