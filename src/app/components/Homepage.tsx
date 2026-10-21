import { useState } from "react";
import {
  ChevronRight, Shield, Snowflake, Truck, HelpCircle,
  ArrowRight, CheckCircle2, Clock, MapPin, Package,
} from "lucide-react";
import {
  ALL_PRODUCTS,
  MAIN_CATEGORIES,
  RECIPES,
  matchCategory,
  type Product,
  type Locale,
} from "../../data/products";
import { ProductCard } from "./ProductCard";
import type { View, LegalTopic } from "../types";

interface HomepageProps {
  locale: Locale;
  onAdd: (product: Product) => void;
  onSelectProduct: (id: string) => void;
  setView: (v: View) => void;
  setSelectedCategory: (catId: string) => void;
  onOpenLegal: (topic: LegalTopic) => void;
}

export function Homepage({
  locale,
  onAdd,
  onSelectProduct,
  setView,
  setSelectedCategory,
  onOpenLegal,
}: HomepageProps) {
  // Recommended products: products with highest reviews or isBestSeller flag
  const recommendedProducts = ALL_PRODUCTS.filter(p => p.isBestSeller || p.reviews > 40).slice(0, 6);

  // Deals products: products with actual comparePrice > price
  const dealProducts = ALL_PRODUCTS.filter(p => p.comparePrice && p.comparePrice > p.price).slice(0, 6);

  const handleCategoryClick = (catId: string) => {
    setSelectedCategory(catId);
    setView("category");
  };

  return (
    <div className="pb-16 space-y-10 sm:space-y-12">
      {/* 1. Hero Section */}
      <section className="max-w-screen-xl mx-auto px-4 pt-4 sm:pt-6">
        <div className="relative rounded-2xl overflow-hidden min-h-[300px] sm:min-h-[360px] flex items-center bg-[#12633D]">
          {/* Background image with high contrast overlay */}
          <img
            src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1400&h=700&fit=crop&auto=format"
            alt="Beticrom Halal Foods"
            className="absolute inset-0 w-full h-full object-cover opacity-25 mix-blend-luminosity"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0B4F2A] via-[#12633D]/90 to-[#12633D]/60" />

          {/* Hero Content */}
          <div className="relative z-10 p-6 sm:p-12 max-w-2xl text-white">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-xs font-bold text-white mb-4 border border-white/30">
              <Shield size={13} className="text-emerald-300" />
              <span>ハラール食品・スパイス・世界の食材専門店</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight sm:leading-snug mb-3">
              毎日の食卓に、<br className="hidden sm:inline" />世界のハラール食材。
            </h1>

            <p className="text-white/90 text-sm sm:text-base leading-relaxed mb-6 max-w-lg">
              お肉・冷凍食品・お米・スパイスなど、毎日の料理に使える食材をお届けします。ヤマトクール便対応で全国へ安全に発送。
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => {
                  setSelectedCategory("all");
                  setView("category");
                }}
                className="px-6 py-3 rounded-xl bg-white text-[#12633D] font-extrabold text-sm shadow-md hover:bg-neutral-100 transition-all cursor-pointer flex items-center gap-2"
              >
                <span>商品を見る</span>
                <ChevronRight size={16} />
              </button>

              <button
                onClick={() => onOpenLegal("guide")}
                className="px-5 py-3 rounded-xl bg-white/15 text-white font-bold text-sm border border-white/30 backdrop-blur-xs hover:bg-white/25 transition-all cursor-pointer flex items-center gap-2"
              >
                <HelpCircle size={16} />
                <span>はじめての方へ</span>
              </button>
            </div>

            {/* Quick Guarantees */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 mt-6 pt-5 border-t border-white/20 text-xs text-white/85">
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 size={14} className="text-emerald-300" />
                <span>全品ハラール区分明記</span>
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <Snowflake size={14} className="text-blue-300" />
                <span>ヤマトクール宅急便対応</span>
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <Package size={14} className="text-amber-300" />
                <span>常温品 ¥6,500〜送料無料</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Priority Categories (7 Core Categories) */}
      <section className="max-w-screen-xl mx-auto px-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-[#202824]">
              カテゴリーから探す
            </h2>
            <p className="text-xs text-[#59635D] mt-0.5">
              お求めの食材をカテゴリーからスムーズにお選びいただけます
            </p>
          </div>
          <button
            onClick={() => {
              setSelectedCategory("all");
              setView("category");
            }}
            className="text-xs font-bold text-[#12633D] hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            <span>全商品一覧 (948品)</span>
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {MAIN_CATEGORIES.map(cat => {
            const isDeal = cat.id === "deals";
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id)}
                className={`p-3.5 rounded-xl border text-left transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between group ${
                  isDeal
                    ? "bg-red-50/70 border-red-200 hover:border-[#C92A2A]"
                    : "bg-white border-[#E1E6E2] hover:border-[#12633D]"
                }`}
              >
                <div>
                  <span className="text-2xl mb-2 block">{cat.icon}</span>
                  <p className={`text-xs sm:text-sm font-extrabold line-clamp-1 ${isDeal ? "text-[#C92A2A]" : "text-[#202824]"}`}>
                    {locale === "JA" ? cat.ja : locale === "BN" ? cat.bn : cat.en}
                  </p>
                  <p className="text-[10px] text-[#59635D] mt-0.5 line-clamp-2 leading-relaxed">
                    {cat.descriptionJa}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-[#E1E6E2]/60 flex items-center justify-between text-[11px] font-bold">
                  <span className={isDeal ? "text-[#C92A2A]" : "text-[#12633D]"}>
                    {cat.count}品
                  </span>
                  <ChevronRight size={13} className="text-[#59635D] group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. Recommended Products (おすすめ商品 - Based on real data) */}
      <section className="max-w-screen-xl mx-auto px-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-extrabold text-[#202824]">
                おすすめ商品
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-[#12633D]">
                人気定番
              </span>
            </div>
            <p className="text-xs text-[#59635D] mt-0.5">
              日本在住のお客様からリピート購入されている確かな品質のハラール食品
            </p>
          </div>
          <button
            onClick={() => {
              setSelectedCategory("all");
              setView("category");
            }}
            className="text-xs font-bold text-[#12633D] hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            <span>もっと見る</span>
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {recommendedProducts.map(p => (
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
      </section>

      {/* 4. Genuine Weekly Deals (お買い得商品) */}
      <section className="max-w-screen-xl mx-auto px-4">
        <div className="rounded-2xl border border-red-200 bg-gradient-to-r from-red-50/50 via-white to-amber-50/50 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🔥</span>
                <h2 className="text-lg sm:text-xl font-extrabold text-[#202824]">
                  今週のお買い得商品
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-[#C92A2A] text-white">
                  SALE
                </span>
              </div>
              <p className="text-xs text-[#59635D] mt-0.5">
                数量限定・特別価格。おまとめ買いにも最適です
              </p>
            </div>
            <button
              onClick={() => handleCategoryClick("deals")}
              className="text-xs font-bold text-[#C92A2A] hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <span>セール一覧を見る</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {dealProducts.map(p => (
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
        </div>
      </section>

      {/* 5. Recipe / Cooking Inspiration */}
      <section className="max-w-screen-xl mx-auto px-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-[#202824]">
              レシピから探す
            </h2>
            <p className="text-xs text-[#59635D] mt-0.5">
              本格ハラール料理に必要なスパイスや食材をまとめて確認できます
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {RECIPES.map(recipe => (
            <div
              key={recipe.name}
              onClick={() => {
                setSelectedCategory("spices");
                setView("category");
              }}
              className="bg-white border border-[#E1E6E2] rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col"
            >
              <div className="relative h-36 bg-[#F7F8F5] overflow-hidden">
                <img
                  src={recipe.img}
                  alt={recipe.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-2.5 left-3 right-3 text-white">
                  <p className="text-sm font-extrabold leading-tight">
                    {locale === "JA" ? recipe.nameJA : recipe.name}
                  </p>
                  <p className="text-[11px] text-white/80 mt-0.5">
                    調理目安: {recipe.time} · 主食材 {recipe.items}品
                  </p>
                </div>
              </div>
              <div className="p-3 flex items-center justify-between text-xs text-[#12633D] font-bold">
                <span>関連食材を見る</span>
                <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. First-time Shopping Guide (はじめての方へ) */}
      <section className="max-w-screen-xl mx-auto px-4">
        <div className="rounded-2xl border border-[#E1E6E2] bg-[#F7F8F5] p-6 sm:p-8">
          <div className="max-w-2xl mx-auto text-center mb-8">
            <span className="text-xs font-bold text-[#12633D] uppercase tracking-wider bg-emerald-100/70 px-3 py-1 rounded-full">
              FIRST TIME GUIDE
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#202824] mt-2 mb-2">
              Beticrom（ベティクロム）でのお買い物の流れ
            </h2>
            <p className="text-xs sm:text-sm text-[#59635D] leading-relaxed">
              当店は、日本全国のご家庭や飲食店様へ、厳選されたハラール食品と本格スパイスをお届けする専門店です。
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-5 border border-[#E1E6E2] shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-[#12633D] flex items-center justify-center font-extrabold text-base mb-3">
                1
              </div>
              <h3 className="text-sm font-bold text-[#202824] mb-1">
                商品を選んでカートへ
              </h3>
              <p className="text-xs text-[#59635D] leading-relaxed">
                全商品に「常温・冷蔵・冷凍」およびハラール区分を明記。1点から気軽にご注文いただけます。
              </p>
            </div>

            <div className="bg-white rounded-xl p-5 border border-[#E1E6E2] shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-extrabold text-base mb-3">
                2
              </div>
              <h3 className="text-sm font-bold text-[#202824] mb-1">
                温度帯別に安心梱包
              </h3>
              <p className="text-xs text-[#59635D] leading-relaxed">
                品質保持のため、常温品と冷凍・冷蔵品は別箱に梱包。ヤマト運輸の温度管理便にて発送いたします。
              </p>
            </div>

            <div className="bg-white rounded-xl p-5 border border-[#E1E6E2] shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-extrabold text-base mb-3">
                3
              </div>
              <h3 className="text-sm font-bold text-[#202824] mb-1">
                ご指定の日時に全国お届け
              </h3>
              <p className="text-xs text-[#59635D] leading-relaxed">
                午前中から夜間21時まで配達時間帯を指定可能。常温品は¥6,500以上で送料無料になります。
              </p>
            </div>
          </div>

          <div className="mt-6 text-center">
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

      {/* 7. Store Information & Trust Badges */}
      <section className="max-w-screen-xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-[#E1E6E2] rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Shield size={18} className="text-[#12633D]" />
                <h3 className="text-sm sm:text-base font-bold text-[#202824]">
                  Beticromのハラール品質基準
                </h3>
              </div>
              <p className="text-xs text-[#59635D] leading-relaxed mb-4">
                当店で取り扱う食品は、ハラール認証機関（JMA/HJBA等）の認証品、正規輸入元の証明書確認済み商品、および原材料に豚・アルコール不使用の食品を厳密に分類・管理しています。
              </p>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-[#202824]">
                  <span className="w-2 h-2 rounded-full bg-[#12633D]" />
                  <span>第三者ハラール認証取得商品（認定書確認済み）</span>
                </div>
                <div className="flex items-center gap-2 text-[#202824]">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  <span>正規サプライヤー公認ハラール宣言商品</span>
                </div>
                <div className="flex items-center gap-2 text-[#202824]">
                  <span className="w-2 h-2 rounded-full bg-amber-600" />
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

          <div className="bg-white border border-[#E1E6E2] rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MapPin size={18} className="text-[#12633D]" />
                <h3 className="text-sm sm:text-base font-bold text-[#202824]">
                  店舗情報・配送拠点
                </h3>
              </div>
              <p className="text-xs text-[#59635D] leading-relaxed mb-3">
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
