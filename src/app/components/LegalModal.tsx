import React from "react";
import { X, ShieldCheck, Truck, HelpCircle, Building, FileText, RotateCcw, Mail, Phone, MapPin } from "lucide-react";
import type { LegalTopic } from "../types";
import type { Locale } from "../../data/products";

interface LegalModalProps {
  topic: LegalTopic;
  onClose: () => void;
  locale: Locale;
}

export const LegalModal: React.FC<LegalModalProps> = ({ topic, onClose, locale }) => {
  if (!topic) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[85vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-[#E1E6E2]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E1E6E2] bg-[#F7F8F5]">
          <div className="flex items-center gap-2.5">
            {topic === "tokushoho" && <FileText size={20} className="text-[#12633D]" />}
            {topic === "privacy" && <ShieldCheck size={20} className="text-[#12633D]" />}
            {topic === "shipping" && <Truck size={20} className="text-[#12633D]" />}
            {topic === "guide" && <HelpCircle size={20} className="text-[#12633D]" />}
            {topic === "company" && <Building size={20} className="text-[#12633D]" />}
            {topic === "returns" && <RotateCcw size={20} className="text-[#12633D]" />}
            {topic === "contact" && <Mail size={20} className="text-[#12633D]" />}
            <h2 className="text-base font-bold text-[#202824]">
              {topic === "tokushoho" && "特定商取引法に基づく表記"}
              {topic === "privacy" && (locale === "JA" ? "プライバシーポリシー（個人情報保護方針）" : "Privacy Policy")}
              {topic === "shipping" && (locale === "JA" ? "配送料金・お届けについて" : "Shipping Rates & Delivery Info")}
              {topic === "guide" && (locale === "JA" ? "ご利用ガイド（はじめての方へ）" : "Shopping Guide")}
              {topic === "company" && (locale === "JA" ? "会社概要・実店舗のご案内" : "About Beticrom & Store Info")}
              {topic === "returns" && (locale === "JA" ? "返品・交換・特約について" : "Returns & Refund Policy")}
              {topic === "contact" && (locale === "JA" ? "お問い合わせ・カスタマーサポート" : "Customer Support")}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#59635D] hover:text-[#202824] hover:bg-black/5 transition-colors"
            aria-label="閉じる"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 text-sm text-[#202824] leading-relaxed space-y-6">
          {/* 1. 特定商取引法に基づく表記 */}
          {topic === "tokushoho" && (
            <div className="space-y-4">
              <p className="text-xs text-[#59635D]">
                「特定商取引に関する法律」第11条（通信販売についての広告）に基づき、以下の通り明示いたします。
              </p>
              <div className="border border-[#E1E6E2] rounded-xl overflow-hidden divide-y divide-[#E1E6E2] text-xs">
                <div className="grid grid-cols-3 p-3 bg-[#F7F8F5]">
                  <span className="font-bold text-[#202824]">販売事業者名</span>
                  <span className="col-span-2 text-[#59635D]">Beticrom（ベティクロム）</span>
                </div>
                <div className="grid grid-cols-3 p-3">
                  <span className="font-bold text-[#202824]">運営統括責任者</span>
                  <span className="col-span-2 text-[#59635D]">アフメド ファイヤズ (Ahmed Faiyaz)</span>
                </div>
                <div className="grid grid-cols-3 p-3 bg-[#F7F8F5]">
                  <span className="font-bold text-[#202824]">所在地</span>
                  <span className="col-span-2 text-[#59635D]">〒124-0025 東京都葛飾区西新小岩1-2-11</span>
                </div>
                <div className="grid grid-cols-3 p-3">
                  <span className="font-bold text-[#202824]">電話番号</span>
                  <span className="col-span-2 text-[#59635D]">03-5654-6417（受付時間：平日 10:00〜18:00）</span>
                </div>
                <div className="grid grid-cols-3 p-3 bg-[#F7F8F5]">
                  <span className="font-bold text-[#202824]">メールアドレス</span>
                  <span className="col-span-2 text-[#59635D]">support@beticrom.jp</span>
                </div>
                <div className="grid grid-cols-3 p-3">
                  <span className="font-bold text-[#202824]">販売価格</span>
                  <span className="col-span-2 text-[#59635D]">各商品ページに表示された税込み価格に準じます。</span>
                </div>
                <div className="grid grid-cols-3 p-3 bg-[#F7F8F5]">
                  <span className="font-bold text-[#202824]">商品代金以外の必要料金</span>
                  <div className="col-span-2 text-[#59635D] space-y-1">
                    <p>・配送料：常温便 ¥880（※常温商品 ¥6,500以上で常温配送料無料）</p>
                    <p>・クール便手数料：冷蔵・冷凍商品1箱につき +¥330</p>
                    <p>・決済手数料：代金引換 ¥330、コンビニ決済 ¥110</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 p-3">
                  <span className="font-bold text-[#202824]">お支払い方法</span>
                  <span className="col-span-2 text-[#59635D]">クレジットカード、PayPay、コンビニ決済、銀行振込、代金引換</span>
                </div>
                <div className="grid grid-cols-3 p-3 bg-[#F7F8F5]">
                  <span className="font-bold text-[#202824]">商品のお届け時期</span>
                  <span className="col-span-2 text-[#59635D]">ご注文確認後（銀行振込・コンビニ決済はご入金確認後）、通常1〜3営業日以内にヤマト運輸にて発送いたします。</span>
                </div>
                <div className="grid grid-cols-3 p-3">
                  <span className="font-bold text-[#202824]">返品・キャンセルについて</span>
                  <span className="col-span-2 text-[#59635D]">食品という商品の性質上、お客様都合による返品・交換はお受けいたしかねます。万一、商品不良や品違いがございましたら、商品到着後2日以内にご連絡ください。</span>
                </div>
              </div>
            </div>
          )}

          {/* 2. プライバシーポリシー */}
          {topic === "privacy" && (
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-[#12633D]">個人情報の保護に関する基本方針</h3>
              <p>
                Beticrom（以下、「当店」といいます）は、お客様のプライバシーを尊重し、お客様の個人情報を適切に保護・管理するため、個人情報保護法および関連法令を遵守します。
              </p>
              <div className="space-y-3">
                <h4 className="font-bold text-xs text-[#202824]">1. 取得する情報</h4>
                <p className="text-xs text-[#59635D]">
                  当店では、商品のご注文、会員登録、お問い合わせ等の際に、氏名、住所、電話番号、メールアドレス、配送先情報等をご提供いただきます。クレジットカード情報は決済代行会社（Stripe等）にて安全に暗号化処理され、当店サーバー内に生カード情報は保存されません。
                </p>
                <h4 className="font-bold text-xs text-[#202824]">2. 利用目的</h4>
                <p className="text-xs text-[#59635D]">
                  取得した個人情報は、商品の梱包・発送、ご注文内容の確認・ご連絡、カスタマーサポート、法令に基づく義務の履行のみに使用いたします。
                </p>
                <h4 className="font-bold text-xs text-[#202824]">3. 第三者への提供</h4>
                <p className="text-xs text-[#59635D]">
                  配送業者（ヤマト運輸株式会社）および正規の決済代行業者への業務委託を除き、お客様の同意なく第三者に個人情報を提供・開示いたしません。
                </p>
              </div>
            </div>
          )}

          {/* 3. 配送料金・お届けについて */}
          {topic === "shipping" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-[#E1E6E2] bg-[#F7F8F5]">
                <h3 className="font-bold text-sm text-[#12633D] mb-1">ヤマト運輸 温度帯分別配送の仕組み</h3>
                <p className="text-xs text-[#59635D]">
                  当店では食品の鮮度と安全を保つため、ヤマト運輸の規定に基づき「常温便」「冷蔵便」「冷凍便」の温度帯ごとに専用箱に分けて梱包・発送しております。
                </p>
              </div>

              <div className="border border-[#E1E6E2] rounded-xl overflow-hidden divide-y divide-[#E1E6E2] text-xs">
                <div className="p-3 bg-white">
                  <div className="flex items-center justify-between font-bold text-[#202824] mb-1">
                    <span>常温便（米・粉・スパイス・豆類・缶詰等）</span>
                    <span className="text-[#12633D]">¥880（全国一律）</span>
                  </div>
                  <p className="text-[#59635D]">
                    常温商品合計が <strong>¥6,500（税込）以上</strong> の場合、常温便の配送料は <strong>無料</strong> となります。
                  </p>
                </div>
                <div className="p-3 bg-white">
                  <div className="flex items-center justify-between font-bold text-[#202824] mb-1">
                    <span>冷蔵便（チルド食品・生鮮野菜・特定乳製品等）</span>
                    <span className="text-[#12633D]">基本送料 ¥880 ＋ クール手数料 ¥330</span>
                  </div>
                  <p className="text-[#59635D]">
                    0℃〜10℃の保冷コンテナで鮮度を維持してお届けします。
                  </p>
                </div>
                <div className="p-3 bg-white">
                  <div className="flex items-center justify-between font-bold text-[#202824] mb-1">
                    <span>冷凍便（ハラール肉・冷凍パラタ・魚介等）</span>
                    <span className="text-[#12633D]">基本送料 ¥880 ＋ 冷凍手数料 ¥330（計 ¥1,210）</span>
                  </div>
                  <p className="text-[#59635D]">
                    -15℃以下の専用冷凍便でお届けします。※冷凍便は品質保持のため常温便の送料無料特典の対象外となります。
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 4. ご利用ガイド */}
          {topic === "guide" && (
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-[#12633D]">Beticrom でのお買い物の流れ</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl border border-[#E1E6E2] bg-[#F7F8F5]">
                  <span className="inline-block w-6 h-6 rounded-full bg-[#12633D] text-white text-xs font-bold text-center leading-6 mb-2">1</span>
                  <h4 className="font-bold text-xs text-[#202824] mb-1">商品を選ぶ</h4>
                  <p className="text-[11px] text-[#59635D]">
                    肉・魚、スパイス、米、冷凍スナックなど、欲しい商品をカートに追加します。ハラール基準や温度帯（常温・冷凍）も明記されています。
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-[#E1E6E2] bg-[#F7F8F5]">
                  <span className="inline-block w-6 h-6 rounded-full bg-[#12633D] text-white text-xs font-bold text-center leading-6 mb-2">2</span>
                  <h4 className="font-bold text-xs text-[#202824] mb-1">お届け先・日時指定</h4>
                  <p className="text-[11px] text-[#59635D]">
                    日本の住所を入力し、ご希望のお届け時間帯（午前中、14-16時、16-18時、18-20時、19-21時）を選択します。
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-[#E1E6E2] bg-[#F7F8F5]">
                  <span className="inline-block w-6 h-6 rounded-full bg-[#12633D] text-white text-xs font-bold text-center leading-6 mb-2">3</span>
                  <h4 className="font-bold text-xs text-[#202824] mb-1">決済・ヤマト便受取</h4>
                  <p className="text-[11px] text-[#59635D]">
                    クレジットカード、PayPay、コンビニ決済、銀行振込、代金引換から安全にお支払い。ヤマト運輸が丁寧にお届けします。
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 5. 会社概要・店舗案内 */}
          {topic === "company" && (
            <div className="space-y-4">
              <div className="border border-[#E1E6E2] rounded-xl overflow-hidden divide-y divide-[#E1E6E2] text-xs">
                <div className="grid grid-cols-3 p-3 bg-[#F7F8F5]">
                  <span className="font-bold text-[#202824]">屋号・ストア名</span>
                  <span className="col-span-2 text-[#59635D]">Beticrom（ベティクロム）</span>
                </div>
                <div className="grid grid-cols-3 p-3">
                  <span className="font-bold text-[#202824]">公式ドメイン</span>
                  <span className="col-span-2 text-[#59635D]">beticrom.jp</span>
                </div>
                <div className="grid grid-cols-3 p-3 bg-[#F7F8F5]">
                  <span className="font-bold text-[#202824]">事業内容</span>
                  <span className="col-span-2 text-[#59635D]">ハラール認証食品・南アジア食材・香辛料・冷凍食品の輸入および国内小売・EC販売</span>
                </div>
                <div className="grid grid-cols-3 p-3">
                  <span className="font-bold text-[#202824]">実店舗所在地</span>
                  <span className="col-span-2 text-[#59635D]">〒124-0025 東京都葛飾区西新小岩1-2-11</span>
                </div>
                <div className="grid grid-cols-3 p-3 bg-[#F7F8F5]">
                  <span className="font-bold text-[#202824]">最寄り駅</span>
                  <span className="col-span-2 text-[#59635D]">JR総武線「新小岩駅」北口より徒歩2分</span>
                </div>
                <div className="grid grid-cols-3 p-3">
                  <span className="font-bold text-[#202824]">営業時間</span>
                  <span className="col-span-2 text-[#59635D]">10:00〜21:00（年中無休）※オンライン注文は24時間受付</span>
                </div>
              </div>
            </div>
          )}

          {/* 6. 返品・特約 */}
          {topic === "returns" && (
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-[#C92A2A]">食品の返品・交換特約について</h3>
              <p className="text-xs text-[#59635D]">
                当店で扱う生鮮肉・冷凍食品・スパイス・穀類等の食品は衛生管理上、お客様都合による返品・交換・キャンセルをお受けできません。何卒ご了承ください。
              </p>
              <div className="p-4 rounded-xl border border-[#E1E6E2] bg-[#F7F8F5] space-y-2 text-xs">
                <h4 className="font-bold text-[#202824]">万一の不良品・品違い時のご対応</h4>
                <p className="text-[#59635D]">
                  ・商品の破損・解凍事故、あるいは注文と異なる商品が届いた場合は、<strong>商品到着後2日以内</strong>にメールまたはお電話にてご連絡ください。<br />
                  ・送料当店負担（着払い）にて速やかに良品と交換、または返金対応をさせていただきます。
                </p>
              </div>
            </div>
          )}

          {/* 7. お問い合わせ */}
          {topic === "contact" && (
            <div className="space-y-4">
              <p className="text-xs text-[#59635D]">
                商品に関するご質問、大口仕入れ、配送状況のご確認など、お気軽にお問い合わせください。
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-4 rounded-xl border border-[#E1E6E2] bg-[#F7F8F5]">
                  <div className="flex items-center gap-2 font-bold text-[#12633D] mb-1">
                    <Phone size={16} />
                    <span>お電話でのお問い合わせ</span>
                  </div>
                  <p className="text-sm font-bold text-[#202824]">03-5654-6417</p>
                  <p className="text-[11px] text-[#59635D] mt-1">受付：平日 10:00〜18:00（日本語・英語・ベンガル語対応）</p>
                </div>
                <div className="p-4 rounded-xl border border-[#E1E6E2] bg-[#F7F8F5]">
                  <div className="flex items-center gap-2 font-bold text-[#12633D] mb-1">
                    <Mail size={16} />
                    <span>メールでのお問い合わせ</span>
                  </div>
                  <p className="text-sm font-bold text-[#202824]">support@beticrom.jp</p>
                  <p className="text-[11px] text-[#59635D] mt-1">24時間受付（通常24時間以内にご返答）</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#E1E6E2] bg-[#F7F8F5] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white transition-opacity hover:opacity-90 shadow-sm"
            style={{ background: "#12633D" }}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
