import type { Product, Locale, StorageType, HalalTier } from "../data/products";

export type View = "home" | "category" | "pdp" | "cart" | "checkout" | "account" | "admin";

export type LegalTopic =
  | "tokushoho"
  | "privacy"
  | "shipping"
  | "guide"
  | "company"
  | "contact"
  | "returns"
  | null;

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface ShippingAddress {
  fullName: string;
  kana: string;
  email: string;
  phone: string;
  postalCode: string;
  prefecture: string;
  city: string;
  addressLine1: string;
  addressLine2?: string;
}

export interface DeliveryOptions {
  timeSlot: string;
  notes: string;
  deliveryDate: string;
}

export type PaymentMethodId = "card" | "paypay" | "konbini" | "bank" | "cod";

export interface PaymentOption {
  id: PaymentMethodId;
  labelJa: string;
  labelEn: string;
  labelBn: string;
  descJa: string;
  descEn: string;
  fee: number;
  testNote?: string;
}

// ─── 47 Japanese Prefectures ───────────────────────────────────────────────
export const JAPAN_PREFECTURES = [
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県",
  "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県",
  "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県",
  "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"
];

// ─── Time Slots for Yamato Transport ───────────────────────────────────────
export const TIME_SLOTS = [
  { id: "none",  ja: "指定なし (最短でお届け)", en: "No specification (Fastest delivery)", bn: "নির্দিষ্ট সময় ছাড়া (দ্রুততম ডেলিভারি)" },
  { id: "am",    ja: "午前中 (8:00〜12:00)",    en: "Morning (8:00 - 12:00)",              bn: "সকাল (৮:০০ - ১২:০০)" },
  { id: "14_16", ja: "14:00〜16:00",            en: "14:00 - 16:00",                       bn: "দুপুর ২:০০ - বিকাল ৪:০০" },
  { id: "16_18", ja: "16:00〜18:00",            en: "16:00 - 18:00",                       bn: "বিকাল ৪:০০ - সন্ধ্যা ৬:০০" },
  { id: "18_20", ja: "18:00〜20:00",            en: "18:00 - 20:00",                       bn: "সন্ধ্যা ৬:০০ - রাত ৮:০০" },
  { id: "19_21", ja: "19:00〜21:00",            en: "19:00 - 21:00",                       bn: "রাত ৭:০০ - রাত ৯:০০" },
];

// ─── Payment Methods ───────────────────────────────────────────────────────
export const PAYMENT_METHODS: PaymentOption[] = [
  {
    id: "card",
    labelJa: "クレジットカード",
    labelEn: "Credit Card (Stripe)",
    labelBn: "ক্রেডিট কার্ড",
    descJa: "Visa, Mastercard, JCB, American Express（一括払い）",
    descEn: "Visa, Mastercard, JCB, Amex (One-time payment)",
    descBn: "ভিসা, মাস্টারকার্ড, জেসিবি, অ্যামেক্স",
    fee: 0,
    testNote: "Stripe テスト環境対応（安全なトークン決済）",
  },
  {
    id: "paypay",
    labelJa: "PayPay（ペイペイ）",
    labelEn: "PayPay",
    labelBn: "পেপে",
    descJa: "スマホで即座にお支払い。PayPay残高・クレジット決済",
    descEn: "Instant smartphone QR payment with PayPay balance",
    descBn: "স্মার্টফোন দিয়ে তাৎক্ষণিক কিউআর পেমেন্ট",
    fee: 0,
  },
  {
    id: "konbini",
    labelJa: "コンビニ決済",
    labelEn: "Convenience Store (Konbini)",
    labelBn: "কনভিনি পেমেন্ট",
    descJa: "セブン-イレブン、ローソン、ファミリーマート、ミニストップ（手数料: ¥110）",
    descEn: "7-Eleven, Lawson, FamilyMart, Ministop (Fee: ¥110)",
    descBn: "সেভেন-ইলেভেন, লসন, ফ্যামিলিমার্ট (ফি: ¥১১০)",
    fee: 110,
  },
  {
    id: "bank",
    labelJa: "銀行振込（前払い）",
    labelEn: "Bank Transfer (Pre-payment)",
    labelBn: "ব্যাংক ট্রান্সফার",
    descJa: "みずほ銀行。ご注文確定後、お振込先情報をメールでお送りします。",
    descEn: "Mizuho Bank. Account details will be sent by email after order confirmation.",
    descBn: "মিজুহো ব্যাংক। অর্ডার কনফার্মের পর একাউন্ট তথ্য পাঠানো হবে।",
    fee: 0,
  },
  {
    id: "cod",
    labelJa: "代金引換（着払い）",
    labelEn: "Cash on Delivery (COD)",
    labelBn: "ক্যাশ অন ডেলিভারি",
    descJa: "商品お届け時にヤマト運輸ドライバーへ現金でお支払い（代引手数料: ¥330）",
    descEn: "Pay in cash to Yamato Transport driver upon delivery (COD fee: ¥330)",
    descBn: "ডেলিভারি পাওয়ার পর ড্রাইভারকে ক্যাশ পেমেন্ট (ফি: ¥৩৩০)",
    fee: 330,
  },
];

// ─── Format Currency ───────────────────────────────────────────────────────
export function formatYen(amount: number): string {
  return `¥${Math.round(amount).toLocaleString()}`;
}

