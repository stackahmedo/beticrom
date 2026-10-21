import {
  ShoppingCart, X, Minus, Plus, Snowflake, Thermometer,
  Package, Shield, ArrowRight, HelpCircle, AlertCircle, CheckCircle2,
} from "lucide-react";
import type { CartItem, View, LegalTopic } from "../types";
import { calculateShipping, formatYen, DRY_FREE_THRESHOLD } from "../types";
import type { Locale, StorageType } from "../../data/products";
import { HalalBadge, StorageBadge } from "./ProductCard";

interface CartPageProps {
  locale: Locale;
  cartItems: CartItem[];
  onUpdateQty: (productId: string, qty: number) => void;
  onRemove: (productId: string) => void;
  setView: (v: View) => void;
  onOpenLegal: (topic: LegalTopic) => void;
}

export function CartPage({
  locale,
  cartItems,
  onUpdateQty,
  onRemove,
  setView,
  onOpenLegal,
}: CartPageProps) {
  const shipping = calculateShipping(cartItems, false);
  const totalItemCount = cartItems.reduce((acc, i) => acc + i.quantity, 0);

  const subtotal = shipping.drySubtotal + shipping.coolSubtotal + shipping.frozenSubtotal;
  const estimatedTotal = subtotal + shipping.totalShipping;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-28 sm:pb-16">
      {/* Page Title */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#202824]">
            {locale === "JA" ? "ショッピングカート" : locale === "BN" ? "শপিং কার্ট" : "Shopping Cart"}
          </h1>
          <p className="text-xs text-[#59635D] mt-0.5">
            {totalItemCount}点の商品が入っています
          </p>
        </div>
        {cartItems.length > 0 && (
          <button
            onClick={() => setView("category")}
            className="text-xs font-bold text-[#12633D] hover:underline cursor-pointer"
          >
            お買い物を続ける →
          </button>
        )}
      </div>

      {cartItems.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white rounded-2xl border border-[#E1E6E2] shadow-xs">
          <div className="w-16 h-16 rounded-full bg-[#F7F8F5] flex items-center justify-center mx-auto mb-4 text-[#59635D]">
            <ShoppingCart size={32} />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-[#202824] mb-2">
            お客様のカートには商品が入っていません
          </h2>
          <p className="text-xs text-[#59635D] max-w-sm mx-auto mb-6 leading-relaxed">
            ハラール精肉、冷凍惣菜、香り豊かなバスマティ米や本格スパイスをお探しいただけます。
          </p>
          <button
            onClick={() => setView("category")}
            className="px-6 py-3 rounded-xl bg-[#12633D] text-white font-bold text-xs sm:text-sm shadow-md hover:bg-[#0b4f2a] transition-all cursor-pointer"
          >
            商品一覧を見る
          </button>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Left Column: Items segregated by temperature */}
          <div className="flex-1 w-full space-y-4">
            {/* Free Shipping Progress for Dry Items */}
            {shipping.dryItems.length > 0 && (
              <div className="p-4 rounded-xl border border-[#E1E6E2] bg-white shadow-xs">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-bold text-[#202824] flex items-center gap-1.5">
                    <Package size={14} className="text-[#12633D]" />
                    <span>常温便 送料無料対象商品</span>
                  </span>
                  <span className="font-extrabold text-[#12633D]">
                    {shipping.isDryFreeEligible ? (
                      <span className="flex items-center gap-1 text-emerald-700">
                        <CheckCircle2 size={13} />
                        常温便 送料無料適用中！
                      </span>
                    ) : (
                      `あと ${formatYen(shipping.dryFreeRemaining)} で送料無料`
                    )}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#F7F8F5] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${shipping.dryFreeProgress}%`,
                      background: shipping.isDryFreeEligible ? "#166534" : "#12633D",
                    }}
                  />
                </div>
                <p className="text-[11px] text-[#59635D] mt-1.5 leading-snug">
                  ※常温商品合計が¥6,500（税込）以上の場合、常温基本配送料が無料となります。冷凍・冷蔵便は別箱梱包のため対象外となります。
                </p>
              </div>
            )}

            {/* Temperature Segregation Notice */}
            {(shipping.coolItems.length > 0 || shipping.frozenItems.length > 0) && (
              <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/60 text-xs text-blue-900 flex items-start gap-2.5">
                <Snowflake size={16} className="text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">
                    温度帯別の専用梱包について（ヤマトクール便規定）
                  </p>
                  <p className="text-[11px] text-blue-800/80 mt-0.5 leading-relaxed">
                    品質保持のため、常温品・冷蔵品・冷凍品は別々の箱に梱包されて発送されます。各温度帯ごとに所定の配送料・クール手数料が加算されます。
                  </p>
                </div>
              </div>
            )}

            {/* Dry Items Parcel */}
            {shipping.dryItems.length > 0 && (
              <div className="bg-white border border-[#E1E6E2] rounded-xl overflow-hidden shadow-xs">
                <div className="p-3 px-4 bg-[#F7F8F5] border-b border-[#E1E6E2] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StorageBadge type="dry" locale={locale} />
                    <span className="font-bold text-xs text-[#202824]">
                      常温便ボックス（{shipping.dryItems.length}品目）
                    </span>
                  </div>
                  <span className="text-xs font-bold text-[#12633D]">
                    {shipping.isDryFreeEligible ? "配送料無料" : "基本送料 ¥880"}
                  </span>
                </div>
                <div className="divide-y divide-[#E1E6E2]">
                  {shipping.dryItems.map(item => (
                    <CartItemRow
                      key={item.product.id}
                      item={item}
                      locale={locale}
                      onUpdateQty={onUpdateQty}
                      onRemove={onRemove}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Cool Items Parcel */}
            {shipping.coolItems.length > 0 && (
              <div className="bg-white border border-[#E1E6E2] rounded-xl overflow-hidden shadow-xs">
                <div className="p-3 px-4 bg-teal-50/50 border-b border-[#E1E6E2] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StorageBadge type="cool" locale={locale} />
                    <span className="font-bold text-xs text-teal-900">
                      冷蔵便ボックス（0℃〜10℃ / {shipping.coolItems.length}品目）
                    </span>
                  </div>
                  <span className="text-xs font-bold text-teal-800">
                    クール便手数料 +¥330
                  </span>
                </div>
                <div className="divide-y divide-[#E1E6E2]">
                  {shipping.coolItems.map(item => (
                    <CartItemRow
                      key={item.product.id}
                      item={item}
                      locale={locale}
                      onUpdateQty={onUpdateQty}
                      onRemove={onRemove}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Frozen Items Parcel */}
            {shipping.frozenItems.length > 0 && (
              <div className="bg-white border border-[#E1E6E2] rounded-xl overflow-hidden shadow-xs">
                <div className="p-3 px-4 bg-blue-50/50 border-b border-[#E1E6E2] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StorageBadge type="frozen" locale={locale} />
                    <span className="font-bold text-xs text-blue-900">
                      冷凍便ボックス（-15℃以下 / {shipping.frozenItems.length}品目）
                    </span>
                  </div>
                  <span className="text-xs font-bold text-blue-800">
                    {shipping.dryItems.length === 0 && shipping.coolItems.length === 0
                      ? "基本送料 ¥880 + クール便 ¥330"
                      : "冷凍便手数料 +¥330"}
                  </span>
                </div>
                <div className="divide-y divide-[#E1E6E2]">
                  {shipping.frozenItems.map(item => (
                    <CartItemRow
                      key={item.product.id}
                      item={item}
                      locale={locale}
                      onUpdateQty={onUpdateQty}
                      onRemove={onRemove}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Order Summary Card */}
          <div className="w-full lg:w-80 shrink-0">
            <div className="bg-white border border-[#E1E6E2] rounded-2xl p-5 sticky top-24 shadow-xs space-y-4">
              <h2 className="font-extrabold text-base text-[#202824] border-b border-[#E1E6E2] pb-3">
                注文小計・送料目安
              </h2>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-[#59635D]">
                  <span>商品合計（{totalItemCount}点）</span>
                  <span className="font-bold text-[#202824]">{formatYen(subtotal)}</span>
                </div>

                {/* Dry shipping line */}
                {shipping.dryItems.length > 0 && (
                  <div className="flex justify-between text-[#59635D]">
                    <span>常温便送料</span>
                    <span className={shipping.isDryFreeEligible ? "text-[#12633D] font-bold" : ""}>
                      {shipping.isDryFreeEligible ? "無料" : formatYen(shipping.dryBaseFee)}
                    </span>
                  </div>
                )}

                {/* Cool shipping line */}
                {shipping.coolItems.length > 0 && (
                  <div className="flex justify-between text-[#59635D]">
                    <span>冷蔵クール便手数料</span>
                    <span>+{formatYen(shipping.coolSurcharge)}</span>
                  </div>
                )}

                {/* Frozen shipping line */}
                {shipping.frozenItems.length > 0 && (
                  <div className="flex justify-between text-[#59635D]">
                    <span>
                      {shipping.dryItems.length === 0 && shipping.coolItems.length === 0
                        ? "冷凍便送料（基本+クール）"
                        : "冷凍クール便手数料"}
                    </span>
                    <span>
                      {shipping.dryItems.length === 0 && shipping.coolItems.length === 0
                        ? formatYen(shipping.frozenBaseFee + shipping.frozenSurcharge)
                        : `+${formatYen(shipping.frozenSurcharge)}`}
                    </span>
                  </div>
                )}

                {/* Delivery destination clarification */}
                <div className="pt-2 text-[11px] text-[#59635D] bg-[#F7F8F5] p-2.5 rounded-lg border border-[#E1E6E2]/60">
                  <span className="font-semibold block text-[#202824]">
                    配送料金の確定について
                  </span>
                  正式な配送料金は次の画面（お届け先住所の入力後）に確定いたします。
                </div>
              </div>

              {/* Total Row */}
              <div className="pt-3 border-t border-[#E1E6E2] flex items-baseline justify-between">
                <div>
                  <span className="text-sm font-extrabold text-[#202824] block">お支払い目安合計</span>
                  <span className="text-[10px] text-[#59635D]">（消費税込・送料目安含む）</span>
                </div>
                <span className="text-xl font-extrabold text-[#12633D]">
                  {formatYen(estimatedTotal)}
                </span>
              </div>

              {/* Checkout Button */}
              <button
                onClick={() => setView("checkout")}
                className="w-full py-3.5 rounded-xl bg-[#12633D] text-white font-extrabold text-sm shadow-md hover:bg-[#0b4f2a] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>レジへ進む（お届け先入力）</span>
                <ArrowRight size={16} />
              </button>

              <div className="text-[11px] text-[#59635D] space-y-1 text-center pt-2">
                <p className="flex items-center justify-center gap-1 font-semibold text-[#12633D]">
                  <Shield size={12} />
                  <span>ヤマト運輸正規温度管理便でお届け</span>
                </p>
                <button
                  onClick={() => onOpenLegal("shipping")}
                  className="hover:underline text-[10px] cursor-pointer"
                >
                  配送料金・お届け日時の詳細を見る
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CartItemRow({
  item,
  locale,
  onUpdateQty,
  onRemove,
}: {
  item: CartItem;
  locale: Locale;
  onUpdateQty: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
}) {
  const p = item.product;
  const name = locale === "JA" ? p.nameJA : locale === "BN" ? p.nameBN : p.nameEN;

  return (
    <div className="p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
      {/* Product Image */}
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-[#F7F8F5] border border-[#E1E6E2] p-1.5 shrink-0 flex items-center justify-center">
        <img
          src={p.img}
          alt={name}
          className="w-full h-full object-contain"
          onError={e => {
            (e.target as HTMLImageElement).src =
              "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=400&fit=crop";
          }}
        />
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5 text-[10px] text-[#59635D]">
          <span className="font-semibold">{p.brand}</span>
          <span>·</span>
          <span>{p.weight || "1点"}</span>
        </div>
        <h3 className="text-xs sm:text-sm font-bold text-[#202824] truncate">
          {name}
        </h3>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs sm:text-sm font-extrabold text-[#202824]">
            {formatYen(p.price)}
          </span>
          <span className="text-[10px] text-[#59635D]">（税込）</span>
          <HalalBadge tier={p.halalTier} locale={locale} />
        </div>
      </div>

      {/* Quantity & Total */}
      <div className="flex items-center gap-3 sm:gap-6 shrink-0">
        <div className="flex items-center border border-[#E1E6E2] rounded-lg overflow-hidden bg-white">
          <button
            type="button"
            onClick={() => onUpdateQty(p.id, item.quantity - 1)}
            className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center hover:bg-[#F7F8F5] text-[#59635D] cursor-pointer"
          >
            <Minus size={12} />
          </button>
          <span className="w-7 sm:w-8 text-center text-xs font-bold text-[#202824]">
            {item.quantity}
          </span>
          <button
            type="button"
            onClick={() => onUpdateQty(p.id, item.quantity + 1)}
            className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center hover:bg-[#F7F8F5] text-[#59635D] cursor-pointer"
          >
            <Plus size={12} />
          </button>
        </div>

        <span className="text-xs sm:text-sm font-extrabold text-[#202824] w-20 text-right">
          {formatYen(p.price * item.quantity)}
        </span>

        <button
          type="button"
          onClick={() => onRemove(p.id)}
          className="text-[#59635D] hover:text-[#C92A2A] cursor-pointer p-1"
          aria-label="Remove item"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
