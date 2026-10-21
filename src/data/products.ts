import rawProducts from "./products.json";

export type Locale = "JA" | "EN" | "BN";
export type HalalTier = "certified" | "supplier" | "nopork" | "not_halal";
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
  desc?: string;
  origin?: string;
  weight?: string;
}

export const ALL_PRODUCTS: Product[] = rawProducts as Product[];

// ─── 7 Core Japanese E-Commerce Categories (Authoritative Taxonomy) ────────
export interface MainCategory {
  id: string;
  ja: string;
  en: string;
  bn: string;
  icon: string;
  count: number;
  subcategories: string[];
  descriptionJa: string;
}

export function isFamilyOrBulk(p: Product): boolean {
  const n = (p.nameEN + " " + p.nameJA + " " + (p.weight || "")).toLowerCase();
  const isLargeRiceOrFlour =
    n.includes("5kg") || n.includes("10kg") || n.includes("5 kg") || n.includes("10 kg");
  const isLargeOil =
    (n.includes("oil") || n.includes("ghee")) &&
    (n.includes("5l") || n.includes("5litter") || n.includes("5 l") || n.includes("2l") || n.includes("1l") || n.includes("1litter") || n.includes("1000ml"));
  const isLargeMeat =
    p.category === "Meat & Fish" &&
    (n.includes("1kg") || n.includes("1 kg") || n.includes("900g") || n.includes("800g"));
  const isLargeLentil =
    p.subcategory === "Lentils and Beans" &&
    (n.includes("1kg") || n.includes("1 kg") || n.includes("2kg") || n.includes("5kg"));
  const isMultiPack =
    p.storage === "frozen" &&
    (n.includes("10pcs") || n.includes("10枚") || n.includes("6pcs") || n.includes("5pcs") || n.includes("20pcs") || n.includes("30pcs"));

  return Boolean(isLargeRiceOrFlour || isLargeOil || isLargeMeat || isLargeLentil || isMultiPack);
}

export function getUnitPrice(p: Product): string | null {
  const n = (p.nameEN + " " + p.nameJA + " " + (p.weight || "")).toLowerCase();
  const price = p.price;
  if (n.includes("10kg") || n.includes("10 kg")) return `¥${Math.round(price / 10).toLocaleString()}/kg`;
  if (n.includes("5kg") || n.includes("5 kg")) return `¥${Math.round(price / 5).toLocaleString()}/kg`;
  if (n.includes("2kg") || n.includes("2 kg")) return `¥${Math.round(price / 2).toLocaleString()}/kg`;
  if (n.includes("1kg") || n.includes("1 kg")) return `¥${Math.round(price).toLocaleString()}/kg`;
  if (n.includes("5litter") || n.includes("5l") || n.includes("5 l")) return `¥${Math.round(price / 5).toLocaleString()}/L`;
  if (n.includes("1litter") || n.includes("1l") || n.includes("1 l")) return `¥${Math.round(price).toLocaleString()}/L`;
  if (n.includes("10pcs") || n.includes("10枚")) return `¥${Math.round(price / 10).toLocaleString()}/枚`;
  if (n.includes("6pcs")) return `¥${Math.round(price / 6).toLocaleString()}/枚`;
  if (n.includes("5pcs")) return `¥${Math.round(price / 5).toLocaleString()}/枚`;
  return null;
}

