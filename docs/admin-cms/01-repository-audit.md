# Phase 1: Repository Audit & Gap Analysis

**Project:** Beticrom Halal Market (`beticrom-japan`)  
**Audit Date:** 2026-11-26  
**Scope:** Existing storefront, admin prototype, backend edge functions, data layer, UI library, and security posture.

---

## 1. Existing Technology Stack

| Layer | Current Technology | Version | Notes |
|---|---|---|---|
| Build Tool | Vite | `6.3.5` | `vite.config.ts` with `@` alias -> `./src` |
| UI Framework | React + TypeScript | `18.3.1` | SPA with hash-based routing in `src/app/App.tsx` |
| Styling | Tailwind CSS v4 + PostCSS | `4.1.12` | `@tailwindcss/vite`, design tokens in `src/styles/theme.css` |
| Component Library | shadcn/ui (Radix UI primitives) | 46 primitives | Full suite in `src/app/components/ui/` |
| Icons | Lucide React | `0.487.0` | Used across storefront and admin prototype |
| Charts | Recharts | `2.15.2` | Installed; not yet used in admin prototype |
| Forms | React Hook Form | `7.55.0` | Installed; Zod & TanStack Table/Query not yet installed |
| Notifications | Sonner | `2.0.3` | Installed in `src/app/components/ui/sonner.tsx` |
| Theming | `next-themes` | `0.4.6` | Light/dark tokens already present in `src/styles/theme.css` |
| Router | `react-router` | `7.13.0` | Installed in `package.json`, currently unused (`App.tsx` uses hash view state) |
| Backend Runtime | Supabase Edge Function (Hono / Deno) | Stub | `supabase/functions/server/index.tsx` has only `GET /api/health` |
| Database | None active (KV stub only) | N/A | `kv_store.tsx` references `kv_store` table; zero SQL migrations exist |
| Product Catalog | Static JSON | 948 records | `src/data/products.json` (~27,543 lines) |
| Testing | None | N/A | No `tsconfig.json`, no Vitest, no Playwright |

---

## 2. Existing Storefront Capabilities (Must Be Preserved)

All existing customer-facing functionality in `src/app/` must continue working seamlessly:

- **Trilingual UI (`JA`, `EN`, `BN`)**: Controlled via `locale` state in `src/app/App.tsx`.
- **Views (`src/app/types.ts`)**: `home`, `category`, `pdp`, `cart`, `checkout`, `account`, `admin`, synchronized via URL hash (`#product=...`, `#category=...`, `#cart`, `#checkout`, `#account`, `#admin`).
- **Storefront Components (`src/app/components/`)**:
  - `Header.tsx`: Announcement bar, logo, trilingual autocomplete search, language switcher, category navigation, cart badge.
  - `Homepage.tsx`: 9 deduplicated merchandising sections (Weekly Offers, Recommended, Halal Meat & Fish, Rice/Flour/Lentils, Family & Bulk, Frozen, Spices, Under ¥500, Recipes/Bundles).
  - `CategoryPage.tsx`: Multi-facet filtering (category, storage temp, halal tier, under ¥500, search, sort).
  - `PDPPage.tsx` & `ProductDetailModal.tsx`: Image gallery, halal tier badge, storage temperature badge, 7 product info tabs, add-to-cart.
  - `CartPage.tsx`: Cold-chain segregated cart grouping (Dry / Cool / Frozen) with free-shipping progress bar.
  - `CheckoutPage.tsx`: 4-step Japan checkout (address validation with 47 prefectures & postal regex, Yamato delivery time slots, 5 domestic payment methods, coupon input, order summary).
  - `AccountPage.tsx`: Static demo profile and reorder list.
  - `Footer.tsx` & `LegalModal.tsx`: Tokushoho, Privacy Policy, Shipping Policy, Buying Guide, Company Info, Contact, Returns, plus Admin Portal entry trigger.

---

## 3. Reusable Components & Business Logic

