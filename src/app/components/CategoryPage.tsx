import { useState, useMemo } from "react";
import {
  ChevronRight, SlidersHorizontal, X, Search, RotateCcw,
  Snowflake, Thermometer, Package, Shield, Filter,
} from "lucide-react";
import {
  ALL_PRODUCTS,
  MAIN_CATEGORIES,
  matchCategory,
  type Product,
  type Locale,
  type StorageType,
  type HalalTier,
} from "../../data/products";
import { ProductCard } from "./ProductCard";
import type { View } from "../types";

interface CategoryPageProps {
  locale: Locale;
  selectedCategory: string;
  setSelectedCategory: (catId: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onAdd: (product: Product) => void;
  onSelectProduct: (id: string) => void;
  setView: (v: View) => void;
}

export function CategoryPage({
  locale,
  selectedCategory,
  setSelectedCategory,
  searchQuery,
  setSearchQuery,
  onAdd,
  onSelectProduct,
  setView,
}: CategoryPageProps) {
  const [activeStorage, setActiveStorage] = useState<StorageType | "all">("all");
  const [activeHalal, setActiveHalal] = useState<HalalTier | "all">("all");
  const [under500Only, setUnder500Only] = useState(false);
  const [sortBy, setSortBy] = useState<"popular" | "price_asc" | "price_desc" | "newest">("popular");
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  // Active category object if not "all"
  const currentCategory = useMemo(() => {
    return MAIN_CATEGORIES.find(c => c.id === selectedCategory) || null;
  }, [selectedCategory]);

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    let list = ALL_PRODUCTS.filter(p => {
      // 1. Category match
      if (selectedCategory && selectedCategory !== "all") {
        if (!matchCategory(p, selectedCategory)) return false;
      }

      // 2. Search query match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesNameJA = p.nameJA.toLowerCase().includes(q);
        const matchesNameEN = p.nameEN.toLowerCase().includes(q);
        const matchesNameBN = p.nameBN.toLowerCase().includes(q);
        const matchesBrand = (p.brand || "").toLowerCase().includes(q);
        const matchesSubcat = (p.subcategory || "").toLowerCase().includes(q);
        const matchesCategory = (p.category || "").toLowerCase().includes(q);

        if (
          !matchesNameJA &&
          !matchesNameEN &&
          !matchesNameBN &&
          !matchesBrand &&
          !matchesSubcat &&
          !matchesCategory
        ) {
          return false;
        }
      }

      // 3. Storage temperature match
      if (activeStorage !== "all" && p.storage !== activeStorage) {
        return false;
      }

      // 4. Halal tier match
      if (activeHalal !== "all" && p.halalTier !== activeHalal) {
        return false;
      }

      // 5. Under 500 filter
      if (under500Only && p.price > 500) {
        return false;
      }

      return true;
    });

    // Sort logic
    if (sortBy === "price_asc") {
      list.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price_desc") {
      list.sort((a, b) => b.price - a.price);
    } else if (sortBy === "newest") {
      list.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
    } else {
      // "popular"
      list.sort((a, b) => b.reviews - a.reviews);
    }

