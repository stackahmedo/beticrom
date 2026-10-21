# Plan: Halal Grocery Ecommerce Storefront (Japan) — Homepage Demo

## Context
This project implements the design and storefront architecture for **Beticorm Halal Market**, a halal grocery ecommerce platform targeting Japan. The storefront emphasizes a **mobile-first, trust-led, promotion-aware grocery experience** with dense category access, deal zones, and high-quality product merchandising — combined with rigorous halal credibility signals, trilingual localization (JA/EN/BN), and repeat-order convenience.

The deliverable is an interactive homepage demo showcasing the key UX surfaces described in the document.

---

## Aesthetic Stance

**Committed stance:** High-velocity grocery retail — energetic but operationally grounded. Not kinetic/dark (wrong for grocery trust), not archival. Clean, warm, promotion-aware.

**Palette (semantic color model from the document):**
- Deep forest green `#1B5E35` → trust/halal compliance (primary)
- Warm red `#D42B2B` → promo urgency, deals
- Off-white `#FAF9F7` → page background
- Charcoal `#1C1C1C` → body text
- Soft gold `#C9972A` → low-stock/cutoff accent
- Blue `#1A6EA8` → frozen/cool-chain info
- Card surface `#FFFFFF`

**Fonts:**
- `Noto Sans JP` — Japanese-first body/UI (covers JA + Latin)
- `Plus Jakarta Sans` — Latin display headings and promo text
- Written to `src/styles/fonts.css`

---

## What to Build

A full homepage demo with interactive state. Six major sections:

### 1. Announcement Bar
- Sticky, dismissible
- "送料無料 ¥6,500以上のご注文 · Free dry shipping over ¥6,500"
- Green background, white text

### 2. Header
- Logo (green crescent + wordmark "ハラール市場 Halal Ichiba")
- Search bar (full-width on mobile)
- Cart icon with item count badge
- Language switcher: JA | EN | BN
- Active locale state with React useState

### 3. Hero Banner
- "ハラール サマーディール · Halal Summer Deals"
- Two CTAs: [今すぐ購入 Shop Now] [ハラール肉 View Halal Meat]
- Static banner, no auto-rotate (per document guidance)
- Unsplash background: spice/food market image

### 4. Quick Category Grid (2×4 scrollable row on mobile)
- Meat 🥩, Rice & Flour, Spices, Frozen, Snacks, Drinks, Baby, Beauty
- Icon-led tiles with translated labels

### 5. Shop by Country Strip (horizontal scroll)
- Bangladesh 🇧🇩, India 🇮🇳, Pakistan 🇵🇰, Japan 🇯🇵, Myanmar 🇲🇲, Nepal 🇳🇵
- Flag + country name

### 6. Today's Deals — Product Card Grid
- 4 realistic product cards (2-col on mobile, 4-col on desktop):
  1. Chicken Samosa 20pcs — ¥780 (was ¥980) — Certified Halal · Frozen
  2. Basmati Rice 5kg — ¥1,480 (was ¥1,780) — Certified Halal · Dry
  3. Lamb Biryani Kit — ¥1,250 — Supplier-Declared Halal · Cool
  4. Naan Paratha 10pcs — ¥620 (was ¥750) — Certified Halal · Frozen
- Each card: image, name, price/crossed-out price, halal badge (color-coded tier), storage badge, Quick Add button
- Halal badge tiers: Certified (green), Supplier-Declared (teal), No Pork/Alcohol (amber)
- Quick Add triggers cart count increment

### 7. Trust Badge Strip
- 4 badges: ✓ Halal Verified · ❄ Cold Chain Delivery · ↩ Quality Guarantee · 🕐 Rapid Support
- Links to policy pages (visual only)

### 8. Reorder / Personalized Module
- "Recently Ordered Essentials" — 3 compact product tiles with one-tap Reorder button

### 9. Footer
- Logo, links (About, Delivery Policy, Halal Standards, FAQs), locale switch, language

---

## Interactive State
- `locale` state: JA | EN | BN — changes header label
- `cartCount` state: increments on Quick Add
- `announcementDismissed` state: hides bar on ×
- `activeCategory` hover state on category tiles

---

## Files to Modify

| File | Change |
|---|---|
| `src/styles/fonts.css` | Add Google Fonts imports for Noto Sans JP + Plus Jakarta Sans |
| `src/styles/theme.css` | Update `:root` tokens — green primary, red destructive as promo, warm off-white background |
| `src/app/App.tsx` | Full homepage implementation |

---

## Token Updates (theme.css)
Keep all existing token names. Update values:
- `--background: #FAF9F7`
- `--foreground: #1C1C1C`
- `--primary: #1B5E35` (forest green)
- `--primary-foreground: #FFFFFF`
- `--destructive: #D42B2B` (promo red — reused for deal badges)
- `--accent: #C9972A` (gold)
- `--card: #FFFFFF`
- `--border: rgba(0,0,0,0.08)`
- `--radius: 0.75rem`

---

## Unsplash Images
- Hero: spice market / Middle Eastern food spread (warm, colorful)
- Product cards: food photography per product type (chicken, rice, lamb, flatbread)

---

## Verification
1. Announcement bar is sticky and dismissible
2. Language switcher cycles JA → EN → BN and updates header label
3. Quick Add on any product card increments cart badge
4. Category tiles and country chips scroll horizontally on narrow viewport
5. Layout reflowss cleanly at ~768px (2-col product grid on mobile, 4-col on desktop)
6. Halal badges are color-coded by tier (green/teal/amber)
7. No auto-rotating carousel — hero is static
