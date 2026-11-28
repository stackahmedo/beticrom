import { useState, useMemo } from "react";
import {
  ChevronRight,
  Shield,
  Snowflake,
  Package,
  ArrowRight,
  Tag,
  Flame,
  HelpCircle,
} from "lucide-react";
import {
  ALL_PRODUCTS,
  MAIN_CATEGORIES,
  type Product,
  type Locale,
} from "../../data/products";
import { ProductCard } from "./ProductCard";
import { ShippingEstimator } from "./ShippingEstimator";
import type { View, LegalTopic } from "../types";

interface HomepageProps {
  locale: Locale;
  onAdd: (product: Product) => void;
  onSelectProduct: (id: string) => void;
  onOpenProductPopup?: (product: Product) => void;
  setView: (v: View) => void;
  setSelectedCategory: (catId: string) => void;
  onOpenLegal: (topic: LegalTopic) => void;
}

export function Homepage({
  locale,
  onAdd,
  onSelectProduct,
  onOpenProductPopup,
  setView,
  setSelectedCategory,
  onOpenLegal,
}: HomepageProps) {
  const [activeTab, setActiveTab] = useState<"deals" | "popular">("deals");

  const handleProductClick = (id: string) => {
    if (onOpenProductPopup) {
      const p = ALL_PRODUCTS.find(item => item.id === id);
      if (p) {
        onOpenProductPopup(p);
        return;
      }
    }
    onSelectProduct(id);
    setView("pdp");
  };

  const handleCategoryClick = (catId: string) => {
    setSelectedCategory(catId);
    setView("category");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Curated static 8-item Deals & 8-item Popular grids (zero duplicates)
  const { deals, popular } = useMemo(() => {
    const used = new Set<string>();
    const dealsList = ALL_PRODUCTS.filter(p => Boolean(p.comparePrice && p.comparePrice > p.price)).slice(0, 8);
    dealsList.forEach(p => used.add(p.id));
    const popularList = ALL_PRODUCTS.filter(p => !used.has(p.id) && (p.isBestSeller || p.reviews >= 20)).slice(0, 8);
    return { deals: dealsList, popular: popularList };
  }, []);

  const visibleProducts = activeTab === "deals" ? deals : popular;

  return (
    <div className="pb-16 space-y-6 sm:space-y-8">
      {/* 1. Compact Hero Banner (shortened so categories & first product grid appear immediately) */}
      <section className="max-w-screen-xl mx-auto px-4 pt-3 sm:pt-4">
        <div className="relative rounded-2xl overflow-hidden min-h-[136px] sm:min-h-[156px] flex items-center bg-gradient-to-r from-[#0B4F2A] via-[#12633D] to-[#17784B] text-white px-5 py-4 sm:px-8 sm:py-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
            <div className="space-y-1.5 max-w-2xl">
              <h1 className="text-xl sm:text-2xl lg:text-[26px] font-extrabold tracking-tight leading-snug">
                {locale === "JA"
                  ? "世界のハラール食材・スパイスを日本全国へ。"
                  : locale === "BN"
                    ? "জাপান জুড়ে খাঁটি হালাল খাদ্য ও মশলা ডেলিভারি।"
                    : "Authentic Halal Groceries & Spices, Delivered Japan-Wide."}
              </h1>
              <p className="text-xs text-white/90 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>
                  {locale === "JA"
                    ? "常温品 ¥6,500〜送料無料 · 冷凍/冷蔵はヤマトクール便（+¥330）"
                    : "Free Dry shipping ≥ ¥6,500 · Cold-chain boxes (+¥330)"}
                </span>
                <button
                  type="button"
                  onClick={() => onOpenLegal("shipping")}
                  className="underline font-semibold hover:text-emerald-200 cursor-pointer"
                >
                  {locale === "JA" ? "配送料金の詳細を見る →" : "Shipping details →"}
                </button>
              </p>
            </div>

            <div className="shrink-0">
              <button
                type="button"
                onClick={() => handleCategoryClick("all")}
                className="px-5 py-2.5 rounded-xl bg-white text-[#12633D] font-extrabold text-xs sm:text-sm shadow-sm hover:bg-neutral-100 transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <span>{locale === "JA" ? "商品を見る" : locale === "BN" ? "পণ্য দেখুন" : "Browse Products"}</span>
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Compact Category Row (broken-out categories, consistent derived counts) */}
      <section className="max-w-screen-xl mx-auto px-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar">
          {MAIN_CATEGORIES.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => handleCategoryClick(c.id)}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#E1E6E2] hover:border-[#12633D] hover:bg-[#F7F8F5] transition-colors text-xs font-bold text-[#202824] cursor-pointer"
            >
              <span>{c.icon}</span>
              <span>{locale === "JA" ? c.ja : locale === "BN" ? c.bn : c.en}</span>
              <span className="text-[10px] text-[#59635D] font-medium">({c.count})</span>
            </button>
          ))}
        </div>
      </section>

      {/* 3. Above-the-Fold Static 8-Product Grid (Deals & Popular) + Halal Clarity Link */}
      <section className="max-w-screen-xl mx-auto px-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTab("deals")}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-1.5 cursor-pointer transition-colors ${
                activeTab === "deals"
                  ? "bg-[#C92A2A] text-white"
                  : "bg-[#F7F8F5] text-[#202824] border border-[#E1E6E2] hover:border-[#C92A2A]"
              }`}
            >
              <Tag size={14} />
              <span>{locale === "JA" ? "今週のお買い得" : locale === "BN" ? "আজকের ডিল" : "Today's Deals"}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("popular")}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-1.5 cursor-pointer transition-colors ${
                activeTab === "popular"
                  ? "bg-[#12633D] text-white"
                  : "bg-[#F7F8F5] text-[#202824] border border-[#E1E6E2] hover:border-[#12633D]"
              }`}
            >
              <Flame size={14} />
              <span>{locale === "JA" ? "人気定番商品" : locale === "BN" ? "জনপ্রিয় পণ্য" : "Popular Items"}</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenLegal("halal")}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#12633D] underline hover:text-[#0b4f2a] cursor-pointer ml-1"
            >
              <Shield size={13} />
              <span>{locale === "JA" ? "ハラール表示について" : "About Halal Labels"}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleCategoryClick(activeTab === "deals" ? "deals" : "all")}
            className="text-xs font-bold text-[#12633D] hover:underline flex items-center gap-1 cursor-pointer self-start sm:self-auto"
          >
            <span>{locale === "JA" ? "すべて見る" : "View all"}</span>
            <ArrowRight size={13} />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {visibleProducts.map((p, idx) => (
            <ProductCard
              key={p.id}
              product={p}
              locale={locale}
              index={idx}
              onAdd={onAdd}
              onView={() => handleProductClick(p.id)}
            />
          ))}
        </div>
      </section>

      {/* 4. Secondary Grid: Popular / Deals opposite list (4 items) */}
      <section className="max-w-screen-xl mx-auto px-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-extrabold text-[#202824]">
            {activeTab === "deals"
              ? locale === "JA" ? "よく買われている人気商品" : "Popular Essentials"
              : locale === "JA" ? "今週の特選セール" : "Weekly Deals"}
          </h2>
          <button
            type="button"
            onClick={() => handleCategoryClick(activeTab === "deals" ? "all" : "deals")}
            className="text-xs font-bold text-[#12633D] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>{locale === "JA" ? "一覧へ" : "See all"}</span>
            <ArrowRight size={13} />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {(activeTab === "deals" ? popular : deals).slice(0, 4).map((p, idx) => (
            <ProductCard
              key={p.id}
              product={p}
              locale={locale}
              index={idx}
              onAdd={onAdd}
              onView={() => handleProductClick(p.id)}
            />
          ))}
        </div>
      </section>

      {/* 5. Postcode Shipping Estimator */}
      <section className="max-w-screen-xl mx-auto px-4">
        <ShippingEstimator locale={locale} />
      </section>

      {/* 6. Collection Directory Links (replaces repetitive carousels with clean destination links) */}
      <section className="max-w-screen-xl mx-auto px-4 space-y-3">
        <h2 className="text-base sm:text-lg font-extrabold text-[#202824]">
          {locale === "JA" ? "カテゴリー・特集から探す" : "Shop by Collection"}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {MAIN_CATEGORIES.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => handleCategoryClick(c.id)}
              className="text-left p-3.5 rounded-xl bg-white border border-[#E1E6E2] hover:border-[#12633D] hover:shadow-xs transition-all cursor-pointer flex items-center justify-between gap-2"
            >
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-[#202824] flex items-center gap-1.5">
                  <span>{c.icon}</span>
                  <span className="truncate">{locale === "JA" ? c.ja : locale === "BN" ? c.bn : c.en}</span>
                </p>
                <p className="text-[11px] text-[#59635D] mt-0.5">{c.count}品</p>
              </div>
              <ChevronRight size={15} className="text-[#59635D] shrink-0" />
            </button>
          ))}

          <button
            type="button"
            onClick={() => handleCategoryClick("under500")}
            className="text-left p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 hover:border-amber-400 transition-all cursor-pointer flex items-center justify-between gap-2"
          >
            <div>
              <p className="text-xs sm:text-sm font-bold text-amber-900">🪙 500円以下コーナー</p>
              <p className="text-[11px] text-amber-800/80 mt-0.5">送料調整にもおすすめ</p>
            </div>
            <ChevronRight size={15} className="text-amber-800 shrink-0" />
          </button>
        </div>
      </section>

      {/* 7. Compact Halal & Cold-Chain Assurance Strip */}
      <section className="max-w-screen-xl mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <button
            type="button"
            onClick={() => onOpenLegal("halal")}
            className="text-left p-3.5 rounded-xl bg-white border border-[#E1E6E2] hover:border-[#12633D] flex items-start gap-2.5 cursor-pointer"
          >
            <Shield size={18} className="text-[#12633D] shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-[#202824]">ハラール表示基準</p>
              <p className="text-[11px] text-[#59635D] mt-0.5">第三者認証・供給元申告・豚酒不使用を全品明記</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => onOpenLegal("shipping")}
            className="text-left p-3.5 rounded-xl bg-white border border-[#E1E6E2] hover:border-[#12633D] flex items-start gap-2.5 cursor-pointer"
          >
            <Snowflake size={18} className="text-[#075985] shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-[#202824]">温度帯別・ヤマトクール便</p>
              <p className="text-[11px] text-[#59635D] mt-0.5">常温・冷蔵・冷凍を別箱で安全に全国配送</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => onOpenLegal("guide")}
            className="text-left p-3.5 rounded-xl bg-white border border-[#E1E6E2] hover:border-[#12633D] flex items-start gap-2.5 cursor-pointer"
          >
            <HelpCircle size={18} className="text-[#12633D] shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-[#202824]">初めての方へ（ご利用ガイド）</p>
              <p className="text-[11px] text-[#59635D] mt-0.5">お支払い方法・配送ルール・店舗案内</p>
            </div>
          </button>
        </div>
      </section>
    </div>
  );
}