    return list;
  }, [selectedCategory, searchQuery, activeStorage, activeHalal, under500Only, sortBy]);

  const activeFilterCount =
    (activeStorage !== "all" ? 1 : 0) +
    (activeHalal !== "all" ? 1 : 0) +
    (under500Only ? 1 : 0) +
    (selectedCategory !== "all" ? 1 : 0) +
    (searchQuery.trim() ? 1 : 0);

  const resetAllFilters = () => {
    setActiveStorage("all");
    setActiveHalal("all");
    setUnder500Only(false);
    setSelectedCategory("all");
    setSearchQuery("");
  };

  const categoryTitle = useMemo(() => {
    if (searchQuery.trim()) {
      return `「${searchQuery}」の検索結果`;
    }
    if (currentCategory) {
      return locale === "JA" ? currentCategory.ja : locale === "BN" ? currentCategory.bn : currentCategory.en;
    }
    return locale === "JA" ? "全商品カタログ" : locale === "BN" ? "সকল পণ্য" : "All Products";
  }, [searchQuery, currentCategory, locale]);

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-4 sm:py-6 pb-24 sm:pb-12">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-1.5 text-xs text-[#59635D] mb-4 flex-wrap">
        <button
          onClick={() => {
            setSelectedCategory("all");
            setSearchQuery("");
            setView("home");
          }}
          className="hover:text-[#12633D] cursor-pointer"
        >
          {locale === "JA" ? "ホーム" : "Home"}
        </button>
        <ChevronRight size={12} />
        {currentCategory ? (
          <>
            <button
              onClick={() => {
                setSelectedCategory("all");
                setSearchQuery("");
              }}
              className="hover:text-[#12633D] cursor-pointer"
            >
              {locale === "JA" ? "全商品" : "All Products"}
            </button>
            <ChevronRight size={12} />
            <span className="text-[#202824] font-semibold">
              {locale === "JA" ? currentCategory.ja : locale === "BN" ? currentCategory.bn : currentCategory.en}
            </span>
          </>
        ) : searchQuery.trim() ? (
          <span className="text-[#202824] font-semibold">
            検索: 「{searchQuery}」
          </span>
        ) : (
          <span className="text-[#202824] font-semibold">
            {locale === "JA" ? "全商品カタログ" : "All Products"}
          </span>
        )}
      </nav>

      {/* Header Banner */}
      <div className="bg-[#F7F8F5] border border-[#E1E6E2] rounded-2xl p-5 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {currentCategory && <span className="text-2xl">{currentCategory.icon}</span>}
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#202824]">
                {categoryTitle}
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-[#59635D]">
              {currentCategory
                ? currentCategory.descriptionJa
                : searchQuery.trim()
                ? `キーワード「${searchQuery}」に一致する商品を表示しています`
                : "日本全国配送対応・ヤマトクール便完備。全948商品のハラール食材カタログ"}
            </p>
          </div>

          <div className="text-right shrink-0">
            <span className="text-xs text-[#59635D] block">該当件数</span>
            <span className="text-xl sm:text-2xl font-extrabold text-[#12633D]">
              {filteredProducts.length} <span className="text-xs text-[#202824] font-normal">品</span>
            </span>
          </div>
        </div>

        {/* Quick Category Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pt-4 mt-4 border-t border-[#E1E6E2]">
          <button
            onClick={() => {
              setSelectedCategory("all");
              setSearchQuery("");
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 cursor-pointer ${
              selectedCategory === "all" && !searchQuery
                ? "bg-[#12633D] text-white"
                : "bg-white border border-[#E1E6E2] text-[#202824] hover:border-[#12633D]"
            }`}
          >
            すべて (948)
          </button>
          {MAIN_CATEGORIES.map(c => (
            <button
              key={c.id}
              onClick={() => {
                setSelectedCategory(c.id);
                setSearchQuery("");
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 cursor-pointer flex items-center gap-1.5 ${
                selectedCategory === c.id
                  ? c.id === "deals"
                    ? "bg-[#C92A2A] text-white"
                    : "bg-[#12633D] text-white"
                  : c.id === "deals"
                  ? "bg-red-50 text-[#C92A2A] border border-red-200 hover:border-[#C92A2A]"
                  : "bg-white border border-[#E1E6E2] text-[#59635D] hover:text-[#202824] hover:border-[#12633D]"
              }`}
            >
              <span>{c.icon}</span>
              <span>{locale === "JA" ? c.ja : locale === "BN" ? c.bn : c.en}</span>
              <span className="text-[10px] opacity-80">({c.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Filter and Sort Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 bg-white border border-[#E1E6E2] p-3 rounded-xl shadow-xs">
        {/* Left: Storage Temperature Tabs & Filters button */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setFilterDrawerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E1E6E2] text-xs font-bold text-[#202824] hover:bg-[#F7F8F5] cursor-pointer"
          >
            <SlidersHorizontal size={13} className="text-[#12633D]" />
            <span>絞り込み</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#12633D] text-white text-[10px] flex items-center justify-center font-extrabold">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Quick Storage Pills */}
          <div className="hidden sm:flex items-center gap-1 border-l border-[#E1E6E2] pl-2">
            {[
              { id: "all", label: "全温度帯" },
              { id: "dry", label: "常温便", icon: <Package size={11} /> },
              { id: "cool", label: "冷蔵便", icon: <Thermometer size={11} /> },
              { id: "frozen", label: "冷凍便", icon: <Snowflake size={11} /> },
            ].map(s => (
              <button
                key={s.id}
                onClick={() => setActiveStorage(s.id as any)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                  activeStorage === s.id
                    ? "bg-[#12633D] text-white"
                    : "text-[#59635D] hover:bg-[#F7F8F5]"
                }`}
              >
                {s.icon}
                <span>{s.label}</span>
              </button>
            ))}
          </div>

          {/* Under 500 toggle */}
          <button
            onClick={() => setUnder500Only(!under500Only)}
            className={`hidden md:flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer border ${
              under500Only
                ? "bg-amber-100 border-amber-300 text-amber-900 font-bold"
                : "border-[#E1E6E2] text-[#59635D] hover:bg-[#F7F8F5]"
            }`}
          >
            <span>¥500以下コーナー</span>
          </button>

          {activeFilterCount > 0 && (
            <button
              onClick={resetAllFilters}
              className="text-xs text-[#59635D] hover:text-[#C92A2A] flex items-center gap-1 cursor-pointer ml-1"
            >
              <RotateCcw size={11} />
              <span>条件をクリア</span>
            </button>
          )}
        </div>

        {/* Right: Sort Options */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#59635D] hidden sm:inline">並び順:</span>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="px-3 py-1.5 rounded-lg border border-[#E1E6E2] bg-white text-xs font-semibold text-[#202824] outline-none cursor-pointer focus:border-[#12633D]"
          >
            <option value="popular">人気・レビュー順</option>
            <option value="price_asc">価格が安い順</option>
            <option value="price_desc">価格が高い順</option>
            <option value="newest">新着順</option>
          </select>
        </div>
      </div>

      {/* Active Filter Indicators */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap mb-4 text-xs">
          <span className="text-[#59635D] font-medium">適用中の条件:</span>
          {searchQuery && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-[#12633D] font-bold">
              キーワード: {searchQuery}
              <button onClick={() => setSearchQuery("")} className="hover:opacity-75"><X size={12} /></button>
            </span>
          )}
          {selectedCategory !== "all" && currentCategory && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-[#12633D] font-bold">
              カテゴリー: {currentCategory.ja}
              <button onClick={() => setSelectedCategory("all")} className="hover:opacity-75"><X size={12} /></button>
            </span>
          )}
          {activeStorage !== "all" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-800 font-bold">
              温度帯: {activeStorage === "frozen" ? "冷凍便" : activeStorage === "cool" ? "冷蔵便" : "常温便"}
              <button onClick={() => setActiveStorage("all")} className="hover:opacity-75"><X size={12} /></button>
            </span>
          )}
          {activeHalal !== "all" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-50 border border-green-200 text-green-800 font-bold">
              ハラール: {activeHalal === "certified" ? "ハラール認証" : activeHalal === "supplier" ? "供給元申告" : "豚・酒不使用"}
              <button onClick={() => setActiveHalal("all")} className="hover:opacity-75"><X size={12} /></button>
            </span>
          )}
          {under500Only && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 font-bold">
              ¥500以下
              <button onClick={() => setUnder500Only(false)} className="hover:opacity-75"><X size={12} /></button>
            </span>
          )}
        </div>
      )}

      {/* Product Grid / Empty State */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white border border-[#E1E6E2] rounded-2xl p-12 text-center max-w-md mx-auto my-8">
          <div className="w-16 h-16 rounded-full bg-[#F7F8F5] flex items-center justify-center mx-auto mb-4 text-[#59635D]">
            <Search size={28} />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-[#202824] mb-2">
            該当する商品が見つかりませんでした
          </h2>
          <p className="text-xs text-[#59635D] leading-relaxed mb-6">
            検索キーワードのスペルをご確認いただくか、絞り込み条件をリセットしてお試しください。
          </p>
          <button
            onClick={resetAllFilters}
            className="px-5 py-2.5 rounded-xl bg-[#12633D] text-white text-xs font-bold hover:bg-[#0b4f2a] transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
          >
            <RotateCcw size={13} />
            <span>すべての条件をリセット</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {filteredProducts.map(p => (
            <ProductCard
              key={p.id}
              product={p}
              locale={locale}
              onAdd={onAdd}
              onView={() => {
                onSelectProduct(p.id);
                setView("pdp");
              }}
            />
          ))}
        </div>
      )}

      {/* Filter Drawer Modal */}
      {filterDrawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-black/40 backdrop-blur-2xs"
            onClick={() => setFilterDrawerOpen(false)}
          />
          <div className="w-80 max-w-full bg-white shadow-2xl flex flex-col h-full overflow-hidden">
            <div className="p-4 border-b border-[#E1E6E2] flex items-center justify-between">
              <span className="font-extrabold text-sm text-[#202824]">商品の絞り込み</span>
              <button
                onClick={() => setFilterDrawerOpen(false)}
                className="text-[#59635D] hover:text-[#202824] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 p-4 space-y-6 overflow-y-auto text-xs">
              {/* Category */}
              <div>
                <p className="font-bold text-[#202824] mb-2.5 uppercase tracking-wider text-[11px]">
                  カテゴリー
                </p>
                <div className="space-y-1">
                  <button
                    onClick={() => setSelectedCategory("all")}
                    className={`w-full text-left px-3 py-2 rounded-lg font-semibold flex items-center justify-between ${
                      selectedCategory === "all" ? "bg-emerald-50 text-[#12633D]" : "hover:bg-[#F7F8F5] text-[#59635D]"
                    }`}
                  >
                    <span>すべてのカテゴリー</span>
                    <span>948</span>
                  </button>
                  {MAIN_CATEGORIES.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCategory(c.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg font-semibold flex items-center justify-between ${
                        selectedCategory === c.id ? "bg-emerald-50 text-[#12633D]" : "hover:bg-[#F7F8F5] text-[#59635D]"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span>{c.icon}</span>
                        <span>{c.ja}</span>
                      </span>
                      <span>{c.count}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Storage */}
              <div>
                <p className="font-bold text-[#202824] mb-2.5 uppercase tracking-wider text-[11px]">
                  配送温度帯
                </p>
                <div className="space-y-1">
                  {[
                    { id: "all", label: "すべての温度帯" },
                    { id: "dry", label: "常温便（¥6,500以上送料無料）" },
                    { id: "cool", label: "冷蔵便（クール宅急便）" },
                    { id: "frozen", label: "冷凍便（クール宅急便 -15℃）" },
                  ].map(s => (
                    <button
                      key={s.id}
                      onClick={() => setActiveStorage(s.id as any)}
                      className={`w-full text-left px-3 py-2 rounded-lg font-semibold ${
                        activeStorage === s.id ? "bg-emerald-50 text-[#12633D]" : "hover:bg-[#F7F8F5] text-[#59635D]"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Halal Tier */}
              <div>
                <p className="font-bold text-[#202824] mb-2.5 uppercase tracking-wider text-[11px]">
                  ハラール区分
                </p>
                <div className="space-y-1">
                  {[
                    { id: "all", label: "すべての区分" },
                    { id: "certified", label: "ハラール認証済（JMA/HJBA等）" },
                    { id: "supplier", label: "供給元ハラール証明確認済" },
                    { id: "nopork", label: "豚肉・アルコール成分不使用" },
                  ].map(h => (
                    <button
                      key={h.id}
                      onClick={() => setActiveHalal(h.id as any)}
                      className={`w-full text-left px-3 py-2 rounded-lg font-semibold ${
                        activeHalal === h.id ? "bg-emerald-50 text-[#12633D]" : "hover:bg-[#F7F8F5] text-[#59635D]"
                      }`}
                    >
                      {h.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price range */}
              <div>
                <p className="font-bold text-[#202824] mb-2.5 uppercase tracking-wider text-[11px]">
                  価格帯
                </p>
                <label className="flex items-center gap-2 p-2.5 rounded-lg border border-[#E1E6E2] cursor-pointer hover:bg-[#F7F8F5]">
                  <input
                    type="checkbox"
                    checked={under500Only}
                    onChange={e => setUnder500Only(e.target.checked)}
                    className="accent-[#12633D]"
                  />
                  <span className="font-bold text-[#202824]">¥500以下の商品のみ表示</span>
                </label>
              </div>
            </div>

            <div className="p-4 border-t border-[#E1E6E2] flex gap-2">
              <button
                onClick={resetAllFilters}
                className="flex-1 py-2.5 rounded-xl border border-[#E1E6E2] text-xs font-bold text-[#59635D] hover:bg-[#F7F8F5] cursor-pointer"
              >
                クリア
              </button>
              <button
                onClick={() => setFilterDrawerOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#12633D] text-white text-xs font-bold hover:bg-[#0b4f2a] cursor-pointer"
              >
                結果を表示 ({filteredProducts.length}件)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
