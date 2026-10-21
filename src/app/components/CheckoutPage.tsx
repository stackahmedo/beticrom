import { useState, useMemo } from "react";
import {
  CheckCircle2, ArrowRight, ArrowLeft, Shield, AlertCircle,
  Truck, CreditCard, Tag, Lock, Check,
} from "lucide-react";
import type { CartItem, View, ShippingAddress, DeliveryOptions, PaymentMethodId } from "../types";
import {
  calculateShipping,
  calculateJapanTax,
  formatYen,
  JAPAN_PREFECTURES,
  TIME_SLOTS,
  PAYMENT_METHODS,
} from "../types";
import type { Locale } from "../../data/products";

interface CheckoutPageProps {
  locale: Locale;
  cartItems: CartItem[];
  onClearCart: () => void;
  setView: (v: View) => void;
}

export function CheckoutPage({
  locale,
  cartItems,
  onClearCart,
  setView,
}: CheckoutPageProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Address state
  const [address, setAddress] = useState<ShippingAddress>({
    fullName: "",
    kana: "",
    email: "",
    phone: "",
    postalCode: "",
    prefecture: "東京都",
    city: "",
    addressLine1: "",
    addressLine2: "",
  });

  const [addressErrors, setAddressErrors] = useState<Record<string, string>>({});

  // Step 2: Delivery options
  const [delivery, setDelivery] = useState<DeliveryOptions>({
    timeSlot: "none",
    notes: "",
    deliveryDate: "fastest",
  });

  // Step 3: Payment & Coupon
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId>("card");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponError, setCouponError] = useState("");

  // Step 4: Submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderComplete, setOrderComplete] = useState<string | null>(null);

  // Calculations
  const hasValidAddress = Boolean(address.fullName && address.postalCode && address.city && address.addressLine1);
  const shipping = calculateShipping(cartItems, hasValidAddress);
  const selectedPayment = PAYMENT_METHODS.find(m => m.id === paymentMethod) || PAYMENT_METHODS[0];

  const subtotal = shipping.drySubtotal + shipping.coolSubtotal + shipping.frozenSubtotal;
  const discountAmount = appliedCoupon ? appliedCoupon.discount : 0;
  const shippingCharge = shipping.totalShipping;
  const paymentFee = selectedPayment.fee;
  const grandTotal = Math.max(0, subtotal - discountAmount + shippingCharge + paymentFee);

  // Tax calculations (Food 8% vs Services 10%)
  const foodPortion = Math.max(0, subtotal - discountAmount);
  const servicePortion = shippingCharge + paymentFee;
  const taxBreakdown = calculateJapanTax(foodPortion, servicePortion);

  // ── Address Validation ───────────────────────────────────────────────────
  const validateAddress = (): boolean => {
    const errors: Record<string, string> = {};

    if (!address.fullName.trim()) {
      errors.fullName = "お名前（氏名）を入力してください";
    }
    if (!address.email.trim() || !address.email.includes("@")) {
      errors.email = "有効なメールアドレスを入力してください";
    }
    if (!address.phone.trim() || address.phone.replace(/\D/g, "").length < 10) {
      errors.phone = "日中連絡可能な電話番号を入力してください（10桁以上）";
    }
    if (!address.postalCode.trim() || !/^\d{3}-?\d{4}$/.test(address.postalCode.trim())) {
      errors.postalCode = "郵便番号を正しく入力してください（例: 124-0025）";
    }
    if (!address.prefecture) {
      errors.prefecture = "都道府県を選択してください";
    }
    if (!address.city.trim()) {
      errors.city = "市区町村を入力してください（例: 葛飾区）";
    }
    if (!address.addressLine1.trim()) {
      errors.addressLine1 = "町名・番地を入力してください（例: 西新小岩1-2-11）";
    }

    setAddressErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleStep1Next = () => {
    if (validateAddress()) {
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError("");
    const code = couponCode.trim().toUpperCase();
    if (code === "BETICROM500" || code === "BETICORM500") {
      setAppliedCoupon({ code, discount: 500 });
      setCouponError("");
    } else {
      setCouponError("有効なクーポンコードではありません。正しいコードを入力してください。");
    }
  };

  const handlePlaceOrder = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      const generatedId = `BC-2026-${Math.floor(100000 + Math.random() * 900000)}`;
      setOrderComplete(generatedId);
      onClearCart();
      setIsSubmitting(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 1200);
  };

  // If order completed
  if (orderComplete) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#12633D] flex items-center justify-center mx-auto mb-4">
          <Check size={36} />
        </div>
        <h1 className="text-2xl font-extrabold text-[#202824] mb-2">
          ご注文ありがとうございました
        </h1>
        <p className="text-xs sm:text-sm text-[#59635D] mb-6">
          ご注文番号: <span className="font-mono font-bold text-[#12633D]">{orderComplete}</span>
        </p>

        <div className="bg-white border border-[#E1E6E2] rounded-2xl p-6 text-left text-xs sm:text-sm space-y-4 mb-8 shadow-xs">
          <div className="flex justify-between border-b border-[#E1E6E2] pb-3">
            <span className="text-[#59635D]">お届け先</span>
            <span className="font-bold text-[#202824] text-right">
              〒{address.postalCode} {address.prefecture}{address.city}{address.addressLine1} {address.addressLine2}<br />
              {address.fullName} 様 ({address.phone})
            </span>
          </div>
          <div className="flex justify-between border-b border-[#E1E6E2] pb-3">
            <span className="text-[#59635D]">お届け希望時間帯</span>
            <span className="font-bold text-[#202824]">
              {TIME_SLOTS.find(s => s.id === delivery.timeSlot)?.ja || "指定なし"}
            </span>
          </div>
          <div className="flex justify-between border-b border-[#E1E6E2] pb-3">
            <span className="text-[#59635D]">お支払い方法</span>
            <span className="font-bold text-[#202824]">{selectedPayment.labelJa}</span>
          </div>
          <div className="flex justify-between text-base font-extrabold text-[#12633D]">
            <span>合計お支払い金額</span>
            <span>{formatYen(grandTotal)}（税込）</span>
          </div>
        </div>

        <p className="text-xs text-[#59635D] mb-6 leading-relaxed">
          ご入力いただいたメールアドレス（{address.email}）へ注文確認メールをお送りしました。<br />
          商品の発送手配が完了いたしましたら、ヤマト運輸の追跡伝票番号をお知らせいたします。
        </p>

        <button
          onClick={() => setView("home")}
          className="px-8 py-3 rounded-xl bg-[#12633D] text-white font-bold text-sm shadow-md hover:bg-[#0b4f2a] cursor-pointer"
        >
          ストアトップへ戻る
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24 sm:pb-16">
      <h1 className="text-xl sm:text-2xl font-extrabold text-[#202824] mb-6">
        チェックアウト（ご注文手続き）
      </h1>

      {/* 4-Step Progress Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[
            { step: 1, label: "お届け先住所" },
            { step: 2, label: "配送希望日時" },
            { step: 3, label: "お支払い方法" },
            { step: 4, label: "最終確認" },
          ].map((item, idx) => {
            const isCompleted = currentStep > item.step;
            const isCurrent = currentStep === item.step;
            return (
              <div key={item.step} className="flex-1 flex flex-col items-center relative">
                <div
                  onClick={() => {
                    if (isCompleted) setCurrentStep(item.step as any);
                  }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                    isCompleted
                      ? "bg-[#12633D] text-white cursor-pointer"
                      : isCurrent
                      ? "border-2 border-[#12633D] text-[#12633D] bg-white"
                      : "border border-[#E1E6E2] text-[#59635D] bg-[#F7F8F5]"
                  }`}
                >
                  {isCompleted ? <Check size={14} /> : item.step}
                </div>
                <span
                  className={`text-[11px] mt-1.5 font-semibold text-center hidden sm:block ${
                    isCurrent ? "text-[#12633D]" : isCompleted ? "text-[#202824]" : "text-[#59635D]"
                  }`}
                >
                  {item.label}
                </span>

                {/* Connector line */}
                {idx < 3 && (
                  <div
                    className={`absolute top-4 left-1/2 w-full h-[2px] -z-10 ${
                      currentStep > idx + 1 ? "bg-[#12633D]" : "bg-[#E1E6E2]"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-[#E1E6E2] rounded-2xl p-5 sm:p-7 shadow-xs">
          {/* STEP 1: Address Form */}
          {currentStep === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-[#202824]">
                  お届け先住所の入力
                </h2>
                <p className="text-xs text-[#59635D] mt-0.5">
                  ヤマト運輸の宅急便伝票に印字されるお届け先をご入力ください
                </p>
              </div>

              <div className="space-y-4 text-xs">
                {/* Full name & kana */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-[#202824] block mb-1">
                      お名前（氏名） <span className="text-[#C92A2A]">*</span>
                    </label>
                    <input
                      type="text"
                      value={address.fullName}
                      onChange={e => setAddress({ ...address, fullName: e.target.value })}
                      placeholder="例: 山田 太郎 / Rahman Ahmed"
                      className={`w-full px-3 py-2.5 rounded-xl border text-xs sm:text-sm outline-none transition-all ${
                        addressErrors.fullName ? "border-[#C92A2A] bg-red-50/20" : "border-[#E1E6E2] focus:border-[#12633D]"
                      }`}
                      autoComplete="name"
                    />
                    {addressErrors.fullName && (
                      <p className="text-[11px] text-[#C92A2A] mt-1 font-medium">{addressErrors.fullName}</p>
                    )}
                  </div>

                  <div>
                    <label className="font-bold text-[#202824] block mb-1">
                      フリガナ（任意）
                    </label>
                    <input
                      type="text"
                      value={address.kana}
                      onChange={e => setAddress({ ...address, kana: e.target.value })}
                      placeholder="例: ヤマダ タロウ"
                      className="w-full px-3 py-2.5 rounded-xl border border-[#E1E6E2] text-xs sm:text-sm outline-none focus:border-[#12633D]"
                    />
                  </div>
                </div>

                {/* Email & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-[#202824] block mb-1">
                      メールアドレス <span className="text-[#C92A2A]">*</span>
                    </label>
                    <input
                      type="email"
                      value={address.email}
                      onChange={e => setAddress({ ...address, email: e.target.value })}
                      placeholder="例: sample@email.com"
                      className={`w-full px-3 py-2.5 rounded-xl border text-xs sm:text-sm outline-none transition-all ${
                        addressErrors.email ? "border-[#C92A2A] bg-red-50/20" : "border-[#E1E6E2] focus:border-[#12633D]"
                      }`}
                      autoComplete="email"
                    />
                    {addressErrors.email && (
                      <p className="text-[11px] text-[#C92A2A] mt-1 font-medium">{addressErrors.email}</p>
                    )}
                  </div>

                  <div>
                    <label className="font-bold text-[#202824] block mb-1">
                      電話番号 <span className="text-[#C92A2A]">*</span>
                    </label>
                    <input
                      type="tel"
                      value={address.phone}
                      onChange={e => setAddress({ ...address, phone: e.target.value })}
                      placeholder="例: 090-1234-5678"
                      className={`w-full px-3 py-2.5 rounded-xl border text-xs sm:text-sm outline-none transition-all ${
                        addressErrors.phone ? "border-[#C92A2A] bg-red-50/20" : "border-[#E1E6E2] focus:border-[#12633D]"
                      }`}
                      autoComplete="tel"
                    />
                    {addressErrors.phone && (
                      <p className="text-[11px] text-[#C92A2A] mt-1 font-medium">{addressErrors.phone}</p>
                    )}
                  </div>
                </div>

                {/* Postal Code & Prefecture */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-[#202824] block mb-1">
                      郵便番号（7桁） <span className="text-[#C92A2A]">*</span>
                    </label>
                    <input
                      type="text"
                      value={address.postalCode}
                      onChange={e => setAddress({ ...address, postalCode: e.target.value })}
                      placeholder="例: 124-0025"
                      className={`w-full px-3 py-2.5 rounded-xl border text-xs sm:text-sm outline-none transition-all ${
                        addressErrors.postalCode ? "border-[#C92A2A] bg-red-50/20" : "border-[#E1E6E2] focus:border-[#12633D]"
                      }`}
                      autoComplete="postal-code"
                    />
                    {addressErrors.postalCode && (
                      <p className="text-[11px] text-[#C92A2A] mt-1 font-medium">{addressErrors.postalCode}</p>
                    )}
                  </div>

                  <div>
                    <label className="font-bold text-[#202824] block mb-1">
                      都道府県 <span className="text-[#C92A2A]">*</span>
                    </label>
                    <select
                      value={address.prefecture}
                      onChange={e => setAddress({ ...address, prefecture: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-[#E1E6E2] text-xs sm:text-sm outline-none focus:border-[#12633D] bg-white cursor-pointer"
                      autoComplete="address-level1"
                    >
                      {JAPAN_PREFECTURES.map(pref => (
                        <option key={pref} value={pref}>{pref}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* City & Ward */}
                <div>
                  <label className="font-bold text-[#202824] block mb-1">
                    市区町村 <span className="text-[#C92A2A]">*</span>
                  </label>
                  <input
                    type="text"
                    value={address.city}
                    onChange={e => setAddress({ ...address, city: e.target.value })}
                    placeholder="例: 葛飾区 / 大阪市北区"
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs sm:text-sm outline-none transition-all ${
                      addressErrors.city ? "border-[#C92A2A] bg-red-50/20" : "border-[#E1E6E2] focus:border-[#12633D]"
                    }`}
                    autoComplete="address-level2"
                  />
                  {addressErrors.city && (
                    <p className="text-[11px] text-[#C92A2A] mt-1 font-medium">{addressErrors.city}</p>
                  )}
                </div>

                {/* Street address */}
                <div>
                  <label className="font-bold text-[#202824] block mb-1">
                    町名・番地 <span className="text-[#C92A2A]">*</span>
                  </label>
                  <input
                    type="text"
                    value={address.addressLine1}
                    onChange={e => setAddress({ ...address, addressLine1: e.target.value })}
                    placeholder="例: 西新小岩1-2-11"
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs sm:text-sm outline-none transition-all ${
                      addressErrors.addressLine1 ? "border-[#C92A2A] bg-red-50/20" : "border-[#E1E6E2] focus:border-[#12633D]"
                    }`}
                    autoComplete="address-line1"
                  />
                  {addressErrors.addressLine1 && (
                    <p className="text-[11px] text-[#C92A2A] mt-1 font-medium">{addressErrors.addressLine1}</p>
                  )}
                </div>

                {/* Building / Room */}
                <div>
                  <label className="font-bold text-[#202824] block mb-1">
                    建物名・部屋番号（任意）
                  </label>
                  <input
                    type="text"
                    value={address.addressLine2}
                    onChange={e => setAddress({ ...address, addressLine2: e.target.value })}
                    placeholder="例: キクヤビル 101号室"
                    className="w-full px-3 py-2.5 rounded-xl border border-[#E1E6E2] text-xs sm:text-sm outline-none focus:border-[#12633D]"
                    autoComplete="address-line2"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setView("cart")}
                  className="text-xs font-bold text-[#59635D] hover:text-[#202824] flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>カートに戻る</span>
                </button>

                <button
                  type="button"
                  onClick={handleStep1Next}
                  className="px-6 py-3 rounded-xl bg-[#12633D] text-white font-bold text-xs sm:text-sm shadow-md hover:bg-[#0b4f2a] flex items-center gap-2 cursor-pointer"
                >
                  <span>配送日時の指定へ進む</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Delivery Slot Form */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-[#202824]">
                  ヤマト運輸 お届け希望時間帯の指定
                </h2>
                <p className="text-xs text-[#59635D] mt-0.5">
                  ご都合の良い配達時間帯をご選択いただけます
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {TIME_SLOTS.map(slot => (
                  <label
                    key={slot.id}
                    onClick={() => setDelivery({ ...delivery, timeSlot: slot.id })}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      delivery.timeSlot === slot.id
                        ? "border-[#12633D] bg-emerald-50/50 ring-1 ring-[#12633D]"
                        : "border-[#E1E6E2] hover:bg-[#F7F8F5]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="timeSlot"
                      checked={delivery.timeSlot === slot.id}
                      onChange={() => setDelivery({ ...delivery, timeSlot: slot.id })}
                      className="accent-[#12633D]"
                    />
                    <div>
                      <span className="font-bold text-[#202824] block">{slot.ja}</span>
                      <span className="text-[10px] text-[#59635D]">{slot.en}</span>
                    </div>
                  </label>
                ))}
              </div>

              {/* Delivery Notes */}
              <div>
                <label className="font-bold text-xs text-[#202824] block mb-1">
                  配送ドライバーへの連絡事項・ご要望（任意）
                </label>
                <textarea
                  rows={2}
                  value={delivery.notes}
                  onChange={e => setDelivery({ ...delivery, notes: e.target.value })}
                  placeholder="例: 宅配ボックスへの配達（常温品のみ）、インターホンを鳴らしてください 等"
                  className="w-full px-3 py-2 rounded-xl border border-[#E1E6E2] text-xs outline-none focus:border-[#12633D]"
                />
              </div>

              <div className="pt-4 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="text-xs font-bold text-[#59635D] hover:text-[#202824] flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>住所入力に戻る</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCurrentStep(3);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="px-6 py-3 rounded-xl bg-[#12633D] text-white font-bold text-xs sm:text-sm shadow-md hover:bg-[#0b4f2a] flex items-center gap-2 cursor-pointer"
                >
                  <span>お支払い方法の選択へ進む</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Payment & Coupon */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-[#202824]">
                  お支払い方法の選択
                </h2>
                <p className="text-xs text-[#59635D] mt-0.5">
                  日本国内でご利用可能なお支払い方法をお選びください
                </p>
              </div>

              {/* Payment Methods List */}
              <div className="space-y-2.5 text-xs">
                {PAYMENT_METHODS.map(m => (
                  <label
                    key={m.id}
                    onClick={() => setPaymentMethod(m.id)}
                    className={`flex items-start justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                      paymentMethod === m.id
                        ? "border-[#12633D] bg-emerald-50/50 ring-1 ring-[#12633D]"
                        : "border-[#E1E6E2] hover:bg-[#F7F8F5]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="payMethod"
                        checked={paymentMethod === m.id}
                        onChange={() => setPaymentMethod(m.id)}
                        className="accent-[#12633D] mt-0.5"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#202824] text-xs sm:text-sm">{m.labelJa}</span>
                          {m.fee > 0 ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800">
                              手数料 +¥{m.fee}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-[#12633D]">
                              手数料無料
                            </span>
                          )}
                        </div>
                        <p className="text-[#59635D] text-[11px] mt-0.5">{m.descJa}</p>
                        {m.testNote && (
                          <p className="text-[10px] text-[#12633D] mt-0.5 font-medium">{m.testNote}</p>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              {/* Coupon Code Section */}
              <div className="p-4 rounded-xl border border-[#E1E6E2] bg-[#F7F8F5]">
                <span className="font-bold text-xs text-[#202824] block mb-1">
                  クーポンコードの利用
                </span>
                <p className="text-[11px] text-[#59635D] mb-2.5">
                  新規お客様向けクーポン（BETICROM500）などをお持ちの場合はご入力ください
                </p>
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={e => setCouponCode(e.target.value)}
                    placeholder="BETICROM500"
                    className="flex-1 px-3 py-2 rounded-xl border border-[#E1E6E2] bg-white text-xs font-mono font-bold uppercase outline-none focus:border-[#12633D]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#202824] text-white text-xs font-bold hover:bg-black cursor-pointer shrink-0"
                  >
                    適用する
                  </button>
                </form>

                {appliedCoupon && (
                  <p className="text-xs font-bold text-[#12633D] mt-2 flex items-center gap-1">
                    <CheckCircle2 size={13} />
                    <span>クーポン「{appliedCoupon.code}」が適用されました（-¥{appliedCoupon.discount}）</span>
                  </p>
                )}
                {couponError && (
                  <p className="text-xs font-medium text-[#C92A2A] mt-2">{couponError}</p>
                )}
              </div>

              <div className="pt-4 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="text-xs font-bold text-[#59635D] hover:text-[#202824] flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>配送日時指定に戻る</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCurrentStep(4);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="px-6 py-3 rounded-xl bg-[#12633D] text-white font-bold text-xs sm:text-sm shadow-md hover:bg-[#0b4f2a] flex items-center gap-2 cursor-pointer"
                >
                  <span>ご注文内容の最終確認へ進む</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Final Review */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-[#202824]">
                  ご注文内容の最終確認
                </h2>
                <p className="text-xs text-[#59635D] mt-0.5">
                  内容をご確認の上、「注文を確定する」ボタンを押してください
                </p>
              </div>

              {/* Summary Cards */}
              <div className="space-y-4 text-xs">
                {/* 1. Address summary */}
                <div className="p-4 rounded-xl border border-[#E1E6E2] bg-[#F7F8F5] relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-[#202824] text-xs">お届け先情報</span>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="text-xs text-[#12633D] font-bold hover:underline cursor-pointer"
                    >
                      変更する
                    </button>
                  </div>
                  <p className="text-[#202824] font-semibold">{address.fullName} 様 ({address.phone})</p>
                  <p className="text-[#59635D] mt-0.5">
                    〒{address.postalCode} {address.prefecture}{address.city}{address.addressLine1} {address.addressLine2}
                  </p>
                  <p className="text-[#59635D] mt-0.5">{address.email}</p>
                </div>

                {/* 2. Delivery time slot summary */}
                <div className="p-4 rounded-xl border border-[#E1E6E2] bg-[#F7F8F5] relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-[#202824] text-xs">配送日時・伝達事項</span>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="text-xs text-[#12633D] font-bold hover:underline cursor-pointer"
                    >
                      変更する
                    </button>
                  </div>
                  <p className="text-[#202824] font-semibold">
                    ヤマト運輸: {TIME_SLOTS.find(s => s.id === delivery.timeSlot)?.ja}
                  </p>
                  {delivery.notes && (
                    <p className="text-[#59635D] mt-1">ご要望: {delivery.notes}</p>
                  )}
                </div>

                {/* 3. Payment method summary */}
                <div className="p-4 rounded-xl border border-[#E1E6E2] bg-[#F7F8F5] relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-[#202824] text-xs">お支払い方法</span>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      className="text-xs text-[#12633D] font-bold hover:underline cursor-pointer"
                    >
                      変更する
                    </button>
                  </div>
                  <p className="text-[#202824] font-semibold">{selectedPayment.labelJa}</p>
                  <p className="text-[#59635D] text-[11px] mt-0.5">{selectedPayment.descJa}</p>
                </div>

                {/* 4. Products list preview */}
                <div className="border border-[#E1E6E2] rounded-xl overflow-hidden">
                  <div className="p-3 bg-[#F7F8F5] font-bold text-xs text-[#202824] border-b border-[#E1E6E2]">
                    ご注文商品一覧（{cartItems.reduce((a, b) => a + b.quantity, 0)}点）
                  </div>
                  <div className="divide-y divide-[#E1E6E2] max-h-60 overflow-y-auto">
                    {cartItems.map(item => (
                      <div key={item.product.id} className="p-3 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={item.product.img}
                            alt=""
                            className="w-8 h-8 rounded object-contain bg-[#F7F8F5] shrink-0"
                          />
                          <div className="truncate">
                            <p className="font-semibold text-[#202824] truncate">
                              {locale === "JA" ? item.product.nameJA : item.product.nameEN}
                            </p>
                            <p className="text-[10px] text-[#59635D]">数量: {item.quantity}</p>
                          </div>
                        </div>
                        <span className="font-bold text-[#202824] shrink-0 ml-3">
                          {formatYen(item.product.price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="text-xs font-bold text-[#59635D] hover:text-[#202824] flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>お支払い選択に戻る</span>
                </button>

                <button
                  type="button"
                  onClick={handlePlaceOrder}
                  disabled={isSubmitting}
                  className="px-8 py-3.5 rounded-xl bg-[#12633D] text-white font-extrabold text-sm shadow-lg hover:bg-[#0b4f2a] active:scale-[0.99] transition-all cursor-pointer flex items-center gap-2"
                >
                  <Lock size={15} />
                  <span>{isSubmitting ? "注文処理中..." : "注文を確定する"}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Summary Sidebar (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-[#E1E6E2] rounded-2xl p-5 shadow-xs space-y-4 sticky top-24">
          <h3 className="font-extrabold text-sm text-[#202824] border-b border-[#E1E6E2] pb-3">
            ご請求サマリー
          </h3>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-[#59635D]">
              <span>商品小計</span>
              <span className="font-bold text-[#202824]">{formatYen(subtotal)}</span>
            </div>

            {appliedCoupon && (
              <div className="flex justify-between text-[#12633D] font-bold">
                <span>クーポン割引 ({appliedCoupon.code})</span>
                <span>-{formatYen(appliedCoupon.discount)}</span>
              </div>
            )}

            <div className="flex justify-between text-[#59635D]">
              <span>配送料金</span>
              <span className="font-bold text-[#202824]">
                {shippingCharge === 0 ? "無料" : formatYen(shippingCharge)}
              </span>
            </div>

            {paymentFee > 0 && (
              <div className="flex justify-between text-[#59635D]">
                <span>決済手数料 ({selectedPayment.labelJa})</span>
                <span className="font-bold text-[#202824]">+{formatYen(paymentFee)}</span>
              </div>
            )}

            {/* Consumption Tax Breakdown */}
            <div className="pt-2 border-t border-[#E1E6E2]/70 text-[11px] text-[#59635D] space-y-1">
              <div className="flex justify-between">
                <span>うち消費税（飲食料品 8%対象分）</span>
                <span>{formatYen(taxBreakdown.foodTax)}</span>
              </div>
              {taxBreakdown.serviceTax > 0 && (
                <div className="flex justify-between">
                  <span>うち消費税（送料・手数料 10%対象分）</span>
                  <span>{formatYen(taxBreakdown.serviceTax)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Grand Total */}
          <div className="pt-3 border-t border-[#E1E6E2] flex items-baseline justify-between">
            <div>
              <span className="text-sm font-extrabold text-[#202824] block">合計お支払い金額</span>
              <span className="text-[10px] text-[#59635D]">（すべての税・送料込）</span>
            </div>
            <span className="text-xl sm:text-2xl font-extrabold text-[#12633D]">
              {formatYen(grandTotal)}
            </span>
          </div>

          <div className="text-[10px] text-[#59635D] text-center pt-2 border-t border-[#E1E6E2]">
            <p className="flex items-center justify-center gap-1 font-semibold text-[#12633D] mb-1">
              <Shield size={12} />
              <span>SSL 256bit 暗号化通信</span>
            </p>
            カード情報は安全に送信され、店舗側に生カード情報は保持されません。
          </div>
        </div>
      </div>
    </div>
  );
}
