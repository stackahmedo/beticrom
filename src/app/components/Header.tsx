import { useState, useMemo, useRef, useEffect } from "react";
import {
  ShoppingCart, Search, X, ChevronRight, User, HelpCircle,
} from "lucide-react";
import {
  ALL_PRODUCTS,
  MAIN_CATEGORIES,
  matchCategory,
  type Product,
  type Locale,
} from "../../data/products";
import type { View, LegalTopic } from "../types";

interface HeaderProps {
  locale: Locale;
  setLocale: (l: Locale) => void;
  cartCount: number;
  view: View;
  setView: (v: View) => void;
  selectedCategory: string;
  setSelectedCategory: (catId: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onSelectProduct: (productId: string) => void;
  onOpenLegal: (topic: LegalTopic) => void;
}

export function Header({
  locale,
  setLocale,
  cartCount,
  view,
  setView,
  selectedCategory,
  setSelectedCategory,
  searchQuery,
  setSearchQuery,
  onSelectProduct,
  onOpenLegal,
}: HeaderProps) {
  const [inputValue, setInputValue] = useState(searchQuery);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Sync external search query to input value
  useEffect(() => {
    setInputValue(searchQuery);
  }, [searchQuery]);

  // Click outside to close search dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Autocomplete suggestions
  const suggestions = useMemo(() => {
    const q = inputValue.trim().toLowerCase();
    if (q.length < 2) return [];
    return ALL_PRODUCTS.filter(p =>
      p.nameJA.toLowerCase().includes(q) ||
      p.nameEN.toLowerCase().includes(q) ||
      p.nameBN.toLowerCase().includes(q) ||
      (p.brand && p.brand.toLowerCase().includes(q)) ||
      (p.subcategory && p.subcategory.toLowerCase().includes(q))
    ).slice(0, 6);
  }, [inputValue]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSearchQuery(inputValue.trim());
    setSelectedCategory("all");
    setSearchFocused(false);
    setView("category");
  };

  const handleCategoryClick = (catId: string) => {
    setSelectedCategory(catId);
    setSearchQuery("");
    setInputValue("");
    setView("category");
  };

  return (
    <header className="sticky top-0 z-50 bg-card border-b border-border shadow-xs">
      {/* Top Banner / Shopping Notice */}
      <div className="bg-[#12633D] text-white text-[11px] sm:text-xs py-1.5 px-4 font-medium">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden truncate">
            <span className="font-bold bg-white/20 px-2 py-0.5 rounded-full text-[10px] shrink-0">
              {locale === "JA" ? "全国配送" : locale === "BN" ? "দেশব্যাপী ডেলিভারি" : "Japan-wide"}
            </span>
            <span className="truncate">
              {locale === "JA"
                ? "常温品 ¥6,500以上で送料無料 · ヤマトクール便（冷凍・冷蔵）対応"
                : locale === "BN"
                ? "¥৬,৫০০ এর বেশি শুকনো পণ্যে ফ্রি ডেলিভারি · ইয়ামাতো কোল্ড চেইন"
                : "Free dry shipping over ¥6,500 · Yamato Cold Chain (Frozen/Cool)"}
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-3 shrink-0 text-white/90">
            <button
              onClick={() => onOpenLegal("guide")}
              className="hover:underline flex items-center gap-1 cursor-pointer"
            >
              <HelpCircle size={12} />
              <span>{locale === "JA" ? "ご利用ガイド" : locale === "BN" ? "ব্যবহারবিধি" : "Shopping Guide"}</span>
            </button>
            <span className="text-white/40">|</span>
            <button
              onClick={() => onOpenLegal("shipping")}
              className="hover:underline cursor-pointer"
            >
              {locale === "JA" ? "配送料金" : locale === "BN" ? "ডেলিভারি ফি" : "Shipping Rates"}
            </button>
          </div>
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="max-w-screen-xl mx-auto px-4 py-2.5 sm:py-3">
        <div className="flex flex-col md:flex-row md:items-center gap-2.5 sm:gap-4 lg:gap-6">
          {/* Top Row on mobile / Left group on desktop */}
          <div className="flex items-center justify-between gap-3 shrink-0">
            {/* Brand Logo & Descriptor */}
            <button
              onClick={() => {
                setSelectedCategory("all");
                setSearchQuery("");
                setInputValue("");
                setView("home");
              }}
              className="flex items-center gap-2.5 shrink-0 text-left cursor-pointer group"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#12633D] text-white flex items-center justify-center font-extrabold text-base shadow-xs group-hover:scale-105 transition-transform">
                <span>☪</span>
              </div>
              <div>
                <div className="text-lg sm:text-xl font-extrabold tracking-tight text-[#12633D] leading-none">
                  Beticrom
                </div>
                <div className="text-[10px] sm:text-[11px] text-[#59635D] font-medium leading-none mt-1">
                  ハラール食品・スパイス・世界の食材
                </div>
              </div>
            </button>

            {/* Mobile Actions (Language + Cart) */}
            <div className="flex md:hidden items-center gap-2">
              <div className="flex items-center border border-[#E1E6E2] rounded-lg overflow-hidden text-[10px] font-bold bg-white shadow-xs">
                {(["JA", "EN", "BN"] as Locale[]).map(l => (
                  <button
                    key={l}
                    onClick={() => setLocale(l)}
                    className={`px-1.5 py-1 transition-colors cursor-pointer ${
                      locale === l ? "bg-[#12633D] text-white" : "text-[#59635D] hover:bg-[#F7F8F5]"
                    }`}
                  >
                    {l === "JA" ? "JP" : l === "BN" ? "বাংলা" : "EN"}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setView("cart")}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-white font-bold text-xs shadow-xs cursor-pointer ${
                  view === "cart" ? "bg-[#0b4f2a]" : "bg-[#12633D]"
                }`}
              >
                <ShoppingCart size={14} />
                <span className="w-4 h-4 rounded-full text-[10px] font-extrabold flex items-center justify-center bg-white text-[#12633D]">
                  {cartCount}
                </span>
              </button>
            </div>
          </div>

          {/* Wide Product Search with Enter-to-search & Autocomplete */}
          <div ref={searchContainerRef} className="flex-1 w-full max-w-2xl relative">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#59635D] pointer-events-none" />
              <input
                type="text"
                value={inputValue}
                onChange={e => {
                  setInputValue(e.target.value);
                  setSearchFocused(true);
                }}
                onFocus={() => setSearchFocused(true)}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    handleSearchSubmit();
                  }
                }}
                placeholder={
                  locale === "JA"
                    ? "商品名・ブランド名で検索（例: マトン, バスマティ, Shan）"
                    : locale === "BN"
                    ? "পণ্য বা ব্র্যান্ড খুঁজুন (যেমন: মাটন, বাসমতি, শান)"
                    : "Search by product or brand (e.g. Mutton, Basmati, Shan)..."
                }
                className="w-full pl-10 pr-10 py-2 sm:py-2.5 rounded-xl border border-[#E1E6E2] text-xs sm:text-sm bg-[#F7F8F5] focus:bg-white focus:border-[#12633D] outline-none transition-all shadow-xs"
              />
              {inputValue && (
                <button
                  type="button"
                  onClick={() => {
                    setInputValue("");
                    setSearchQuery("");
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#59635D] hover:text-[#202824] cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </form>

            {/* Autocomplete Dropdown */}
            {searchFocused && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#E1E6E2] rounded-xl shadow-xl overflow-hidden z-50 divide-y divide-[#E1E6E2]">
                <div className="px-3 py-1.5 bg-[#F7F8F5] text-[10px] font-bold text-[#59635D] flex justify-between items-center">
                  <span>{locale === "JA" ? "検索候補" : "Search Suggestions"}</span>
                  <span>Enterキーで全件表示</span>
                </div>
                {suggestions.map(p => (
                  <div
                    key={p.id}
                    onClick={() => {
                      onSelectProduct(p.id);
                      setSearchFocused(false);
                      setView("pdp");
                    }}
                    className="flex items-center gap-3 p-2.5 hover:bg-[#F7F8F5] cursor-pointer transition-colors"
                  >
                    <img
                      src={p.img}
                      alt={p.nameEN}
                      className="w-10 h-10 rounded-lg object-contain bg-white border border-[#E1E6E2] p-0.5 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[#202824] truncate">
                        {locale === "JA" ? p.nameJA : locale === "BN" ? p.nameBN : p.nameEN}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                        <span className="font-extrabold text-[#12633D]">¥{p.price.toLocaleString()}（税込）</span>
                        <span className="text-[#59635D] text-[10px]">{p.brand}</span>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-[#59635D] shrink-0" />
                  </div>
                ))}
                <div
                  onClick={() => handleSearchSubmit()}
                  className="p-2.5 bg-emerald-50/50 hover:bg-emerald-50 text-center text-xs font-bold text-[#12633D] cursor-pointer transition-colors"
                >
                  「{inputValue}」の全検索結果を見る →
                </div>
              </div>
            )}
          </div>

          {/* Desktop Right Navigation Actions */}
          <div className="hidden md:flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Trilingual Selector */}
            <div className="flex items-center border border-[#E1E6E2] rounded-lg overflow-hidden text-[11px] font-bold bg-white shadow-xs">
              {(["JA", "EN", "BN"] as Locale[]).map(l => (
                <button
                  key={l}
                  onClick={() => setLocale(l)}
                  className={`px-2 sm:px-2.5 py-1.5 transition-colors cursor-pointer ${
                    locale === l ? "bg-[#12633D] text-white" : "text-[#59635D] hover:bg-[#F7F8F5]"
                  }`}
                >
                  {l === "JA" ? "JP" : l === "BN" ? "বাংলা" : "EN"}
                </button>
              ))}
            </div>

            {/* User Guide (Desktop) */}
            <button
              onClick={() => onOpenLegal("guide")}
              className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E1E6E2] text-xs font-semibold text-[#202824] hover:bg-[#F7F8F5] transition-colors cursor-pointer"
            >
              <HelpCircle size={14} className="text-[#12633D]" />
              <span>{locale === "JA" ? "ご利用ガイド" : locale === "BN" ? "ব্যবহারবিধি" : "Guide"}</span>
            </button>

            {/* My Page / Account */}
            <button
              onClick={() => setView("account")}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                view === "account"
                  ? "bg-[#12633D] text-white border-[#12633D]"
                  : "border-[#E1E6E2] text-[#202824] hover:bg-[#F7F8F5]"
              }`}
            >
              <User size={14} />
              <span>{locale === "JA" ? "マイページ" : locale === "BN" ? "অ্যাকাউন্ট" : "My Page"}</span>
            </button>

            {/* Cart Button */}
            <button
              onClick={() => setView("cart")}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-white font-bold text-xs sm:text-sm shadow-xs transition-opacity cursor-pointer ${
                view === "cart" ? "bg-[#0b4f2a]" : "bg-[#12633D] hover:opacity-95"
              }`}
            >
              <ShoppingCart size={16} />
              <span className="hidden sm:inline">
                {locale === "JA" ? "カート" : locale === "BN" ? "কার্ট" : "Cart"}
              </span>
              <span className="w-5 h-5 rounded-full text-[10px] font-extrabold flex items-center justify-center bg-white text-[#12633D]">
                {cartCount}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 7 Main Categories Bar */}
      <nav className="border-t border-[#E1E6E2] bg-[#F7F8F5]/80 overflow-x-auto scrollbar-hide py-1.5 px-4">
        <div className="max-w-screen-xl mx-auto flex items-center gap-2 sm:gap-3 text-xs font-medium whitespace-nowrap">
          <button
            onClick={() => handleCategoryClick("all")}
            className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
              selectedCategory === "all" && view === "category"
                ? "bg-[#12633D] text-white"
                : "text-[#202824] hover:bg-white"
            }`}
          >
            {locale === "JA" ? "すべて (948)" : locale === "BN" ? "সব পণ্য (৯৪৮)" : "All Items (948)"}
          </button>

          {MAIN_CATEGORIES.map(cat => {
            const isSelected = selectedCategory === cat.id && view === "category";
            const isDeal = cat.id === "deals";
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? isDeal
                      ? "bg-[#C92A2A] text-white"
                      : "bg-[#12633D] text-white"
                    : isDeal
                    ? "text-[#C92A2A] hover:bg-red-50 font-bold"
                    : "text-[#59635D] hover:text-[#202824] hover:bg-white"
                }`}
              >
                <span>{cat.icon}</span>
                <span>{locale === "JA" ? cat.ja : locale === "BN" ? cat.bn : cat.en}</span>
                <span className={`text-[10px] ${isSelected ? "text-white/80" : "text-[#59635D]"}`}>
                  ({cat.count})
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
