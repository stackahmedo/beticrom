# E-Commerce Design System & Layout Specification

## Executive Summary
This document specifies the complete design system, page hierarchy, and section architecture for **MyBIMI Halal Market**, spanning the customer storefront (Homepage, Category PLP, Product PDP, Cart, Checkout, Account) and operational merchant administration.

---

## Design System Architecture
This architecture defines the complete modern ecommerce UI/UX design system for “MyBIMI Halal Market”, a dedicated halal grocery EC platform in Japan.

The design must feel modern, professional, trustworthy, mobile-first, conversion-focused, and future-proof for at least 3 years. It should be inspired by the strong product discovery, category density, deal sections, and shopping flow of SHEIN, but must NOT copy SHEIN branding or layout exactly. Adapt the idea for halal grocery, frozen foods, pantry items, South Asian groceries, and Japan-based ecommerce.

Brand name:
MyBIMI Halal Market

Japanese name:
マイビミ・ハラール市場

Business:
MyBIMI sells halal groceries in Japan: halal meat, frozen food, rice, flour, spices, lentils, snacks, drinks, baby products, beauty/personal care, and daily essentials. Target users are Muslim residents in Japan, Bangladeshi, Indian, Pakistani, Nepali, Indonesian customers, and Japanese halal-curious customers.

Main design goal:
Make the site look richer, more complete, more premium, more commercial, and more trustworthy than a simple prototype. Avoid too much empty white space. Add more homepage content, better product discovery, stronger trust sections, stronger product cards, better footer, and stronger MyBIMI branding.

Use these brand colors:
- Primary deep halal green: #11683A
- Dark green: #0B4F2A
- MyBIMI red / offer red: #D92D20
- Warm orange/gold accent: #F59E0B
- Background warm white: #FAF8F3
- Card white: #FFFFFF
- Text charcoal: #1F2933
- Muted text: #6B7280
- Border: #E5E7EB
- Frozen badge blue: #E0F2FE
- Halal badge green: #DCFCE7
- Cool badge teal: #CCFBF1
- Warning/low-stock amber: #FEF3C7

Typography:
Use clean modern ecommerce typography.
Japanese and English must look balanced.
Use strong headings, readable body text, and clear product pricing.
Use font scale:
- Display: 48 / 56
- H1: 40 / 48
- H2: 28 / 36
- H3: 22 / 30
- Body: 16 / 24
- Small: 13 / 18
- Product title: 16 / 22 semibold
- Price: 22 / 28 bold

Core Storefront Pages:
1. Design System
2. Desktop Homepage
3. Mobile Homepage
4. Category / Product Listing Page
5. Product Detail Page
6. Cart Drawer
7. Checkout Flow
8. Account / Reorder Page
9. Admin Panel Dashboard
10. Admin Product Management
11. Admin Order Management

Frame sizes:
- Desktop: 1440px width
- Desktop content max width: 1200px to 1280px
- Mobile: 390px width
- Tablet: 768px width optional
Use 12-column desktop grid, 4-column tablet grid, 2-column mobile product grid.

Create a full design system with:
- Color tokens
- Typography tokens
- Spacing tokens: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80
- Radius tokens: 8, 12, 16, 20, 24, full
- Shadow tokens: soft card shadow, floating cart shadow, modal shadow
- Buttons: primary, secondary, outline, ghost, danger
- Inputs: search, text input, select, quantity stepper, postal code checker
- Badges: Certified Halal, Supplier-Declared, No Pork / No Alcohol, Dry, Cool, Frozen, New, Sale, Low Stock
- Product card variants: default, compact, deal, out-of-stock, added-to-cart
- Category tile variants: image tile, icon tile, country pill
- Navigation components
- Cart components
- Checkout form components
- Admin table components

Desktop Homepage layout:

1. Top announcement bar
Full-width green bar.
Text: “🚚 Free dry shipping on orders over ¥6,500”
Add close icon on right.
Add small coupon message optional: “New customer coupon: MYBIMI500”

2. Header
White sticky header with soft shadow.
Left: MyBIMI logo placeholder + “MyBIMI Halal Market”
Center: large search bar with placeholder “Search rice, halal meat, spices, frozen food...”
Right: Delivery to / postal code checker, JA / EN / BN language switcher, Account, Wishlist, Cart.
Cart should show item count badge.

3. Mega navigation row
Horizontal categories:
Deals, Halal Meat, Frozen Foods, Rice & Flour, Spices, Lentils, Snacks, Drinks, Baby, Beauty, Shop by Country.
Add hover-style mega menu sample for “Halal Meat” with subcategories.