export function matchCategory(p: Product, catId: string): boolean {
  if (!catId || catId === "all") return true;
  const name = (p.nameEN || "").toLowerCase();

  if (catId === "deals" || catId === "deal" || catId === "お買い得") {
    return Boolean(p.comparePrice && p.comparePrice > p.price);
  }
  if (catId === "family" || catId === "bulk" || catId === "ファミリー・まとめ買い") {
    return isFamilyOrBulk(p);
  }
  if (catId === "under500" || catId === "500円以下") {
    return p.price <= 500;
  }
  if (catId === "new_restocked" || catId === "new" || catId === "新入荷・再入荷") {
    return Boolean(p.isNew || p.isRestocked);
  }
  if (catId === "meat_fish" || catId === "meat" || catId === "肉・魚") {
    return p.category === "Meat & Fish";
  }
  if (catId === "frozen" || catId === "冷凍食品") {
    return (
      p.category !== "Meat & Fish" &&
      (p.category === "Frozen food" ||
        p.category === "Frozen Foods" ||
        (p.storage === "frozen" && p.category !== "Grocery"))
    );
  }
  if (catId === "rice_flour" || catId === "rice" || catId === "米・粉") {
    return (
      p.subcategory === "Rice and Flours" ||
      (p.category !== "Meat & Fish" &&
        p.category !== "Frozen food" &&
        p.category !== "Frozen Foods" &&
        (name.includes("basmati") || name.includes("atta") || name.includes("flour") || name.includes("rice")))
    );
  }
  if (catId === "beans" || catId === "lentils" || catId === "豆類") {
    return p.subcategory === "Lentils and Beans";
  }
  if (catId === "spices" || catId === "スパイス") {
    return p.subcategory === "Masala & spices" || p.category === "Spices & Seasoning";
  }
  if (catId === "others" || catId === "その他") {
    return (
      !matchCategory(p, "meat_fish") &&
      !matchCategory(p, "frozen") &&
      !matchCategory(p, "rice_flour") &&
      !matchCategory(p, "spices") &&
      !matchCategory(p, "beans")
    );
  }
  return p.category === catId || p.subcategory === catId;
}

export const MAIN_CATEGORIES: MainCategory[] = [
  {
    id: "meat_fish",
    ja: "肉・魚",
    en: "Meat & Fish",
    bn: "মাংস ও মাছ",
    icon: "🥩",
    count: ALL_PRODUCTS.filter(p => matchCategory(p, "meat_fish")).length,
    subcategories: ["Mutton", "Beef", "Chicken", "Goat", "Fish"],
    descriptionJa: "ハラール認証の羊肉・牛肉・鶏肉・淡水魚。急速冷凍パックでお届け。",
  },
  {
    id: "frozen",
    ja: "冷凍食品",
    en: "Frozen Foods",
    bn: "হিমায়িত খাবার",
    icon: "❄️",
    count: ALL_PRODUCTS.filter(p => matchCategory(p, "frozen")).length,
    subcategories: ["Paratha", "Puri", "Samosa", "Singara", "Frozen Snacks"],
    descriptionJa: "本場のパラタ、サモサ、シンガラ、冷凍惣菜。手軽に本格の味。",
  },
  {
    id: "rice_flour",
    ja: "米・粉",
    en: "Rice & Flour",
    bn: "চাল ও আটা",
    icon: "🌾",
    count: ALL_PRODUCTS.filter(p => matchCategory(p, "rice_flour")).length,
    subcategories: ["Basmati Rice", "Chinigura Rice", "Atta", "Chakki Fresh", "Suji"],
    descriptionJa: "香り高い特選バスマティ米、チャパティ用全粒粉アタ、セモリナ粉。",
  },
  {
    id: "spices",
    ja: "スパイス",
    en: "Spices & Masala",
    bn: "মশলা",
    icon: "🌶️",
    count: ALL_PRODUCTS.filter(p => matchCategory(p, "spices")).length,
    subcategories: ["Curry Powder", "Garam Masala", "Biryani Mix", "Whole Spices", "Pastes"],
    descriptionJa: "直輸入の本格ホールスパイス、パウダー、調合マサラ、ジンジャーペースト。",
  },
  {
    id: "beans",
    ja: "豆類",
    en: "Lentils & Beans",
    bn: "ডাল ও মটরশুটি",
    icon: "🫘",
    count: ALL_PRODUCTS.filter(p => matchCategory(p, "beans")).length,
    subcategories: ["Masoor Dal", "Moong Dal", "Chana Dal", "Urad Dal", "Chickpeas"],
    descriptionJa: "マスール豆、ムング豆、チャナダール、ひよこ豆。豊富な食物繊維と植物性タンパク質。",
  },
  {
    id: "family",
    ja: "ファミリー・まとめ買い",
    en: "Family & Bulk",
    bn: "পারিবারিক ও পাইকারি",
    icon: "👨‍👩‍👧‍👦",
    count: ALL_PRODUCTS.filter(p => matchCategory(p, "family")).length,
    subcategories: ["5kg/10kg Rice", "10kg Atta", "5L Oil", "1kg Meats", "Multipack Frozen"],
    descriptionJa: "ご家族の毎日の食卓に。大容量のお米、お肉、食用油、まとめ買い向け商品。",
  },
  {
    id: "others",
    ja: "その他",
    en: "Other Groceries",
    bn: "অন্যান্য খাদ্যদ্রব্য",
    icon: "🛒",
    count: ALL_PRODUCTS.filter(p => matchCategory(p, "others")).length,
    subcategories: ["Oils & Ghee", "Snacks", "Tea & Coffee", "Beverages", "Sweets"],
    descriptionJa: "マスタードオイル、純ギー、伝統菓子スナック、チャイ紅茶、日用調味料。",
  },
  {
    id: "deals",
    ja: "お買い得",
    en: "Weekly Deals",
    bn: "বিশেষ অফার",
    icon: "🏷️",
    count: ALL_PRODUCTS.filter(p => matchCategory(p, "deals")).length,
    subcategories: ["Flash Sale", "Bundle Deals", "Bulk Discounts"],
    descriptionJa: "今週の特選割引商品。人気定番食材を特別価格でお届けします。",
  },
];

