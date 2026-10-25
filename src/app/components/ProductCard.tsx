import { useState } from "react";
import { Snowflake, Package, Thermometer, Shield, Heart, Check, Eye } from "lucide-react";
import {
  type Product,
  type Locale,
  type HalalTier,
  type StorageType,
  getUnitPrice,
} from "../../data/products";

interface ProductCardProps {
  product: Product;
  locale: Locale;
  onAdd: (product: Product) => void;
  onView: () => void;
  showUnitPrice?: boolean;
  index?: number;
}

const HALAL_CONFIG: Record<
  HalalTier,
  { label: Record<Locale, string>; bg: string; text: string; border: string } | null
> = {
  certified: {
    label: { JA: "ハラール認証", EN: "Certified Halal", BN: "সার্টিফাইড হালাল" },
    bg: "#DCFCE7",
    text: "#166534",
    border: "#86efac",
  },
  supplier: {
    label: { JA: "供給元申告", EN: "Supplier-Declared", BN: "সরবরাহকারী নিশ্চিত" },
    bg: "#E0F2FE",
    text: "#075985",
    border: "#7dd3fc",
  },
  nopork: {
    label: { JA: "豚・酒不使用", EN: "No Pork/Alcohol", BN: "শূকর ও অ্যালকোহল মুক্ত" },
    bg: "#FEF3C7",
    text: "#92400e",
    border: "#fde68a",
  },
  not_halal: null,
};

const STORAGE_CONFIG: Record<
  StorageType,
  { icon: React.ReactNode; labelJa: string; labelEn: string; bg: string; text: string }
> = {
  dry: {
    icon: <Package size={11} />,
    labelJa: "常温",
    labelEn: "Dry",
    bg: "#F5F5F4",
    text: "#57534E",
  },
  cool: {
    icon: <Thermometer size={11} />,
    labelJa: "冷蔵",
    labelEn: "Cool",
    bg: "#CCFBF1",
    text: "#0F766E",
  },
  frozen: {
    icon: <Snowflake size={11} />,
    labelJa: "冷凍",
    labelEn: "Frozen",
    bg: "#E0F2FE",
    text: "#0284C7",
  },
};

export function HalalBadge({ tier, locale }: { tier: HalalTier; locale: Locale }) {
  const cfg = HALAL_CONFIG[tier];
  if (!cfg) return null;
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold border leading-none"
      style={{ background: cfg.bg, color: cfg.text, borderColor: cfg.border }}
    >
      <Shield size={9} strokeWidth={2.5} />
      <span>{cfg.label[locale] || cfg.label.EN}</span>
    </span>
  );
}

export function StorageBadge({ type, locale = "JA" }: { type: StorageType; locale?: Locale }) {
  const cfg = STORAGE_CONFIG[type] || STORAGE_CONFIG.dry;
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold leading-none"
      style={{ background: cfg.bg, color: cfg.text }}
    >
      {cfg.icon}
      <span>{locale === "JA" ? cfg.labelJa : cfg.labelEn}</span>
    </span>
  );
}