4. Hero section
Large premium hero banner with high-quality halal grocery / grilled meat / rice / spices photography.
Dark gradient overlay.
Headline:
“Japan’s Trusted Halal Grocery Store”
Subheadline:
“Fresh halal meat, frozen foods, rice, spices, snacks, and daily essentials delivered across Japan.”
CTA buttons:
“Shop Today’s Deals”
“View Halal Meat”
Trust line:
“Certified Halal • Frozen Delivery • Fast Japan-wide Shipping • JP/EN/BN Support”
Add 2 smaller side campaign cards:
- “Rice & Pantry Sale”
- “Frozen Snack Week”

5. Quick trust strip
Four horizontal cards:
- Verified Halal
  “Certification and supplier proof clearly shown”
- Cold Chain Delivery
  “Frozen and cool items packed safely”
- Japan-wide Shipping
  “Dry items delivered across Japan”
- Multilingual Support
  “Support in Japanese, English, Bengali”

6. Category grid
Make it richer than simple emoji cards.
Use image/icon hybrid tiles.
Categories:
Halal Meat, Rice & Flour, Spices & Masala, Frozen Foods, Snacks, Drinks, Baby & Family, Beauty & Care.
Each tile should have soft background, small image area, title, and item count.

7. Shop by Country
Pill-style country cards with flags:
Bangladesh, India, Pakistan, Japan, Myanmar, Nepal, Indonesia, Malaysia.
Add heading:
“Shop by Country”
Subtext:
“Find familiar products from home.”

8. Today’s Deals
Section header with red “ON SALE” badge and “View all”.
Create 8 product cards in desktop 4-column grid.
Products:
- Chicken Samosa 20pcs — ¥780 — old ¥980 — Frozen — Certified Halal
- Basmati Rice 5kg — ¥1,480 — old ¥1,780 — Dry — Certified Halal
- Lamb Biryani Kit — ¥1,250 — Cool — Supplier-Declared
- Naan Paratha 10pcs — ¥620 — old ¥750 — Frozen — Certified Halal
- Pure Ghee 500ml — ¥980 — Dry — Certified Halal
- Atta Flour 2kg — ¥560 — Dry — Supplier-Declared
- Mixed Spice Blend 200g — ¥480 — Dry — No Pork / No Alcohol
- Chicken Seekh Kebab 500g — ¥890 — Frozen — Certified Halal

Product card must include:
- Product image
- Discount badge
- Wishlist icon
- Product title
- Supplier/brand
- Rating
- Halal badge
- Storage badge
- Price and old price
- Stock label where useful
- Quick Add button

9. Best Sellers
Create 8 product cards.
Heading:
“Best Sellers This Week”
Subtext:
“Most loved halal groceries by families across Japan.”

10. Halal Meat & Frozen Foods
Horizontal product section with premium banner on left.
Text:
“Halal Meat & Frozen Foods”
“Chicken, beef, mutton, kebab, paratha, samosa, momo, and frozen essentials.”
CTA:
“Shop Frozen & Meat”
Show product cards on right.

11. Rice, Flour & Pantry Essentials
Show rice, flour, lentils, oil, ghee, tea, spices.
Add a small banner:
“Monthly pantry shopping made easy.”

12. Under ¥500
Budget-friendly section.
Design with red/orange deal feeling.
Products:
spices, snacks, drinks, small packs, sauces.

13. Family Saving Bundles
Create bundle cards:
- Monthly Rice Bundle
- Biryani Night Kit
- Frozen Snack Pack
- Curry Cooking Set
Each bundle card should show multiple product images, total price, save amount, and CTA.

14. Shop by Meal
Create visual meal cards:
- Biryani Night
- Curry Dinner
- Breakfast Essentials
- Iftar Box
- Family Cooking
Each card should have food image, short text, and “Shop ingredients”.

15. Reorder Essentials
For logged-in users.
Show 3 previously bought items:
- Pure Ghee 500ml
- Atta Flour 2kg
- Mixed Spice Blend 200g
Each row should include image, price, halal badge, and green “Reorder” button.
Add link:
“View Order History”

16. Delivery Area Section
Large soft green card.
Title:
“Delivery Across Japan”
Text:
“Dry items ship Japan-wide. Frozen and cool items are delivered with temperature-safe packaging and area-based rules.”
Add postal code checker input:
“Enter postal code”
Button:
“Check Delivery”
Add delivery type cards:
Dry 1–3 days, Cool selected areas, Frozen scheduled delivery, Pickup available.

