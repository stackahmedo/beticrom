import { useState, useMemo } from "react";
import {
  ChevronRight, Heart, Minus, Plus, Check, Shield, Snowflake,
  Thermometer, Package, Truck, AlertCircle, Sparkles, CheckCircle2,
} from "lucide-react";
import {
  ALL_PRODUCTS,
  type Product,
  type Locale,
} from "../../data/products";
import { HalalBadge, StorageBadge, ProductCard } from "./ProductCard";
import { ProductCarousel } from "./ProductCarousel";
import type { View, LegalTopic } from "../types";

interface PDPPageProps {
  locale: Locale;
  productId: string;
  onAdd: (product: Product, quantity?: number) => void;
  onSelectProduct: (id: string) => void;
  onOpenProductPopup?: (product: Product) => void;
  setView: (v: View) => void;
  setSelectedCategory: (catId: string) => void;
  onOpenLegal: (topic: LegalTopic) => void;
}

type TabKey =
  | "about"
  | "usage"
  | "specs"
  | "allergen"
  | "storage"
  | "halal"
  | "shipping";

export function PDPPage({
  locale,
  productId,
  onAdd,
  onSelectProduct,
  onOpenProductPopup,
  setView,
  setSelectedCategory,
  onOpenLegal,
}: PDPPageProps) {
  const p = useMemo(() => {
    return ALL_PRODUCTS.find(item => item.id === productId) || ALL_PRODUCTS[0];
  }, [productId]);

  const [selectedImg, setSelectedImg] = useState<string>(p.img);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("about");

  const displayName = locale === "JA" ? p.nameJA : locale === "BN" ? p.nameBN : p.nameEN;

  const discountPercent =
    p.comparePrice && p.comparePrice > p.price
      ? Math.round((1 - p.price / p.comparePrice) * 100)
      : 0;

  const handleAdd = () => {
    onAdd(p, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  // Related products from same category
  const relatedProducts = useMemo(() => {
    return ALL_PRODUCTS.filter(item => item.category === p.category && item.id !== p.id).slice(0, 6);
  }, [p]);

  const tabs: { key: TabKey; label: string }[] = [
    { key: "about", label: "商品について" },
    { key: "usage", label: "おすすめの使い方" },
    { key: "specs", label: "商品情報" },
    { key: "allergen", label: "アレルギー情報" },
    { key: "storage", label: "保存方法" },
    { key: "halal", label: "ハラールについて" },
    { key: "shipping", label: "配送について" },
  ];

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-4 sm:py-6 pb-28 sm:pb-16">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-[#59635D] mb-5 flex-wrap">
        <button
          onClick={() => {
            setSelectedCategory("all");
            setView("home");
          }}
          className="hover:text-[#12633D] cursor-pointer"
        >
          {locale === "JA" ? "ホーム" : "Home"}
        </button>
        <ChevronRight size={12} />
        <button
          onClick={() => {
            setSelectedCategory(p.category);
            setView("category");
          }}
          className="hover:text-[#12633D] cursor-pointer"
        >
          {p.category}
        </button>
        <ChevronRight size={12} />
        <span className="text-[#202824] font-semibold truncate max-w-xs">
          {displayName}
        </span>
      </nav>

      {/* Main PDP Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Gallery (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="aspect-square rounded-2xl border border-[#E1E6E2] bg-[#F7F8F5] p-6 flex items-center justify-center overflow-hidden relative shadow-xs">
            <img
              src={selectedImg || p.img}
              alt={displayName}
              className="w-full h-full object-contain"
              onError={e => {
                (e.target as HTMLImageElement).src =
                  "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=400&fit=crop";
              }}
            />
            {discountPercent > 0 && (
              <span className="absolute top-3 left-3 bg-[#C92A2A] text-white text-xs font-extrabold px-2.5 py-1 rounded-md shadow-xs">
                -{discountPercent}% OFF
              </span>
            )}
          </div>

          {p.gallery && p.gallery.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {p.gallery.map((imgUrl, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedImg(imgUrl)}
                  className={`w-16 h-16 rounded-xl border p-1 bg-[#F7F8F5] shrink-0 transition-all cursor-pointer ${
                    (selectedImg || p.img) === imgUrl
                      ? "border-[#12633D] ring-2 ring-[#12633D]/20"
                      : "border-[#E1E6E2] hover:border-[#12633D]/50"
                  }`}
                >
                  <img src={imgUrl} alt="" className="w-full h-full object-contain" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Info & Purchase Controls with Left-to-Right Entrance (7 cols) */}
        <div className="lg:col-span-7 space-y-5 animate-slide-ltr">
          {/* Brand, Badges, & SKU */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-[#F7F8F5] text-[#202824] font-bold text-xs border border-[#E1E6E2]">
                {p.brand}
              </span>
              <StorageBadge type={p.storage} locale={locale} />
              <HalalBadge tier={p.halalTier} locale={locale} />
            </div>
            <span className="text-[11px] font-mono text-[#59635D]">
              商品番号: #{p.id}
            </span>
          </div>

          {/* Product Title */}
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#202824] leading-snug">
              {displayName}
            </h1>
            {p.nameEN && p.nameEN !== displayName && (
              <p className="text-sm text-[#59635D] mt-1 font-medium">
                {p.nameEN}
              </p>
            )}
          </div>

          {/* Pricing Box */}
          <div className="bg-[#F7F8F5] p-4 rounded-xl border border-[#E1E6E2] flex items-baseline gap-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#202824]">
              ¥{p.price.toLocaleString()}
            </span>
            <span className="text-xs text-[#59635D] font-medium">
              （税込・消費税率8%適用）
            </span>
            {p.comparePrice && p.comparePrice > p.price && (
              <div className="ml-auto text-right">
                <span className="text-xs text-[#59635D] line-through block">
                  参考通常価格: ¥{p.comparePrice.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-[#C92A2A]">
                  ¥{(p.comparePrice - p.price).toLocaleString()} お得！
                </span>
              </div>
            )}
          </div>

          {/* Stock & Yamato Logistics Notice */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
              <span className="font-bold text-[#202824]">在庫あり</span>
              <span className="text-[#59635D]">（東京都葛飾区倉庫より即納可能）</span>
            </div>

            <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/50 flex items-start gap-2.5 text-xs text-blue-900">
              {p.storage === "frozen" ? (
                <Snowflake size={16} className="text-blue-600 shrink-0 mt-0.5" />
              ) : p.storage === "cool" ? (
                <Thermometer size={16} className="text-teal-600 shrink-0 mt-0.5" />
              ) : (
                <Package size={16} className="text-[#12633D] shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-bold">
                  {p.storage === "frozen"
                    ? "ヤマトクール宅急便（冷凍便 -15℃以下）でお届け"
                    : p.storage === "cool"
                    ? "ヤマトクール宅急便（冷蔵便 0℃〜10℃）でお届け"
                    : "ヤマト宅急便（常温便 · ¥6,500以上で送料無料）でお届け"}
                </p>
                <p className="text-[11px] text-blue-800/80 mt-0.5">
                  品質管理のため、常温品とは異なる専用の保冷箱にてお届けします。
                </p>
              </div>
            </div>
          </div>

          {/* Quantity Selector & Add to Cart (Desktop) */}
          <div className="flex items-center gap-3 pt-2">
            <div className="flex items-center border border-[#E1E6E2] rounded-xl overflow-hidden bg-white shadow-xs">
              <button
                type="button"
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="w-10 h-11 flex items-center justify-center hover:bg-[#F7F8F5] text-[#59635D] cursor-pointer transition-transform active:scale-90"
                aria-label="Decrease quantity"
              >
                <Minus size={14} />
              </button>
              <span className="w-12 text-center font-bold text-sm text-[#202824]">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity(q => q + 1)}
                className="w-10 h-11 flex items-center justify-center hover:bg-[#F7F8F5] text-[#59635D] cursor-pointer transition-transform active:scale-90"
                aria-label="Increase quantity"
              >
                <Plus size={14} />
              </button>
            </div>

            <button
              type="button"
              onClick={handleAdd}
              className={`flex-1 py-3 px-6 rounded-xl font-bold text-sm text-white shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] ${
                added ? "bg-[#0b4f2a]" : "bg-[#12633D] hover:bg-[#0b4f2a]"
              }`}
            >
              {added ? (
                <div className="flex items-center gap-2 animate-content-ltr">
                  <Check size={18} className="animate-soft-pulse" />
                  <span>カートに追加しました</span>
                </div>
              ) : (
                <span>カートに入れる — ¥{(p.price * quantity).toLocaleString()}（税込）</span>
              )}
            </button>
          </div>

          {/* 7 Food-Specific Information Tabs */}
          <div className="pt-4">
            <div className="flex border-b border-[#E1E6E2] overflow-x-auto scrollbar-hide text-xs font-bold">
              {tabs.map(t => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`px-3.5 py-2.5 transition-all whitespace-nowrap cursor-pointer border-b-2 ${
                    activeTab === t.key
                      ? "border-[#12633D] text-[#12633D] bg-[#F7F8F5]/60"
                      : "border-transparent text-[#59635D] hover:text-[#202824]"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div
              key={activeTab}
              className="p-4 bg-white border border-t-0 border-[#E1E6E2] rounded-b-2xl text-xs sm:text-sm text-[#202824] leading-relaxed animate-content-ltr"
            >
              {activeTab === "about" && (
                <div className="space-y-2">
                  <p className="font-bold text-[#202824]">{displayName}</p>
                  <p className="text-[#59635D]">
                    {p.desc ||
                      `${p.brand}による本格品質の${displayName}。厳選された原材料を用い、日本の食品衛生基準に準拠して輸入・管理されています。`}
                  </p>
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-[#E1E6E2] text-xs">
                    <div>
                      <span className="text-[#59635D]">原産国 / 産地:</span>{" "}
                      <span className="font-semibold">{p.country || "輸入食品"}</span>
                    </div>
                    <div>
                      <span className="text-[#59635D]">内容量 / 規格:</span>{" "}
                      <span className="font-semibold">{p.weight || "1パック"}</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "usage" && (
                <div className="space-y-2">
                  <p className="font-bold text-[#202824]">調理・お召し上がり方のアドバイス</p>
                  {p.storage === "frozen" ? (
                    <p className="text-[#59635D]">
                      調理前に冷蔵庫内でゆっくり自然解凍していただくと、ドリップの流出を防ぎ旨味を保つことができます。急ぎの場合は密閉パックのまま流水解凍を行ってください。再冷凍は品質劣化の原因となりますのでお控えください。
                    </p>
                  ) : p.category.includes("Spice") ? (
                    <p className="text-[#59635D]">
                      油で弱火で軽く炒めて香り（テンパリング）を引き出してから煮込み料理やカレーのベースにお使いいただくと、より本格的な風味が楽しめます。
                    </p>
                  ) : (
                    <p className="text-[#59635D]">
                      カレー、ビリヤニ、ロティなどの日常的な料理をはじめ、様々な南アジア・中東料理のレシピと合わせて本格的な味わいをお楽しみいただけます。
                    </p>
                  )}
                </div>
              )}

              {activeTab === "specs" && (
                <div className="space-y-2">
                  <p className="font-bold text-[#202824]">製品仕様</p>
                  <table className="w-full text-xs">
                    <tbody className="divide-y divide-[#E1E6E2]">
                      <tr>
                        <td className="py-2 text-[#59635D] w-32">商品名</td>
                        <td className="py-2 font-semibold">{displayName}</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-[#59635D]">英字名</td>
                        <td className="py-2">{p.nameEN}</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-[#59635D]">ブランド</td>
                        <td className="py-2">{p.brand}</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-[#59635D]">商品分類</td>
                        <td className="py-2">{p.category} &gt; {p.subcategory}</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-[#59635D]">輸入・販売元</td>
                        <td className="py-2">株式会社ベティクロム（Beticrom Co., Ltd.）</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === "allergen" && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-[#202824]">
                    <AlertCircle size={15} className="text-amber-600" />
                    <span>アレルギー表示に関するご案内</span>
                  </div>
                  <p className="text-[#59635D]">
                    特定原材料（小麦、そば、卵、乳、落花生、えび、かに）および準ずる21品目に関する最新情報は、商品パッケージ裏面の日本語一括表示ラベルを必ずご確認ください。
                  </p>
                  <p className="text-[11px] text-[#59635D]">
                    ※当店ではナッツ類、豆類、小麦製品を同一流通ラインで取り扱っております。重度のアレルギーをお持ちの方はご注文前にお問い合わせください。
                  </p>
                </div>
              )}

              {activeTab === "storage" && (
                <div className="space-y-2">
                  <p className="font-bold text-[#202824]">保存方法・取り扱い</p>
                  {p.storage === "frozen" ? (
                    <p className="text-[#59635D]">
                      要冷凍（-15℃以下で保存してください）。商品到着後は速やかに冷凍庫にお入れください。
                    </p>
                  ) : p.storage === "cool" ? (
                    <p className="text-[#59635D]">
                      要冷蔵（10℃以下で保存してください）。開封後は賞味期限にかかわらずお早めにお召し上がりください。
                    </p>
                  ) : (
                    <p className="text-[#59635D]">
                      直射日光・高温多湿を避け、涼しい冷暗所で保存してください。開封後は虫害や吸湿を防ぐため密閉容器に保管してください。
                    </p>
                  )}
                </div>
              )}

              {activeTab === "halal" && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-1.5 font-bold text-[#12633D]">
                    <Shield size={16} />
                    <span>ハラール分類・透明性方針</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#F7F8F5] border border-[#E1E6E2]">
                    <p className="font-bold text-xs">
                      本商品の区分:{" "}
                      {p.halalTier === "certified"
                        ? "第三者ハラール認証取得品 (Certified Halal)"
                        : p.halalTier === "supplier"
                        ? "供給元ハラール証明書確認品 (Supplier-Declared)"
                        : p.halalTier === "nopork"
                        ? "原材料豚肉・アルコール不使用確認品 (No Pork / No Alcohol)"
                        : "一般食品"}
                    </p>
                    <p className="text-[#59635D] text-xs mt-1">
                      {p.halalTier === "certified"
                        ? "公認ハラール認証機関（JMA、HJBA、MUIS、JAKIMなど）による第三者監査・認証書が発行されている商品です。"
                        : p.halalTier === "supplier"
                        ? "正規製造元または公式輸入商社によるハラール保証文書に基づき取り扱っております。"
                        : p.halalTier === "nopork"
                        ? "製造原材料に豚由来成分およびエタノール・酒類が含まれていないことを成分表により厳密に確認しています。"
                        : "一般食品として取り扱っております。"}
                    </p>
                  </div>
                </div>
              )}

              {activeTab === "shipping" && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-[#202824]">
                    <Truck size={15} className="text-[#12633D]" />
                    <span>ヤマト運輸による配送について</span>
                  </div>
                  <p className="text-[#59635D]">
                    常温品は通常便、冷凍・冷蔵品はヤマト運輸クール宅急便にて温度帯を徹底して分離発送いたします。
                  </p>
                  <ul className="list-disc list-inside text-xs text-[#59635D] space-y-1">
                    <li>常温品：合計 ¥6,500（税込）以上のお買い上げで送料無料</li>
                    <li>冷凍・冷蔵品：温度管理手数料として各クール箱あたり +¥330（税込）</li>
                    <li>配達日時の指定、および午前中〜21時までの時間帯指定が可能</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="mt-14 pt-8 border-t border-[#E1E6E2]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-extrabold text-[#202824]">
              同じカテゴリーの関連商品
            </h2>
            <button
              onClick={() => {
                setSelectedCategory(p.category);
                setView("category");
              }}
              className="text-xs font-bold text-[#12633D] hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <span>カテゴリー一覧を見る</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <ProductCarousel
            products={relatedProducts}
            locale={locale}
            onAdd={item => onAdd(item)}
            onViewProduct={id => {
              if (onOpenProductPopup) {
                const rp = ALL_PRODUCTS.find(item => item.id === id);
                if (rp) {
                  onOpenProductPopup(rp);
                  return;
                }
              }
              onSelectProduct(id);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        </div>
      )}

      {/* Mobile Sticky Buy Bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#E1E6E2] p-3 z-40 flex items-center justify-between gap-3 shadow-lg">
        <div>
          <span className="text-xs text-[#59635D]">税込価格</span>
          <p className="text-lg font-extrabold text-[#202824] leading-none">
            ¥{p.price.toLocaleString()}
          </p>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs text-white shadow-md flex items-center justify-center gap-1.5 cursor-pointer ${
            added ? "bg-[#0b4f2a]" : "bg-[#12633D]"
          }`}
        >
          {added ? (
            <>
              <Check size={16} />
              <span>追加しました</span>
            </>
          ) : (
            <span>カートに入れる</span>
          )}
        </button>
      </div>
    </div>
  );
}
