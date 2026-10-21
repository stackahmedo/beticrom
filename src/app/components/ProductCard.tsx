import { useState } from "react";
import { Snowflake, Package, Thermometer, Shield, Heart, Check } from "lucide-react";
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
}: ProductCardProps) {
  const [added, setAdded] = useState(false);
  const [wished, setWished] = useState(false);

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

  return (
    <div
      onClick={onView}
      className="bg-white rounded-xl border border-[#E1E6E2] overflow-hidden flex flex-col cursor-pointer transition-all duration-200 hover:shadow-md hover:border-[#12633D]/60 hover:-translate-y-0.5 group"
    >
      {/* Product Image Box */}
      <div className="relative aspect-square w-full bg-[#F7F8F5] p-3 flex items-center justify-center overflow-hidden">
        <img
          src={p.img}
          alt={p.nameEN}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
          onError={e => {
            (e.target as HTMLImageElement).src =
              "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=400&fit=crop";
          }}
        />

        {/* Status Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
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
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 border border-[#E1E6E2] flex items-center justify-center shadow-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white z-10 cursor-pointer"
          aria-label="Wishlist"
        >
          <Heart size={13} className={wished ? "fill-[#C92A2A] text-[#C92A2A]" : "text-[#59635D]"} />
        </button>
      </div>

      {/* Content Container */}
      <div className="p-3 flex flex-col flex-1 gap-1.5">
        {/* Brand & Weight/Size */}
        <div className="flex items-center justify-between text-[11px] text-[#59635D]">
          <span className="font-semibold truncate max-w-[120px]">{p.brand}</span>
          {p.weight && (
            <span className="shrink-0 font-medium px-1.5 py-0.2 bg-[#F7F8F5] rounded text-[10px]">
              {p.weight}
            </span>
          )}
        </div>

        {/* Primary Name (Japanese) */}
        <h3 className="text-xs sm:text-sm font-bold text-[#202824] leading-snug line-clamp-2 min-h-[2.5rem]">
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
          <span className="text-sm sm:text-base font-extrabold text-[#202824] whitespace-nowrap">
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

        {/* Add to Cart Button */}
        <button
          type="button"
          onClick={handleAdd}
          className={`w-full py-2 rounded-lg text-xs font-bold text-white transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer mt-1 ${
            added
              ? "bg-[#0b4f2a]"
              : "bg-[#12633D] hover:bg-[#0b4f2a] active:scale-[0.98]"
          }`}
        >
          {added ? (
            <>
              <Check size={14} />
              <span>{locale === "JA" ? "追加しました" : locale === "BN" ? "যোগ হয়েছে" : "Added!"}</span>
            </>
          ) : (
            <span>{locale === "JA" ? "カートに入れる" : locale === "BN" ? "কার্টে যোগ করুন" : "Add to Cart"}</span>
          )}
        </button>
      </div>
    </div>
  );
}