17. Halal Standards Section
Professional trust content.
Title:
“Our Halal Standard”
Explain badges:
- Certified Halal
- Supplier-Declared
- No Pork / No Alcohol
- Muslim-Friendly
Add CTA:
“Learn About Halal Verification”
Use clean icons and document/certificate style visual.

18. Customer Reviews
Create 3–4 review cards:
- “Finally, I can order halal groceries easily in Japan.”
- “Frozen items arrived safely packed.”
- “Great for Bangladeshi pantry shopping.”
Show rating stars and location: Tokyo, Chiba, Saitama, Osaka.

19. FAQ Preview
Accordion style:
- Do you deliver frozen items?
- How do you verify halal products?
- Can I pay by card or PayPay?
- Can I reorder previous items?
- What happens if a frozen item has an issue?

20. Newsletter / LINE section
CTA card:
“Get weekly halal deals”
“Receive new arrivals, coupons, and restock alerts.”
Buttons:
“Join LINE”
“Subscribe Email”

21. Full footer
Make footer much richer than current design.
Columns:
Company:
About MyBIMI, Store Location, Careers, Business Inquiry
Shop:
Halal Meat, Frozen Foods, Rice & Flour, Spices, Deals
Trust:
Halal Standards, Supplier Verification, Cold Chain Delivery, Quality Guarantee
Support:
Track Order, Contact Us, FAQ, Returns
Policies:
Delivery Policy, Return Policy, Privacy Policy, Terms
Payment:
Visa, Mastercard, PayPay, Konbini, Bank Transfer
Language:
日本語 / English / বাংলা
SNS:
Facebook, Instagram, TikTok, LINE

Mobile Homepage:
Create a separate 390px mobile version.
Use:
- Top promo bar
- Compact header with logo, search, cart
- Horizontal category chips
- Hero card
- 2-column product grid
- Sticky bottom navigation:
Home, Categories, Search, Deals, Cart
- Sticky mini cart after product added
- Better spacing, no overcrowding
- Product cards must remain readable

Category Page:
Create product listing page for “Halal Meat”.
Include:
- Breadcrumb
- Category hero
- Subcategory chips: Chicken, Beef, Mutton, Mince, Kebab, Sausage
- Filter drawer
- Sort dropdown
- Product grid
- Active filters
Filters:
Halal Status, Storage Type, Price, Brand, Country, In Stock, Discount

Product Detail Page:
Create PDP for “Chicken Samosa 20pcs”.
Include:
- Product image gallery
- Product title
- Price and old price
- Rating
- Halal badges
- Storage type
- Quantity stepper
- Add to cart
- Buy now
- Delivery estimate
- Ingredients
- Allergens
- Storage instructions
- Halal verification
- Supplier info
- Frequently bought together
- Similar products
Mobile PDP must have sticky bottom Add to Cart bar.

Cart Drawer:
Create right-side desktop drawer and mobile full-screen drawer.
Include:
- Cart items
- Quantity stepper
- Remove
- Save for later
- Free shipping progress bar
- Delivery type grouping: Dry / Frozen / Cool
- Coupon input
- Estimated total
- Checkout button

Checkout Flow:
Create 3-step checkout:
1. Address
2. Delivery
3. Payment
Include guest checkout.
Payment options:
Card, PayPay, Konbini, Bank Transfer
Show order summary on right for desktop.
Show collapsible order summary on mobile.
Use trust copy:
“Secure payment”
“Frozen items packed safely”
“Support available in JP / EN / BN”

Account / Reorder Page:
Create dashboard with:
- Recent orders
- Reorder button
- Saved addresses
- Wishlist
- Support ticket
- Track order

Admin Panel:
Create modern admin dashboard for MyBIMI.
Sidebar:
Dashboard, Orders, Products, Inventory, Customers, Promotions, Delivery, Halal Verification, Content, Reports, Settings.
Dashboard cards:
Today’s Sales, Orders, Pending Packing, Low Stock, Frozen Orders, Refund Requests.
Order table:
Order ID, customer, payment status, delivery type, total, fulfillment status, action.
Product management page:
Product image, SKU, stock, price, halal status, storage type, category, status.
Halal verification page:
Product, halal tier, certificate upload, supplier proof, expiry date, admin approval.
Inventory page:
Stock on hand, reserved stock, low stock, expiry warning, storage type.