// ─── Legacy compatibility array ─────────────────────────────────────────────
export const CATEGORIES = MAIN_CATEGORIES;

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
  { name: "Ahmed",         color: "#C92A2A", bg: "#FFF5F5" },
  { name: "Shan",          color: "#12633D", bg: "#F7F8F5" },
  { name: "Radhuni",       color: "#C2410C", bg: "#FFF7ED" },
  { name: "PRAN",          color: "#D97706", bg: "#FFFBEB" },
  { name: "Century",       color: "#12633D", bg: "#F7F8F5" },
  { name: "Everest",       color: "#C92A2A", bg: "#FFF5F5" },
  { name: "Haldiram",      color: "#BE185D", bg: "#FDF2F8" },
  { name: "MDH",           color: "#1A6EA8", bg: "#EBF5FF" },
  { name: "Kaalar",        color: "#12633D", bg: "#F7F8F5" },
  { name: "Zeeba",         color: "#7C3AED", bg: "#F5F3FF" },
  { name: "Fresh",         color: "#12633D", bg: "#F7F8F5" },
  { name: "Teer",          color: "#B45309", bg: "#FFFBEB" },
  { name: "Paragon",       color: "#0369A1", bg: "#EBF5FF" },
  { name: "National",      color: "#7C3AED", bg: "#F5F3FF" },
  { name: "Kazi Farms",    color: "#C92A2A", bg: "#FFF5F5" },
  { name: "Mehran",        color: "#0369A1", bg: "#EBF5FF" },
  { name: "Laziza",        color: "#12633D", bg: "#F7F8F5" },
  { name: "Beticrom",      color: "#12633D", bg: "#F7F8F5" },
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
  { name: "Chicken Biryani",   nameJA: "チキンビリヤニ",  nameBN: "চিকেন বিরিয়ানি", img: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=500&h=300&fit=crop&auto=format", time: "45 min", items: 8 },
  { name: "Beef Curry",        nameJA: "ビーフカレー",    nameBN: "গরুর মাংসের ভুনা", img: "https://images.unsplash.com/photo-1574484284002-952d92456975?w=300&h=200&fit=crop&auto=format", time: "40 min", items: 10 },
  { name: "Dal Tadka",         nameJA: "ダルタルカ",      nameBN: "ডাল তরকা",        img: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=300&h=200&fit=crop&auto=format", time: "30 min", items: 7 },
  { name: "Chicken Tikka",     nameJA: "チキンティッカ",  nameBN: "চিকেন টিক্কা",      img: "https://images.unsplash.com/photo-1529563021893-cc83c992d75d?w=300&h=200&fit=crop&auto=format", time: "35 min", items: 9 },
  { name: "Naan & Curry",      nameJA: "ナーン＆カレー",  nameBN: "নান ও কারি",      img: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=300&h=200&fit=crop&auto=format", time: "25 min", items: 6 },
  { name: "Mutton Rogan Josh", nameJA: "マトンカレー",    nameBN: "মাটন কারি",        img: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=300&h=200&fit=crop&auto=format", time: "60 min", items: 12 },
];
