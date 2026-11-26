# Beticrom E-Commerce Admin Panel & Storefront CMS — Operations, API & Deployment Guide

## 1. Local Setup & Running

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Configure environment (optional for local dev):**
   ```bash
   cp .env.example .env
   ```
   - Leave `DATABASE_URL` empty to automatically use embedded persistent PostgreSQL 16 (`PGlite`) at `.local/pgdata/`.
   - Set `DATABASE_URL` to a PostgreSQL / Supabase connection string for external DB execution.
3. **Start Backend API & Frontend Dev Server:**
   - Terminal 1 (API server on `:3001`, runs migrations + seeds 948 products + dev admin):
     ```bash
     npm run dev:api
     ```
   - Terminal 2 (Vite frontend on `:5173`, proxies `/api/*` -> `:3001`):
     ```bash
     npm run dev
     ```
4. **Access Admin Panel:**
   - Open `http://localhost:5173/#admin` (or click the footer Admin link).
   - Dev Super Admin credentials (only seeded when `NODE_ENV=development` and `ENABLE_DEV_SEED=true`):
     - Email: `admin@beticrom.jp`
     - Password: `ChangeMe!2026`

---

## 2. API Reference Summary (`/api/v1`)

| Domain | Endpoints | Auth & Permissions |
|---|---|---|
| **Auth** | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `GET/DELETE /auth/sessions`, `POST /auth/change-password`, `POST /auth/recover`, `POST /auth/reset-password`, `POST /auth/mfa/setup`, `POST /auth/mfa/enable`, `POST /auth/mfa/disable` | Public login/recover; Session cookie + CSRF or Bearer |
| **RBAC & Audit** | `GET/POST/PATCH/DELETE /admin/rbac/users`, `GET/POST /admin/rbac/roles`, `PUT /admin/rbac/roles/:id/permissions`, `GET /admin/rbac/permissions`, `GET /admin/rbac/audit-logs` | `users.read`, `users.manage`, `roles.manage`, `audit.read` |
| **Catalog** | `GET/POST/PATCH/DELETE /admin/catalog/products`, `POST /products/:id/duplicate`, `POST /products/bulk`, `GET/POST/PATCH/DELETE /categories`, `GET/POST /brands`, `/countries`, `/attributes`, `GET /variants`, `GET /products-export`, `GET /products-import/template`, `POST /products-import/run` | `products.*`, `taxonomy.*`, `products.import_export` |
| **Media** | `GET /media`, `POST /media/upload`, `DELETE /media/:id`, `GET /media/files/*` | `media.read`, `media.write` |
| **Inventory** | `GET /admin/inventory/stock`, `POST /adjust`, `GET /movements`, `GET/POST /warehouses`, `/suppliers`, `/purchase-orders`, `POST /purchase-orders/:id/receive` | `inventory.*`, `warehouses.manage`, `suppliers.manage`, `purchase_orders.manage` |
| **Orders** | `GET /admin/orders`, `GET /orders/invoices`, `GET /orders/:id`, `POST /orders/:id/transition`, `POST /orders/:id/notes`, `PATCH /orders/:id/assign` | `orders.read`, `orders.update`, `orders.fulfill`, `invoices.read` |
| **Payments & Webhooks** | `GET/PATCH /admin/payments/methods`, `GET /transactions`, `POST /transactions/record`, `POST /transactions/:id/reconcile`, `POST /webhooks/:provider` | `payments.*`; Webhooks verified via HMAC-SHA256 |
| **Returns & Refunds** | `GET/POST /admin/returns`, `GET /returns/:id`, `POST /returns/:id/transition`, `POST /returns/refunds` | `returns.*`, `refunds.create` |
| **Customers** | `GET/POST /admin/customers/groups`, `GET/PATCH /admin/customers`, `GET /customers/:id/gdpr-export`, `POST /customers/:id/gdpr-anonymize` | `customers.read`, `customers.write` |
| **Shipping** | `GET/POST /admin/shipping/{countries,regions,cities,zones,rates,couriers}`, `GET/PATCH /shipments` | `shipping.read`, `shipping.write` |
| **Vendors** | `GET/POST/PATCH /admin/vendors`, `GET /applications`, `POST /applications/:id/decision`, `GET/POST /payouts` | `vendors.read`, `vendors.manage` |
| **Marketing** | `GET/POST /admin/marketing/{offers,coupons,flash-sales,campaigns}`, `GET/PATCH /reviews` | `marketing.*`, `reviews.moderate` |
| **CMS** | `GET/POST/PATCH /admin/cms/{homepage-sections,sliders,banners,pages,menus,blog/categories,blog/posts,announcements,team}` | `cms.read`, `cms.write` |
| **Support** | `GET/PATCH /admin/support/contact-messages`, `GET/POST /tickets`, `GET/POST /notifications` | `support.*`, `notifications.read` |
| **Analytics & Settings** | `GET /admin/analytics/dashboard`, `GET /admin/analytics/reports`, `GET/PUT /admin/settings/:key` | `dashboard.read`, `reports.read`, `settings.*` |
| **Storefront Live Sync** | `GET /storefront/bootstrap`, `GET /storefront/products`, `POST /storefront/coupons/validate`, `POST /storefront/checkout`, `POST /storefront/contact` | Public (rate-limited) |

---

## 3. Production Deployment Checklist

- [ ] Set `NODE_ENV=production` and `ENABLE_DEV_SEED=false`.
- [ ] Generate cryptographically random 32+ byte secrets for `SESSION_SECRET` and `MFA_ENCRYPTION_KEY`.
- [ ] Configure `DATABASE_URL` pointing to managed PostgreSQL / Supabase PostgreSQL and run `npm run db:migrate`.
- [ ] Configure `APP_ORIGIN` to the exact HTTPS domain (for CORS & secure cookies).
- [ ] Configure `MEDIA_STORAGE_PROVIDER=r2` with `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE_URL`.
- [ ] Configure `RESEND_API_KEY` and `EMAIL_FROM` for transactional emails.
- [ ] Configure `STRIPE_WEBHOOK_SECRET` and/or `PAYPAY_WEBHOOK_SECRET` for server-side webhook verification.
- [ ] Create the initial production Super Admin user via CLI/seed script and immediately enroll TOTP MFA.
- [ ] Enable automated daily `pg_dump` backups and test `pg_restore` against staging.
