import { useState, useMemo } from "react";
import {
  ChevronRight,
  Shield,
  Snowflake,
  Package,
  ArrowRight,
  CheckCircle2,
  MapPin,
  HelpCircle,
  Sparkles,
  Tag,
  Flame,
  Users,
  UtensilsCrossed,
  Layers,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  ALL_PRODUCTS,
  MAIN_CATEGORIES,
  RECIPES,
  matchCategory,
  isFamilyOrBulk,
  type Product,
  type Locale,
} from "../../data/products";
import { ProductCard } from "./ProductCard";
import { ProductCarousel } from "./ProductCarousel";
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
  // Toggle state for "もっと見る" (expand/collapse) per section
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

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

  const toggleExpand = (sectionKey: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  const handleCategoryClick = (catId: string) => {
    setSelectedCategory(catId);
    setView("category");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Curate 9 distinct product sections with ZERO duplicates across the entire homepage
  const sections = useMemo(() => {
    const usedIds = new Set<string>();

    function pickUnique(filterFn: (p: Product) => boolean, count: number = 16): Product[] {
      const matches = ALL_PRODUCTS.filter(p => !usedIds.has(p.id) && filterFn(p));
      const selected = matches.slice(0, count);
      selected.forEach(p => usedIds.add(p.id));
      return selected;
    }

    // 1. Weekly Offers (Deals): genuine comparePrice > price
    const deals = pickUnique(p => Boolean(p.comparePrice && p.comparePrice > p.price), 16);

    // 2. Recommended: customer favorites & high ratings
    const recommended = pickUnique(p => p.isBestSeller || p.reviews >= 20, 16);

    // 3. Halal Meat & Fish: strictly meat/fish (zero masalas or curries)
    const meatFish = pickUnique(p => p.category === "Meat & Fish", 16);

    // 4. Rice, Flour & Lentils: staple grains and flours (standard non-bulk packs)
    const riceFlourBeans = pickUnique(
      p => (matchCategory(p, "rice_flour") || matchCategory(p, "beans")) && !isFamilyOrBulk(p),
      16
    );

    // 5. Family & Bulk Shopping: 5kg/10kg rice & atta, 5L oil, 1kg meats, 10-packs
    const bulkCandidates = ALL_PRODUCTS.filter(p => !usedIds.has(p.id) && isFamilyOrBulk(p));
    const prioritizedBulk: Product[] = [];

    // Ensure diverse representation: Rice, Atta, Oil, Mutton, Chicken, Frozen multipacks, Lentils
    const rice5k = bulkCandidates.find(p => p.nameEN.toLowerCase().includes("5kg") || p.nameEN.toLowerCase().includes("kaalar"));
    if (rice5k) prioritizedBulk.push(rice5k);

    const atta10k = bulkCandidates.find(p => p.nameEN.toLowerCase().includes("atta") && (p.nameEN.toLowerCase().includes("10kg") || p.nameEN.toLowerCase().includes("5kg")));
    if (atta10k && !prioritizedBulk.includes(atta10k)) prioritizedBulk.push(atta10k);

    const oil5L = bulkCandidates.find(p => p.nameEN.toLowerCase().includes("sunflower") || p.nameEN.toLowerCase().includes("5l") || p.nameEN.toLowerCase().includes("oil"));
    if (oil5L && !prioritizedBulk.includes(oil5L)) prioritizedBulk.push(oil5L);

    const mutton1k = bulkCandidates.find(p => p.category === "Meat & Fish" && p.nameEN.toLowerCase().includes("mutton"));
    if (mutton1k && !prioritizedBulk.includes(mutton1k)) prioritizedBulk.push(mutton1k);

    const chicken1k = bulkCandidates.find(p => p.category === "Meat & Fish" && p.nameEN.toLowerCase().includes("chicken"));
    if (chicken1k && !prioritizedBulk.includes(chicken1k)) prioritizedBulk.push(chicken1k);

    const frozenMultipack = bulkCandidates.find(p => p.nameEN.toLowerCase().includes("10pcs") || p.nameEN.toLowerCase().includes("puri"));
    if (frozenMultipack && !prioritizedBulk.includes(frozenMultipack)) prioritizedBulk.push(frozenMultipack);

    const dal1k = bulkCandidates.find(p => p.subcategory === "Lentils and Beans" && p.nameEN.toLowerCase().includes("1kg"));
    if (dal1k && !prioritizedBulk.includes(dal1k)) prioritizedBulk.push(dal1k);

    // Fill up to 16
    bulkCandidates.forEach(p => {
      if (!prioritizedBulk.includes(p) && prioritizedBulk.length < 16) {
        prioritizedBulk.push(p);
      }
    });
    prioritizedBulk.forEach(p => usedIds.add(p.id));
    const familyBulk = prioritizedBulk;

    // 6. Spices & Seasoning: whole spices, ground masalas, seasonings
    const spices = pickUnique(p => matchCategory(p, "spices"), 16);

    // 7. Frozen Foods: parathas, samosas, singaras, snacks
    const frozen = pickUnique(p => matchCategory(p, "frozen"), 16);

    // 8. Under ¥500: budget items, spices, snacks
    const under500 = pickUnique(p => p.price <= 500, 16);

    // 9. New & Restocked: newly arrived or freshly restocked
    const newRestocked = pickUnique(p => Boolean(p.isNew || p.isRestocked), 16);

    return {
      deals,
      recommended,
      meatFish,
      riceFlourBeans,
      familyBulk,
      spices,
      frozen,
      under500,
      newRestocked,
    };
  }, []);

  return (
    <div className="pb-16 space-y-10 sm:space-y-12">
      {/* 3. Short Hero Banner */}
      <section className="max-w-screen-xl mx-auto px-4 pt-4 sm:pt-6">
        <div className="relative rounded-2xl overflow-hidden min-h-[260px] sm:min-h-[300px] flex items-center bg-[#12633D] shadow-sm">
          {/* Subtle contextual backdrop */}
          <img
            src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1400&h=700&fit=crop&auto=format"
            alt="Beticrom Halal Groceries"
            className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-luminosity"
            decoding="async"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0B4F2A] via-[#12633D]/95 to-[#12633D]/70" />

          {/* Hero Content */}
          <div className="relative z-10 p-5 sm:p-10 max-w-2xl text-white">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-xs font-bold text-white mb-3 border border-white/30">
              <Shield size={13} className="text-emerald-300" />
              <span>
                {locale === "JA"
                  ? "ハラール食品・スパイス・世界の食材専門店"
                  : locale === "BN"
                  ? "খাঁটি হালাল খাদ্য ও আন্তর্জাতিক পণ্যের বিশ্বস্ত প্রতিষ্ঠান"
                  : "Authentic Halal Foods & International Groceries in Japan"}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight sm:leading-snug mb-2.5">
              {locale === "JA" ? (
                <>毎日の食卓に、<br className="hidden sm:inline" />世界のハラール食材をお届け。</>
              ) : locale === "BN" ? (
                <>দৈনন্দিন রান্নার সেরা হালাল খাদ্যপণ্য,<br className="hidden sm:inline" />সরাসরি আপনার ঘরে।</>
              ) : (
                <>Everyday Halal Groceries & Spices,<br className="hidden sm:inline" />Delivered Japan-Wide.</>
              )}
            </h1>

            <p className="text-white/90 text-xs sm:text-sm leading-relaxed mb-5 max-w-lg">
              {locale === "JA"
                ? "お肉・冷凍食品・バスマティ米から大容量ファミリーパックまで940品以上。ヤマトクール便対応で全国へ新鮮にお届けします。"
                : locale === "BN"
                ? "মাংস, মাছ, হিমায়িত পরোটা, বাসমতি চাল ও সাশ্রয়ী ফ্যামিলি প্যাকসহ ৯৪০+ পণ্য। দ্রুত কোল্ড চেইন ডেলিভারি।"
                : "Over 940 authentic halal items including fresh meat, frozen breads, basmati rice & bulk family packs. Delivered safe via Yamato Cold Chain."}
            </p>

            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              <button
                onClick={() => handleCategoryClick("all")}
                className="px-5 py-2.5 rounded-xl bg-white text-[#12633D] font-extrabold text-xs sm:text-sm shadow-md hover:bg-neutral-100 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>{locale === "JA" ? "全商品を見る (948品)" : locale === "BN" ? "সব পণ্য দেখুন (৯৪৮)" : "View All Products (948)"}</span>
                <ChevronRight size={15} />
              </button>

              <button
                onClick={() => handleCategoryClick("family")}
                className="px-4 py-2.5 rounded-xl bg-emerald-500/30 text-white font-bold text-xs sm:text-sm border border-emerald-300/40 backdrop-blur-xs hover:bg-emerald-500/40 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Users size={15} />
                <span>{locale === "JA" ? "まとめ買い・ファミリー" : locale === "BN" ? "ফ্যামিলি ও বাল্ক" : "Family & Bulk"}</span>
              </button>

              <button
                onClick={() => onOpenLegal("guide")}
                className="px-3.5 py-2.5 rounded-xl bg-white/15 text-white font-bold text-xs sm:text-sm border border-white/30 backdrop-blur-xs hover:bg-white/25 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <HelpCircle size={15} />
                <span>{locale === "JA" ? "ご利用ガイド" : locale === "BN" ? "ব্যবহারবিধি" : "Guide"}</span>
              </button>
            </div>

            {/* Quick Guarantees */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 mt-5 pt-4 border-t border-white/20 text-[11px] sm:text-xs text-white/90">
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 size={13} className="text-emerald-300 shrink-0" />
                <span>全品ハラール区分明記</span>
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <Snowflake size={13} className="text-blue-300 shrink-0" />
                <span>ヤマトクール宅急便対応</span>
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <Package size={13} className="text-amber-300 shrink-0" />
                <span>常温品 ¥6,500〜送料無料</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Compact Category Navigation */}
      <section className="max-w-screen-xl mx-auto px-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-[#202824] flex items-center gap-1.5">
              <Layers size={18} className="text-[#12633D]" />
              <span>{locale === "JA" ? "カテゴリーから探す" : locale === "BN" ? "ক্যাটাগরি সমূহ" : "Shop by Category"}</span>
            </h2>
            <p className="text-xs text-[#59635D] mt-0.5">
              {locale === "JA"
                ? "お求めの食材をカテゴリーからスムーズにお選びいただけます"
                : locale === "BN"
                ? "আপনার প্রয়োজনীয় খাদ্যপণ্য খুব সহজেই ক্যাটাগরি থেকে বেছে নিন"
                : "Quickly browse our curated grocery categories"}
            </p>
          </div>
          <button
            onClick={() => handleCategoryClick("all")}
            className="text-xs font-bold text-[#12633D] hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            <span>{locale === "JA" ? "全948品一覧" : locale === "BN" ? "সকল পণ্য" : "All 948 Items"}</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {/* 8 Compact Category Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          {MAIN_CATEGORIES.map((cat, catIdx) => {
            const isDeal = cat.id === "deals";
            const isFamily = cat.id === "family";
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id)}
                style={{ animationDelay: `${catIdx * 25}ms` }}
                className={`p-3 rounded-xl border text-left transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between group animate-slide-ltr ${
                  isDeal
                    ? "bg-red-50/70 border-red-200 hover:border-[#C92A2A]"
                    : isFamily
                    ? "bg-emerald-50/60 border-emerald-200 hover:border-[#12633D]"
                    : "bg-white border-[#E1E6E2] hover:border-[#12633D]"
                }`}
              >
                <div>
                  <span className="text-xl sm:text-2xl mb-1.5 block transition-transform group-hover:scale-110 duration-200 origin-left">
                    {cat.icon}
                  </span>
                  <p
                    className={`text-xs font-extrabold line-clamp-1 transition-colors ${
                      isDeal ? "text-[#C92A2A]" : isFamily ? "text-[#12633D]" : "text-[#202824] group-hover:text-[#12633D]"
                    }`}
                  >
                    {locale === "JA" ? cat.ja : locale === "BN" ? cat.bn : cat.en}
                  </p>
                </div>
                <div className="mt-2 pt-1.5 border-t border-[#E1E6E2]/60 flex items-center justify-between text-[10px] font-bold">
                  <span className={isDeal ? "text-[#C92A2A]" : isFamily ? "text-[#12633D]" : "text-[#59635D]"}>
                    {cat.count}品
                  </span>
                  <ChevronRight size={12} className="text-[#59635D] group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 5. 今週のお買い得 — Weekly Offers */}
      <section className="max-w-screen-xl mx-auto px-4">
        <div className="rounded-2xl border border-red-200 bg-gradient-to-r from-red-50/60 via-white to-amber-50/40 p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3.5">
            <div>
              <div className="flex items-center gap-2">
                <Flame size={18} className="text-[#C92A2A]" />
                <h2 className="text-base sm:text-lg font-extrabold text-[#202824]">
                  {locale === "JA" ? "今週のお買い得商品" : locale === "BN" ? "সাপ্তাহিক অফার" : "Weekly Offers"}
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-[#C92A2A] text-white">
                  SALE
                </span>
              </div>
              <p className="text-xs text-[#59635D] mt-0.5">
                {locale === "JA"
                  ? "数量限定・特別割引価格。人気定番商品をお得にお買い求めいただけます"
                  : locale === "BN"
                  ? "সীমিত সময়ের জন্য বিশেষ ছাড়যুক্ত জনপ্রিয় হালাল খাদ্যদ্রব্য"
                  : "Special limited-time discounted prices on everyday halal favorites"}
              </p>
            </div>
            <button
              onClick={() => handleCategoryClick("deals")}
              className="text-xs font-bold text-[#C92A2A] hover:underline flex items-center gap-0.5 cursor-pointer shrink-0"
            >
              <span>{locale === "JA" ? "セール一覧を見る" : locale === "BN" ? "সব অফার" : "View All Deals"}</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <ProductCarousel
            products={sections.deals}
            locale={locale}
            onAdd={onAdd}
            onViewProduct={handleProductClick}
          />
        </div>
      </section>

      {/* 6. おすすめ商品 — Recommended Products */}
      <section className="max-w-screen-xl mx-auto px-4">
        <div className="flex items-center justify-between mb-3.5">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-amber-500" />
              <h2 className="text-base sm:text-lg font-extrabold text-[#202824]">
                {locale === "JA" ? "おすすめ商品" : locale === "BN" ? "জনপ্রিয় পণ্য" : "Recommended Products"}
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-[#12633D]">
                人気定番
              </span>
            </div>
            <p className="text-xs text-[#59635D] mt-0.5">
              {locale === "JA"
                ? "日本在住のお客様からリピート購入されている確かな品質の定番品"
                : locale === "BN"
                ? "গ্রাহকদের অত্যন্ত পছন্দের ও নিয়মিত কেনা বিশ্বস্ত খাদ্যসামগ্রী"
                : "Top-rated authentic staples trusted by international shoppers in Japan"}
            </p>
          </div>
          <button
            onClick={() => handleCategoryClick("all")}
            className="text-xs font-bold text-[#12633D] hover:underline flex items-center gap-0.5 cursor-pointer shrink-0"
          >
            <span>{locale === "JA" ? "すべて見る" : locale === "BN" ? "সবগুলো" : "View All"}</span>
            <ChevronRight size={14} />
          </button>
        </div>

        <ProductCarousel
          products={sections.recommended}
          locale={locale}
          onAdd={onAdd}
          onViewProduct={handleProductClick}
        />
      </section>

      {/* 7. ハラール肉・魚 — Halal Meat & Fish */}
      <section className="max-w-screen-xl mx-auto px-4">
        <div className="flex items-center justify-between mb-3.5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🥩</span>
              <h2 className="text-base sm:text-lg font-extrabold text-[#202824]">
                {locale === "JA" ? "ハラール肉・魚" : locale === "BN" ? "হালাল মাংস ও মাছ" : "Halal Meat & Fish"}
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-700">
                冷凍便発送
              </span>
            </div>
            <p className="text-xs text-[#59635D] mt-0.5">
              {locale === "JA"
                ? "マトン・チキン・ビーフ・魚介をヤマト冷凍便にて新鮮なまま全国へお届け"
                : locale === "BN"
                ? "হিমায়িত হালাল খাসি, মুরগি, গরু এবং সামুদ্রিক মাছের তাজা সরবরাহ"
                : "Freshly frozen certified halal mutton, beef, chicken & seafood"}
            </p>
          </div>
          <button
            onClick={() => handleCategoryClick("meat_fish")}
            className="text-xs font-bold text-[#12633D] hover:underline flex items-center gap-0.5 cursor-pointer shrink-0"
          >
            <span>{locale === "JA" ? "お肉・魚一覧" : locale === "BN" ? "সব মাংস ও মাছ" : "View Meat & Fish"}</span>
            <ChevronRight size={14} />
          </button>
        </div>

        <ProductCarousel
          products={sections.meatFish}
          locale={locale}
          onAdd={onAdd}
          onViewProduct={handleProductClick}
        />
      </section>

      {/* 8. 米・粉・豆類 — Rice, Flour & Lentils */}
      <section className="max-w-screen-xl mx-auto px-4">
        <div className="flex items-center justify-between mb-3.5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🌾</span>
              <h2 className="text-base sm:text-lg font-extrabold text-[#202824]">
                {locale === "JA" ? "米・粉・豆類" : locale === "BN" ? "চাল, আটা ও ডাল" : "Rice, Flour & Lentils"}
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800">
                主食・食卓の定番
              </span>
            </div>
            <p className="text-xs text-[#59635D] mt-0.5">
              {locale === "JA"
                ? "香り高い特選バスマティ米、チャパティ用全粒粉アタ、チャナ豆・ダールなど"
                : locale === "BN"
                ? "খাঁটি বাসমতি চাল, তাজা আটা, সুজি এবং পুষ্টিকর নানা পদের ডাল"
                : "Premium basmati rice, chapati atta, semolina, and nutritious lentils"}
            </p>
          </div>
          <button
            onClick={() => handleCategoryClick("rice_flour")}
            className="text-xs font-bold text-[#12633D] hover:underline flex items-center gap-0.5 cursor-pointer shrink-0"
          >
            <span>{locale === "JA" ? "米・粉一覧" : locale === "BN" ? "সব চাল ও আটা" : "View Rice & Flour"}</span>
            <ChevronRight size={14} />
          </button>
        </div>

        <ProductCarousel
          products={sections.riceFlourBeans}
          locale={locale}
          onAdd={onAdd}
          onViewProduct={handleProductClick}
        />
      </section>

      {/* 9. ファミリー・まとめ買い — Family & Bulk Shopping (Immediately after Rice, Flour & Lentils) */}
      <section id="family-bulk" className="max-w-screen-xl mx-auto px-4">
        <div className="rounded-2xl border border-emerald-300 bg-gradient-to-r from-emerald-50/70 via-white to-teal-50/50 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3.5">
            <div>
              <div className="flex items-center gap-2">
                <Users size={18} className="text-[#12633D]" />
                <h2 className="text-base sm:text-lg font-extrabold text-[#202824]">
                  {locale === "JA" ? "ファミリー・まとめ買い" : locale === "BN" ? "ফ্যামিলি ও বাল্ক শপিং" : "Family & Bulk Shopping"}
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-[#12633D] text-white">
                  大容量でお得
                </span>
              </div>
              <p className="text-xs text-[#59635D] mt-0.5">
                {locale === "JA"
                  ? "5kg/10kgの大袋米・粉、5L食用油、1kgお肉、10枚入冷凍パンなど大容量パック（単価目安表示）"
                  : locale === "BN"
                  ? "৫/১০ কেজি চাল ও আটা, ৫ লিটার তেল, ১ কেজি মাংস এবং ১০ পিস পরোটার সাশ্রয়ী বাল্ক প্যাক"
                  : "Great-value bulk packs: 5kg/10kg rice & atta, 5L oil, 1kg meats & 10pc multipacks with unit pricing"}
              </p>
            </div>
            <button
              onClick={() => handleCategoryClick("family")}
              className="text-xs font-bold text-[#12633D] hover:underline flex items-center gap-0.5 cursor-pointer shrink-0"
            >
              <span>{locale === "JA" ? "大容量一覧を見る" : locale === "BN" ? "সব বাল্ক পণ্য" : "View All Bulk"}</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <ProductCarousel
            products={sections.familyBulk}
            locale={locale}
            showUnitPrice={true}
            onAdd={onAdd}
            onViewProduct={handleProductClick}
          />
        </div>
      </section>

      {/* 10. スパイス・調味料 — Spices & Seasonings */}
      <section className="max-w-screen-xl mx-auto px-4">
        <div className="flex items-center justify-between mb-3.5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🌶️</span>
              <h2 className="text-base sm:text-lg font-extrabold text-[#202824]">
                {locale === "JA" ? "スパイス・調味料" : locale === "BN" ? "মসলা ও সিজনিং" : "Spices & Seasonings"}
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-100 text-red-800">
                本場の香り
              </span>
            </div>
            <p className="text-xs text-[#59635D] mt-0.5">
              {locale === "JA"
                ? "直輸入の本格ホールスパイス、パウダー、ブレンドマサラ、純ギー・オイル"
                : locale === "BN"
                ? "খাঁটি গোটা ও গুঁড়া মসলা, বিখ্যাত বিরিয়ানি ও কারি মিক্স এবং ঐতিহ্যবাহী ঘি"
                : "Directly imported authentic whole spices, powdered masalas, curry mixes & ghee"}
            </p>
          </div>
          <button
            onClick={() => handleCategoryClick("spices")}
            className="text-xs font-bold text-[#12633D] hover:underline flex items-center gap-0.5 cursor-pointer shrink-0"
          >
            <span>{locale === "JA" ? "スパイス一覧" : locale === "BN" ? "সব মসলা" : "View Spices"}</span>
            <ChevronRight size={14} />
          </button>
        </div>

        <ProductCarousel
          products={sections.spices}
          locale={locale}
          onAdd={onAdd}
          onViewProduct={handleProductClick}
        />
      </section>

      {/* 11. 冷凍食品 — Frozen Foods */}
      <section className="max-w-screen-xl mx-auto px-4">
        <div className="flex items-center justify-between mb-3.5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">❄️</span>
              <h2 className="text-base sm:text-lg font-extrabold text-[#202824]">
                {locale === "JA" ? "冷凍食品" : locale === "BN" ? "হিমায়িত খাবার" : "Frozen Foods"}
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-cyan-100 text-cyan-800">
                時短・手軽に本場
              </span>
            </div>
            <p className="text-xs text-[#59635D] mt-0.5">
              {locale === "JA"
                ? "焼くだけ・揚げるだけ。本場のパラタ、サモサ、シンガラ、スナックを冷凍でお届け"
                : locale === "BN"
                ? "সহজেই তৈরি পরোটা, পুরি, সমুচা এবং ঐতিহ্যবাহী সুস্বাদু ফ্রোজেন নাস্তা"
                : "Convenient heat-and-eat: authentic parathas, samosas, puris & frozen savory snacks"}
            </p>
          </div>
          <button
            onClick={() => handleCategoryClick("frozen")}
            className="text-xs font-bold text-[#12633D] hover:underline flex items-center gap-0.5 cursor-pointer shrink-0"
          >
            <span>{locale === "JA" ? "冷凍食品一覧" : locale === "BN" ? "সব ফ্রোজেন" : "View Frozen"}</span>
            <ChevronRight size={14} />
          </button>
        </div>

        <ProductCarousel
          products={sections.frozen}
          locale={locale}
          onAdd={onAdd}
          onViewProduct={handleProductClick}
        />
      </section>

      {/* 12. 500円以下の商品 — Products ¥500 and Under */}
      <section className="max-w-screen-xl mx-auto px-4">
        <div className="flex items-center justify-between mb-3.5">
          <div>
            <div className="flex items-center gap-2">
              <Tag size={18} className="text-emerald-600" />
              <h2 className="text-base sm:text-lg font-extrabold text-[#202824]">
                {locale === "JA" ? "500円以下の商品" : locale === "BN" ? "৫০০ ইয়েনের নিচের পণ্য" : "Products ¥500 and Under"}
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-[#12633D]">
                ワンコイン・ついで買い
              </span>
            </div>
            <p className="text-xs text-[#59635D] mt-0.5">
              {locale === "JA"
                ? "あと少しで送料無料！手軽に試せる本格スパイス・お菓子・日常の常備品"
                : locale === "BN"
                ? "ফ্রি ডেলিভারি পেতে বা অল্প খরচে নতুন কিছু ট্রাই করতে ৫০০ ইয়েনের সুলভ পণ্য"
                : "Great additions to reach free delivery: affordable spices, snacks & pantry staples"}
            </p>
          </div>
          <button
            onClick={() => handleCategoryClick("under500")}
            className="text-xs font-bold text-[#12633D] hover:underline flex items-center gap-0.5 cursor-pointer shrink-0"
          >
            <span>{locale === "JA" ? "500円以下一覧" : locale === "BN" ? "সবগুলো" : "View All Under ¥500"}</span>
            <ChevronRight size={14} />
          </button>
        </div>

        <ProductCarousel
          products={sections.under500}
          locale={locale}
          onAdd={onAdd}
          onViewProduct={handleProductClick}
        />
      </section>

      {/* 13. 新入荷・再入荷 — New & Restocked */}
      {sections.newRestocked.length > 0 && (
        <section className="max-w-screen-xl mx-auto px-4">
          <div className="flex items-center justify-between mb-3.5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg">✨</span>
                <h2 className="text-base sm:text-lg font-extrabold text-[#202824]">
                  {locale === "JA" ? "新入荷・再入荷" : locale === "BN" ? "নতুন ও পুনরায় আমদানি" : "New & Restocked"}
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-700">
                  NEW & RESTOCK
                </span>
              </div>
              <p className="text-xs text-[#59635D] mt-0.5">
                {locale === "JA"
                  ? "新しく入荷した世界の食材と、リクエストにお応えして再入荷した人気商品"
                  : locale === "BN"
                  ? "সদ্য আমদানি হওয়া নতুন পণ্য এবং গ্রাহকদের অনুরোধে পুনরায় স্টক হওয়া খাদ্যদ্রব্য"
                  : "Fresh arrivals and newly restocked international pantry favorites"}
              </p>
            </div>
            <button
              onClick={() => handleCategoryClick("new_restocked")}
              className="text-xs font-bold text-[#12633D] hover:underline flex items-center gap-0.5 cursor-pointer shrink-0"
            >
              <span>{locale === "JA" ? "新入荷一覧" : locale === "BN" ? "সব নতুন পণ্য" : "View New & Restocked"}</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <ProductCarousel
            products={sections.newRestocked}
            locale={locale}
            onAdd={onAdd}
            onViewProduct={handleProductClick}
          />
        </section>
      )}

      {/* 14. Compact Recipes & First-Time Shopping Guide */}
      <section className="max-w-screen-xl mx-auto px-4 space-y-6">
        {/* Compact Recipes */}
        <div>
          <div className="flex items-center justify-between mb-3.5">
            <div>
              <div className="flex items-center gap-2">
                <UtensilsCrossed size={18} className="text-[#12633D]" />
                <h2 className="text-base sm:text-lg font-extrabold text-[#202824]">
                  {locale === "JA" ? "おすすめハラールレシピから探す" : locale === "BN" ? "রেসিপি থেকে উপাদান খুঁজুন" : "Cook Authentic Recipes"}
                </h2>
              </div>
              <p className="text-xs text-[#59635D] mt-0.5">
                {locale === "JA"
                  ? "本格ビリヤニやカレーに必要なスパイス・食材をまとめて確認できます"
                  : locale === "BN"
                  ? "সুস্বাদু বিরিয়ানি ও কারি তৈরির সঠিক উপাদান ও মসলা সহজে সংগ্রহ করুন"
                  : "Easily find the authentic spices and ingredients required for classic dishes"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {RECIPES.slice(0, 4).map(recipe => (
              <div
                key={recipe.name}
                onClick={() => handleCategoryClick("spices")}
                className="bg-white border border-[#E1E6E2] rounded-xl overflow-hidden shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col"
              >
                <div className="relative h-32 bg-[#F7F8F5] overflow-hidden">
                  <img
                    src={recipe.img}
                    alt={recipe.name}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                  <div className="absolute bottom-2.5 left-3 right-3 text-white">
                    <p className="text-sm font-extrabold leading-tight">
                      {locale === "JA" ? recipe.nameJA : locale === "BN" ? recipe.nameBN : recipe.name}
                    </p>
                    <p className="text-[10px] text-white/80 mt-0.5">
                      調理目安: {recipe.time} · 主食材 {recipe.items}品
                    </p>
                  </div>
                </div>
                <div className="p-2.5 flex items-center justify-between text-xs text-[#12633D] font-bold">
                  <span>{locale === "JA" ? "関連食材を見る" : locale === "BN" ? "উপাদানসমূহ" : "View Ingredients"}</span>
                  <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* First-time Shopping Guide */}
        <div className="rounded-2xl border border-[#E1E6E2] bg-[#F7F8F5] p-5 sm:p-7">
          <div className="max-w-xl mx-auto text-center mb-6">
            <span className="text-[11px] font-bold text-[#12633D] uppercase tracking-wider bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
              FIRST TIME GUIDE
            </span>
            <h3 className="text-lg sm:text-xl font-extrabold text-[#202824] mt-1.5 mb-1">
              {locale === "JA" ? "Beticromでのお買い物の流れ" : locale === "BN" ? "বেটিক্রম এ কেনাকাটার সহজ ধাপ" : "How to Order on Beticrom"}
            </h3>
            <p className="text-xs text-[#59635D] leading-relaxed">
              {locale === "JA"
                ? "日本全国のご家庭へ、厳選されたハラール食品と本格スパイスを安心・迅速にお届けします。"
                : locale === "BN"
                ? "জাপানের যেকোনো প্রান্ত থেকে সহজে ও নিরাপদে আপনার প্রয়োজনীয় হালাল খাদ্যপণ্য অর্ডার করুন।"
                : "Safe, transparent, and prompt halal grocery delivery across Japan."}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-4 border border-[#E1E6E2] shadow-2xs">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#12633D] flex items-center justify-center font-extrabold text-sm mb-2.5">
                1
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-[#202824] mb-1">
                商品を選んでカートへ
              </h4>
              <p className="text-[11px] text-[#59635D] leading-relaxed">
                全商品に「常温・冷蔵・冷凍」およびハラール区分を明記。1点から気軽にご注文いただけます。
              </p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-[#E1E6E2] shadow-2xs">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-extrabold text-sm mb-2.5">
                2
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-[#202824] mb-1">
                温度帯別に安心梱包
              </h4>
              <p className="text-[11px] text-[#59635D] leading-relaxed">
                品質保持のため、常温品と冷凍・冷蔵品は別箱に梱包。ヤマト運輸の温度管理便にて発送いたします。
              </p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-[#E1E6E2] shadow-2xs">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-extrabold text-sm mb-2.5">
                3
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-[#202824] mb-1">
                ご指定の日時に全国お届け
              </h4>
              <p className="text-[11px] text-[#59635D] leading-relaxed">
                午前中から夜間21時まで配達時間帯を指定可能。常温品は¥6,500以上で送料無料になります。
              </p>
            </div>
          </div>

          <div className="mt-5 text-center">
            <button
              onClick={() => onOpenLegal("guide")}
              className="text-xs font-bold text-[#12633D] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>詳しいご利用ガイド・配送料金について確認する</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </section>

      {/* 15. Store Information & Trust Badges */}
      <section className="max-w-screen-xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-[#E1E6E2] rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Shield size={18} className="text-[#12633D]" />
                <h3 className="text-sm sm:text-base font-bold text-[#202824]">
                  Beticromのハラール品質基準
                </h3>
              </div>
              <p className="text-xs text-[#59635D] leading-relaxed mb-3">
                当店で取り扱う食品は、ハラール認証機関（JMA/HJBA等）の認証品、正規輸入元の証明書確認済み商品、および原材料に豚・アルコール不使用の食品を厳密に分類・管理しています。
              </p>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2 text-[#202824]">
                  <span className="w-2 h-2 rounded-full bg-[#12633D] shrink-0" />
                  <span>第三者ハラール認証取得商品（認定書確認済み）</span>
                </div>
                <div className="flex items-center gap-2 text-[#202824]">
                  <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                  <span>正規サプライヤー公認ハラール宣言商品</span>
                </div>
                <div className="flex items-center gap-2 text-[#202824]">
                  <span className="w-2 h-2 rounded-full bg-amber-600 shrink-0" />
                  <span>原材料に豚肉・アルコール等非ハラール成分不使用</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => onOpenLegal("tokushoho")}
              className="mt-4 pt-3 border-t border-[#E1E6E2] text-xs font-bold text-[#12633D] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>特定商取引法に基づく表記を見る</span>
              <ChevronRight size={13} />
            </button>
          </div>

          <div className="bg-white border border-[#E1E6E2] rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MapPin size={18} className="text-[#12633D]" />
                <h3 className="text-sm sm:text-base font-bold text-[#202824]">
                  店舗情報・配送拠点
                </h3>
              </div>
              <p className="text-xs text-[#59635D] leading-relaxed mb-2.5">
                実店舗および東京物流センターから、新鮮な状態のまま迅速・確実に発送いたします。
              </p>
              <div className="bg-[#F7F8F5] p-3 rounded-xl border border-[#E1E6E2] text-xs text-[#202824] space-y-1">
                <p className="font-bold">株式会社ベティクロム（Beticrom Co., Ltd.）</p>
                <p className="text-[#59635D]">〒124-0025 東京都葛飾区西新小岩1-2-11 キクヤビル1F</p>
                <p className="text-[#59635D]">お電話でのお問い合わせ: 03-5654-6417</p>
                <p className="text-[#59635D]">メール: contact@beticrom.jp</p>
              </div>
            </div>
            <button
              onClick={() => onOpenLegal("company")}
              className="mt-4 pt-3 border-t border-[#E1E6E2] text-xs font-bold text-[#12633D] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>会社概要を見る</span>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