// ─── Tax Calculation (Japan Consumption Tax) ───────────────────────────────
// Food items: 8% reduced tax (軽減税率)
// Shipping, packaging, and payment fees: 10% standard tax (標準税率)
export interface TaxBreakdown {
  foodSubtotal: number;
  foodTax: number;       // 8% inclusive portion
  serviceSubtotal: number;
  serviceTax: number;    // 10% inclusive portion
  totalTax: number;
}

export function calculateJapanTax(foodSubtotal: number, serviceSubtotal: number): TaxBreakdown {
  // Food items in Japan are priced tax-inclusive at 8% (rate = 8 / 108)
  const foodTax = Math.round(foodSubtotal * (8 / 108));
  // Services (shipping/fees) are priced tax-inclusive at 10% (rate = 10 / 110)
  const serviceTax = Math.round(serviceSubtotal * (10 / 110));
  return {
    foodSubtotal,
    foodTax,
    serviceSubtotal,
    serviceTax,
    totalTax: foodTax + serviceTax,
  };
}

// ─── Shipping Calculation ──────────────────────────────────────────────────
export interface ShippingCalculation {
  dryItems: CartItem[];
  coolItems: CartItem[];
  frozenItems: CartItem[];
  drySubtotal: number;
  coolSubtotal: number;
  frozenSubtotal: number;
  dryBaseFee: number;
  coolBaseFee: number;
  frozenBaseFee: number;
  coolSurcharge: number;
  frozenSurcharge: number;
  dryDiscount: number;
  totalShipping: number;
  parcelCount: number;
  dryFreeProgress: number;
  dryFreeThreshold: number;
  dryFreeRemaining: number;
  isDryFreeEligible: boolean;
  hasAddress: boolean;
}

export const DRY_FREE_THRESHOLD = 6500;
export const BASE_SHIPPING_RATE = 880;
export const COLD_SURCHARGE = 330;

export function calculateShipping(cartItems: CartItem[], hasAddress: boolean): ShippingCalculation {
  const dryItems = cartItems.filter(i => i.product.storage === "dry");
  const coolItems = cartItems.filter(i => i.product.storage === "cool");
  const frozenItems = cartItems.filter(i => i.product.storage === "frozen");

  const drySubtotal = dryItems.reduce((acc, i) => acc + i.product.price * i.quantity, 0);
  const coolSubtotal = coolItems.reduce((acc, i) => acc + i.product.price * i.quantity, 0);
  const frozenSubtotal = frozenItems.reduce((acc, i) => acc + i.product.price * i.quantity, 0);

  // Temperature box count
  let parcelCount = 0;
  if (dryItems.length > 0) parcelCount += 1;
  if (coolItems.length > 0) parcelCount += 1;
  if (frozenItems.length > 0) parcelCount += 1;

  // Dry Shipping calculation:
  // Eligible for free shipping if dry subtotal >= ¥6,500
  const isDryFreeEligible = dryItems.length > 0 && drySubtotal >= DRY_FREE_THRESHOLD;
  const dryBaseFee = dryItems.length > 0 ? (isDryFreeEligible ? 0 : BASE_SHIPPING_RATE) : 0;
  const dryDiscount = isDryFreeEligible ? BASE_SHIPPING_RATE : 0;

  // Cool Shipping: Base delivery + Cool surcharge (per Yamato regulations)
  // Cool parcels require dedicated temperature-controlled handling
  const coolBaseFee = coolItems.length > 0 ? (dryItems.length > 0 ? 0 : BASE_SHIPPING_RATE) : 0;
  const coolSurcharge = coolItems.length > 0 ? COLD_SURCHARGE : 0;

  // Frozen Shipping: Base delivery + Frozen surcharge (per Yamato regulations)
  // If cart is only frozen items, base shipping (880) + frozen surcharge (330) = ¥1,210
  const frozenBaseFee = frozenItems.length > 0 ? (dryItems.length > 0 || coolItems.length > 0 ? 0 : BASE_SHIPPING_RATE) : 0;
  const frozenSurcharge = frozenItems.length > 0 ? COLD_SURCHARGE : 0;

  // Total shipping:
  // If cart has dry & frozen: Dry base (880 or free) + Frozen surcharge (330)
  // If cart is only frozen: Frozen base (880) + Frozen surcharge (330) = ¥1,210
  const totalShipping = dryBaseFee + coolBaseFee + frozenBaseFee + coolSurcharge + frozenSurcharge;

  const dryFreeRemaining = Math.max(0, DRY_FREE_THRESHOLD - drySubtotal);
  const dryFreeProgress = Math.min(100, Math.round((drySubtotal / DRY_FREE_THRESHOLD) * 100));

  return {
    dryItems,
    coolItems,
    frozenItems,
    drySubtotal,
    coolSubtotal,
    frozenSubtotal,
    dryBaseFee,
    coolBaseFee,
    frozenBaseFee,
    coolSurcharge,
    frozenSurcharge,
    dryDiscount,
    totalShipping,
    parcelCount,
    dryFreeProgress,
    dryFreeThreshold: DRY_FREE_THRESHOLD,
    dryFreeRemaining,
    isDryFreeEligible,
    hasAddress,
  };
}