export function ProductCard({
  product: p,
  locale,
  onAdd,
  onView,
  showUnitPrice = true,
  index,
}: ProductCardProps) {
  const [added, setAdded] = useState(false);
  const [wished, setWished] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const discountPercent =
    p.comparePrice && p.comparePrice > p.price
      ? Math.round((1 - p.price / p.comparePrice) * 100)
      : 0;

  const unitPrice = showUnitPrice ? getUnitPrice(p) : null;

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAdd(p);
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  };

  const displayName = locale === "JA" ? p.nameJA : locale === "BN" ? p.nameBN : p.nameEN;

  // Stagger left-to-right entrance based on column index (capped at 5 to avoid long delays)
  const staggerDelay = index !== undefined ? `${Math.min(index % 6, 5) * 35}ms` : undefined;

  return (
    <div
      onClick={onView}
      style={staggerDelay ? { animationDelay: staggerDelay } : undefined}
      className="bg-white rounded-xl border border-[#E1E6E2] overflow-hidden flex flex-col cursor-pointer transition-all duration-200 hover:shadow-md hover:border-[#12633D]/60 hover:-translate-y-1 group relative animate-slide-rtl will-change-transform h-full"
    >
      {/* Product Image Box with Left-to-Right Sheen on Hover */}
      <div className="relative aspect-square w-full bg-[#F7F8F5] p-3 flex items-center justify-center overflow-hidden">
        {/* Placeholder shimmer before image loads */}
        {!imageLoaded && (
          <div className="absolute inset-0 bg-[#F7F8F5] flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-[#12633D]/20 border-t-[#12633D] animate-spin" />
          </div>
        )}

        <img
          src={p.img}
          alt={p.nameEN}
          loading="lazy"
          decoding="async"
          onLoad={() => setImageLoaded(true)}
          className={`w-full h-full object-contain transition-all duration-300 group-hover:scale-105 ${
            imageLoaded ? "opacity-100" : "opacity-0"
          }`}
          onError={e => {
            (e.target as HTMLImageElement).src =
              "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=400&fit=crop";
            setImageLoaded(true);
          }}
        />

        {/* Minimalistic Left-to-Right Light Sweep on Hover */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="w-full h-full bg-gradient-to-r from-transparent via-white/35 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />
        </div>

        {/* Status Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 z-10 transition-transform duration-200 group-hover:translate-x-0.5">
          {discountPercent > 0 && (
            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md text-white bg-[#C92A2A] shadow-xs leading-none">
              -{discountPercent}%
            </span>
          )}
          {p.isBestSeller && discountPercent === 0 && (
            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md text-white bg-amber-600 shadow-xs leading-none">
              人気商品
            </span>
          )}
          {p.isNew && discountPercent === 0 && !p.isBestSeller && (
            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md text-white bg-[#12633D] shadow-xs leading-none">
              新商品
            </span>
          )}
          {p.isRestocked && discountPercent === 0 && !p.isBestSeller && !p.isNew && (
            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md text-white bg-blue-600 shadow-xs leading-none">
              再入荷
            </span>
          )}
        </div>

        {/* Wishlist toggle */}
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            setWished(!wished);
          }}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 border border-[#E1E6E2] flex items-center justify-center shadow-xs opacity-0 group-hover:opacity-100 transition-all duration-150 hover:bg-white hover:scale-110 active:scale-95 z-10 cursor-pointer"
          aria-label="Wishlist"
        >
          <Heart size={13} className={wished ? "fill-[#C92A2A] text-[#C92A2A]" : "text-[#59635D]"} />
        </button>

        {/* Quick View Details Pop-Up Pill on Hover */}
        <div className="absolute inset-x-0 bottom-2.5 flex justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-1.5 group-hover:translate-y-0 z-10">
          <span className="px-2.5 py-1 rounded-full bg-white/95 text-[#202824] text-[11px] font-bold shadow-md flex items-center gap-1.5 border border-[#E1E6E2] backdrop-blur-xs">
            <Eye size={12} className="text-[#12633D]" />
            <span>{locale === "JA" ? "詳細を見る" : locale === "BN" ? "বিস্তারিত দেখুন" : "Quick View"}</span>
          </span>
        </div>
      </div>

      {/* Content Container with Left-to-Right Entrance */}
      <div className="p-3 flex flex-col flex-1 gap-1.5 transition-colors duration-200">
        {/* Brand & Weight/Size */}
        <div className="flex items-center justify-between text-[11px] text-[#59635D]">
          <span className="font-semibold truncate max-w-[120px] transition-colors group-hover:text-[#12633D]">
            {p.brand}
          </span>
          {p.weight && (
            <span className="shrink-0 font-medium px-1.5 py-0.2 bg-[#F7F8F5] rounded text-[10px]">
              {p.weight}
            </span>
          )}
        </div>

        {/* Primary Name (Japanese) */}
        <h3 className="text-xs sm:text-sm font-bold text-[#202824] leading-snug line-clamp-2 min-h-[2.5rem] group-hover:text-[#12633D] transition-colors duration-150">
          {displayName}
        </h3>

        {/* Original English Name (if viewing JA or BN) */}
        {locale !== "EN" && p.nameEN && p.nameEN !== displayName && (
          <p className="text-[11px] text-[#59635D] truncate leading-none">
            {p.nameEN}
          </p>
        )}

        {/* Badges: Halal & Temperature */}
        <div className="flex flex-wrap items-center gap-1 mt-0.5">
          <StorageBadge type={p.storage} locale={locale} />
          <HalalBadge tier={p.halalTier} locale={locale} />
        </div>

        {/* Price Row: Tax-inclusive and Unit Price */}
        <div className="flex flex-wrap items-baseline gap-1 mt-auto pt-2 border-t border-[#E1E6E2]/60">
          <span className="text-sm sm:text-base font-extrabold text-[#202824] whitespace-nowrap transition-transform duration-150 group-hover:translate-x-0.5">
            ¥{p.price.toLocaleString()}
          </span>
          <span className="text-[10px] text-[#59635D] whitespace-nowrap">（税込）</span>
          {unitPrice && (
            <span className="text-[10px] text-[#12633D] font-bold bg-[#DCFCE7] px-1.5 py-0.5 rounded border border-[#86efac]/80 whitespace-nowrap">
              {unitPrice}
            </span>
          )}
          {p.comparePrice && p.comparePrice > p.price && (
            <span className="text-[10px] text-[#59635D] line-through ml-auto whitespace-nowrap">
              ¥{p.comparePrice.toLocaleString()}
            </span>
          )}
        </div>

        {/* Add to Cart Button with Tactile Feedback */}
        <button
          type="button"
          onClick={handleAdd}
          className={`w-full py-2 rounded-lg text-xs font-bold text-white shadow-xs flex items-center justify-center gap-1.5 cursor-pointer mt-1 transition-all duration-150 active:scale-[0.96] ${
            added
              ? "bg-[#0b4f2a] ring-2 ring-[#0b4f2a]/30"
              : "bg-[#12633D] hover:bg-[#0b4f2a] hover:shadow-xs"
          }`}
        >
          {added ? (
            <div className="flex items-center gap-1 animate-content-ltr">
              <Check size={14} className="animate-soft-pulse" />
              <span>{locale === "JA" ? "追加しました" : locale === "BN" ? "যোগ হয়েছে" : "Added!"}</span>
            </div>
          ) : (
            <span>{locale === "JA" ? "カートに入れる" : locale === "BN" ? "কার্টে যোগ করুন" : "Add to Cart"}</span>
          )}
        </button>
      </div>

      {/* Sleek Left-to-Right Accent Line Expanding on Hover */}
      <div className="h-[2px] w-full bg-gradient-to-r from-[#12633D] via-[#10B981] to-[#12633D] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out origin-left" />
    </div>
  );
}