Visual style:
- Premium but friendly grocery ecommerce
- Clean Japanese EC quality
- Richer than the current simple prototype
- Do not use childish emojis as main icons
- Use real food/product images or clean vector placeholders
- Strong hierarchy
- Product cards should feel commercial and clickable
- Use soft shadows and rounded cards
- Avoid huge empty blank spaces
- Use enough content density like a serious EC site
- Keep accessibility and readable contrast
- Make all components reusable with Auto Layout
- Name layers clearly
- Use consistent spacing
- Make the result developer-ready
```

---

# Storefront Structure & Screens

Core screens in the design system:

| Page                     | Purpose                                          |
| ------------------------ | ------------------------------------------------ |
| `00 Cover`               | Project title, brand preview                     |
| `01 Design System`       | Colors, typography, buttons, badges, forms       |
| `02 Components`          | Product cards, category tiles, nav, cart, footer |
| `03 Desktop Homepage`    | Main 1440px homepage                             |
| `04 Mobile Homepage`     | 390px mobile homepage                            |
| `05 Category Page`       | Product listing page                             |
| `06 Product Detail Page` | PDP design                                       |
| `07 Cart + Checkout`     | Cart drawer and checkout flow                    |
| `08 Account`             | Reorder, orders, saved address                   |
| `09 Admin Panel`         | Admin dashboard and management screens           |

---

# Recommended Homepage Sections

Use this exact order:

| Order | Section               |
| ----- | --------------------- |
| 1     | Promo bar             |
| 2     | Header                |
| 3     | Mega menu             |
| 4     | Hero + campaign cards |
| 5     | Trust strip           |
| 6     | Category grid         |
| 7     | Shop by country       |
| 8     | Today’s Deals         |
| 9     | Best Sellers          |
| 10    | Halal Meat & Frozen   |
| 11    | Rice & Pantry         |
| 12    | Under ¥500            |
| 13    | Family Bundles        |
| 14    | Shop by Meal          |
| 15    | Reorder Essentials    |
| 16    | Delivery checker      |
| 17    | Halal standards       |
| 18    | Customer reviews      |
| 19    | FAQ                   |
| 20    | LINE / Newsletter     |
| 21    | Footer                |

---

# Key Storefront Design Improvements

## UI & UX Enhancements

| Area                          | Design System Solution                       |
| ----------------------------- | -------------------------------------------- |
| Whitespace & layout balance   | Add richer homepage merchandising sections   |
| Branding identity             | Establish **MyBIMI Halal Market** wordmark   |
| Category navigation           | Use photo/icon hybrid visual tiles           |
| Product catalog density       | Display dense multi-column product grids     |
| Comprehensive footer          | Add full ecommerce footer with legal links   |
| Trust & compliance            | Display halal certifications & cold-chain    |
| Product card metadata         | Add stock, origin, badges, temperature specs |
| Mobile bottom navigation      | Add sticky mobile tab bar                    |
| Checkout & conversion flow    | Add free shipping progress & family bundles  |

---

# Best Visual Direction

Use this style:

```text
Modern Japanese grocery ecommerce + South Asian halal warmth + high product discovery density.
Clean, premium, fast, promotional, trustworthy, mobile-first.
```

Avoid this:

```text
Generic halal website, empty white prototype, emoji-heavy category UI, weak footer, simple product grid only.
```

---

# Hero Section Messaging & Localization

English version:

```text
Japan’s Trusted Halal Grocery Store

Fresh halal meat, frozen foods, rice, spices, snacks, and daily essentials delivered across Japan.

[Shop Today’s Deals] [View Halal Meat]

Certified Halal • Frozen Delivery • Fast Japan-wide Shipping • JP/EN/BN Support
```

Japanese version:

```text
日本全国へ届ける、信頼のハラール食品ストア

ハラール肉、冷凍食品、お米、スパイス、スナック、日用品まで、MyBIMIが日本全国へお届けします。

[本日のセールを見る] [ハラール肉を見る]

ハラール確認済み • 冷凍配送対応 • 日本全国配送 • 日本語・英語・ベンガル語サポート
```

---

# Architectural Philosophy

Do not design only one homepage. Build a comprehensive **system**:

1. Design System
2. Components
3. Desktop Homepage
4. Mobile Homepage
5. Category Page
6. Product Detail Page
7. Cart
8. Checkout
9. Account
10. Admin Panel

That will make your EC site look professional and reduce redesign work later.
