import { useState } from "react";
import {
  ShoppingCart, Search, X, ChevronRight, Star, Snowflake, Thermometer,
  Package, Shield, Truck, RotateCcw, Clock, MapPin, Heart, Menu,
  Home, Tag, LayoutGrid, User, ChevronDown, Plus, Minus,
  CheckCircle, MessageCircle, Mail, Facebook, Instagram, ArrowRight,
  BarChart2, BoxSelect, ListOrdered, Users, Megaphone, Settings,
  FileCheck, AlertTriangle, TrendingUp, Phone, Utensils, ShoppingBag,
  CreditCard, Smartphone, Building2, Lock, ToggleLeft, ToggleRight,
  Receipt, RefreshCcw, DollarSign, Download,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type Locale = "JA" | "EN" | "BN";
type HalalTier = "certified" | "supplier" | "nopork";
type StorageType = "frozen" | "dry" | "cool";
type View = "home" | "category" | "pdp" | "cart" | "checkout" | "account" | "admin";

interface Product {
  id: number;
  nameJA: string; nameEN: string; nameBN: string;
  price: number; comparePrice?: number;
  halalTier: HalalTier; storage: StorageType;
  img: string; rating: number; reviews: number;
  supplier: string; stock?: number;
  isNew?: boolean; isBestSeller?: boolean; isRestocked?: boolean;
}

// ─── Brand constants ─────────────────────────────────────────────────────────

const GREEN = "#11683A";
const DARK_GREEN = "#0B4F2A";
const RED = "#D92D20";
const GOLD = "#F59E0B";

// ─── Categories (18) ────────────────────────────────────────────────────────

const CATEGORIES = [
  { en: "Halal Meat",            ja: "ハラール肉",     bn: "হালাল মাংস",        count: 142, img: "https://images.unsplash.com/photo-1529563021893-cc83c992d75d?w=120&h=90&fit=crop&auto=format", bg: "#FFF0F0" },
  { en: "Frozen Foods",          ja: "冷凍食品",       bn: "হিমায়িত খাবার",    count: 113, img: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=120&h=90&fit=crop&auto=format", bg: "#EBF5FF" },
  { en: "Rice & Flour",          ja: "米・粉",         bn: "চাল ও আটা",         count:  67, img: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=120&h=90&fit=crop&auto=format", bg: "#FFFBF0" },
  { en: "Spices & Masala",       ja: "スパイス",       bn: "মশলা",              count:  89, img: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=120&h=90&fit=crop&auto=format", bg: "#FFF3E0" },
  { en: "Lentils & Beans",       ja: "豆類",           bn: "ডাল ও মটরশুটি",    count:  45, img: "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=120&h=90&fit=crop&auto=format", bg: "#FFF8ED" },
  { en: "Oil & Ghee",            ja: "油・ギー",       bn: "তেল ও ঘি",          count:  33, img: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=120&h=90&fit=crop&auto=format", bg: "#FFFFF0" },
  { en: "Snacks",                ja: "スナック",       bn: "স্ন্যাকস",          count:  54, img: "https://images.unsplash.com/photo-1575448985741-0c3ddb28d44b?w=120&h=90&fit=crop&auto=format", bg: "#F5F0FF" },
  { en: "Drinks",                ja: "飲み物",         bn: "পানীয়",            count:  38, img: "https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=120&h=90&fit=crop&auto=format", bg: "#EDFFF5" },
  { en: "Sweets & Desserts",     ja: "お菓子・デザート",bn: "মিষ্টি",           count:  29, img: "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=120&h=90&fit=crop&auto=format", bg: "#FFF0FA" },
  { en: "Pickles & Sauces",      ja: "漬物・ソース",   bn: "আচার ও সস",         count:  41, img: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=120&h=90&fit=crop&auto=format", bg: "#F5FFE5" },
  { en: "Tea & Coffee",          ja: "お茶・コーヒー", bn: "চা ও কফি",          count:  27, img: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=120&h=90&fit=crop&auto=format", bg: "#FFF8F0" },
  { en: "Ready-to-Eat",          ja: "レトルト・調理済",bn: "রেডি-টু-ইট",      count:  36, img: "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=120&h=90&fit=crop&auto=format", bg: "#F0FFF4" },
  { en: "Baby Products",         ja: "ベビー用品",     bn: "শিশু পণ্য",         count:  22, img: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=120&h=90&fit=crop&auto=format", bg: "#FFF0FA" },
  { en: "Beauty & Care",         ja: "美容・ケア",     bn: "সৌন্দর্য",          count:  41, img: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=120&h=90&fit=crop&auto=format", bg: "#F0F0FF" },
  { en: "Cleaning & Essentials", ja: "日用品・洗剤",   bn: "পরিষ্কার পণ্য",     count:  18, img: "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=120&h=90&fit=crop&auto=format", bg: "#F0F8FF" },
  { en: "Fresh Vegetables",      ja: "新鮮野菜",       bn: "তাজা সবজি",         count:  31, img: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=120&h=90&fit=crop&auto=format", bg: "#EDFFF0" },
  { en: "Fish & Seafood",        ja: "魚・海産物",     bn: "মাছ ও সামুদ্রিক",  count:  44, img: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=120&h=90&fit=crop&auto=format", bg: "#EBF5FF" },
  { en: "Frozen Snacks",         ja: "冷凍スナック",   bn: "ফ্রোজেন স্ন্যাকস", count:  58, img: "https://images.unsplash.com/photo-1534422298391-e4f8c172789a?w=120&h=90&fit=crop&auto=format", bg: "#F0F8FF" },
];

// ─── Countries (14) ─────────────────────────────────────────────────────────

const COUNTRIES = [
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

const BRANDS = [
  { name: "Ahmed",         color: "#D92D20", bg: "#FFF5F5" },
  { name: "Shan",          color: "#11683A", bg: "#F0FFF4" },
  { name: "MHD",           color: "#1A6EA8", bg: "#EBF5FF" },
  { name: "Bashundhara",   color: "#7C3AED", bg: "#F5F3FF" },
  { name: "PRAN",          color: "#D97706", bg: "#FFFBEB" },
  { name: "Radhuni",       color: "#C2410C", bg: "#FFF7ED" },
  { name: "ACI",           color: "#0369A1", bg: "#EBF5FF" },
  { name: "Fresh",         color: "#11683A", bg: "#F0FFF4" },
  { name: "Teer",          color: "#B45309", bg: "#FFFBEB" },
  { name: "Padma",         color: "#BE185D", bg: "#FDF2F8" },
  { name: "Kobe Spices",   color: "#9C2D2D", bg: "#FFF5F5" },
  { name: "Sadia",         color: "#1A6EA8", bg: "#EBF5FF" },
  { name: "Bombay Sweets", color: "#D97706", bg: "#FFFBEB" },
  { name: "Laziza",        color: "#11683A", bg: "#F0FFF4" },
  { name: "National",      color: "#7C3AED", bg: "#F5F3FF" },
  { name: "Kazi Farms",    color: "#D92D20", bg: "#FFF5F5" },
  { name: "Rupchanda",     color: "#B45309", bg: "#FFFBEB" },
  { name: "Danish",        color: "#0369A1", bg: "#EBF5FF" },
];

// ─── Products (24) ──────────────────────────────────────────────────────────

const ALL_PRODUCTS: Product[] = [
  { id:  1, nameJA:"チキンサモサ 20個入",       nameEN:"Chicken Samosa 20pcs",        nameBN:"চিকেন সামোসা ২০টি",         price:  780, comparePrice:  980, halalTier:"certified", storage:"frozen", img:"https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=400&fit=crop&auto=format",  rating:4.8, reviews:234, supplier:"Tokyo Halal Foods",  stock:48,  isBestSeller:true  },
  { id:  2, nameJA:"バスマティ米 5kg",           nameEN:"Basmati Rice 5kg",            nameBN:"বাসমতি চাল ৫কেজি",           price: 1480, comparePrice: 1780, halalTier:"certified", storage:"dry",    img:"https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=400&fit=crop&auto=format",  rating:4.9, reviews:512, supplier:"Regal Rice Co.",    isBestSeller:true  },
  { id:  3, nameJA:"ラムビリヤニキット",         nameEN:"Lamb Biryani Kit",            nameBN:"ল্যাম্ব বিরিয়ানি কিট",      price: 1250,                    halalTier:"supplier",  storage:"cool",   img:"https://images.unsplash.com/photo-1563379091339-03246963d651?w=400&h=400&fit=crop&auto=format",  rating:4.6, reviews: 89, supplier:"Spice Route Japan"                   },
  { id:  4, nameJA:"ナンパラタ 10枚入",          nameEN:"Naan Paratha 10pcs",          nameBN:"নান পরোটা ১০টি",              price:  620, comparePrice:  750, halalTier:"certified", storage:"frozen", img:"https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=400&fit=crop&auto=format",  rating:4.7, reviews:178, supplier:"Halal Bread Works"                   },
  { id:  5, nameJA:"純粋ギー 500ml",             nameEN:"Pure Ghee 500ml",             nameBN:"বিশুদ্ধ ঘি ৫০০মিলি",         price:  980,                    halalTier:"certified", storage:"dry",    img:"https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&h=400&fit=crop&auto=format",  rating:4.9, reviews:341, supplier:"Pure Dairy Japan",  isBestSeller:true  },
  { id:  6, nameJA:"アタ粉 2kg",                 nameEN:"Atta Flour 2kg",              nameBN:"আটা ময়দা ২কেজি",              price:  560,                    halalTier:"supplier",  storage:"dry",    img:"https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop&auto=format",  rating:4.7, reviews:203, supplier:"Golden Mills"                        },
  { id:  7, nameJA:"ミックススパイス 200g",       nameEN:"Mixed Spice Blend 200g",      nameBN:"মিক্সড স্পাইস ২০০গ্রাম",     price:  480,                    halalTier:"nopork",    storage:"dry",    img:"https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=400&fit=crop&auto=format",  rating:4.5, reviews:127, supplier:"Shan Foods"                          },
  { id:  8, nameJA:"チキンシークケバブ 500g",    nameEN:"Chicken Seekh Kebab 500g",    nameBN:"চিকেন শিক কাবাব ৫০০গ্রাম",  price:  890,                    halalTier:"certified", storage:"frozen", img:"https://images.unsplash.com/photo-1529563021893-cc83c992d75d?w=400&h=400&fit=crop&auto=format",  rating:4.8, reviews:156, supplier:"Halal Grill Japan",  isNew:true          },
  { id:  9, nameJA:"レッドレンティル 1kg",       nameEN:"Red Lentils 1kg",             nameBN:"লাল ডাল ১কেজি",               price:  420,                    halalTier:"nopork",    storage:"dry",    img:"https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=400&h=400&fit=crop&auto=format",  rating:4.6, reviews: 98, supplier:"PRAN Foods"                          },
  { id: 10, nameJA:"マンゴーラッシー 330ml×6",   nameEN:"Mango Lassi 330ml × 6",      nameBN:"ম্যাঙ্গো লাচ্ছি ৩৩০মিলি×৬",  price:  780,                    halalTier:"nopork",    storage:"cool",   img:"https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=400&h=400&fit=crop&auto=format",  rating:4.4, reviews: 67, supplier:"Dairy Fresh",        isNew:true          },
  { id: 11, nameJA:"チャイマサラ 100g",          nameEN:"Chai Masala 100g",            nameBN:"চা মশলা ১০০গ্রাম",            price:  350,                    halalTier:"nopork",    storage:"dry",    img:"https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&h=400&fit=crop&auto=format",  rating:4.7, reviews:211, supplier:"Ahmed Foods"                         },
  { id: 12, nameJA:"冷凍モモ 20個入",            nameEN:"Frozen Momo 20pcs",           nameBN:"ফ্রোজেন মোমো ২০টি",           price:  850, comparePrice: 1000, halalTier:"certified", storage:"frozen", img:"https://images.unsplash.com/photo-1534422298391-e4f8c172789a?w=400&h=400&fit=crop&auto=format",  rating:4.5, reviews: 73, supplier:"Himalaya Kitchen"                    },
  { id: 13, nameJA:"ビーフカレーペースト 200g",  nameEN:"Beef Curry Paste 200g",       nameBN:"বিফ কারি পেস্ট ২০০গ্রাম",    price:  520, comparePrice:  640, halalTier:"certified", storage:"dry",    img:"https://images.unsplash.com/photo-1574484284002-952d92456975?w=400&h=400&fit=crop&auto=format",  rating:4.6, reviews:144, supplier:"Shan Foods",         isNew:true          },
  { id: 14, nameJA:"セマイ 500g",               nameEN:"Vermicelli Semai 500g",       nameBN:"সেমাই ৫০০গ্রাম",              price:  290,                    halalTier:"nopork",    storage:"dry",    img:"https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400&h=400&fit=crop&auto=format",  rating:4.3, reviews: 55, supplier:"Bashundhara",        isNew:true          },
  { id: 15, nameJA:"パキスタンチリソース 300g",  nameEN:"Pakistani Chilli Sauce 300g", nameBN:"চিলি সস ৩০০গ্রাম",            price:  380,                    halalTier:"nopork",    storage:"dry",    img:"https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&h=400&fit=crop&auto=format",  rating:4.4, reviews: 82, supplier:"National Foods"                       },
  { id: 16, nameJA:"フレッシュオニオン 1kg",     nameEN:"Fresh Onion 1kg",             nameBN:"তাজা পেঁয়াজ ১কেজি",           price:  198,                    halalTier:"nopork",    storage:"cool",   img:"https://images.unsplash.com/photo-1548943487-a2e4e43b4853?w=400&h=400&fit=crop&auto=format",  rating:4.5, reviews: 34, supplier:"Fresh Farms Japan"                   },
  { id: 17, nameJA:"ムトンカレーパック 400g",    nameEN:"Mutton Curry Pack 400g",      nameBN:"মটন কারি প্যাক ৪০০গ্রাম",    price: 1180, comparePrice: 1380, halalTier:"certified", storage:"frozen", img:"https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=400&fit=crop&auto=format",  rating:4.7, reviews:201, supplier:"Kazi Farms",         isBestSeller:true  },
  { id: 18, nameJA:"ルパチャンダ大豆油 1L",     nameEN:"Rupchanda Soybean Oil 1L",   nameBN:"রূপচাঁদা তেল ১লিটার",         price:  680, comparePrice:  780, halalTier:"nopork",    storage:"dry",    img:"https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&h=400&fit=crop&auto=format",  rating:4.6, reviews:167, supplier:"Rupchanda",          isRestocked:true   },
  { id: 19, nameJA:"プランジュース 250ml×6",    nameEN:"PRAN Juice 250ml × 6",       nameBN:"প্রাণ জুস ২৫০মিলি×৬",         price:  580,                    halalTier:"nopork",    storage:"dry",    img:"https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&h=400&fit=crop&auto=format",  rating:4.4, reviews: 88, supplier:"PRAN Foods",          isRestocked:true   },
  { id: 20, nameJA:"バターチキン レトルト",      nameEN:"Butter Chicken Ready-to-Eat",nameBN:"বাটার চিকেন রেডি-টু-ইট",      price:  890, comparePrice: 1050, halalTier:"certified", storage:"frozen", img:"https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400&h=400&fit=crop&auto=format",  rating:4.7, reviews:119, supplier:"Halal Ready Japan",  isNew:true          },
  { id: 21, nameJA:"サーモンフィレ 300g",       nameEN:"Halal Salmon Fillet 300g",   nameBN:"হালাল স্যালমন ফিলেট ৩০০গ্রাম", price:1290,                    halalTier:"certified", storage:"frozen", img:"https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&h=400&fit=crop&auto=format",  rating:4.8, reviews: 91, supplier:"Ocean Halal Japan",  isNew:true          },
  { id: 22, nameJA:"デーツ 500g",               nameEN:"Medjool Dates 500g",          nameBN:"মেডজুল খেজুর ৫০০গ্রাম",       price:  980,                    halalTier:"nopork",    storage:"dry",    img:"https://images.unsplash.com/photo-1602596167517-f6cf22fea67b?w=400&h=400&fit=crop&auto=format",  rating:4.9, reviews:278, supplier:"Middle East Direct"                  },
  { id: 23, nameJA:"カレーリーフ 50g",          nameEN:"Curry Leaves Fresh 50g",      nameBN:"কারি পাতা তাজা ৫০গ্রাম",      price:  180,                    halalTier:"nopork",    storage:"cool",   img:"https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=400&fit=crop&auto=format",  rating:4.5, reviews: 44, supplier:"Fresh Farms Japan"                   },
  { id: 24, nameJA:"ダニッシュ 全脂肪ミルク 1L×4",nameEN:"Full Cream Milk 1L × 4",    nameBN:"ফুল ক্রিম মিল্ক ১লি×৪",       price:  980,                    halalTier:"certified", storage:"cool",   img:"https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&h=400&fit=crop&auto=format",  rating:4.6, reviews:132, supplier:"Danish Foods",        isRestocked:true   },
];

const RECIPES = [
  { name:"Chicken Biryani",   nameJA:"チキンビリヤニ",  img:"https://images.unsplash.com/photo-1563379091339-03246963d651?w=300&h=200&fit=crop&auto=format", time:"45 min", items:8  },
  { name:"Beef Curry",        nameJA:"ビーフカレー",    img:"https://images.unsplash.com/photo-1574484284002-952d92456975?w=300&h=200&fit=crop&auto=format", time:"40 min", items:10 },
  { name:"Dal Tadka",         nameJA:"ダルタルカ",      img:"https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=300&h=200&fit=crop&auto=format", time:"30 min", items:7  },
  { name:"Chicken Tikka",     nameJA:"チキンティッカ",  img:"https://images.unsplash.com/photo-1529563021893-cc83c992d75d?w=300&h=200&fit=crop&auto=format", time:"35 min", items:9  },
  { name:"Naan & Curry",      nameJA:"ナーン＆カレー",  img:"https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=300&h=200&fit=crop&auto=format", time:"25 min", items:6  },
  { name:"Mutton Rogan Josh", nameJA:"マトンカレー",    img:"https://images.unsplash.com/photo-1547592166-23ac45744acd?w=300&h=200&fit=crop&auto=format", time:"60 min", items:12 },
];

// ─── Config ──────────────────────────────────────────────────────────────────

const HALAL_TIER_CFG: Record<HalalTier, { label: Record<Locale,string>; bg:string; text:string; border:string }> = {
  certified:{ label:{ JA:"ハラール認証", EN:"Certified Halal",  BN:"সার্টিফাইড হালাল" }, bg:"#DCFCE7", text:"#166534", border:"#bbf7d0" },
  supplier: { label:{ JA:"供給元申告",   EN:"Supplier-Declared",BN:"সরবরাহকারী"        }, bg:"#CCFBF1", text:"#0d6e6e", border:"#99f6e4" },
  nopork:   { label:{ JA:"豚・酒不使用", EN:"No Pork/Alcohol",  BN:"শূকর মুক্ত"        }, bg:"#FEF3C7", text:"#92400e", border:"#fde68a" },
};

const STORAGE_CFG: Record<StorageType, { icon:React.ReactNode; label:string; bg:string; text:string }> = {
  frozen:{ icon:<Snowflake   size={9}/>, label:"Frozen", bg:"#E0F2FE", text:"#0369a1" },
  dry:   { icon:<Package     size={9}/>, label:"Dry",    bg:"#F5F5F4", text:"#57534e" },
  cool:  { icon:<Thermometer size={9}/>, label:"Cool",   bg:"#CCFBF1", text:"#0d6e6e" },
};

const getName = (p:Product, l:Locale) => l==="JA" ? p.nameJA : l==="BN" ? p.nameBN : p.nameEN;
const discPct = (p:Product) => p.comparePrice ? Math.round((1-p.price/p.comparePrice)*100) : 0;

// ─── Atoms ───────────────────────────────────────────────────────────────────

function HalalBadge({tier,locale}:{tier:HalalTier;locale:Locale}){
  const c=HALAL_TIER_CFG[tier];
  return <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold border whitespace-nowrap" style={{background:c.bg,color:c.text,borderColor:c.border}}><Shield size={7} strokeWidth={2.5}/>{c.label[locale]}</span>;
}

function StorageBadge({type}:{type:StorageType}){
  const c=STORAGE_CFG[type];
  return <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold whitespace-nowrap" style={{background:c.bg,color:c.text}}>{c.icon}{c.label}</span>;
}

function Stars({n,size=9}:{n:number;size?:number}){
  return <span className="flex items-center gap-px">{[1,2,3,4,5].map(i=><Star key={i} size={size} className={i<=Math.round(n)?"fill-amber-400 text-amber-400":"fill-gray-200 text-gray-200"}/>)}</span>;
}

function SectionHeader({title,sub,cta,onCta,badge}:{title:string;sub?:string;cta?:string;onCta?:()=>void;badge?:string}){
  return(
    <div className="flex items-end justify-between mb-4">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-extrabold text-foreground">{title}</h2>
          {badge&&<span className="px-2 py-0.5 text-[10px] font-bold rounded-full text-white" style={{background:RED}}>{badge}</span>}
        </div>
        {sub&&<p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      {cta&&<button onClick={onCta} className="text-xs font-bold flex items-center gap-0.5 hover:underline shrink-0" style={{color:GREEN}}>{cta}<ChevronRight size={12}/></button>}
    </div>
  );
}

// ─── Compact Product Card (6-col grid) ───────────────────────────────────────

function ProductCard({p,locale,onAdd,onView}:{p:Product;locale:Locale;onAdd:()=>void;onView:()=>void}){
  const [wished,setWished]=useState(false);
  const [added,setAdded]=useState(false);
  const d=discPct(p);

  const handleAdd=(e:React.MouseEvent)=>{e.stopPropagation();onAdd();setAdded(true);setTimeout(()=>setAdded(false),1400);};

  return(
    <div onClick={onView} className="bg-card rounded-xl border border-border overflow-hidden flex flex-col cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 group"
      onMouseEnter={e=>(e.currentTarget.style.borderColor=GREEN+"55")}
      onMouseLeave={e=>(e.currentTarget.style.borderColor="")}
    >
      <div className="relative overflow-hidden bg-muted">
        <img src={p.img} alt={p.nameEN} className="w-full aspect-square object-cover transition-transform duration-300 group-hover:scale-[1.07]" />
        <div className="absolute top-1.5 left-1.5 flex flex-col gap-0.5">
          {d>0  &&<span className="text-[9px] font-extrabold px-1.5 py-px rounded-full text-white leading-none" style={{background:RED}}>-{d}%</span>}
          {p.isNew&&!d&&<span className="text-[9px] font-extrabold px-1.5 py-px rounded-full text-white leading-none" style={{background:GREEN}}>NEW</span>}
          {p.isRestocked&&<span className="text-[9px] font-extrabold px-1.5 py-px rounded-full text-white leading-none" style={{background:GOLD}}>BACK</span>}
          {p.isBestSeller&&<span className="text-[9px] font-extrabold px-1.5 py-px rounded-full text-white leading-none bg-amber-500">BEST</span>}
        </div>
        <button onClick={e=>{e.stopPropagation();setWished(w=>!w);}} className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-white/90 flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white">
          <Heart size={11} className={wished?"fill-red-500 text-red-500":"text-muted-foreground"}/>
        </button>
      </div>
      <div className="p-2.5 flex flex-col flex-1 gap-1">
        <p className="text-[10px] text-muted-foreground leading-none truncate">{p.supplier}</p>
        <p className="text-xs font-semibold text-foreground leading-snug line-clamp-2">{getName(p,locale)}</p>
        <div className="flex items-center gap-1"><Stars n={p.rating}/><span className="text-[9px] text-muted-foreground">({p.reviews})</span></div>
        <div className="flex flex-wrap gap-0.5"><HalalBadge tier={p.halalTier} locale={locale}/><StorageBadge type={p.storage}/></div>
        <div className="flex items-baseline gap-1.5 mt-auto pt-1">
          <span className="text-sm font-extrabold text-foreground">¥{p.price.toLocaleString()}</span>
          {p.comparePrice&&<span className="text-[10px] text-muted-foreground line-through">¥{p.comparePrice.toLocaleString()}</span>}
        </div>
        <button onClick={handleAdd} className="w-full py-1.5 rounded-lg text-[11px] font-bold text-white transition-all"
          style={{background:added?"#166534":GREEN}}
          onMouseEnter={e=>{if(!added)(e.currentTarget as HTMLButtonElement).style.background=DARK_GREEN;}}
          onMouseLeave={e=>{if(!added)(e.currentTarget as HTMLButtonElement).style.background=GREEN;}}
        >{added?"✓ Added!":locale==="JA"?"カートへ":locale==="BN"?"যোগ করুন":"Add to Cart"}</button>
      </div>
    </div>
  );
}

// ─── Header ──────────────────────────────────────────────────────────────────

const NAV_JA=["セール","ハラール肉","冷凍食品","米・粉","スパイス","豆類","スナック","飲み物","ベビー","美容","国別"];
const NAV_EN=["Deals","Halal Meat","Frozen Foods","Rice & Flour","Spices","Lentils","Snacks","Drinks","Baby","Beauty","By Country"];

function Header({locale,setLocale,cartCount,setView}:{locale:Locale;setLocale:(l:Locale)=>void;cartCount:number;setView:(v:View)=>void}){
  const [menuOpen,setMenuOpen]=useState(false);
  const navItems=locale==="JA"?NAV_JA:NAV_EN;
  return(
    <header className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
      <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center gap-3">
        <button onClick={()=>setView("home")} className="flex items-center gap-2 shrink-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-extrabold text-sm" style={{background:GREEN}}>BC</div>
          <div className="hidden sm:block text-left">
            <div className="text-sm font-extrabold leading-none" style={{color:GREEN}}>Beticrom</div>
            <div className="text-[10px] text-muted-foreground leading-none">Halal Market · ベティクロム</div>
          </div>
        </button>
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"/>
          <input type="text" placeholder={locale==="JA"?"お米、ハラール肉、スパイスを検索...":locale==="BN"?"পণ্য খুঁজুন...":"Search rice, halal meat, spices, frozen food..."}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-input-background text-sm outline-none border border-border placeholder:text-muted-foreground"
            onFocus={e=>(e.target.style.borderColor=GREEN+"80")} onBlur={e=>(e.target.style.borderColor="")}
          />
        </div>
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <div className="flex border border-border rounded-lg overflow-hidden">
            {(["JA","EN","BN"] as Locale[]).map((l,i)=>(
              <button key={l} onClick={()=>setLocale(l)} className={`px-2 py-1.5 text-[10px] font-bold transition-colors ${locale===l?"text-white":"text-muted-foreground hover:bg-muted"} ${i<2?"border-r border-border":""}`} style={locale===l?{background:GREEN}:{}}>{l}</button>
            ))}
          </div>
          <button onClick={()=>setView("account")} className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-muted text-sm font-medium transition-colors">
            <User size={15}/><span className="hidden lg:block">{locale==="JA"?"アカウント":"Account"}</span>
          </button>
          <button onClick={()=>setView("cart")} className="relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-sm font-bold hover:opacity-90" style={{background:GREEN}}>
            <ShoppingCart size={15}/>
            <span className="hidden lg:block">{locale==="JA"?"カート":"Cart"}</span>
            {cartCount>0&&<span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center" style={{background:RED}}>{cartCount>9?"9+":cartCount}</span>}
          </button>
        </div>
        <div className="flex sm:hidden items-center gap-2 shrink-0">
          <button onClick={()=>setView("cart")} className="relative w-9 h-9 rounded-xl flex items-center justify-center text-white" style={{background:GREEN}}>
            <ShoppingCart size={16}/>
            {cartCount>0&&<span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center" style={{background:RED}}>{cartCount}</span>}
          </button>
          <button onClick={()=>setMenuOpen(m=>!m)} className="w-9 h-9 rounded-xl border border-border flex items-center justify-center">{menuOpen?<X size={16}/>:<Menu size={16}/>}</button>
        </div>
      </div>
      <div className="hidden sm:block border-t border-border">
        <div className="max-w-screen-xl mx-auto px-4">
          <nav className="flex items-center overflow-x-auto scrollbar-hide">
            {navItems.map((item,i)=>(
              <button key={item} onClick={()=>setView("category")} className={`px-3 py-2.5 text-xs font-semibold whitespace-nowrap hover:bg-secondary transition-colors flex-shrink-0 ${i===0?"font-extrabold":""}`} style={i===0?{color:RED}:{}}>{item}</button>
            ))}
          </nav>
        </div>
      </div>
      {menuOpen&&(
        <div className="sm:hidden border-t border-border bg-card px-4 py-3 space-y-2">
          <div className="flex gap-1 mb-3">
            {(["JA","EN","BN"] as Locale[]).map(l=>(
              <button key={l} onClick={()=>{setLocale(l);setMenuOpen(false);}} className={`flex-1 py-1.5 rounded-lg text-xs font-bold ${locale===l?"text-white":"bg-muted text-muted-foreground"}`} style={locale===l?{background:GREEN}:{}}>{l}</button>
            ))}
          </div>
          {[["home","Home"],["category","Categories"],["account","Account"],["cart","Cart"]].map(([v,label])=>(
            <button key={v} onClick={()=>{setView(v as View);setMenuOpen(false);}} className="w-full text-left px-3 py-2 rounded-xl hover:bg-muted text-sm font-medium">{label}</button>
          ))}
        </div>
      )}
    </header>
  );
}

// ─── Homepage ────────────────────────────────────────────────────────────────

function Homepage({locale,cartCount,onAdd,setView}:{locale:Locale;cartCount:number;onAdd:()=>void;setView:(v:View)=>void}){
  const [dismissed,setDismissed]=useState(false);
  const [postalCode,setPostalCode]=useState("");
  const [postalOk,setPostalOk]=useState(false);
  const [openFaq,setOpenFaq]=useState<number|null>(null);
  const L=locale;
  const t=(ja:string,en:string,bn?:string)=>L==="JA"?ja:L==="BN"&&bn?bn:en;

  return(
    <div className="pb-24 sm:pb-8">
      {/* Promo bar */}
      {!dismissed&&(
        <div className="text-white flex items-center justify-between px-4 py-2 text-xs font-medium" style={{background:GREEN}}>
          <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-center gap-1 sm:gap-6 text-center">
            <span>🚚 {t("¥6,500以上のご注文で送料無料","Free dry shipping on orders over ¥6,500")}</span>
            <span className="font-extrabold bg-white/20 px-2 py-0.5 rounded-full">{t("新規クーポン: BETICROM500","New customer coupon: BETICROM500")}</span>
          </div>
          <button onClick={()=>setDismissed(true)} className="ml-2 shrink-0 hover:opacity-70"><X size={14}/></button>
        </div>
      )}

      <div className="max-w-screen-xl mx-auto px-4 space-y-12 pt-5">

        {/* Hero */}
        <section className="relative rounded-2xl overflow-hidden min-h-[260px] sm:min-h-[360px] flex">
          <img src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1400&h=700&fit=crop&auto=format" alt="Halal food" className="absolute inset-0 w-full h-full object-cover"/>
          <div className="absolute inset-0" style={{background:"linear-gradient(to right,rgba(11,79,42,0.90) 0%,rgba(11,79,42,0.50) 55%,transparent 100%)"}}/>
          <div className="relative z-10 flex-1 p-6 sm:p-12 flex flex-col justify-center max-w-2xl">
            <span className="text-xs font-bold bg-white/20 backdrop-blur border border-white/30 text-white px-3 py-1 rounded-full w-fit mb-3">{t("日本全国へ届ける・ハラール認証済み","Japan-wide · Certified Halal")}</span>
            <h1 className="text-white font-extrabold leading-tight mb-2" style={{fontSize:"clamp(1.6rem,4vw,2.8rem)",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
              {t("日本全国へ届ける\n信頼のハラール食品","Japan's Trusted\nHalal Grocery Store")}
            </h1>
            <p className="text-white/80 text-sm mb-5 leading-relaxed max-w-md">{t("ハラール肉・冷凍食品・お米・スパイス・スナック・日用品まで全国へ。","Fresh halal meat, frozen foods, rice, spices, snacks, and daily essentials delivered across Japan.")}</p>
            <div className="flex flex-wrap gap-2 mb-4">
              <button onClick={()=>setView("category")} className="px-5 py-2.5 rounded-xl text-white text-sm font-bold hover:opacity-90" style={{background:RED}}>{t("本日のセールを見る","Shop Today's Deals")}</button>
              <button onClick={()=>setView("category")} className="px-5 py-2.5 rounded-xl border border-white/40 text-white text-sm font-bold backdrop-blur-sm hover:bg-white/10">{t("ハラール肉を見る","View Halal Meat")}</button>
            </div>
            <div className="flex flex-wrap gap-3">
              {[t("ハラール認証","Certified Halal"),t("冷凍配送","Cold Chain"),t("全国配送","Japan-wide"),t("JP/EN/BN","JP/EN/BN")].map(badge=>(
                <span key={badge} className="flex items-center gap-1 text-[11px] text-white/75 font-medium"><CheckCircle size={11} className="text-green-300"/>{badge}</span>
              ))}
            </div>
          </div>
          <div className="hidden lg:flex flex-col gap-3 p-5 justify-center shrink-0 w-52">
            {[{label:t("米・パントリーセール","Rice & Pantry Sale"),sub:"Up to 20% off",color:"#FFFBEB"},{label:t("冷凍スナックウィーク","Frozen Snack Week"),sub:"New arrivals",color:"#EBF5FF"},{label:t("バルク・業務用","Bulk & Wholesale"),sub:"From ¥30,000",color:"#F0FFF4"}].map(c=>(
              <button key={c.label} className="rounded-xl p-3 text-left hover:scale-105 transition-transform border border-border" style={{background:c.color}}>
                <p className="text-xs font-bold text-foreground">{c.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{c.sub}</p>
                <span className="text-[10px] font-bold flex items-center gap-0.5 mt-1.5" style={{color:GREEN}}>{t("今すぐ","Shop")} <ArrowRight size={9}/></span>
              </button>
            ))}
          </div>
        </section>

        {/* Trust strip */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {icon:<Shield size={20} style={{color:GREEN}}/>,title:t("ハラール認証済","Verified Halal"),sub:t("第三者認証・供給元証明","Certification & supplier proof")},
            {icon:<Snowflake size={20} className="text-blue-500"/>,title:t("コールドチェーン","Cold Chain Delivery"),sub:t("安全な冷凍・冷蔵配送","Frozen and cool packed safely")},
            {icon:<Truck size={20} style={{color:GOLD}}/>,title:t("全国配送","Japan-wide Shipping"),sub:t("全国の乾物配送","Dry items shipped everywhere")},
            {icon:<MessageCircle size={20} className="text-muted-foreground"/>,title:t("多言語サポート","Multilingual Support"),sub:t("日本語・英語・ベンガル語","JP · EN · BN")},
          ].map((item,i)=>(
            <div key={i} className="bg-card border border-border rounded-xl p-4 flex items-start gap-3 hover:shadow-sm transition-shadow">
              <div className="shrink-0 mt-0.5">{item.icon}</div>
              <div><p className="text-sm font-bold text-foreground">{item.title}</p><p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{item.sub}</p></div>
            </div>
          ))}
        </section>

        {/* Categories (18) */}
        <section>
          <SectionHeader title={t("カテゴリーから探す","Shop by Category")} cta={t("すべて","All categories")} onCta={()=>setView("category")}/>
          <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-9 gap-2.5">
            {CATEGORIES.map(cat=>(
              <button key={cat.en} onClick={()=>setView("category")} className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl border border-border hover:shadow-sm transition-all group text-center" style={{background:cat.bg}} onMouseEnter={e=>(e.currentTarget.style.borderColor=GREEN+"50")} onMouseLeave={e=>(e.currentTarget.style.borderColor="")}>
                <img src={cat.img} alt={cat.en} className="w-12 h-9 object-cover rounded-lg group-hover:scale-105 transition-transform"/>
                <div>
                  <p className="text-[10px] font-bold text-foreground leading-tight group-hover:text-primary">{L==="JA"?cat.ja:L==="BN"?cat.bn:cat.en}</p>
                  <p className="text-[9px] text-muted-foreground">{cat.count} items</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Today's Deals – 6-col compact */}
        <section>
          <SectionHeader title={t("本日のセール","Today's Deals")} badge="ON SALE" cta={t("すべて","View all")} onCta={()=>setView("category")}/>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {ALL_PRODUCTS.filter(p=>p.comparePrice).slice(0,12).map(p=><ProductCard key={p.id} p={p} locale={L} onAdd={onAdd} onView={()=>setView("pdp")}/>)}
          </div>
        </section>

        {/* New Arrivals */}
        <section>
          <SectionHeader title={t("新着商品","New Arrivals")} badge="NEW" sub={t("今月の新入荷商品","Freshly landed this month")} cta={t("すべて","See all")} onCta={()=>setView("category")}/>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {ALL_PRODUCTS.filter(p=>p.isNew).slice(0,6).map(p=><ProductCard key={p.id} p={p} locale={L} onAdd={onAdd} onView={()=>setView("pdp")}/>)}
          </div>
        </section>

        {/* Best Sellers */}
        <section>
          <SectionHeader title={t("今週のベストセラー","Best Sellers This Week")} sub={t("日本中の家族に愛されているハラール食品","Most loved halal groceries by families across Japan.")} cta={t("すべて","See all")} onCta={()=>setView("category")}/>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {Array.from(new Map([...ALL_PRODUCTS.filter(p=>p.isBestSeller),...ALL_PRODUCTS].map(p=>[p.id,p])).values()).slice(0,6).map(p=><ProductCard key={p.id} p={p} locale={L} onAdd={onAdd} onView={()=>setView("pdp")}/>)}
          </div>
        </section>

        {/* Halal Meat & Frozen banner */}
        <section className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex flex-col sm:flex-row">
            <div className="sm:w-72 relative shrink-0">
              <img src="https://images.unsplash.com/photo-1529563021893-cc83c992d75d?w=600&h=400&fit=crop&auto=format" alt="Halal Meat" className="w-full h-48 sm:h-full object-cover"/>
              <div className="absolute inset-0 flex items-end p-6" style={{background:"linear-gradient(to top,rgba(11,79,42,0.85),transparent)"}}>
                <div>
                  <h3 className="text-white font-extrabold text-lg leading-tight">{t("ハラール肉・冷凍食品","Halal Meat & Frozen Foods")}</h3>
                  <p className="text-white/80 text-xs mt-1 mb-3">{t("鶏肉、牛肉、羊肉、ケバブ、パラタ...","Chicken, beef, mutton, kebab, paratha, momo...")}</p>
                  <button onClick={()=>setView("category")} className="px-4 py-2 text-white text-xs font-bold rounded-xl hover:opacity-90" style={{background:RED}}>{t("冷凍・肉を見る","Shop Frozen & Meat")}</button>
                </div>
              </div>
            </div>
            <div className="flex-1 p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {ALL_PRODUCTS.filter(p=>p.storage==="frozen").slice(0,8).map(p=><ProductCard key={p.id} p={p} locale={L} onAdd={onAdd} onView={()=>setView("pdp")}/>)}
              </div>
            </div>
          </div>
        </section>

        {/* Weekly Halal Deals */}
        <section className="rounded-2xl overflow-hidden border border-border" style={{background:"linear-gradient(135deg,#FFF8ED,#FFF0F0)"}}>
          <div className="p-5 flex items-center justify-between border-b border-border">
            <div className="flex items-center gap-2">
              <span className="text-xl">🔥</span>
              <div>
                <h2 className="text-lg font-extrabold text-foreground">{t("今週のハラールセール","Weekly Halal Deals")}</h2>
                <p className="text-xs text-muted-foreground">{t("毎週月曜日更新","Updated every Monday")}</p>
              </div>
            </div>
            <span className="px-3 py-1 text-xs font-bold text-white rounded-full" style={{background:RED}}>LIMITED</span>
          </div>
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {ALL_PRODUCTS.filter(p=>p.comparePrice||p.isBestSeller).slice(0,6).map(p=><ProductCard key={p.id} p={p} locale={L} onAdd={onAdd} onView={()=>setView("pdp")}/>)}
          </div>
        </section>

        {/* Recently Restocked */}
        <section>
          <SectionHeader title={t("入荷再開商品","Recently Restocked")} badge="BACK IN STOCK" sub={t("完売後の再入荷商品","Back after selling out")} cta={t("すべて","View all")} onCta={()=>setView("category")}/>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {ALL_PRODUCTS.filter(p=>p.isRestocked).concat(ALL_PRODUCTS.slice(8,14)).slice(0,6).map(p=><ProductCard key={p.id} p={p} locale={L} onAdd={onAdd} onView={()=>setView("pdp")}/>)}
          </div>
        </section>

        {/* Rice & Pantry */}
        <section>
          <SectionHeader title={t("米・粉・パントリー","Rice, Flour & Pantry")} sub={t("月間パントリーショッピングを簡単に。","Monthly pantry shopping made easy.")} cta={t("すべて","See all")} onCta={()=>setView("category")}/>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {ALL_PRODUCTS.filter(p=>p.storage==="dry").slice(0,6).map(p=><ProductCard key={p.id} p={p} locale={L} onAdd={onAdd} onView={()=>setView("pdp")}/>)}
          </div>
        </section>

        {/* Shop by Country (14) */}
        <section>
          <SectionHeader title={t("国別で探す","Shop by Country")} sub={t("母国の商品を見つけよう。","Find familiar products from home.")}/>
          <div className="flex gap-2 flex-wrap">
            {COUNTRIES.map(c=>(
              <button key={c.name} onClick={()=>setView("category")} className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-border bg-card transition-all hover:-translate-y-px hover:shadow-sm group" onMouseEnter={e=>(e.currentTarget.style.borderColor=GREEN+"60")} onMouseLeave={e=>(e.currentTarget.style.borderColor="")}>
                <span className="text-lg leading-none">{c.flag}</span>
                <span className="text-xs font-semibold text-foreground group-hover:text-primary whitespace-nowrap">{L==="JA"?c.ja:c.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Popular Brands (18) */}
        <section>
          <SectionHeader title={t("人気ブランド","Popular Brands")} sub={t("信頼のハラールブランドを揃えています","Trusted halal brands from around the world")} cta={t("すべて","All brands")} onCta={()=>setView("category")}/>
          <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-9 gap-2.5">
            {BRANDS.map(b=>(
              <button key={b.name} className="flex items-center justify-center p-3 rounded-xl border border-border bg-card hover:shadow-md transition-all group h-14" style={{background:b.bg}} onMouseEnter={e=>(e.currentTarget.style.borderColor=b.color+"60")} onMouseLeave={e=>(e.currentTarget.style.borderColor="")}>
                <span className="text-sm font-extrabold text-center group-hover:scale-105 transition-transform" style={{color:b.color,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>{b.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Ramadan / Eid Specials */}
        <section className="rounded-2xl border border-amber-200 overflow-hidden" style={{background:"linear-gradient(135deg,#FFFBEB,#FFF0D0)"}}>
          <div className="p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🌙</span>
              <div>
                <h2 className="text-lg font-extrabold text-foreground">{t("ラマダン・イード スペシャル","Ramadan / Eid Specials")}</h2>
                <p className="text-xs text-muted-foreground">{t("イフタール、サフール用の特別セット","Iftar, Suhoor & celebration bundles")}</p>
              </div>
            </div>
            <button onClick={()=>setView("category")} className="px-5 py-2.5 rounded-xl text-white text-sm font-bold hover:opacity-90 shrink-0" style={{background:GOLD}}>{t("スペシャルを見る","Shop Specials")}</button>
          </div>
          <div className="px-4 pb-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[ALL_PRODUCTS[21],ALL_PRODUCTS[0],ALL_PRODUCTS[3],ALL_PRODUCTS[10],ALL_PRODUCTS[6],ALL_PRODUCTS[4]].map(p=><ProductCard key={p.id} p={p} locale={L} onAdd={onAdd} onView={()=>setView("pdp")}/>)}
          </div>
        </section>

        {/* Shop by Recipe */}
        <section>
          <SectionHeader title={t("レシピから探す","Shop by Recipe")} sub={t("材料をまとめてカートへ","Add all ingredients to cart at once")} cta={t("すべて","All recipes")} onCta={()=>setView("category")}/>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {RECIPES.map(r=>(
              <button key={r.name} onClick={()=>setView("category")} className="relative shrink-0 w-44 rounded-2xl overflow-hidden group hover:shadow-lg transition-shadow">
                <img src={r.img} alt={r.name} className="w-full h-28 object-cover group-hover:scale-105 transition-transform duration-300"/>
                <div className="absolute inset-0" style={{background:"linear-gradient(to top,rgba(0,0,0,0.75),transparent)"}}/>
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-white font-bold text-xs">{L==="JA"?r.nameJA:r.name}</p>
                  <p className="text-white/70 text-[10px] mt-0.5">{r.time} · {r.items} {L==="JA"?"品":"items"}</p>
                  <span className="text-[10px] font-bold text-green-300 flex items-center gap-0.5 mt-1">{t("材料を見る","Shop ingredients")}<ArrowRight size={9}/></span>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Reorder Essentials */}
        <section className="rounded-2xl p-5 border border-border" style={{background:"#F0FFF4"}}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <RotateCcw size={16} style={{color:GREEN}}/>
              <h2 className="font-extrabold text-base text-foreground">{t("定番商品を再注文","Reorder Essentials")}</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{background:GREEN}}>For You</span>
            </div>
            <button className="text-xs font-bold hover:underline" style={{color:GREEN}}>{t("注文履歴","Order History")}</button>
          </div>
          <div className="flex flex-col gap-2">
            {[ALL_PRODUCTS[4],ALL_PRODUCTS[5],ALL_PRODUCTS[6]].map(p=>(
              <div key={p.id} className="bg-card rounded-xl border border-border flex items-center gap-3 p-3">
                <img src={p.img} alt={p.nameEN} className="w-12 h-12 rounded-lg object-cover bg-muted shrink-0"/>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{getName(p,L)}</p>
                  <div className="flex items-center gap-2 mt-0.5"><span className="text-sm font-bold">¥{p.price.toLocaleString()}</span><HalalBadge tier={p.halalTier} locale={L}/></div>
                </div>
                <button onClick={onAdd} className="shrink-0 px-4 py-1.5 text-white text-xs font-bold rounded-lg hover:opacity-90" style={{background:GREEN}}>{t("再注文","Reorder")}</button>
              </div>
            ))}
          </div>
        </section>

        {/* Bulk & Wholesale */}
        <section className="rounded-2xl border border-border overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center gap-6 p-6 sm:p-8" style={{background:`linear-gradient(135deg,${DARK_GREEN},${GREEN})`}}>
            <div className="flex-1">
              <span className="text-xs font-bold text-white/60 uppercase tracking-widest">{t("業務用・大口注文","B2B / Wholesale")}</span>
              <h2 className="text-2xl font-extrabold text-white mt-1" style={{fontFamily:"'Plus Jakarta Sans',sans-serif"}}>{t("バルク・業務用注文","Bulk & Wholesale Orders")}</h2>
              <p className="text-white/80 text-sm mt-2 max-w-lg">{t("レストラン・食料品店・コミュニティ向け大口割引。最低注文額¥30,000から。","Discounts for restaurants, grocery stores & communities. From ¥30,000 minimum order.")}</p>
              <div className="flex flex-wrap gap-3 mt-4">
                <button className="px-5 py-2.5 rounded-xl text-sm font-bold text-white border border-white/40 hover:bg-white/10">{t("お問い合わせ","Enquire Now")}</button>
                <button className="px-5 py-2.5 rounded-xl text-sm font-bold hover:opacity-90" style={{background:GOLD,color:"#fff"}}>{t("業務用カタログ","Download Catalogue")}</button>
              </div>
            </div>
            <div className="shrink-0 grid grid-cols-2 gap-2">
              {[["🏪","Restaurants"],["🕌","Mosques"],["🏫","Schools"],["🏬","Retailers"]].map(([icon,label])=>(
                <div key={label} className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
                  <span className="text-lg">{icon}</span>
                  <span className="text-xs font-semibold text-white">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Delivery Checker */}
        <section className="bg-card border border-border rounded-2xl p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2"><MapPin size={18} style={{color:GREEN}}/><h2 className="text-xl font-extrabold text-foreground">{t("日本全国へ配送","Delivery Across Japan")}</h2></div>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{t("乾物は全国配送。冷凍・冷蔵商品は温度管理包装にてお届け。","Dry items ship Japan-wide. Frozen & cool items with temperature-safe packaging.")}</p>
              <div className="flex gap-2">
                <input value={postalCode} onChange={e=>setPostalCode(e.target.value)} placeholder={t("郵便番号を入力","Enter postal code")} className="flex-1 px-3 py-2.5 rounded-xl border border-border text-sm outline-none" onFocus={e=>(e.target.style.borderColor=GREEN+"80")} onBlur={e=>(e.target.style.borderColor="")}/>
                <button onClick={()=>setPostalOk(true)} className="px-4 py-2.5 text-white text-sm font-bold rounded-xl hover:opacity-90 whitespace-nowrap" style={{background:GREEN}}>{t("確認","Check")}</button>
              </div>
              {postalOk&&<p className="text-xs font-semibold mt-2 flex items-center gap-1" style={{color:GREEN}}><CheckCircle size={12}/>{t("お届け可能なエリアです！","All delivery types available in your area!")}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:w-56">
              {[{icon:<Package size={16}/>,label:t("乾物","Dry"),sub:"1–3 days",bg:"#FFFBEB",text:"#92400e"},{icon:<Thermometer size={16}/>,label:t("冷蔵","Cool"),sub:t("一部エリア","Select areas"),bg:"#CCFBF1",text:"#0d6e6e"},{icon:<Snowflake size={16}/>,label:t("冷凍","Frozen"),sub:t("日程指定","Scheduled"),bg:"#E0F2FE",text:"#0369a1"},{icon:<MapPin size={16}/>,label:t("店舗受取","Pickup"),sub:t("一部エリア","Available"),bg:"#DCFCE7",text:"#166534"}].map((d,i)=>(
                <div key={i} className="rounded-xl p-3 border border-border" style={{background:d.bg}}>
                  <div className="mb-1" style={{color:d.text}}>{d.icon}</div>
                  <p className="text-xs font-bold" style={{color:d.text}}>{d.label}</p>
                  <p className="text-[10px] opacity-70" style={{color:d.text}}>{d.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* BIMI Kitchen Payment Methods */}
        <section className="rounded-3xl overflow-hidden" style={{background:"#FAF8F2",border:"1px solid #E8E4DC"}}>

          {/* ── Header ── */}
          <div className="px-6 pt-8 pb-6 text-center border-b" style={{borderColor:"#EAE6DE"}}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold mb-4" style={{background:RED+"12",color:RED,border:`1px solid ${RED}30`}}>
              <Utensils size={10}/> BIMI Kitchen / 美味キッチン
            </div>
            <h2 className="text-2xl font-extrabold text-foreground mb-1" style={{fontFamily:"'Plus Jakarta Sans',sans-serif",letterSpacing:"-0.01em"}}>
              お支払い方法
            </h2>
            <p className="text-sm text-muted-foreground">
              オンラインショップおよび店内でのお支払い方法のご案内
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Payment methods for online shop and in-store use.
            </p>
          </div>

          <div className="px-4 sm:px-8 py-8 space-y-8">

            {/* ── Trust badges ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {icon:<Lock size={17}/>,         ja:"セキュア決済",           en:"Secure Payment",         sub:"SSL暗号化"},
                {icon:<Receipt size={17}/>,      ja:"領収書発行",             en:"Receipt Available",      sub:"PDF対応"},
                {icon:<CreditCard size={17}/>,   ja:"多様なお支払い",         en:"Multiple Methods",       sub:"カード・QR・IC"},
                {icon:<ShoppingBag size={17}/>,  ja:"店頭受取・デリバリー",   en:"Pickup & Delivery",      sub:"両方対応"},
              ].map((b,i)=>(
                <div key={i} className="bg-white rounded-2xl p-4 flex flex-col items-center text-center gap-2 shadow-sm border" style={{borderColor:"#EAE6DE"}}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:GREEN+"12",color:GREEN}}>{b.icon}</div>
                  <div>
                    <p className="text-xs font-bold text-foreground leading-tight">{b.ja}</p>
                    <p className="text-[10px] font-medium text-muted-foreground">{b.en}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">{b.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Online Shop Payment ── */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-5 rounded-full" style={{background:GREEN}}/>
                <h3 className="font-extrabold text-sm text-foreground">オンラインショップ</h3>
                <span className="text-[10px] font-semibold text-muted-foreground ml-1">Online Shop</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Credit Card */}
                <div className="bg-white rounded-2xl shadow-sm border overflow-hidden" style={{borderColor:"#EAE6DE"}}>
                  <div className="flex items-center gap-2 px-4 py-3 border-b" style={{borderColor:"#EAE6DE",background:"#EEF2FF"}}>
                    <CreditCard size={14} style={{color:"#1A1F71"}}/>
                    <span className="text-xs font-extrabold" style={{color:"#1A1F71"}}>クレジットカード</span>
                    <span className="text-[9px] text-blue-400 ml-0.5">Credit Card</span>
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-2">
                    {[{n:"Visa",c:"#1A1F71",bg:"#EEF2FF"},{n:"Mastercard",c:"#EB001B",bg:"#FFF5F5"},{n:"JCB",c:"#007B40",bg:"#F0FFF4"},{n:"Amex",c:"#007BC1",bg:"#EBF5FF"}].map(m=>(
                      <div key={m.n} className="flex items-center justify-center py-2 px-3 rounded-xl border text-[11px] font-extrabold" style={{background:m.bg,color:m.c,borderColor:m.c+"30"}}>{m.n}</div>
                    ))}
                  </div>
                </div>
                {/* QR */}
                <div className="bg-white rounded-2xl shadow-sm border overflow-hidden" style={{borderColor:"#EAE6DE"}}>
                  <div className="flex items-center gap-2 px-4 py-3 border-b" style={{borderColor:"#EAE6DE",background:"#FFF5F5"}}>
                    <Smartphone size={14} style={{color:RED}}/>
                    <span className="text-xs font-extrabold" style={{color:RED}}>QRコード決済</span>
                    <span className="text-[9px] text-red-300 ml-0.5">QR Payment</span>
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-2">
                    {[{n:"PayPay",c:"#D92D20",bg:"#FFF5F5"},{n:"楽天ペイ",c:"#BF0000",bg:"#FFF5F5"},{n:"Apple Pay",c:"#1C1C1E",bg:"#F5F5F5"},{n:"Google Pay",c:"#4285F4",bg:"#EBF4FF"}].map(m=>(
                      <div key={m.n} className="flex items-center justify-center py-2 px-3 rounded-xl border text-[11px] font-extrabold" style={{background:m.bg,color:m.c,borderColor:m.c+"30"}}>{m.n}</div>
                    ))}
                  </div>
                </div>
                {/* Other */}
                <div className="bg-white rounded-2xl shadow-sm border overflow-hidden" style={{borderColor:"#EAE6DE"}}>
                  <div className="flex items-center gap-2 px-4 py-3 border-b" style={{borderColor:"#EAE6DE",background:"#F5F5F4"}}>
                    <Building2 size={14} style={{color:"#57534e"}}/>
                    <span className="text-xs font-extrabold" style={{color:"#57534e"}}>その他</span>
                    <span className="text-[9px] text-stone-400 ml-0.5">Other</span>
                  </div>
                  <div className="p-4 flex flex-col gap-2">
                    {[{n:"銀行振込 Bank Transfer",c:"#1A6EA8",bg:"#EBF5FF"},{n:"コンビニ払い Konbini",c:"#57534e",bg:"#F5F5F4"},{n:"代金引換 COD",c:"#B45309",bg:"#FFFBEB"}].map(m=>(
                      <div key={m.n} className="flex items-center justify-center py-2 px-3 rounded-xl border text-[10px] font-extrabold text-center leading-tight" style={{background:m.bg,color:m.c,borderColor:m.c+"30"}}>{m.n}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── In-store Payment ── */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-5 rounded-full" style={{background:RED}}/>
                <h3 className="font-extrabold text-sm text-foreground">店内お支払い</h3>
                <span className="text-[10px] font-semibold text-muted-foreground ml-1">In-Store Payment</span>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border overflow-hidden" style={{borderColor:"#EAE6DE"}}>
                {[
                  {
                    ja:"クレジット・デビット", en:"Credit / Debit Card",
                    c:"#1A1F71", bg:"#EEF2FF",
                    icon:<CreditCard size={13}/>,
                    items:[{n:"Visa",c:"#1A1F71",bg:"#EEF2FF"},{n:"Mastercard",c:"#EB001B",bg:"#FFF5F5"},{n:"JCB",c:"#007B40",bg:"#F0FFF4"},{n:"Amex",c:"#007BC1",bg:"#EBF5FF"}],
                  },
                  {
                    ja:"QRコード決済", en:"QR Code",
                    c:RED, bg:"#FFF5F5",
                    icon:<Smartphone size={13}/>,
                    items:[{n:"PayPay",c:"#D92D20",bg:"#FFF5F5"},{n:"楽天ペイ",c:"#BF0000",bg:"#FFF5F5"},{n:"d払い",c:"#D92D20",bg:"#FFF5F5"},{n:"au PAY",c:"#D97706",bg:"#FFFBEB"}],
                  },
                  {
                    ja:"交通系IC", en:"Transport IC",
                    c:"#0369A1", bg:"#E0F2FE",
                    icon:<Package size={13}/>,
                    items:[{n:"Suica",c:"#009944",bg:"#F0FFF4"},{n:"PASMO",c:"#E50071",bg:"#FFF0FA"},{n:"ICOCA",c:"#0075C2",bg:"#EBF5FF"}],
                  },
                  {
                    ja:"電子マネー", en:"e-Money",
                    c:"#7C3AED", bg:"#F5F3FF",
                    icon:<Smartphone size={13}/>,
                    items:[{n:"iD",c:"#1A1A1A",bg:"#F5F5F5"},{n:"QUICPay",c:"#D97706",bg:"#FFFBEB"},{n:"楽天Edy",c:"#BF0000",bg:"#FFF5F5"}],
                  },
                  {
                    ja:"海外・インバウンド", en:"International",
                    c:"#0D6E6E", bg:"#CCFBF1",
                    icon:<Building2 size={13}/>,
                    items:[{n:"Alipay",c:"#00A3E0",bg:"#E8F7FF"},{n:"WeChat Pay",c:"#07C160",bg:"#F0FFF4"},{n:"UnionPay",c:"#D92D20",bg:"#FFF5F5"}],
                  },
                ].map((row,ri)=>(
                  <div key={row.ja} className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 ${ri>0?"border-t":""}`} style={ri>0?{borderColor:"#EAE6DE"}:{}}>
                    <div className="sm:w-44 shrink-0 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{background:row.bg,color:row.c}}>{row.icon}</div>
                      <div>
                        <p className="text-xs font-extrabold" style={{color:row.c}}>{row.ja}</p>
                        <p className="text-[9px] text-muted-foreground">{row.en}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {row.items.map(m=>(
                        <span key={m.n} className="inline-flex items-center px-2.5 py-1 rounded-lg border text-[10px] font-extrabold" style={{background:m.bg,color:m.c,borderColor:m.c+"35"}}>{m.n}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>


            {/* ── Disclaimer ── */}
            <p className="text-[11px] text-muted-foreground text-center leading-relaxed px-4" style={{borderTop:"1px solid #EAE6DE",paddingTop:"1.25rem"}}>
              ※ 利用可能なお支払い方法は、オンライン注文・店頭受取・店内購入によって異なる場合があります。<br/>
              <span className="text-[10px]">Available payment methods may vary depending on online order, store pickup, and in-store purchase.</span>
            </p>

            {/* ── CTA buttons ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              {[
                {label:"オンラインショップ", en:"View Online Shop",  icon:<ShoppingCart size={15}/>, style:{background:GREEN,color:"#fff",border:"none"}},
                {label:"店舗へのご来店",     en:"Visit Store",       icon:<MapPin size={15}/>,       style:{background:"#fff",color:GREEN,border:`1.5px solid ${GREEN}`}},
                {label:"お電話でのご注文",   en:"Call Now",          icon:<Phone size={15}/>,        style:{background:"#fff",color:RED,border:`1.5px solid ${RED}`}},
                {label:"Google Maps",        en:"Get Directions",    icon:<MapPin size={15}/>,       style:{background:"#fff",color:"#4285F4",border:"1.5px solid #4285F4"}},
              ].map(btn=>(
                <button key={btn.en} className="flex flex-col items-center justify-center gap-1.5 py-3.5 px-4 rounded-2xl text-center transition-all hover:shadow-md hover:-translate-y-0.5 font-bold" style={btn.style}>
                  {btn.icon}
                  <span className="text-[10px] font-extrabold leading-none">{btn.label}</span>
                  <span className="text-[9px] font-medium opacity-70 leading-none">{btn.en}</span>
                </button>
              ))}
            </div>

          </div>
        </section>

        {/* Visit Our Stores */}
        <section>
          <SectionHeader title={t("店舗へのご来店","Visit Our Stores")} sub={t("実店舗でもお買い物いただけます","Shop in person at our physical stores")}/>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {name:"Beticrom 新小岩店",nameEN:"Beticrom Shin-Koiwa Store",addr:"〒124-0025 東京都葛飾区西新小岩1-2-11 キクヤビル1F",addrEN:"Kikuya Bldg 1F, 1-2-11 Nishi-Shinkoiwa, Katsushika, Tokyo",phone:"03-5654-6417",hours:"10:00–21:00",station:t("新小岩駅から徒歩5分","5 min walk from Shin-Koiwa Station"),img:"https://images.unsplash.com/photo-1534723452862-4c874986ebad?w=600&h=300&fit=crop&auto=format"},
              {name:"Beticrom 池袋店",nameEN:"Beticrom Ikebukuro Store",addr:"〒171-0014 東京都豊島区池袋2-3-10",addrEN:"2-3-10 Ikebukuro, Toshima, Tokyo",phone:"03-3984-5521",hours:"10:00–21:00",station:t("池袋駅東口から徒歩3分","3 min walk from Ikebukuro East Exit"),img:"https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600&h=300&fit=crop&auto=format"},
            ].map(store=>(
              <div key={store.name} className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
                <div className="relative h-44 overflow-hidden">
                  <img src={store.img} alt={store.name} className="w-full h-full object-cover"/>
                  <div className="absolute top-3 left-3 flex gap-2">
                    <span className="text-[10px] font-bold text-white px-2 py-1 rounded-full" style={{background:GREEN}}>🏪 {t("実店舗","Physical Store")}</span>
                    <span className="text-[10px] font-bold text-white px-2 py-1 rounded-full" style={{background:GOLD}}>📦 {t("受取OK","Pickup OK")}</span>
                  </div>
                </div>
                <div className="p-5 space-y-2">
                  <h3 className="font-extrabold text-base text-foreground">{L==="JA"?store.name:store.nameEN}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{L==="JA"?store.addr:store.addrEN}</p>
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    <span className="flex items-center gap-1 text-foreground"><Clock size={11}/>{store.hours}</span>
                    <span className="flex items-center gap-1 text-muted-foreground"><Phone size={11}/>{store.phone}</span>
                    <span className="flex items-center gap-1 text-muted-foreground col-span-2"><MapPin size={11}/>{store.station}</span>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border text-xs font-bold text-foreground hover:bg-muted transition-colors"><MapPin size={13}/>{t("マップ","Google Map")}</button>
                    <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-white text-xs font-bold hover:opacity-90" style={{background:GREEN}}><Phone size={13}/>{t("今すぐ電話","Call Now")}</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* BIMI Kitchen Restaurant */}
        <section className="rounded-2xl overflow-hidden border border-amber-200">
          <div className="flex flex-col sm:flex-row">
            <div className="sm:w-80 relative shrink-0">
              <img src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop&auto=format" alt="BIMI Kitchen" className="w-full h-52 sm:h-full object-cover"/>
              <div className="absolute inset-0" style={{background:"linear-gradient(to right,rgba(0,0,0,0.35),transparent)"}}/>
            </div>
            <div className="flex-1 p-6 sm:p-8" style={{background:"linear-gradient(135deg,#FFFBEB,#FFF8F0)"}}>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="text-[10px] font-bold text-white px-2 py-1 rounded-full" style={{background:GREEN}}>🕌 {t("ハラール認証","Certified Halal")}</span>
                <span className="text-[10px] font-bold text-white px-2 py-1 rounded-full" style={{background:GOLD}}>🥡 {t("テイクアウトOK","Takeout Available")}</span>
              </div>
              <div className="flex items-center gap-2 mb-1"><Utensils size={18} style={{color:GOLD}}/><h2 className="text-xl font-extrabold text-foreground" style={{fontFamily:"'Plus Jakarta Sans',sans-serif"}}>BIMI Kitchen / 美味キッチン</h2></div>
              <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{t("〒124-0025 東京都葛飾区西新小岩1-2-11 キクヤビル1F · TEL: 03-5654-6417 · 新小岩駅から徒歩5分","Kikuya Bldg 1F, 1-2-11 Nishi-Shinkoiwa, Katsushika, Tokyo · TEL: 03-5654-6417 · 5 min from Shin-Koiwa Station")}</p>
              <p className="text-sm text-muted-foreground mb-4">{t("本格バングラデシュ・ハラール料理レストラン。ビリヤニ、カレー、ケバブ、ナンをご用意。","Authentic Bangladeshi halal restaurant. Biryani, curry sets, kebab, naan, and more.")}</p>
              <div className="flex flex-wrap gap-1.5 mb-5">
                {["Biryani","Curry Set","Kebab","Samosa","Naan","Lassi","Desi Tea"].map(item=>(
                  <span key={item} className="text-[11px] font-semibold px-2.5 py-1 rounded-full border border-amber-200 text-amber-800 bg-white">{item}</span>
                ))}
              </div>
              <div className="flex gap-2">
                <button className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-sm font-bold hover:opacity-90" style={{background:GOLD}}><Utensils size={14}/>{t("メニューを見る","View Menu")}</button>
                <button className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border text-sm font-bold text-foreground hover:bg-muted transition-colors"><MapPin size={14}/>{t("マップ","Google Map")}</button>
              </div>
            </div>
          </div>
        </section>

        {/* Store Pickup */}
        <section className="rounded-2xl border border-border p-6 bg-card flex flex-col sm:flex-row gap-6 items-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{background:GREEN+"15"}}><ShoppingBag size={26} style={{color:GREEN}}/></div>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-lg font-extrabold text-foreground">{t("店舗受取サービス","Store Pickup Available")}</h2>
            <p className="text-sm text-muted-foreground mt-1">{t("オンラインで注文して、お近くの店舗で受け取れます。送料無料。","Order online and pick up at your nearest Beticrom store. No shipping fee.")}</p>
          </div>
          <button onClick={()=>setView("category")} className="px-5 py-2.5 rounded-xl text-white text-sm font-bold hover:opacity-90 shrink-0" style={{background:GREEN}}>{t("受取注文をする","Shop for Pickup")}</button>
        </section>

        {/* Halal Standards */}
        <section className="bg-card border border-border rounded-2xl p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <div className="flex-1">
              <h2 className="text-xl font-extrabold text-foreground mb-1">{t("Beticromのハラール基準","Our Halal Standard")}</h2>
              <p className="text-sm text-muted-foreground mb-5">{t("すべての商品はハラールレベルで区分されています。","Every product is clearly classified by halal compliance level.")}</p>
              <div className="space-y-3">
                {([["certified","Third-party certification from JMA/HJBA. Highest trust level.","第三者認証機関による証明書。最高レベル。"],["supplier","Halal declaration provided by the supplier with documentation.","サプライヤーが提供したハラール宣言書。"],["nopork","Confirmed no pork or alcohol at ingredient level.","豚肉・アルコール不使用を原材料で確認済み。"]] as [HalalTier,string,string][]).map(([tier,en,ja])=>(
                  <div key={tier} className="flex items-start gap-3 p-3 rounded-xl border border-border">
                    <HalalBadge tier={tier} locale={L}/>
                    <p className="text-xs text-muted-foreground leading-relaxed">{L==="JA"?ja:en}</p>
                  </div>
                ))}
              </div>
              <button className="mt-4 flex items-center gap-1 text-sm font-bold hover:underline" style={{color:GREEN}}>
                <FileCheck size={14}/>{t("ハラール認証について詳しく","Learn About Halal Verification")}<ChevronRight size={13}/>
              </button>
            </div>
            <div className="sm:w-52 rounded-2xl p-5 border text-center" style={{background:GREEN+"10",borderColor:GREEN+"30"}}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{background:GREEN+"20"}}><Shield size={24} style={{color:GREEN}}/></div>
              <p className="font-bold text-foreground text-sm">{t("認証パートナー","Certification Partners")}</p>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">Japan Muslim Association · Halal Japan Business Association · MUI · JAKIM</p>
            </div>
          </div>
        </section>

        {/* Reviews */}
        <section>
          <SectionHeader title={t("お客様のレビュー","Customer Reviews")} sub={t("実際にご購入いただいたお客様からの声","From verified customers across Japan")}/>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[{name:"Rahman A.",loc:"Tokyo",text:"Finally, I can order halal groceries easily in Japan. The Chicken Samosa is amazing!",r:5},{name:"Priya M.",loc:"Osaka",text:"Frozen items arrived safely packed. Very impressed with the cold chain delivery!",r:5},{name:"田中 健",loc:"Chiba",text:"バングラデシュのパントリー商品が揃っていて、とても便利です。また購入します。",r:4},{name:"Hamid K.",loc:"Saitama",text:"Great halal certification proof on every product. Trust is very important for us.",r:5}].map((rv,i)=>(
              <div key={i} className="bg-card border border-border rounded-2xl p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-1 mb-2"><Stars n={rv.r} size={11}/></div>
                <p className="text-sm text-foreground leading-relaxed">"{rv.text}"</p>
                <div className="mt-3 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{background:GREEN}}>{rv.name[0]}</div>
                  <div><p className="text-xs font-bold text-foreground">{rv.name}</p><p className="text-[10px] text-muted-foreground flex items-center gap-0.5"><MapPin size={8}/>{rv.loc}</p></div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section>
          <SectionHeader title={t("よくある質問","FAQ")}/>
          <div className="space-y-2">
            {([["Do you deliver frozen items?","冷凍品は配送できますか？","Yes! We use temperature-controlled packaging. Delivery dates for frozen orders are scheduled in advance."],["How do you verify halal products?","ハラール商品はどのように認証されますか？","Three tiers: Certified Halal (third-party), Supplier-Declared (supplier docs), No Pork/Alcohol (ingredient check)."],["Can I pay by card or PayPay?","カードやPayPayで支払えますか？","Yes — Visa, Mastercard, PayPay, Konbini, and bank transfer. All online payments via Stripe."],["Can I reorder previous items?","以前の商品を再注文できますか？","Yes. Your account dashboard has a one-click Reorder button for past orders."],["What if a frozen item has an issue?","冷凍品に問題があった場合は？","Contact us within 24h with a photo. We process refunds or replacements promptly."]] as [string,string,string][]).map(([en,ja,ans],i)=>(
              <div key={i} className="bg-card border border-border rounded-xl overflow-hidden">
                <button onClick={()=>setOpenFaq(openFaq===i?null:i)} className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors">
                  <span className="text-sm font-semibold text-foreground">{L==="JA"?ja:en}</span>
                  <ChevronDown size={15} className={`text-muted-foreground transition-transform shrink-0 ml-2 ${openFaq===i?"rotate-180":""}`}/>
                </button>
                {openFaq===i&&<div className="px-4 pb-4"><p className="text-sm text-muted-foreground leading-relaxed">{ans}</p></div>}
              </div>
            ))}
          </div>
        </section>

        {/* Newsletter / LINE */}
        <section className="rounded-2xl p-6 sm:p-10 text-white text-center" style={{background:`linear-gradient(135deg,${DARK_GREEN},${GREEN})`}}>
          <p className="text-sm font-semibold text-white/70 mb-1">📣 {t("最新情報をお届け","Stay in the loop")}</p>
          <h2 className="text-2xl font-extrabold mb-1" style={{fontFamily:"'Plus Jakarta Sans',sans-serif"}}>{t("週間ハラールセールを受け取る","Get Weekly Halal Deals")}</h2>
          <p className="text-white/80 text-sm mb-6">{t("新商品、クーポン、入荷通知をお届けします。","New arrivals, coupons, and restock alerts.")}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button className="flex items-center justify-center gap-2 px-6 py-3 bg-green-500 text-white rounded-xl font-bold text-sm hover:opacity-90"><MessageCircle size={16}/>{t("LINEに参加","Join LINE")}</button>
            <button className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-foreground rounded-xl font-bold text-sm hover:opacity-90"><Mail size={16}/>{t("メールで登録","Subscribe by Email")}</button>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-card mt-12">
        <div className="max-w-screen-xl mx-auto px-4 py-10">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
            <div className="col-span-2 sm:col-span-3 lg:col-span-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-extrabold text-sm" style={{background:GREEN}}>BC</div>
                <div><div className="text-sm font-extrabold" style={{color:GREEN}}>Beticrom</div><div className="text-[10px] text-muted-foreground">Halal Market</div></div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">Japan's trusted halal grocery — certified, delivered, supported in JP · EN · BN.</p>
              <div className="flex gap-2">
                {[<Facebook size={13}/>,<Instagram size={13}/>,<MessageCircle size={13}/>].map((icon,i)=>(
                  <button key={i} className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-colors">{icon}</button>
                ))}
              </div>
            </div>
            {[{h:"Company",links:["About Beticrom","Store Location","Careers","Business Inquiry"]},{h:"Shop",links:["Halal Meat","Frozen Foods","Rice & Flour","Spices","Deals"]},{h:"Trust",links:["Halal Standards","Supplier Verification","Cold Chain","Quality Guarantee"]},{h:"Support",links:["Track Order","Contact Us","FAQ","Returns"]},{h:"Policies",links:["Delivery Policy","Return Policy","Privacy Policy","Terms"]}].map(col=>(
              <div key={col.h}>
                <p className="font-extrabold text-[10px] text-foreground mb-2 uppercase tracking-widest">{col.h}</p>
                <ul className="space-y-1.5">{col.links.map(l=><li key={l}><a href="#" className="text-xs text-muted-foreground hover:text-primary transition-colors">{l}</a></li>)}</ul>
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[11px] text-muted-foreground">© 2024 Beticrom Halal Market. All rights reserved.</p>
            <div className="flex flex-wrap items-center gap-1">
              {[
                {n:"Visa",     c:"#1A1F71"},{n:"MC",        c:"#EB001B"},{n:"JCB",    c:"#007B40"},{n:"Amex",    c:"#007BC1"},
                {n:"PayPay",   c:"#D92D20"},{n:"楽天ペイ",   c:"#BF0000"},{n:"d払い",  c:"#D92D20"},{n:"au PAY",  c:"#D97706"},
                {n:"Suica",    c:"#009944"},{n:"PASMO",     c:"#E50071"},{n:"iD",     c:"#1A1A1A"},{n:"QUICPay", c:"#D97706"},
                {n:"Alipay",   c:"#00A3E0"},{n:"WeChat",    c:"#07C160"},{n:"UnionPay",c:"#D92D20"},
                {n:"Konbini",  c:"#57534e"},{n:"Apple Pay", c:"#1C1C1E"},{n:"Google Pay",c:"#4285F4"},
              ].map(p=>(
                <span key={p.n} className="px-1.5 py-0.5 rounded border text-[9px] font-bold bg-white" style={{color:p.c,borderColor:p.c+"40"}}>{p.n}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile bottom nav */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40 flex">
        {[{icon:<Home size={17}/>,label:t("ホーム","Home"),v:"home"},{icon:<LayoutGrid size={17}/>,label:t("カテゴリ","Cats"),v:"category"},{icon:<Search size={17}/>,label:t("検索","Search"),v:"home"},{icon:<Tag size={17}/>,label:t("セール","Deals"),v:"category"},{icon:<ShoppingCart size={17}/>,label:t("カート","Cart"),v:"cart"}].map(item=>(
          <button key={item.label} onClick={()=>setView(item.v as View)} className="flex-1 flex flex-col items-center gap-0.5 py-2 text-muted-foreground hover:text-primary transition-colors relative">
            {item.icon}
            <span className="text-[9px] font-medium">{item.label}</span>
            {item.v==="cart"&&cartCount>0&&<span className="absolute top-1 right-3 w-3.5 h-3.5 rounded-full text-white text-[8px] font-bold flex items-center justify-center" style={{background:RED}}>{cartCount}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Category Page ───────────────────────────────────────────────────────────

function CategoryPage({locale,onAdd,setView}:{locale:Locale;onAdd:()=>void;setView:(v:View)=>void}){
  const [activeHalal,setActiveHalal]=useState<HalalTier|null>(null);
  const [activeStorage,setActiveStorage]=useState<StorageType|null>(null);
  const [filterDrawer,setFilterDrawer]=useState(false);
  const [sortBy,setSortBy]=useState("popular");
  const L=locale;
  const filtered=ALL_PRODUCTS.filter(p=>(!activeHalal||p.halalTier===activeHalal)&&(!activeStorage||p.storage===activeStorage));
  return(
    <div className="max-w-screen-xl mx-auto px-4 py-6 pb-24 sm:pb-8">
      <nav className="flex items-center gap-1 text-xs text-muted-foreground mb-4">
        <button onClick={()=>setView("home")} className="hover:text-primary">Home</button>
        <ChevronRight size={11}/><span className="text-foreground font-semibold">Halal Meat</span>
      </nav>
      <div className="relative rounded-2xl overflow-hidden h-32 mb-5">
        <img src="https://images.unsplash.com/photo-1529563021893-cc83c992d75d?w=1200&h=300&fit=crop&auto=format" alt="Halal Meat" className="w-full h-full object-cover"/>
        <div className="absolute inset-0 flex items-center px-6" style={{background:"linear-gradient(to right,rgba(11,79,42,0.8),transparent)"}}>
          <div><h1 className="text-white font-extrabold text-xl">Halal Meat</h1><p className="text-white/70 text-xs mt-0.5">{ALL_PRODUCTS.length} products</p></div>
        </div>
      </div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={()=>setFilterDrawer(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs font-semibold hover:border-primary/40">
          <LayoutGrid size={13}/>Filters{(activeHalal||activeStorage)?<span className="w-4 h-4 rounded-full text-white text-[9px] flex items-center justify-center" style={{background:GREEN}}>{[activeHalal,activeStorage].filter(Boolean).length}</span>:null}
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{filtered.length} results</span>
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)} className="text-xs border border-border rounded-lg px-2 py-1.5 bg-card outline-none">
            <option value="popular">Most Popular</option><option value="price-asc">Price: Low → High</option><option value="price-desc">Price: High → Low</option><option value="rating">Top Rated</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {filtered.map(p=><ProductCard key={p.id} p={p} locale={L} onAdd={onAdd} onView={()=>setView("pdp")}/>)}
      </div>
      {filterDrawer&&(
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={()=>setFilterDrawer(false)}/>
          <div className="w-72 bg-card shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border"><span className="font-bold">Filters</span><button onClick={()=>setFilterDrawer(false)}><X size={18}/></button></div>
            <div className="flex-1 p-4 space-y-5 overflow-y-auto">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide mb-2">Halal Status</p>
                {(["certified","supplier","nopork"] as HalalTier[]).map(t2=>(
                  <button key={t2} onClick={()=>setActiveHalal(activeHalal===t2?null:t2)} className={`w-full flex items-center gap-2 p-2 rounded-lg border mb-1.5 text-left transition-colors ${activeHalal===t2?"border-primary bg-primary/5":"border-border hover:border-primary/30"}`}>
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${activeHalal===t2?"border-primary bg-primary":"border-border"}`}>{activeHalal===t2&&<CheckCircle size={10} className="text-white"/>}</div>
                    <HalalBadge tier={t2} locale={L}/>
                  </button>
                ))}
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide mb-2">Storage Type</p>
                {(["frozen","dry","cool"] as StorageType[]).map(t2=>(
                  <button key={t2} onClick={()=>setActiveStorage(activeStorage===t2?null:t2)} className={`w-full flex items-center gap-2 p-2 rounded-lg border mb-1.5 text-left transition-colors ${activeStorage===t2?"border-primary bg-primary/5":"border-border hover:border-primary/30"}`}>
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${activeStorage===t2?"border-primary bg-primary":"border-border"}`}>{activeStorage===t2&&<CheckCircle size={10} className="text-white"/>}</div>
                    <StorageBadge type={t2}/>
                  </button>
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-border flex gap-2">
              <button onClick={()=>{setActiveHalal(null);setActiveStorage(null);}} className="flex-1 py-2 rounded-xl border border-border text-xs font-bold">Reset</button>
              <button onClick={()=>setFilterDrawer(false)} className="flex-1 py-2 rounded-xl text-white text-xs font-bold" style={{background:GREEN}}>Apply</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PDP ─────────────────────────────────────────────────────────────────────

function PDPPage({locale,onAdd,setView}:{locale:Locale;onAdd:()=>void;setView:(v:View)=>void}){
  const p=ALL_PRODUCTS[0];
  const [qty,setQty]=useState(1);
  const [tab,setTab]=useState("info");
  const L=locale;
  return(
    <div className="max-w-screen-xl mx-auto px-4 py-6 pb-28 sm:pb-8">
      <nav className="flex items-center gap-1 text-xs text-muted-foreground mb-5">
        <button onClick={()=>setView("home")} className="hover:text-primary">Home</button>
        <ChevronRight size={11}/><button onClick={()=>setView("category")} className="hover:text-primary">Halal Meat</button>
        <ChevronRight size={11}/><span className="text-foreground font-semibold">{p.nameEN}</span>
      </nav>
      <div className="flex flex-col sm:flex-row gap-8">
        <div className="sm:w-96 shrink-0">
          <div className="rounded-2xl overflow-hidden border border-border"><img src={p.img} alt={p.nameEN} className="w-full aspect-square object-cover"/></div>
          <div className="flex gap-2 mt-2">{ALL_PRODUCTS.slice(0,4).map((sp,i)=><img key={i} src={sp.img} alt="" className={`w-14 h-14 object-cover rounded-xl border-2 cursor-pointer ${i===0?"border-primary":"border-border hover:border-primary/50"}`}/>)}</div>
        </div>
        <div className="flex-1 space-y-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">{p.supplier}</p>
            <h1 className="text-2xl font-extrabold leading-tight">{getName(p,L)}</h1>
            <div className="flex items-center gap-2 mt-1"><Stars n={p.rating} size={11}/><span className="text-sm font-bold">{p.rating}</span><span className="text-xs text-muted-foreground">({p.reviews})</span></div>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-extrabold">¥{p.price.toLocaleString()}</span>
            {p.comparePrice&&<><span className="text-base text-muted-foreground line-through">¥{p.comparePrice.toLocaleString()}</span><span className="px-2 py-0.5 text-white text-xs font-bold rounded-full" style={{background:RED}}>-{discPct(p)}%</span></>}
          </div>
          <div className="flex flex-wrap gap-2"><HalalBadge tier={p.halalTier} locale={L}/><StorageBadge type={p.storage}/></div>
          <div className="rounded-xl p-3 border flex items-center gap-2" style={{background:GREEN+"08",borderColor:GREEN+"25"}}>
            <Truck size={14} style={{color:GREEN}}/>
            <div><p className="text-xs font-semibold">{L==="JA"?"配送: 冷凍便・要日程指定":"Frozen shipping · Date selection required"}</p><p className="text-[11px] text-muted-foreground">{L==="JA"?"最短明日配送（午前10時まで注文）":"Earliest tomorrow (order by 10am)"}</p></div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center border border-border rounded-xl overflow-hidden">
              <button onClick={()=>setQty(q=>Math.max(1,q-1))} className="w-10 h-10 flex items-center justify-center hover:bg-muted"><Minus size={14}/></button>
              <span className="w-12 text-center font-bold text-sm">{qty}</span>
              <button onClick={()=>setQty(q=>q+1)} className="w-10 h-10 flex items-center justify-center hover:bg-muted"><Plus size={14}/></button>
            </div>
            <button onClick={onAdd} className="flex-1 py-3 rounded-xl text-white font-bold hover:opacity-90" style={{background:GREEN}}>{L==="JA"?"カートに追加":"Add to Cart"}</button>
            <button className="w-11 h-11 rounded-xl border border-border flex items-center justify-center hover:border-red-300 hover:text-red-500 transition-colors"><Heart size={16}/></button>
          </div>
          <div className="border border-border rounded-2xl overflow-hidden">
            <div className="flex border-b border-border">
              {["info","ingredients","halal"].map(t2=>(
                <button key={t2} onClick={()=>setTab(t2)} className={`flex-1 py-2.5 text-xs font-semibold capitalize transition-colors ${tab===t2?"text-white":"text-muted-foreground hover:bg-muted"}`} style={tab===t2?{background:GREEN}:{}}>{t2==="halal"?"Halal Proof":t2}</button>
              ))}
            </div>
            <div className="p-4 text-sm text-muted-foreground leading-relaxed">
              {tab==="info"&&<><p className="font-bold text-foreground mb-1">{p.nameEN}</p><p>Crispy golden pastry filled with seasoned halal chicken mince. Ready to fry or air-fry from frozen. 400g. Origin: Japan.</p><p className="mt-2"><strong className="text-foreground">Storage:</strong> Keep frozen at -18°C. Consume within 3 months.</p></>}
              {tab==="ingredients"&&<><p className="font-bold text-foreground mb-1">Ingredients</p><p>Wheat flour, halal chicken mince (30%), onion, green peas, spices (cumin, coriander, turmeric, chilli), salt, vegetable oil.</p><p className="mt-2 font-bold text-foreground">Allergens</p><p className="mt-1">Contains: Wheat. May contain traces of soy, sesame.</p></>}
              {tab==="halal"&&<><p className="font-bold text-foreground mb-1">Halal Certification</p><p>Certified by Japan Muslim Association. Certificate #JMA-2024-0471. Valid until Dec 2025.</p><button className="mt-2 text-xs font-bold flex items-center gap-1" style={{color:GREEN}}><FileCheck size={12}/>View Certificate PDF</button></>}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-10">
        <SectionHeader title={L==="JA"?"よく一緒に購入":"Frequently Bought Together"}/>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {ALL_PRODUCTS.slice(1,7).map(p2=><ProductCard key={p2.id} p={p2} locale={L} onAdd={onAdd} onView={()=>{}}/>)}
        </div>
      </div>
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border p-3 z-40 flex gap-2">
        <div className="flex items-center border border-border rounded-xl overflow-hidden">
          <button onClick={()=>setQty(q=>Math.max(1,q-1))} className="w-9 h-9 flex items-center justify-center hover:bg-muted"><Minus size={13}/></button>
          <span className="w-8 text-center text-sm font-bold">{qty}</span>
          <button onClick={()=>setQty(q=>q+1)} className="w-9 h-9 flex items-center justify-center hover:bg-muted"><Plus size={13}/></button>
        </div>
        <button onClick={onAdd} className="flex-1 py-2.5 rounded-xl text-white font-bold text-sm hover:opacity-90" style={{background:GREEN}}>{L==="JA"?"カートに追加 — ¥":"Add to Cart — ¥"}{(p.price*qty).toLocaleString()}</button>
      </div>
    </div>
  );
}

// ─── Cart ─────────────────────────────────────────────────────────────────────

function CartPage({locale,cartCount,onAdd,setView}:{locale:Locale;cartCount:number;onAdd:()=>void;setView:(v:View)=>void}){
  const items=ALL_PRODUCTS.slice(0,Math.min(cartCount,4));
  const subtotal=items.reduce((s,p)=>s+p.price,0);
  const threshold=6500;
  const progress=Math.min(100,(subtotal/threshold)*100);
  const L=locale;
  return(
    <div className="max-w-5xl mx-auto px-4 py-6 pb-24 sm:pb-8">
      <h1 className="text-xl font-extrabold mb-5">{L==="JA"?"ショッピングカート":"Shopping Cart"} ({cartCount})</h1>
      {cartCount===0?(
        <div className="text-center py-20">
          <ShoppingCart size={48} className="text-muted mx-auto mb-4"/>
          <p className="text-muted-foreground text-sm mb-4">{L==="JA"?"カートは空です":"Your cart is empty"}</p>
          <button onClick={()=>setView("home")} className="px-6 py-2.5 text-white rounded-xl font-bold text-sm hover:opacity-90" style={{background:GREEN}}>{L==="JA"?"買い物を続ける":"Continue Shopping"}</button>
        </div>
      ):(
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 space-y-3">
            <div className="bg-card border border-border rounded-xl p-4">
              {progress>=100?<p className="text-xs font-bold flex items-center gap-1" style={{color:GREEN}}><CheckCircle size={13}/>Free shipping unlocked!</p>:<p className="text-xs font-semibold">¥{(threshold-subtotal).toLocaleString()} more for free dry shipping</p>}
              <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden"><div className="h-full rounded-full transition-all" style={{width:`${progress}%`,background:GREEN}}/></div>
            </div>
            {(["dry","frozen","cool"] as StorageType[]).map(sType=>{
              const group=items.filter(p=>p.storage===sType);
              if(!group.length) return null;
              return(
                <div key={sType} className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/30"><StorageBadge type={sType}/><span className="text-xs text-muted-foreground">{sType==="frozen"?"Scheduled delivery":sType==="cool"?"Select areas":"Standard 1–3 days"}</span></div>
                  {group.map(p=>(
                    <div key={p.id} className="flex items-center gap-3 p-4 border-b border-border last:border-b-0">
                      <img src={p.img} alt={p.nameEN} className="w-14 h-14 rounded-xl object-cover bg-muted shrink-0"/>
                      <div className="flex-1 min-w-0"><p className="text-sm font-semibold truncate">{getName(p,L)}</p><div className="flex gap-1 mt-1"><HalalBadge tier={p.halalTier} locale={L}/></div></div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center border border-border rounded-lg overflow-hidden">
                          <button className="w-7 h-7 flex items-center justify-center hover:bg-muted text-muted-foreground"><Minus size={11}/></button>
                          <span className="w-6 text-center text-xs font-bold">1</span>
                          <button className="w-7 h-7 flex items-center justify-center hover:bg-muted text-muted-foreground"><Plus size={11}/></button>
                        </div>
                        <span className="text-sm font-bold w-16 text-right">¥{p.price.toLocaleString()}</span>
                        <button className="text-muted-foreground hover:text-destructive"><X size={14}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          <div className="lg:w-80 shrink-0">
            <div className="bg-card border border-border rounded-2xl p-5 sticky top-24">
              <h2 className="font-bold mb-4">{L==="JA"?"注文サマリー":"Order Summary"}</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>¥{subtotal.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span style={progress>=100?{color:GREEN,fontWeight:700}:{}}>{progress>=100?"FREE":"¥500"}</span></div>
                <div className="border-t border-border pt-2 flex justify-between font-bold text-base"><span>Total</span><span>¥{(subtotal+(progress>=100?0:500)).toLocaleString()}</span></div>
              </div>
              <div className="mt-3 flex gap-2">
                <input placeholder="Coupon code" className="flex-1 px-3 py-2 rounded-xl border border-border text-xs outline-none"/>
                <button className="px-3 py-2 bg-muted text-xs font-bold rounded-xl">Apply</button>
              </div>
              <button onClick={()=>setView("checkout")} className="mt-4 w-full py-3 rounded-xl text-white font-bold text-sm hover:opacity-90" style={{background:GREEN}}>{L==="JA"?"レジへ進む":"Proceed to Checkout"} →</button>
              <p className="text-[10px] text-muted-foreground text-center mt-2 flex items-center justify-center gap-1"><Shield size={10}/>Secure · Stripe encrypted</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Checkout ────────────────────────────────────────────────────────────────

function CheckoutPage({locale,setView}:{locale:Locale;setView:(v:View)=>void}){
  const [step,setStep]=useState(1);
  const [payMethod,setPayMethod]=useState("card");
  const L=locale;
  return(
    <div className="max-w-4xl mx-auto px-4 py-6 pb-16">
      <h1 className="text-xl font-extrabold mb-5">{L==="JA"?"チェックアウト":"Checkout"}</h1>
      <div className="flex items-center gap-0 mb-8">
        {[L==="JA"?"住所":"Address",L==="JA"?"配送":"Delivery",L==="JA"?"支払い":"Payment"].map((label,i)=>(
          <div key={i} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors" style={step>i+1?{background:GREEN,borderColor:GREEN,color:"#fff"}:step===i+1?{borderColor:GREEN,color:GREEN}:{borderColor:"#e5e7eb",color:"#6b7280"}}>{step>i+1?<CheckCircle size={14}/>:i+1}</div>
              <span className="text-[10px] mt-1 font-semibold" style={step===i+1?{color:GREEN}:{}}>{label}</span>
            </div>
            {i<2&&<div className="flex-1 h-0.5 mx-2" style={{background:step>i+1?GREEN:"#e5e7eb"}}/>}
          </div>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row gap-6">
        <div className="flex-1">
          {step===1&&(
            <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
              <h2 className="font-bold">{L==="JA"?"配送先住所":"Delivery Address"}</h2>
              <button className="w-full py-2.5 border border-dashed rounded-xl text-sm font-semibold hover:bg-primary/5" style={{borderColor:GREEN+"60",color:GREEN}}>+ {L==="JA"?"ゲストとして続ける":"Continue as Guest"}</button>
              <div className="grid grid-cols-2 gap-3">
                {[L==="JA"?"氏名":"Full Name",L==="JA"?"電話番号":"Phone",L==="JA"?"郵便番号":"Postal Code",L==="JA"?"都道府県":"Prefecture",L==="JA"?"市区町村":"City",L==="JA"?"番地・建物":"Street Address"].map((ph,i)=>(
                  <input key={ph} placeholder={ph} className={`px-3 py-2 rounded-xl border border-border text-sm outline-none ${i===5?"col-span-2":""}`} onFocus={e=>(e.target.style.borderColor=GREEN+"80")} onBlur={e=>(e.target.style.borderColor="")}/>
                ))}
              </div>
              <button onClick={()=>setStep(2)} className="w-full py-3 rounded-xl text-white font-bold text-sm hover:opacity-90" style={{background:GREEN}}>{L==="JA"?"次へ → 配送":"Next → Delivery"}</button>
            </div>
          )}
          {step===2&&(
            <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
              <h2 className="font-bold">{L==="JA"?"配送方法":"Delivery Method"}</h2>
              {[{label:"Standard (1–3 days)",price:"¥500",type:"dry"},{label:"Frozen Delivery (date required)",price:"¥800",type:"frozen"}].map(d=>(
                <div key={d.label} className="flex items-center gap-3 p-3 border border-border rounded-xl hover:border-primary/40 cursor-pointer">
                  <StorageBadge type={d.type as StorageType}/><span className="flex-1 text-sm font-medium">{d.label}</span><span className="text-sm font-bold">{d.price}</span>
                </div>
              ))}
              <button onClick={()=>setStep(3)} className="w-full py-3 rounded-xl text-white font-bold text-sm hover:opacity-90" style={{background:GREEN}}>{L==="JA"?"次へ → 支払い":"Next → Payment"}</button>
            </div>
          )}
          {step===3&&(
            <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
              <h2 className="font-bold text-foreground">{L==="JA"?"お支払い方法を選択":"Select Payment Method"}</h2>
              {[
                {id:"card",      icon:<CreditCard size={18}/>,  label:L==="JA"?"クレジット・デビットカード":"Credit / Debit Card",  desc:L==="JA"?"Visa、Mastercard、JCB、Amex対応":"Visa, Mastercard, JCB, Amex",              note:L==="JA"?"即時決済":"Instant",        fee:""},
                {id:"applepay",  icon:<Smartphone size={18}/>,  label:"Apple Pay / Google Pay",                                       desc:L==="JA"?"ワンタップで素早く決済":"One-tap quick checkout",                          note:L==="JA"?"即時決済":"Instant",        fee:""},
                {id:"paypay",    icon:<Smartphone size={18}/>,  label:"PayPay",                                                       desc:L==="JA"?"QRコードでかんたん決済":"Scan QR to pay",                                  note:L==="JA"?"即時決済":"Instant",        fee:""},
                {id:"rakuten",   icon:<Smartphone size={18}/>,  label:L==="JA"?"楽天ペイ / d払い / au PAY":"Rakuten Pay / d払い / au PAY", desc:L==="JA"?"各種QRコード決済":"Japan QR payment services",                       note:L==="JA"?"即時決済":"Instant",        fee:""},
                {id:"konbini",   icon:<Building2 size={18}/>,   label:L==="JA"?"コンビニ払い":"Konbini Payment",                       desc:L==="JA"?"ローソン・ファミマ・セブンで支払い":"Pay at Lawson, FamilyMart, 7-Eleven", note:L==="JA"?"翌日確認":"Confirmed next day", fee:L==="JA"?"手数料 ¥110":"Fee: ¥110"},
                {id:"bank",      icon:<Building2 size={18}/>,   label:L==="JA"?"銀行振込":"Bank Transfer",                             desc:L==="JA"?"ご注文後24時間以内にお振込ください":"Transfer within 24h of order",        note:L==="JA"?"確認後発送":"Ships after confirmation", fee:""},
                {id:"cod",       icon:<DollarSign size={18}/>,  label:L==="JA"?"代金引換 (COD)":"Cash on Delivery",                   desc:L==="JA"?"配達時に現金でお支払い":"Pay in cash upon delivery",                    note:L==="JA"?"対象エリア限定":"Select areas only", fee:L==="JA"?"手数料 ¥330":"Fee: ¥330"},
              ].map(opt=>(
                <button key={opt.id} onClick={()=>setPayMethod(opt.id)}
                  className="w-full flex items-start gap-3 p-3.5 border rounded-xl text-left transition-all hover:shadow-sm"
                  style={payMethod===opt.id?{borderColor:GREEN,background:GREEN+"08"}:{borderColor:"#e5e7eb"}}
                >
                  <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0`} style={payMethod===opt.id?{borderColor:GREEN,background:GREEN}:{borderColor:"#d1d5db"}}>
                    {payMethod===opt.id&&<div className="w-2 h-2 rounded-full bg-white"/>}
                  </div>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{background:payMethod===opt.id?GREEN+"15":"#f5f5f5",color:payMethod===opt.id?GREEN:"#9ca3af"}}>{opt.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">{opt.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{opt.desc}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-50 text-green-700">{opt.note}</span>
                      {opt.fee&&<span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700">{opt.fee}</span>}
                    </div>
                  </div>
                  {/* accepted logos */}
                  {opt.id==="card"&&<div className="hidden sm:flex gap-1 shrink-0">{["Visa","MC","JCB","Amex"].map(n=><span key={n} className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-border bg-white text-foreground">{n}</span>)}</div>}
                  {opt.id==="paypay"&&<span className="hidden sm:block text-[9px] font-bold px-1.5 py-0.5 rounded border border-red-200 bg-red-50 text-red-600 shrink-0">PayPay</span>}
                </button>
              ))}

              {/* Card fields */}
              {payMethod==="card"&&(
                <div className="space-y-2 pt-1 pl-0">
                  <input placeholder={L==="JA"?"カード番号":"Card number"} className="w-full px-3 py-2.5 rounded-xl border border-border text-sm outline-none" onFocus={e=>(e.target.style.borderColor=GREEN+"80")} onBlur={e=>(e.target.style.borderColor="")}/>
                  <div className="grid grid-cols-2 gap-2">
                    <input placeholder="MM / YY" className="px-3 py-2.5 rounded-xl border border-border text-sm outline-none" onFocus={e=>(e.target.style.borderColor=GREEN+"80")} onBlur={e=>(e.target.style.borderColor="")}/>
                    <input placeholder="CVC" className="px-3 py-2.5 rounded-xl border border-border text-sm outline-none" onFocus={e=>(e.target.style.borderColor=GREEN+"80")} onBlur={e=>(e.target.style.borderColor="")}/>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground p-2 bg-muted/50 rounded-lg">
                    <Lock size={11}/>{L==="JA"?"お支払い情報は安全に処理されます。Beticromはカード情報を保存しません。":"Your payment is processed securely. Beticrom does not store card information."}
                  </div>
                </div>
              )}
              {payMethod==="konbini"&&(
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 leading-relaxed">
                  {L==="JA"?"注文確定後、お支払い番号をメールでお送りします。お近くのコンビニのマルチメディア端末でお支払いください。期限内にお支払いが確認されない場合、注文はキャンセルとなります。":"After ordering, you'll receive a payment code by email. Pay at any Konbini multi-media terminal. Orders are cancelled if payment is not confirmed within the deadline."}
                </div>
              )}
              {payMethod==="bank"&&(
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 leading-relaxed">
                  {L==="JA"?"ご注文後、振込先口座情報をメールでお送りします。24時間以内にお振込ください。確認後に発送いたします。":"Bank account details will be emailed after ordering. Please transfer within 24h. We ship after confirming payment."}
                </div>
              )}

              <button onClick={()=>setView("home")} className="w-full py-3 rounded-xl text-white font-bold text-sm hover:opacity-90 mt-2" style={{background:GREEN}}>
                {L==="JA"?"注文を確定する":"Place Order"} →
              </button>
              <p className="text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1">
                <Lock size={10}/>{L==="JA"?"SSLで保護されています · Stripe処理 · JP/EN/BN対応":"SSL secured · Powered by Stripe · JP/EN/BN support"}
              </p>
            </div>
          )}
        </div>
        <div className="sm:w-64 shrink-0">
          <div className="bg-card border border-border rounded-2xl p-4 sticky top-24">
            <h3 className="font-bold text-sm mb-3">Order Summary</h3>
            {ALL_PRODUCTS.slice(0,3).map(p=>(
              <div key={p.id} className="flex items-center gap-2 py-2 border-b border-border">
                <img src={p.img} alt="" className="w-9 h-9 rounded-lg object-cover bg-muted"/>
                <p className="flex-1 text-xs font-semibold truncate">{p.nameEN}</p>
                <span className="text-xs font-bold">¥{p.price.toLocaleString()}</span>
              </div>
            ))}
            <div className="pt-2 space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>¥{ALL_PRODUCTS.slice(0,3).reduce((s,p)=>s+p.price,0).toLocaleString()}</span></div>
              <div className="flex justify-between font-bold text-sm"><span>Total</span><span>¥{ALL_PRODUCTS.slice(0,3).reduce((s,p)=>s+p.price,0).toLocaleString()}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Account ─────────────────────────────────────────────────────────────────

function AccountPage({locale,onAdd,setView}:{locale:Locale;onAdd:()=>void;setView:(v:View)=>void}){
  const L=locale;
  return(
    <div className="max-w-5xl mx-auto px-4 py-6 pb-24 sm:pb-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-extrabold text-lg" style={{background:GREEN}}>R</div>
        <div><p className="font-bold text-foreground">Rahman Ahmed</p><p className="text-xs text-muted-foreground">rahman.ahmed@email.com · Tokyo</p></div>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[["12","Orders"],["¥24,580","Total Spent"],["3","Wishlisted"]].map(([val,label])=>(
          <div key={label} className="bg-card border border-border rounded-xl p-4 text-center">
            <p className="text-2xl font-extrabold" style={{color:GREEN}}>{val}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>
      <h2 className="font-bold mb-3">{L==="JA"?"最近の注文":"Recent Orders"}</h2>
      <div className="space-y-3 mb-6">
        {[{id:"#BC-2041",date:"Jun 20",status:"Delivered",total:"¥2,860",items:4},{id:"#BC-2036",date:"Jun 12",status:"Delivered",total:"¥1,480",items:2},{id:"#BC-2029",date:"May 28",status:"Delivered",total:"¥3,240",items:6}].map(o=>(
          <div key={o.id} className="bg-card border border-border rounded-xl flex flex-col sm:flex-row sm:items-center gap-3 p-4">
            <div className="flex-1"><div className="flex items-center gap-2"><span className="font-bold text-sm">{o.id}</span><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">{o.status}</span></div><p className="text-xs text-muted-foreground mt-0.5">{o.date} · {o.items} items</p></div>
            <div className="flex items-center gap-3"><span className="font-bold">{o.total}</span><button onClick={onAdd} className="px-3 py-1.5 text-white text-xs font-bold rounded-lg hover:opacity-90" style={{background:GREEN}}>{L==="JA"?"再注文":"Reorder"}</button></div>
          </div>
        ))}
      </div>
      <SectionHeader title={L==="JA"?"定番商品を再注文":"Reorder Essentials"}/>
      <div className="flex flex-col gap-2">
        {ALL_PRODUCTS.slice(4,7).map(p=>(
          <div key={p.id} className="bg-card border border-border rounded-xl flex items-center gap-3 p-3">
            <img src={p.img} alt={p.nameEN} className="w-12 h-12 rounded-lg object-cover shrink-0"/>
            <div className="flex-1 min-w-0"><p className="text-sm font-semibold truncate">{getName(p,L)}</p><HalalBadge tier={p.halalTier} locale={L}/></div>
            <div className="flex items-center gap-2 shrink-0"><span className="font-bold text-sm">¥{p.price.toLocaleString()}</span><button onClick={onAdd} className="px-3 py-1.5 text-white text-xs font-bold rounded-lg" style={{background:GREEN}}>{L==="JA"?"再注文":"Reorder"}</button></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Admin Panel ─────────────────────────────────────────────────────────────

function AdminPanel({setView}:{setView:(v:View)=>void}){
  const [activeNav,setActiveNav]=useState("dashboard");
  const SIDEBAR=[{id:"dashboard",icon:<BarChart2 size={15}/>,label:"Dashboard"},{id:"orders",icon:<ListOrdered size={15}/>,label:"Orders"},{id:"products",icon:<BoxSelect size={15}/>,label:"Products"},{id:"inventory",icon:<AlertTriangle size={15}/>,label:"Inventory"},{id:"customers",icon:<Users size={15}/>,label:"Customers"},{id:"promotions",icon:<Megaphone size={15}/>,label:"Promotions"},{id:"halal",icon:<FileCheck size={15}/>,label:"Halal Verification"},{id:"payments",icon:<CreditCard size={15}/>,label:"Payment Settings"},{id:"reports",icon:<TrendingUp size={15}/>,label:"Reports"},{id:"settings",icon:<Settings size={15}/>,label:"Settings"}];
  return(
    <div className="flex h-screen overflow-hidden" style={{background:"#FAF8F3"}}>
      <aside className="w-52 flex flex-col shrink-0 border-r" style={{background:DARK_GREEN,borderColor:"rgba(255,255,255,0.08)"}}>
        <div className="p-4 border-b" style={{borderColor:"rgba(255,255,255,0.08)"}}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white font-extrabold text-xs">BC</div>
            <div><p className="text-xs font-extrabold text-white">Beticrom Admin</p><p className="text-[10px] text-white/40">Halal Market</p></div>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {SIDEBAR.map(item=>(
            <button key={item.id} onClick={()=>setActiveNav(item.id)} className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${activeNav===item.id?"bg-white/20 text-white":"text-white/55 hover:bg-white/10 hover:text-white"}`}>{item.icon}{item.label}</button>
          ))}
        </nav>
        <div className="p-3 border-t" style={{borderColor:"rgba(255,255,255,0.08)"}}>
          <button onClick={()=>setView("home")} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white/50 hover:text-white hover:bg-white/10"><ArrowRight size={13}/>View Storefront</button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 bg-card border-b border-border px-6 py-3 flex items-center justify-between">
          <h1 className="font-extrabold text-sm capitalize">{activeNav==="halal"?"Halal Verification":activeNav==="payments"?"Payment Settings":activeNav}</h1>
          <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">Admin: Tanaka Kenji</span><div className="w-7 h-7 rounded-full text-white text-xs flex items-center justify-center font-bold" style={{background:GREEN}}>T</div></div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            {[{label:"Today's Sales",val:"¥184,200",delta:"+12%",c:"text-green-600"},{label:"Orders",val:"47",delta:"+8",c:"text-blue-600"},{label:"Pending Packing",val:"13",delta:"urgent",c:"text-amber-600"},{label:"Low Stock SKUs",val:"9",delta:"⚠",c:"text-red-600"},{label:"Frozen Orders",val:"22",delta:"today",c:"text-blue-500"},{label:"Refund Requests",val:"2",delta:"open",c:"text-orange-500"}].map(c=>(
              <div key={c.label} className="bg-card border border-border rounded-xl p-4"><p className="text-xs text-muted-foreground">{c.label}</p><p className="text-xl font-extrabold mt-1">{c.val}</p><p className={`text-[10px] font-semibold mt-0.5 ${c.c}`}>{c.delta}</p></div>
            ))}
          </div>
          <div className="bg-card border border-border rounded-2xl overflow-hidden mb-6">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border"><h2 className="font-bold text-sm">Recent Orders</h2><button className="text-xs font-semibold" style={{color:GREEN}}>View all</button></div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 border-b border-border"><tr>{["Order ID","Customer","Payment","Type","Total","Status","Action"].map(h=><th key={h} className="text-left px-4 py-2.5 font-semibold text-muted-foreground">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-border">
                  {[{id:"#BC-2041",cust:"Rahman A.",pay:"Card ✓",type:"dry",total:"¥2,860",status:"Packing",sc:"bg-amber-100 text-amber-700"},{id:"#BC-2040",cust:"Priya M.",pay:"PayPay ✓",type:"dry",total:"¥1,480",status:"Shipped",sc:"bg-blue-100 text-blue-700"},{id:"#BC-2039",cust:"田中 健",pay:"Konbini ⏳",type:"frozen",total:"¥3,240",status:"Awaiting Pay",sc:"bg-orange-100 text-orange-700"},{id:"#BC-2038",cust:"Hamid K.",pay:"Card ✓",type:"cool",total:"¥980",status:"Delivered",sc:"bg-green-100 text-green-700"}].map(o=>(
                    <tr key={o.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-bold" style={{color:GREEN}}>{o.id}</td>
                      <td className="px-4 py-3">{o.cust}</td><td className="px-4 py-3">{o.pay}</td>
                      <td className="px-4 py-3"><StorageBadge type={o.type as StorageType}/></td>
                      <td className="px-4 py-3 font-bold">{o.total}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${o.sc}`}>{o.status}</span></td>
                      <td className="px-4 py-3"><button className="font-semibold hover:underline text-xs" style={{color:GREEN}}>View</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border"><h2 className="font-bold text-sm flex items-center gap-2"><FileCheck size={14} style={{color:GREEN}}/>Halal Verification Queue</h2><button className="text-xs font-semibold" style={{color:GREEN}}>Manage</button></div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 border-b border-border"><tr>{["Product","Tier","Certifier","Expires","Status","Action"].map(h=><th key={h} className="text-left px-4 py-2.5 font-semibold text-muted-foreground">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-border">
                  {[{product:"Chicken Samosa 20pcs",tier:"certified" as HalalTier,certifier:"JMA",exp:"Dec 2025",status:"Verified",sc:"bg-green-100 text-green-700"},{product:"Lamb Biryani Kit",tier:"supplier" as HalalTier,certifier:"Supplier Docs",exp:"—",status:"Pending Review",sc:"bg-amber-100 text-amber-700"},{product:"Naan Paratha 10pcs",tier:"certified" as HalalTier,certifier:"HJBA",exp:"Mar 2026",status:"Verified",sc:"bg-green-100 text-green-700"}].map((r,i)=>(
                    <tr key={i} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-semibold">{r.product}</td>
                      <td className="px-4 py-3"><HalalBadge tier={r.tier} locale="EN"/></td>
                      <td className="px-4 py-3 text-muted-foreground">{r.certifier}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.exp}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${r.sc}`}>{r.status}</span></td>
                      <td className="px-4 py-3 flex gap-2"><button className="font-semibold hover:underline" style={{color:GREEN}}>View</button>{r.status!=="Verified"&&<button className="text-green-600 font-semibold hover:underline">Approve</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {/* ── Payment Settings page ── */}
          {activeNav==="payments"&&(
            <div className="space-y-6">
              {/* Method toggles */}
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <h2 className="font-bold text-sm flex items-center gap-2"><CreditCard size={14} style={{color:GREEN}}/>Payment Methods</h2>
                  <button className="text-xs font-semibold" style={{color:GREEN}}>Save Changes</button>
                </div>
                <div className="divide-y divide-border">
                  {[
                    {id:"card",   label:"Credit / Debit Card",     desc:"Visa, MC, JCB, Amex via Stripe",       enabled:true,  gateway:"Stripe"},
                    {id:"appay",  label:"Apple Pay / Google Pay",   desc:"Tap-to-pay via Stripe",                 enabled:true,  gateway:"Stripe"},
                    {id:"paypay", label:"PayPay",                   desc:"Japan QR payment",                      enabled:true,  gateway:"PayPay for Business"},
                    {id:"rakuten",label:"Rakuten Pay / d払い / au PAY",desc:"QR payment services",               enabled:false, gateway:"各プロバイダ"},
                    {id:"ic",     label:"Transport IC (Suica etc)", desc:"Via Airペイ POS terminal",              enabled:true,  gateway:"Airペイ"},
                    {id:"emoney", label:"iD / QUICPay / Edy",       desc:"Via Airペイ POS terminal",              enabled:true,  gateway:"Airペイ"},
                    {id:"alipay", label:"Alipay / WeChat / UnionPay",desc:"Inbound tourist payments",            enabled:false, gateway:"Alipay+"},
                    {id:"konbini",label:"Konbini Payment",          desc:"Pay at convenience stores",             enabled:true,  gateway:"Stripe"},
                    {id:"bank",   label:"Bank Transfer",            desc:"Manual reconciliation required",        enabled:true,  gateway:"Manual"},
                    {id:"cod",    label:"Cash on Delivery",         desc:"Select delivery areas only",            enabled:false, gateway:"Manual"},
                  ].map((m,i)=>{
                    const [on,setOn]=useState(m.enabled);
                    return(
                      <div key={m.id} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30">
                        <button onClick={()=>setOn(v=>!v)} className="shrink-0">
                          {on?<ToggleRight size={22} style={{color:GREEN}}/>:<ToggleLeft size={22} className="text-muted-foreground"/>}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-foreground">{m.label}</p>
                          <p className="text-[10px] text-muted-foreground">{m.desc}</p>
                        </div>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0" style={on?{background:GREEN+"15",color:GREEN}:{background:"#f5f5f4",color:"#9ca3af"}}>{on?"Active":"Disabled"}</span>
                        <span className="text-[10px] text-muted-foreground hidden sm:block shrink-0 w-28 text-right">{m.gateway}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Transaction history */}
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <h2 className="font-bold text-sm flex items-center gap-2"><RefreshCcw size={14} style={{color:GREEN}}/>Transaction History</h2>
                  <button className="flex items-center gap-1 text-xs font-semibold" style={{color:GREEN}}><Download size={12}/>Export CSV</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>{["Txn ID","Order","Method","Amount","Status","Date","Action"].map(h=><th key={h} className="text-left px-4 py-2.5 font-semibold text-muted-foreground">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {[
                        {txn:"TXN-8821",order:"#BC-2041",method:"Card",amount:"¥2,860",status:"Captured",  sc:"bg-green-100 text-green-700", date:"Jun 20"},
                        {txn:"TXN-8820",order:"#BC-2040",method:"PayPay",amount:"¥1,480",status:"Captured", sc:"bg-green-100 text-green-700", date:"Jun 20"},
                        {txn:"TXN-8819",order:"#BC-2039",method:"Konbini",amount:"¥3,240",status:"Pending", sc:"bg-amber-100 text-amber-700", date:"Jun 19"},
                        {txn:"TXN-8815",order:"#BC-2038",method:"Card",amount:"¥980",  status:"Refunded",  sc:"bg-red-100 text-red-700",   date:"Jun 18"},
                      ].map(t=>(
                        <tr key={t.txn} className="hover:bg-muted/30">
                          <td className="px-4 py-3 font-bold" style={{color:GREEN}}>{t.txn}</td>
                          <td className="px-4 py-3">{t.order}</td>
                          <td className="px-4 py-3">{t.method}</td>
                          <td className="px-4 py-3 font-bold">{t.amount}</td>
                          <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${t.sc}`}>{t.status}</span></td>
                          <td className="px-4 py-3 text-muted-foreground">{t.date}</td>
                          <td className="px-4 py-3"><button className="font-semibold hover:underline" style={{color:GREEN}}>Detail</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Settings cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  {icon:<CreditCard size={16}/>, title:"Stripe Gateway",     fields:["API Key (live)","Webhook Secret","Currency: JPY"]},
                  {icon:<Smartphone size={16}/>, title:"PayPay for Business",fields:["API Key","API Secret","Merchant ID"]},
                  {icon:<Building2 size={16}/>,  title:"Konbini Settings",  fields:["Provider: Stripe","Deadline: 3 days","Auto-cancel: enabled"]},
                  {icon:<DollarSign size={16}/>, title:"Bank Transfer",      fields:["Bank: Sumitomo Mitsui","Branch: Tokyo","Account: ****1234"]},
                  {icon:<Receipt size={16}/>,    title:"Receipt & Invoice",  fields:["PDF receipt: enabled","Tax invoice: enabled","Consumption tax: 10%"]},
                  {icon:<Download size={16}/>,   title:"Tax & Sales Export", fields:["Format: CSV / PDF","Period: monthly","Scheduled: 1st of month"]},
                ].map(card=>(
                  <div key={card.title} className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:GREEN+"15",color:GREEN}}>{card.icon}</div>
                      <p className="font-bold text-sm text-foreground">{card.title}</p>
                      <button className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-lg border border-border hover:bg-muted">Edit</button>
                    </div>
                    <ul className="space-y-1">
                      {card.fields.map(f=><li key={f} className="text-[11px] text-muted-foreground flex items-center gap-1"><CheckCircle size={9} className="text-green-500 shrink-0"/>{f}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ─── Root ────────────────────────────────────────────────────────────────────

export default function App(){
  const [locale,setLocale]=useState<Locale>("EN");
  const [cartCount,setCartCount]=useState(0);
  const [view,setView]=useState<View>("home");

  const addToCart=()=>setCartCount(c=>c+1);

  if(view==="admin") return <AdminPanel setView={setView}/>;

  return(
    <div className="min-h-screen bg-background text-foreground" style={{fontFamily:"'Noto Sans JP','Plus Jakarta Sans',sans-serif"}}>
      <Header locale={locale} setLocale={setLocale} cartCount={cartCount} setView={setView}/>
      {view==="home"     &&<Homepage     locale={locale} cartCount={cartCount} onAdd={addToCart} setView={setView}/>}
      {view==="category" &&<CategoryPage locale={locale} onAdd={addToCart} setView={setView}/>}
      {view==="pdp"      &&<PDPPage      locale={locale} onAdd={addToCart} setView={setView}/>}
      {view==="cart"     &&<CartPage     locale={locale} cartCount={cartCount} onAdd={addToCart} setView={setView}/>}
      {view==="checkout" &&<CheckoutPage locale={locale} setView={setView}/>}
      {view==="account"  &&<AccountPage  locale={locale} onAdd={addToCart} setView={setView}/>}
      <style>{`
        .scrollbar-hide{scrollbar-width:none}
        .scrollbar-hide::-webkit-scrollbar{display:none}
      `}</style>
    </div>
  );
}
