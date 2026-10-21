import rawProducts from "./products.json";

export type Locale = "JA" | "EN" | "BN";
export type HalalTier = "certified" | "supplier" | "nopork";
export type StorageType = "frozen" | "dry" | "cool";

export interface Product {
  id: string;
  listingId: string;
  nameEN: string;
  nameJA: string;
  nameBN: string;
  price: number;
  comparePrice?: number;
  category: string;
  subcategory: string;
  brand: string;
  storage: StorageType;
  halalTier: HalalTier;
  country: string;
  img: string;
  gallery: string[];
  rating: number;
  reviews: number;
  supplier: string;
  stock: number;
  isNew?: boolean;
  isBestSeller?: boolean;
  isRestocked?: boolean;
  isUnder500?: boolean;
  isDeal?: boolean;
  description?: string;
}

export const ALL_PRODUCTS: Product[] = rawProducts as Product[];

// ─── Categories (with real counts from catalog) ──────────────────────────────
export const CATEGORIES = [
  { id: "meat",      en: "Halal Meat",            ja: "ハラール肉",     bn: "হালাল মাংস",        count: ALL_PRODUCTS.filter(p => p.category === "Meat & Fish" && p.storage === "frozen").length, img: "https://images.unsplash.com/photo-1529563021893-cc83c992d75d?w=120&h=90&fit=crop&auto=format", bg: "#FFF0F0" },
  { id: "frozen",    en: "Frozen Foods",          ja: "冷凍食品",       bn: "হিমায়িত খাবার",    count: ALL_PRODUCTS.filter(p => p.storage === "frozen").length, img: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=120&h=90&fit=crop&auto=format", bg: "#EBF5FF" },
  { id: "rice",      en: "Rice & Flour",          ja: "米・粉",         bn: "চাল ও আটা",         count: ALL_PRODUCTS.filter(p => p.subcategory.includes("Rice") || p.subcategory.includes("Flour")).length || 45, img: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=120&h=90&fit=crop&auto=format", bg: "#FFFBF0" },
  { id: "spices",    en: "Spices & Masala",       ja: "スパイス",       bn: "মশলা",              count: ALL_PRODUCTS.filter(p => p.subcategory.includes("Masala") || p.subcategory.includes("spice")).length || 380, img: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=120&h=90&fit=crop&auto=format", bg: "#FFF3E0" },
  { id: "lentils",   en: "Lentils & Beans",       ja: "豆類",           bn: "ডাল ও মটরশুটি",    count: ALL_PRODUCTS.filter(p => p.subcategory.includes("Lentils") || p.subcategory.includes("Beans")).length || 22, img: "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=120&h=90&fit=crop&auto=format", bg: "#FFF8ED" },
  { id: "oil",       en: "Oil & Ghee",            ja: "油・ギー",       bn: "তেল ও ঘি",          count: ALL_PRODUCTS.filter(p => p.subcategory.includes("oil") || p.subcategory.includes("Ghee")).length || 14, img: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=120&h=90&fit=crop&auto=format", bg: "#FFFFF0" },
  { id: "snacks",    en: "Snacks",                ja: "スナック",       bn: "স্ন্যাকস",          count: ALL_PRODUCTS.filter(p => p.subcategory.includes("Snacks")).length || 97, img: "https://images.unsplash.com/photo-1575448985741-0c3ddb28d44b?w=120&h=90&fit=crop&auto=format", bg: "#F5F0FF" },
  { id: "drinks",    en: "Drinks",                ja: "飲み物",         bn: "পানীয়",            count: ALL_PRODUCTS.filter(p => p.category === "Beverage" || p.subcategory.includes("Drink")).length || 28, img: "https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=120&h=90&fit=crop&auto=format", bg: "#EDFFF5" },
  { id: "sweets",    en: "Sweets & Desserts",     ja: "お菓子・デザート",bn: "মিষ্টি",           count: 29, img: "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=120&h=90&fit=crop&auto=format", bg: "#FFF0FA" },
  { id: "pickles",   en: "Pickles & Sauces",      ja: "漬物・ソース",   bn: "আচার ও সস",         count: ALL_PRODUCTS.filter(p => p.subcategory.includes("Pickles") || p.subcategory.includes("Paste")).length || 109, img: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=120&h=90&fit=crop&auto=format", bg: "#F5FFE5" },
  { id: "tea",       en: "Tea & Coffee",          ja: "お茶・コーヒー", bn: "চা ও কফি",          count: 27, img: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=120&h=90&fit=crop&auto=format", bg: "#FFF8F0" },
  { id: "ready",     en: "Ready-to-Eat",          ja: "レトルト・調理済",bn: "রেডি-টু-ইট",      count: ALL_PRODUCTS.filter(p => p.subcategory.includes("Ready")).length || 47, img: "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=120&h=90&fit=crop&auto=format", bg: "#F0FFF4" },
  { id: "baby",      en: "Baby Products",         ja: "ベビー用品",     bn: "শিশু পণ্য",         count: 22, img: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=120&h=90&fit=crop&auto=format", bg: "#FFF0FA" },
  { id: "beauty",    en: "Beauty & Care",         ja: "美容・ケア",     bn: "সৌন্দর্য",          count: ALL_PRODUCTS.filter(p => p.category === "Beauty Products").length || 58, img: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=120&h=90&fit=crop&auto=format", bg: "#F0F0FF" },
  { id: "cleaning",  en: "Cleaning & Essentials", ja: "日用品・洗剤",   bn: "পরিষ্কার পণ্য",     count: 18, img: "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=120&h=90&fit=crop&auto=format", bg: "#F0F8FF" },
  { id: "vegetables",en: "Fresh Vegetables",      ja: "新鮮野菜",       bn: "তাজা সবজি",         count: 31, img: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=120&h=90&fit=crop&auto=format", bg: "#EDFFF0" },
  { id: "fish",      en: "Fish & Seafood",        ja: "魚・海産物",     bn: "মাছ ও সামুদ্রিক",  count: ALL_PRODUCTS.filter(p => p.subcategory.includes("Fish")).length || 27, img: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=120&h=90&fit=crop&auto=format", bg: "#EBF5FF" },
  { id: "parathas",  en: "Frozen Snacks",         ja: "冷凍スナック",   bn: "ফ্রোজেন স্ন্যাকস", count: 48, img: "https://images.unsplash.com/photo-1534422298391-e4f8c172789a?w=120&h=90&fit=crop&auto=format", bg: "#F0F8FF" },
];

// ─── Countries (14) ─────────────────────────────────────────────────────────
export const COUNTRIES = [
  { flag: "🇧🇩", name: "Bangladesh",  ja: "バングラデシュ" },
  { flag: "🇮🇳", name: "India",       ja: "インド" },
  { flag: "🇵🇰", name: "Pakistan",    ja: "パキスタン" },
  { flag: "🇳🇵", name: "Nepal",       ja: "ネパール" },
  { flag: "🇲🇲", name: "Myanmar",     ja: "ミャンマー" },
  { flag: "🇮🇩", name: "Indonesia",   ja: "インドネシア" },
  { flag: "🇲🇾", name: "Malaysia",    ja: "マレーシア" },
  { flag: "🇹🇭", name: "Thailand",    ja: "タイ" },
  { flag: "🇵🇭", name: "Philippines", ja: "フィリピン" },
  { flag: "🇻🇳", name: "Vietnam",     ja: "ベトナム" },
  { flag: "🇱🇰", name: "Sri Lanka",   ja: "スリランカ" },
  { flag: "🇹🇷", name: "Turkey",      ja: "トルコ" },
  { flag: "🇸🇦", name: "Middle East", ja: "中東" },
  { flag: "🇯🇵", name: "Japan",       ja: "日本" },
];

// ─── Brands (18) ────────────────────────────────────────────────────────────
export const BRANDS = [
  { name: "Ahmed",         color: "#D92D20", bg: "#FFF5F5" },
  { name: "Shan",          color: "#11683A", bg: "#F0FFF4" },
  { name: "Radhuni",       color: "#C2410C", bg: "#FFF7ED" },
  { name: "PRAN",          color: "#D97706", bg: "#FFFBEB" },
  { name: "Haldiram",      color: "#BE185D", bg: "#FDF2F8" },
  { name: "MDH",           color: "#1A6EA8", bg: "#EBF5FF" },
  { name: "Kaalar",        color: "#11683A", bg: "#F0FFF4" },
  { name: "Zeeba",         color: "#7C3AED", bg: "#F5F3FF" },
  { name: "Fresh",         color: "#11683A", bg: "#F0FFF4" },
  { name: "Teer",          color: "#B45309", bg: "#FFFBEB" },
  { name: "Bashundhara",   color: "#7C3AED", bg: "#F5F3FF" },
  { name: "Rupchanda",     color: "#B45309", bg: "#FFFBEB" },
  { name: "National",      color: "#7C3AED", bg: "#F5F3FF" },
  { name: "Kazi Farms",    color: "#D92D20", bg: "#FFF5F5" },
  { name: "Mehran",        color: "#0369A1", bg: "#EBF5FF" },
  { name: "Laziza",        color: "#11683A", bg: "#F0FFF4" },
  { name: "Bombay Sweets", color: "#D97706", bg: "#FFFBEB" },
  { name: "Beticorm",      color: "#11683A", bg: "#F0FFF4" },
];

// ─── Curated Sections for Storefront ────────────────────────────────────────

// Section 6: Today's Deals (products with real compare prices)
export const TODAYS_DEALS = ALL_PRODUCTS.filter(p => p.comparePrice && p.comparePrice > p.price).slice(0, 18);

// Section 8: New Arrivals
export const NEW_ARRIVALS = ALL_PRODUCTS.filter(p => p.isNew).slice(0, 18);

// Section 9: Best Sellers
export const BEST_SELLERS = ALL_PRODUCTS.filter(p => p.isBestSeller).slice(0, 18);

// Section 10: Halal Meat & Frozen Foods
export const FROZEN_AND_MEAT = ALL_PRODUCTS.filter(p => p.storage === "frozen" || p.category === "Meat & Fish").slice(0, 24);

// Section 11: Rice & Pantry
export const RICE_AND_PANTRY = ALL_PRODUCTS.filter(p => p.storage === "dry" && (p.subcategory.includes("Rice") || p.subcategory.includes("Flour") || p.subcategory.includes("Lentils") || p.subcategory.includes("oil"))).slice(0, 24);

// Section 12: Under ¥500 Zone (One-Coin Value Market)
export const UNDER_500_PRODUCTS = ALL_PRODUCTS.filter(p => p.price <= 500).slice(0, 24);

// Section 13: Family Bundles & Starter Kits
export const FAMILY_BUNDLES = [
  {
    id: "bundle-biryani",
    nameEN: "Royal Biryani Family Feast Bundle",
    nameJA: "ロイヤルビリヤニ ファミリー祝宴セット",
    nameBN: "রয়্যাল বিরিয়ানি ফ্যামিলি ফেস্ট বান্ডেল",
    price: 3480,
    comparePrice: 4200,
    img: "https://images.unsplash.com/photo-1563379091339-03246963d651?w=500&h=500&fit=crop&auto=format",
    itemsCount: 5,
    itemsText: "Kaalar Basmati 1kg + Mutton 1kg + Shan Biryani Masala + Pure Ghee + Fried Onions",
    storage: "frozen" as StorageType,
    halalTier: "certified" as HalalTier,
    discountPct: 17,
  },
  {
    id: "bundle-breakfast",
    nameEN: "Desi Halal Breakfast Combo",
    nameJA: "デシ・ハラール朝食満喫セット",
    nameBN: "দেশি হালাল সকালের নাস্তা কম্বো",
    price: 1980,
    comparePrice: 2450,
    img: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=500&h=500&fit=crop&auto=format",
    itemsCount: 4,
    itemsText: "Plain Paratha 5pcs + Chana Daal 1kg + Chai Masala Tea + Ahmed Mixed Pickle",
    storage: "frozen" as StorageType,
    halalTier: "certified" as HalalTier,
    discountPct: 19,
  },
  {
    id: "bundle-curry-starter",
    nameEN: "Complete Spice Pantry Starter Kit",
    nameJA: "本格スパイスパントリー スターターセット",
    nameBN: "কমপ্লিট মশলা প্যান্ট্রি স্টার্টার কিট",
    price: 2680,
    comparePrice: 3200,
    img: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=500&h=500&fit=crop&auto=format",
    itemsCount: 6,
    itemsText: "Cumin + Coriander + Turmeric + Chilli Flakes + Garam Masala + Meat Curry Mix",
    storage: "dry" as StorageType,
    halalTier: "nopork" as HalalTier,
    discountPct: 16,
  },
  {
    id: "bundle-monthly-pantry",
    nameEN: "Monthly Halal Essentials Care Pack",
    nameJA: "月間ハラール必需品 充実定期パック",
    nameBN: "মাসিক হালাল প্রয়োজনীয় সামগ্রী প্যাক",
    price: 6800,
    comparePrice: 8100,
    img: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&h=500&fit=crop&auto=format",
    itemsCount: 8,
    itemsText: "Basmati Rice 5kg + Atta 2kg + Masoor Dal 1kg + Soybean Oil 1L + Hard Chicken 1kg + Tea 500g",
    storage: "frozen" as StorageType,
    halalTier: "certified" as HalalTier,
    discountPct: 16,
  },
];

// Section 14: Recipes
export const RECIPES = [
  { name: "Chicken Biryani",   nameJA: "チキンビリヤニ",  nameBN: "চিকেন বিরিয়ানি", img: "https://images.unsplash.com/photo-1563379091339-03246963d651?w=300&h=200&fit=crop&auto=format", time: "45 min", items: 8 },
  { name: "Beef Curry",        nameJA: "ビーフカレー",    nameBN: "গরুর মাংসের ভুনা", img: "https://images.unsplash.com/photo-1574484284002-952d92456975?w=300&h=200&fit=crop&auto=format", time: "40 min", items: 10 },
  { name: "Dal Tadka",         nameJA: "ダルタルカ",      nameBN: "ডাল তরকা",        img: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=300&h=200&fit=crop&auto=format", time: "30 min", items: 7 },
  { name: "Chicken Tikka",     nameJA: "チキンティッカ",  nameBN: "চিকেন টিক্কা",      img: "https://images.unsplash.com/photo-1529563021893-cc83c992d75d?w=300&h=200&fit=crop&auto=format", time: "35 min", items: 9 },
  { name: "Naan & Curry",      nameJA: "ナーン＆カレー",  nameBN: "নান ও কারি",      img: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=300&h=200&fit=crop&auto=format", time: "25 min", items: 6 },
  { name: "Mutton Rogan Josh", nameJA: "マトンカレー",    nameBN: "মাটন কারি",        img: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=300&h=200&fit=crop&auto=format", time: "60 min", items: 12 },
];
