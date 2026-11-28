import { useState } from "react";
import { MapPin, Truck, Snowflake, Package } from "lucide-react";
import type { Locale } from "../../data/products";

export function ShippingEstimator({
  locale,
  compact = false,
}: {
  locale: Locale;
  compact?: boolean;
}) {
  const [postal, setPostal] = useState("");
  const [checkedCode, setCheckedCode] = useState<string | null>(null);

  const handleCheck = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = postal.replace(/[^0-9]/g, "");
    if (cleaned.length >= 3) {
      setCheckedCode(cleaned);
    }
  };

  const prefix = checkedCode ? Number(checkedCode.slice(0, 2)) : null;
  const isHokkaidoOrOkinawa = prefix !== null && (prefix === 0 || prefix === 90 || (prefix >= 1 && prefix <= 9));
  const areaLabel = !checkedCode
    ? null
    : isHokkaidoOrOkinawa
      ? locale === "JA"
        ? "北海道・沖縄・離島エリア（お届け目安: 2〜4日）"
        : "Hokkaido / Okinawa / Remote (Est. 2–4 days)"
      : locale === "JA"
        ? "本州・四国・九州エリア（お届け目安: 1〜2日）"
        : "Mainland Japan (Est. 1–2 days)";

  return (
    <div
      className={`bg-[#F7F8F5] border border-[#E1E6E2] rounded-xl ${
        compact ? "p-3" : "p-4 sm:p-5"
      } text-xs`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-[#202824]">
            <MapPin size={14} className="text-[#12633D] shrink-0" />
            <span>
              {locale === "JA"
                ? "郵便番号で配送料金・お届け目安を確認"
                : locale === "BN"
                  ? "পোস্টকোড দিয়ে ডেলিভারি ফি দেখুন"
                  : "Estimate Delivery Cost by Postcode"}
            </span>
          </div>
          <p className="text-[11px] text-[#59635D]">
            {locale === "JA"
              ? "常温品 ¥6,500以上で基本送料（¥880）無料 · 冷凍・冷蔵品は品質保持のため別梱包（クール手数料 +¥330）"
              : "Free base shipping (¥880) on Dry items ≥ ¥6,500 · Cool/Frozen items ship in separate cold-chain boxes (+¥330 surcharge)"}
          </p>
        </div>

        <form onSubmit={handleCheck} className="flex items-center gap-1.5 shrink-0">
          <input
            type="text"
            inputMode="numeric"
            value={postal}
            onChange={e => setPostal(e.target.value)}
            placeholder="例: 124-0025"
            className="h-9 px-3 rounded-lg border border-[#E1E6E2] bg-white text-xs w-32 outline-none focus:border-[#12633D]"
          />
          <button
            type="submit"
            className="h-9 px-3.5 rounded-lg bg-[#12633D] text-white font-bold text-xs hover:bg-[#0b4f2a] cursor-pointer whitespace-nowrap"
          >
            {locale === "JA" ? "確認" : "Check"}
          </button>
        </form>
      </div>

      {areaLabel && (
        <div className="mt-3 pt-2.5 border-t border-[#E1E6E2] grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
          <div className="flex items-center gap-1.5 font-semibold text-[#12633D]">
            <Truck size={13} />
            <span>〒{checkedCode}: {areaLabel}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[#202824]">
            <Package size={13} className="text-[#59635D]" />
            <span>常温便: ¥880（常温¥6,500〜無料）</span>
          </div>
          <div className="flex items-center gap-1.5 text-[#075985] font-medium">
            <Snowflake size={13} />
            <span>冷凍/冷蔵のみ: ¥1,210（常温同梱時は+¥330）</span>
          </div>
        </div>
      )}
    </div>
  );
}
