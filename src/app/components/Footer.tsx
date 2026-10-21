import {
  Shield, Truck, Phone, Mail, MapPin, ExternalLink, Lock,
} from "lucide-react";
import type { LegalTopic, View } from "../types";
import type { Locale } from "../../data/products";

interface FooterProps {
  locale: Locale;
  onOpenLegal: (topic: LegalTopic) => void;
  setView: (v: View) => void;
  onOpenAdminPrompt: () => void;
}

export function Footer({
  locale,
  onOpenLegal,
  setView,
  onOpenAdminPrompt,
}: FooterProps) {
  return (
    <footer className="border-t border-[#E1E6E2] bg-white mt-12 text-[#202824]">
      {/* Upper Footer: Value Props */}
      <div className="border-b border-[#E1E6E2] bg-[#F7F8F5]/60 py-8 px-4">
        <div className="max-w-screen-xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-xs">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-[#12633D] flex items-center justify-center shrink-0">
              <Shield size={18} />
            </div>
            <div>
              <p className="font-extrabold text-sm text-[#202824]">厳選ハラール食品</p>
              <p className="text-[#59635D] mt-0.5 leading-relaxed">
                JMA/HJBA第三者認証品、公認サプライヤー証明書確認品を厳密に区分。
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <Truck size={18} />
            </div>
            <div>
              <p className="font-extrabold text-sm text-[#202824]">ヤマトクール宅急便</p>
              <p className="text-[#59635D] mt-0.5 leading-relaxed">
                冷凍・冷蔵・常温を完全に温度分離して梱包。鮮度を保って全国へ配送。
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <Phone size={18} />
            </div>
            <div>
              <p className="font-extrabold text-sm text-[#202824]">店舗・電話窓口</p>
              <p className="text-[#59635D] mt-0.5 leading-relaxed">
                03-5654-6417（平日 10:00〜18:00）多言語スタッフが丁寧に対応。
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-[#12633D] flex items-center justify-center shrink-0">
              <Mail size={18} />
            </div>
            <div>
              <p className="font-extrabold text-sm text-[#202824]">公式メールサポート</p>
              <p className="text-[#59635D] mt-0.5 leading-relaxed">
                contact@beticrom.jp 宛にいつでもお問い合わせいただけます。
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Footer: Links & Company Information */}
      <div className="max-w-screen-xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white border border-[#E1E6E2] p-0.5 flex items-center justify-center shadow-xs shrink-0">
                <img
                  src="/beticrom-logo.png"
                  alt="Beticrom Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <span className="font-extrabold text-base tracking-tight text-[#12633D]">
                  Beticrom
                </span>
                <span className="text-[10px] text-[#59635D] block leading-none">
                  ハラール食品・スパイス・世界の食材
                </span>
              </div>
            </div>

            <p className="text-xs text-[#59635D] leading-relaxed max-w-sm">
              日本在住のムスリムの方々や、本格的な世界のスパイス・食材を探求するすべてのお客様へ、信頼できる確かな品質の食品をお届けします。
            </p>

            <div className="text-xs text-[#59635D] space-y-1 pt-1">
              <p className="font-semibold text-[#202824]">運営会社: 株式会社ベティクロム</p>
              <p>所在地: 〒124-0025 東京都葛飾区西新小岩1-2-11 キクヤビル1F</p>
              <p>電話番号: 03-5654-6417</p>
              <p>E-mail: contact@beticrom.jp</p>
            </div>
          </div>

          {/* Column 1: Shopping & Guide */}
          <div>
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-[#202824] mb-3">
              お買い物ガイド
            </h4>
            <ul className="space-y-2 text-xs text-[#59635D]">
              <li>
                <button
                  onClick={() => onOpenLegal("guide")}
                  className="hover:text-[#12633D] transition-colors cursor-pointer text-left"
                >
                  ご利用ガイド・ご注文の流れ
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenLegal("shipping")}
                  className="hover:text-[#12633D] transition-colors cursor-pointer text-left"
                >
                  配送料金・お届けについて
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenLegal("returns")}
                  className="hover:text-[#12633D] transition-colors cursor-pointer text-left"
                >
                  返品特約・キャンセル規約
                </button>
              </li>
              <li>
                <button
                  onClick={() => setView("account")}
                  className="hover:text-[#12633D] transition-colors cursor-pointer text-left"
                >
                  注文履歴・マイページ
                </button>
              </li>
            </ul>
          </div>

          {/* Column 2: Legal & Trust */}
          <div>
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-[#202824] mb-3">
              規約・特定商取引法
            </h4>
            <ul className="space-y-2 text-xs text-[#59635D]">
              <li>
                <button
                  onClick={() => onOpenLegal("tokushoho")}
                  className="hover:text-[#12633D] transition-colors cursor-pointer text-left"
                >
                  特定商取引法に基づく表記
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenLegal("privacy")}
                  className="hover:text-[#12633D] transition-colors cursor-pointer text-left"
                >
                  プライバシーポリシー
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenLegal("company")}
                  className="hover:text-[#12633D] transition-colors cursor-pointer text-left"
                >
                  会社概要・店舗案内
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenLegal("contact")}
                  className="hover:text-[#12633D] transition-colors cursor-pointer text-left"
                >
                  お問い合わせ窓口
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Categories Quick Links */}
          <div>
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-[#202824] mb-3">
              主要カテゴリー
            </h4>
            <ul className="space-y-2 text-xs text-[#59635D]">
              <li>
                <button
                  onClick={() => setView("category")}
                  className="hover:text-[#12633D] transition-colors cursor-pointer"
                >
                  ハラール肉・魚（89品）
                </button>
              </li>
              <li>
                <button
                  onClick={() => setView("category")}
                  className="hover:text-[#12633D] transition-colors cursor-pointer"
                >
                  冷凍食品・パラタ（57品）
                </button>
              </li>
              <li>
                <button
                  onClick={() => setView("category")}
                  className="hover:text-[#12633D] transition-colors cursor-pointer"
                >
                  バスマティ米・アタ粉（54品）
                </button>
              </li>
              <li>
                <button
                  onClick={() => setView("category")}
                  className="hover:text-[#12633D] transition-colors cursor-pointer"
                >
                  本格スパイス・マサラ（404品）
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Payment Badges */}
        <div className="mt-12 pt-6 border-t border-[#E1E6E2] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#59635D]">
          <div>
            <p>© 2026 Beticrom Co., Ltd.（株式会社ベティクロム）. All rights reserved.</p>
          </div>

          {/* Payment Badges */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { label: "Visa", color: "#1A1F71" },
              { label: "Mastercard", color: "#EB001B" },
              { label: "JCB", color: "#007B40" },
              { label: "Amex", color: "#007BC1" },
              { label: "PayPay", color: "#D92D20" },
              { label: "コンビニ決済", color: "#202824" },
              { label: "銀行振込", color: "#1A6EA8" },
              { label: "代金引換", color: "#B45309" },
            ].map(b => (
              <span
                key={b.label}
                className="px-2 py-0.5 rounded border text-[10px] font-bold bg-[#F7F8F5]"
                style={{ borderColor: "#E1E6E2", color: b.color }}
              >
                {b.label}
              </span>
            ))}
          </div>

          {/* Secure Admin Access Trigger */}
          <button
            onClick={onOpenAdminPrompt}
            className="text-[11px] text-[#59635D] hover:text-[#202824] flex items-center gap-1 cursor-pointer"
            title="管理者専用ログイン"
          >
            <Lock size={11} />
            <span>管理者ポータル</span>
          </button>
        </div>
      </div>
    </footer>
  );
}
