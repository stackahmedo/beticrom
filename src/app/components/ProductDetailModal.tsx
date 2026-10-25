import { useState, useEffect } from "react";
import {
  X,
  Minus,
  Plus,
  Check,
  Shield,
  Snowflake,
  Thermometer,
  Package,
  Truck,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Info,
  UtensilsCrossed,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  type Product,
  type Locale,
  getUnitPrice,
} from "../../data/products";
import { HalalBadge, StorageBadge } from "./ProductCard";

interface ProductDetailModalProps {
  product: Product;
  locale: Locale;
  onClose: () => void;
  onAdd: (product: Product, quantity?: number) => void;
  onGoToPDP: (productId: string) => void;
}

type ModalTab = "about" | "usage" | "specs" | "halal" | "storage";

export function ProductDetailModal({
  product: p,
  locale,
  onClose,
  onAdd,
  onGoToPDP,
}: ProductDetailModalProps) {
  const [selectedImg, setSelectedImg] = useState<string>(p.img);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [activeTab, setActiveTab] = useState<ModalTab>("about");

  // Reset image & quantity when product changes
  useEffect(() => {
    setSelectedImg(p.img);
    setQuantity(1);
    setAdded(false);
    setActiveTab("about");
  }, [p]);

  // Lock body scroll and handle Escape key
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const displayName = locale === "JA" ? p.nameJA : locale === "BN" ? p.nameBN : p.nameEN;

  const discountPercent =
    p.comparePrice && p.comparePrice > p.price
      ? Math.round((1 - p.price / p.comparePrice) * 100)
      : 0;

  const unitPrice = getUnitPrice(p);

  const handleAdd = () => {
    onAdd(p, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  const tabs: { key: ModalTab; labelJa: string; labelEn: string; labelBn: string }[] = [
    { key: "about", labelJa: "商品説明", labelEn: "Description", labelBn: "বিবরণ" },
    { key: "usage", labelJa: "おすすめ調理・使い方", labelEn: "Cooking & Usage", labelBn: "ব্যবহার বিধি" },
    { key: "specs", labelJa: "仕様・規格", labelEn: "Specifications", labelBn: "স্পেসিফিকেশন" },
    { key: "halal", labelJa: "ハラール保証", labelEn: "Halal Assurance", labelBn: "হালাল নিশ্চয়তা" },
    { key: "storage", labelJa: "保存・配送", labelEn: "Storage & Shipping", labelBn: "সংরক্ষণ ও ডেলিভারি" },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-product-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-[#E1E6E2] overflow-hidden my-auto animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-[#E1E6E2] bg-[#F7F8F5] shrink-0">
          <div className="flex items-center gap-2 text-xs text-[#59635D] truncate">
            <span className="font-semibold text-[#12633D]">{p.category}</span>
            {p.subcategory && (
              <>
                <ChevronRight size={12} />
                <span className="truncate">{p.subcategory}</span>
              </>
            )}
            <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-white border border-[#E1E6E2] text-[10px] font-mono text-[#59635D]">
              #{p.id}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={locale === "JA" ? "閉じる" : "Close"}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#59635D] hover:text-[#202824] hover:bg-black/5 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Left: Product Media & Badges (5 cols) */}
            <div className="md:col-span-5 space-y-3">
              {/* Main Image */}
              <div className="aspect-square w-full rounded-xl border border-[#E1E6E2] bg-[#F7F8F5] p-4 flex items-center justify-center overflow-hidden relative shadow-xs">
                <img
                  src={selectedImg || p.img}
                  alt={displayName}
                  className="w-full h-full object-contain transition-transform duration-200 hover:scale-105"
                  onError={e => {
                    (e.target as HTMLImageElement).src =
                      "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=400&fit=crop";
                  }}
                />

                {/* Status Badges Overlay */}
                <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
                  {discountPercent > 0 && (
                    <span className="bg-[#C92A2A] text-white text-[10px] sm:text-xs font-extrabold px-2 py-0.5 rounded-md shadow-xs">
                      -{discountPercent}% OFF
                    </span>
                  )}
                  {p.isBestSeller && discountPercent === 0 && (
                    <span className="bg-amber-600 text-white text-[10px] sm:text-xs font-extrabold px-2 py-0.5 rounded-md shadow-xs">
                      人気商品
                    </span>
                  )}
                  {p.isNew && discountPercent === 0 && !p.isBestSeller && (
                    <span className="bg-[#12633D] text-white text-[10px] sm:text-xs font-extrabold px-2 py-0.5 rounded-md shadow-xs">
                      新商品
                    </span>
                  )}
                </div>
              </div>

              {/* Gallery Thumbnails (if available) */}
              {p.gallery && p.gallery.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {p.gallery.map((imgUrl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedImg(imgUrl)}
                      className={`w-14 h-14 rounded-lg border p-1 bg-[#F7F8F5] shrink-0 transition-all cursor-pointer ${
                        (selectedImg || p.img) === imgUrl
                          ? "border-[#12633D] ring-2 ring-[#12633D]/25"
                          : "border-[#E1E6E2] hover:border-[#12633D]/50"
                      }`}
                    >
                      <img src={imgUrl} alt="" className="w-full h-full object-contain" />
                    </button>
                  ))}
                </div>
              )}

              {/* Badges & Key Specifications Snapshot */}
              <div className="p-3 bg-[#F7F8F5] rounded-xl border border-[#E1E6E2] space-y-2 text-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                  <StorageBadge type={p.storage} locale={locale} />
                  <HalalBadge tier={p.halalTier} locale={locale} />
                </div>
                <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-[#E1E6E2] text-[11px]">
                  <div>
                    <span className="text-[#59635D]">原産国: </span>
                    <span className="font-semibold text-[#202824]">{p.country || "輸入食品"}</span>
                  </div>
                  <div>
                    <span className="text-[#59635D]">内容量: </span>
                    <span className="font-semibold text-[#202824]">{p.weight || "1パック"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Info, Price, Tabs & Purchase (7 cols) */}
            <div className="md:col-span-7 space-y-4">
              {/* Brand & Title */}
              <div>
                <span className="inline-block px-2 py-0.5 rounded bg-[#F7F8F5] text-[#12633D] font-bold text-xs border border-[#E1E6E2] mb-1.5">
                  {p.brand}
                </span>
                <h2
                  id="modal-product-title"
                  className="text-lg sm:text-xl font-extrabold text-[#202824] leading-snug"
                >
                  {displayName}
                </h2>
                {p.nameEN && p.nameEN !== displayName && (
                  <p className="text-xs sm:text-sm text-[#59635D] mt-0.5 font-medium">
                    {p.nameEN}
                  </p>
                )}
              </div>

              {/* Pricing Box */}
              <div className="bg-[#F7F8F5] p-3.5 rounded-xl border border-[#E1E6E2] flex items-baseline flex-wrap gap-2.5">
                <span className="text-2xl font-extrabold text-[#202824]">
                  ¥{p.price.toLocaleString()}
                </span>
                <span className="text-xs text-[#59635D] font-medium">
                  （税込・軽減税率8%適用）
                </span>
                {unitPrice && (
                  <span className="text-xs text-[#12633D] font-bold bg-[#DCFCE7] px-2 py-0.5 rounded border border-[#86efac]">
                    {unitPrice}
                  </span>
                )}
                {p.comparePrice && p.comparePrice > p.price && (
                  <div className="ml-auto text-right">
                    <span className="text-xs text-[#59635D] line-through block">
                      ¥{p.comparePrice.toLocaleString()}
                    </span>
                    <span className="text-xs font-bold text-[#C92A2A]">
                      ¥{(p.comparePrice - p.price).toLocaleString()} お得！
                    </span>
                  </div>
                )}
              </div>

              {/* Stock & Delivery Condition */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
                  <span className="font-bold text-[#202824]">在庫あり</span>
                  <span className="text-[#59635D]">（東京都葛飾区倉庫より即納可能）</span>
                </div>

                <div className="p-2.5 rounded-lg border border-blue-200 bg-blue-50/50 flex items-start gap-2 text-xs text-blue-900">
                  {p.storage === "frozen" ? (
                    <Snowflake size={15} className="text-blue-600 shrink-0 mt-0.5" />
                  ) : p.storage === "cool" ? (
                    <Thermometer size={15} className="text-teal-600 shrink-0 mt-0.5" />
                  ) : (
                    <Package size={15} className="text-[#12633D] shrink-0 mt-0.5" />
                  )}
                  <div className="leading-tight">
                    <span className="font-bold">
                      {p.storage === "frozen"
                        ? "ヤマトクール宅急便（冷凍 -15℃以下）"
                        : p.storage === "cool"
                        ? "ヤマトクール宅急便（冷蔵 0℃〜10℃）"
                        : "ヤマト宅急便（常温便 · ¥6,500以上送料無料）"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tabs for Detailed Grocery Info */}
              <div className="pt-1">
                <div className="flex border-b border-[#E1E6E2] overflow-x-auto scrollbar-hide text-xs font-bold gap-1">
                  {tabs.map(t => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setActiveTab(t.key)}
                      className={`px-3 py-1.5 transition-all whitespace-nowrap cursor-pointer border-b-2 ${
                        activeTab === t.key
                          ? "border-[#12633D] text-[#12633D] bg-[#F7F8F5]/60"
                          : "border-transparent text-[#59635D] hover:text-[#202824]"
                      }`}
                    >
                      {locale === "JA" ? t.labelJa : locale === "BN" ? t.labelBn : t.labelEn}
                    </button>
                  ))}
                </div>

                <div className="p-3 bg-white border border-t-0 border-[#E1E6E2] rounded-b-xl text-xs text-[#202824] leading-relaxed min-h-[90px]">
                  {activeTab === "about" && (
                    <div className="space-y-1.5">
                      <p className="text-[#59635D]">
                        {p.desc ||
                          `${p.brand}による本格品質の${displayName}。厳選された原材料を用い、日本の食品衛生基準に準拠して輸入・管理されています。日々のハラール食卓に安心してお使いいただけます。`}
                      </p>
                      <div className="text-[11px] text-[#59635D] pt-1 border-t border-[#E1E6E2]">
                        <span>分類: </span>
                        <span className="font-medium">{p.category} &gt; {p.subcategory}</span>
                      </div>
                    </div>
                  )}

                  {activeTab === "usage" && (
                    <div className="space-y-1.5">
                      <p className="font-bold text-[#202824]">調理・使い方のヒント</p>
                      {p.storage === "frozen" ? (
                        <p className="text-[#59635D]">
                          調理前に冷蔵庫内でゆっくり自然解凍していただくと、ドリップの流出を防ぎ旨味を保つことができます。急ぎの場合は密閉パックのまま流水解凍を行ってください。
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
                    <table className="w-full text-xs">
                      <tbody className="divide-y divide-[#E1E6E2]">
                        <tr>
                          <td className="py-1 text-[#59635D] w-24">商品名</td>
                          <td className="py-1 font-semibold">{displayName}</td>
                        </tr>
                        <tr>
                          <td className="py-1 text-[#59635D]">ブランド</td>
                          <td className="py-1">{p.brand}</td>
                        </tr>
                        <tr>
                          <td className="py-1 text-[#59635D]">原産国</td>
                          <td className="py-1">{p.country || "輸入食品"}</td>
                        </tr>
                        <tr>
                          <td className="py-1 text-[#59635D]">内容量</td>
                          <td className="py-1">{p.weight || "1パック"}</td>
                        </tr>
                      </tbody>
                    </table>
                  )}

                  {activeTab === "halal" && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-[#12633D]">
                        <Shield size={14} />
                        <span>
                          {p.halalTier === "certified"
                            ? "第三者ハラール認証取得品 (Certified Halal)"
                            : p.halalTier === "supplier"
                            ? "供給元ハラール証明書確認品 (Supplier-Declared)"
                            : p.halalTier === "nopork"
                            ? "豚・アルコール不使用確認品 (No Pork / No Alcohol)"
                            : "一般食品"}
                        </span>
                      </div>
                      <p className="text-[#59635D]">
                        {p.halalTier === "certified"
                          ? "公認ハラール認証機関による監査・認証書が発行されている商品です。"
                          : p.halalTier === "supplier"
                          ? "正規製造元または公式輸入商社によるハラール保証文書に基づき取り扱っております。"
                          : p.halalTier === "nopork"
                          ? "原材料に豚由来成分および酒類が含まれていないことを成分表により確認しています。"
                          : "一般食品として取り扱っております。"}
                      </p>
                    </div>
                  )}

                  {activeTab === "storage" && (
                    <div className="space-y-1.5">
                      <p className="font-bold text-[#202824]">保存方法の目安</p>
                      <p className="text-[#59635D]">
                        {p.storage === "frozen"
                          ? "要冷凍（-15℃以下）。商品到着後は速やかに冷凍庫にお入れください。"
                          : p.storage === "cool"
                          ? "要冷蔵（10℃以下）。開封後は賞味期限にかかわらずお早めにお召し上がりください。"
                          : "直射日光・高温多湿を避け、涼しい冷暗所で保存してください。開封後は密閉容器に保管してください。"}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Purchase Controls */}
              <div className="flex items-center gap-3 pt-2">
                {/* Quantity Stepper */}
                <div className="flex items-center border border-[#E1E6E2] rounded-xl overflow-hidden bg-white shadow-xs">
                  <button
                    type="button"
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="w-9 h-10 flex items-center justify-center hover:bg-[#F7F8F5] text-[#59635D] cursor-pointer transition-transform active:scale-90"
                    aria-label="数量を減らす"
                  >
                    <Minus size={13} />
                  </button>
                  <span className="w-10 text-center font-bold text-xs sm:text-sm text-[#202824]">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(q => q + 1)}
                    className="w-9 h-10 flex items-center justify-center hover:bg-[#F7F8F5] text-[#59635D] cursor-pointer transition-transform active:scale-90"
                    aria-label="数量を増やす"
                  >
                    <Plus size={13} />
                  </button>
                </div>

                {/* Add to Cart Button */}
                <button
                  type="button"
                  onClick={handleAdd}
                  className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-white shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] ${
                    added ? "bg-[#0b4f2a]" : "bg-[#12633D] hover:bg-[#0b4f2a]"
                  }`}
                >
                  {added ? (
                    <div className="flex items-center gap-1.5 animate-content-ltr">
                      <Check size={16} className="animate-soft-pulse" />
                      <span>{locale === "JA" ? "カートに追加しました" : locale === "BN" ? "যোগ হয়েছে" : "Added to Cart!"}</span>
                    </div>
                  ) : (
                    <span>
                      {locale === "JA"
                        ? `カートに入れる — ¥${(p.price * quantity).toLocaleString()}（税込）`
                        : locale === "BN"
                        ? `কার্টে যোগ করুন — ¥${(p.price * quantity).toLocaleString()}`
                        : `Add to Cart — ¥${(p.price * quantity).toLocaleString()}`}
                    </span>
                  )}
                </button>
              </div>

              {/* View Full Product Page Link */}
              <div className="pt-2 text-center border-t border-[#E1E6E2]/70">
                <button
                  type="button"
                  onClick={() => onGoToPDP(p.id)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#12633D] hover:text-[#0b4f2a] hover:underline cursor-pointer transition-colors"
                >
                  <span>{locale === "JA" ? "商品詳細ページを別画面で開く" : locale === "BN" ? "সম্পূর্ণ বিস্তারিত পাতা দেখুন" : "View Full Product Page"}</span>
                  <ExternalLink size={12} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