| Asset | Path | Reuse Strategy |
|---|---|---|
| 46 shadcn/ui primitives | `src/app/components/ui/*` | Reuse directly (`Sidebar`, `Table`, `Dialog`, `AlertDialog`, `Sheet`, `Tabs`, `Select`, `Popover`, `Command`, `Calendar`, `Badge`, `Card`, `Skeleton`, `Switch`, `Sonner`, `Tooltip`, `Breadcrumb`, etc.) |
| Domain badges | `src/app/components/ProductCard.tsx` (`HalalBadge`, `StorageBadge`) | Reuse in Admin Catalog, Inventory, and Order fulfillment tables |
| Japan Cold-Chain Shipping Engine | `src/app/types.ts` (`calculateShipping`) | Preserve as storefront fallback; parameterize via DB-driven Shipping Zones & Rates in Phase 5 |
| Japan Consumption Tax Engine | `src/app/types.ts` (`calculateJapanTax`) | 8% reduced tax (food) / 10% standard tax (services); port to backend authoritative calculation service |
| Currency & Taxonomy Helpers | `src/app/types.ts` (`formatYen`), `src/data/products.ts` (`isFamilyOrBulk`, `getUnitPrice`, `matchCategory`) | Reuse and make currency/locale configurable via Store Settings |
| Real Product Dataset | `src/data/products.json` | Non-destructive seed source for PostgreSQL catalog migration (948 products, 41 brands, 10 countries, 187 low-stock items) |
| Design Tokens | `src/styles/theme.css` | Already defines `--primary: #12633d`, `--sidebar: #0b4f2a`, `--destructive: #c92a2a`, plus `.dark` variables |

---

## 4. Data Quality Findings in `src/data/products.json`

Programmatic inspection of `src/data/products.json` revealed:
- **Total products:** `948`
- **Raw categories (9):** `Grocery`, `Frozen food`, `Frozen Foods`, `Meat & Fish`, `Spices & Seasoning`, `Health care`, `Fruits & Vegetables`, `Beauty Products`, `Beverage`.
  - *Inconsistency:* Both `"Frozen food"` and `"Frozen Foods"` exist — will be normalized during catalog seeding into canonical hierarchical categories while preserving legacy alias mapping for storefront compatibility.
- **Raw subcategories (17):** Includes empty string `""` for some products and mixed casing (`"oil and Ghee"`).
- **Distinct brands:** `41` (only 18 were hardcoded in `BRANDS` in `products.ts`).
- **Distinct countries:** `10` (`South Asia`, `India`, `Bangladesh`, `Pakistan`, `Japan`, `Nepal`, `Middle East`, `Vietnam`, `Myanmar`, `Thailand`).
- **Storage tiers:** `dry`, `frozen`, `cool`.
- **Halal tiers:** `certified`, `supplier`, `nopork`, `not_halal`.
- **Inventory distribution:** `0` out-of-stock, `187` low-stock (`stock <= 10`).
- **Missing fields in JSON:** No `sku` (uses 4-digit `id` + `listingId`), no `slug`, no `costPrice`, no `barcode`, no `weightGrams`, no `status`, no `taxClass`. Seeding will deterministically derive unique slugs, SKUs (`BTC-0001`), and default statuses without losing any existing JSON attributes.

---

## 5. Critical Gaps & Security Findings in Current Codebase

1. **Client-Side Hardcoded Admin Passcode (`CRITICAL`):** `src/app/App.tsx:25` defines `const ADMIN_PASSCODE = "beticrom-admin-2026"` in client bundle and prints it in the login dialog. Must be replaced with real server-side authentication, hashed passwords / Supabase Auth JWT, HTTP-only session cookies, optional MFA, and RBAC.
2. **Fabricated Admin Dashboard Metrics (`HIGH`):** `src/app/components/AdminPanel.tsx` displays hardcoded `¥1,248,000`, `+24.6%`, `186件`, 3 fake orders, and fake halal counts (`428 / 312 / 204 / 4`). All metrics must be computed from live PostgreSQL records.
3. **Client-Only Checkout & Coupons (`HIGH`):** `CheckoutPage.tsx` validates `BETICROM500` in browser JS and generates a random order ID via `setTimeout` without creating an order, reserving stock, or recording a payment. Must be wired to transactional backend APIs.
4. **No Persistent Database or Migrations (`HIGH`):** `supabase/functions/server/index.tsx` has only `/api/health`. No relational schema, foreign keys, transactions, or audit logs exist.
5. **Hardcoded Supabase Project Info (`MEDIUM`):** `utils/supabase/info.tsx` contains a hardcoded remote `projectId` and `publicAnonKey`. Local `.env` is absent. Remote Supabase data must NOT be modified or wiped; configuration must move to environment variables (`.env.example`).
6. **No TypeScript Config or Test Suite (`MEDIUM`):** Missing `tsconfig.json`, unit tests, integration tests, and E2E tests.
7. **Unused Dependencies & Heavy Packages (`LOW`):** `@mui/material` and `@mui/icons-material` are in `package.json` alongside shadcn/ui (Radix), unused by the storefront. We will leave `package.json` non-destructively intact unless cleanup is requested, and build the admin exclusively with Tailwind + shadcn/ui + Lucide + TanStack.

---

## 6. Assumptions, Missing Requirements & Integration Limitations

### Assumptions
1. **Stack Preservation:** Because Section 2 prohibits unnecessarily replacing the existing working Vite + React + TypeScript storefront, we will **preserve the Vite + React 18 frontend** and add a **modular TypeScript Hono API backend (`server/`)** backed by **PostgreSQL**, rather than rewriting the storefront into Next.js.
2. **Local-First PostgreSQL Execution:** No local `psql` or `supabase` CLI is installed in this Windows environment (Node v24.19.0 + npm 11.17.0 are installed; Docker is present). To guarantee zero-friction local execution with 100% real PostgreSQL semantics (foreign keys, `CHECK` constraints, `NUMERIC`, `TIMESTAMPTZ`, `JSONB`, `SELECT ... FOR UPDATE`, PL/pgSQL triggers/functions), the backend database adapter will:
   - Connect to external PostgreSQL / Supabase via `pg` whenever `DATABASE_URL` is configured.
   - Automatically boot an embedded persistent **PostgreSQL 16 (`@electric-sql/pglite`)** database stored in `.local/pgdata/` when `DATABASE_URL` is unset in local development.
3. **Single-Vendor Default, Multi-Vendor Toggleable:** Multi-vendor marketplace routes, UI, and vendor checkout splitting are controlled via the `multi_vendor_enabled` feature flag in `store_settings` (default `false`, toggleable by Super Admin in System -> Store Settings -> Feature Flags, and fully implemented in Phase 8).
4. **Development Seed Data Isolation:** Demo seed records (sample orders, customers, CMS banners, default dev super-admin account) are loaded ONLY when `NODE_ENV=development` and `ENABLE_DEV_SEED=true` (never in production).

### External Integration Limitations (Configurable Adapters)
- **Cloudflare R2:** Implemented behind a `MediaStorageAdapter` interface (`R2StorageAdapter` using S3-compatible presigned/authenticated requests when `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` are provided; automatic `LocalDiskStorageAdapter` serving validated uploads from `.local/uploads/` in local dev).
- **Resend Email:** Implemented behind a `MailerAdapter` interface (`ResendMailerAdapter` when `RESEND_API_KEY` is configured; `DatabaseOutboxMailerAdapter` logging emails to `email_outbox` / console in local dev).
- **Payment Gateways (Stripe / PayPay):** Webhook endpoints implement real HMAC-SHA256 signature verification, timestamp tolerance, replay protection (`payment_webhooks.event_id` unique constraint), and idempotency keys. Live gateway charges require operator API keys (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PAYPAY_API_KEY`) configured via `.env`; test/manual capture & signed webhook simulation are supported for verification and tests.
- **Supabase Auth:** Dual-mode auth verifier supports Supabase JWT verification when `SUPABASE_URL` + `SUPABASE_JWT_SECRET` are set, plus built-in PostgreSQL scrypt password hashing + HTTP-only secure session cookies + TOTP MFA so local/standalone deployments have full production-grade security without external cloud dependency.
