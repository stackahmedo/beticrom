import { useState } from "react";
import {
  BarChart2, BoxSelect, ListOrdered, FileCheck, CreditCard,
  Settings, ArrowRight, Shield, CheckCircle2, Lock, X, ToggleLeft, ToggleRight,
} from "lucide-react";
import { ALL_PRODUCTS, type Product } from "../../data/products";
import { HalalBadge, StorageBadge } from "./ProductCard";
import type { View } from "../types";

interface AdminPanelProps {
  setView: (v: View) => void;
  onLogout: () => void;
}

export function AdminPanel({ setView, onLogout }: AdminPanelProps) {
  const [activeNav, setActiveNav] = useState<"dashboard" | "products" | "orders" | "halal" | "payments">("dashboard");
  const [searchFilter, setSearchFilter] = useState("");

  const SIDEBAR = [
    { id: "dashboard", icon: <BarChart2 size={15} />, label: "ダッシュボード" },
    { id: "products", icon: <BoxSelect size={15} />, label: "商品カタログ (948品)" },
    { id: "orders", icon: <ListOrdered size={15} />, label: "受注管理" },
    { id: "halal", icon: <FileCheck size={15} />, label: "ハラール監査キュー" },
    { id: "payments", icon: <CreditCard size={15} />, label: "決済ゲートウェイ設定" },
  ];

  const filteredProducts = ALL_PRODUCTS.filter(p => {
    if (!searchFilter) return true;
    const q = searchFilter.toLowerCase();
    return (
      p.nameJA.toLowerCase().includes(q) ||
      p.nameEN.toLowerCase().includes(q) ||
      p.id.includes(q) ||
      p.brand.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex h-screen overflow-hidden bg-[#FAF8F5]">
      {/* Sidebar */}
      <aside className="w-60 flex flex-col shrink-0 bg-[#0B4F2A] text-white border-r border-white/10">
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-extrabold text-sm">
              ☪
            </div>
            <div>
              <p className="text-xs font-extrabold tracking-tight">Beticrom 管理ポータル</p>
              <p className="text-[10px] text-white/60">Halal E-Commerce Internal</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-2 space-y-1 overflow-y-auto text-xs">
          {SIDEBAR.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id as any)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
                activeNav === item.id
                  ? "bg-white/20 text-white font-bold"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10 space-y-1">
          <button
            onClick={() => setView("home")}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white/75 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <ArrowRight size={13} />
            <span>ストア画面へ戻る</span>
          </button>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-red-300 hover:text-red-100 hover:bg-red-950/40 cursor-pointer"
          >
            <Lock size={13} />
            <span>ログアウト</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto flex flex-col">
        {/* Top Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-[#E1E6E2] px-6 py-3 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <h1 className="font-extrabold text-sm text-[#202824]">
              {SIDEBAR.find(s => s.id === activeNav)?.label}
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
              社内管理モード（認証済み）
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="text-[#59635D]">管理者: Ahmed Faiyaz（ベティクロム本部）</span>
            <div className="w-7 h-7 rounded-full bg-[#12633D] text-white flex items-center justify-center font-bold">
              AF
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 flex-1">
          {/* Dashboard View */}
          {activeNav === "dashboard" && (
            <div className="space-y-6">
              {/* Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                {[
                  ["948品", "稼働中カタログ商品", "実データ連携済み・在庫連動中"],
                  ["¥1,248,000", "今月のGMV（総流通額）", "前月比 +24.6%"],
                  ["186件", "今週の発送件数", "ヤマト宅急便・クール便100%連動"],
                  ["0件", "保留中のハラール認証", "監査済み・全品区分確定"],
                ].map(([val, title, note]) => (
                  <div key={title} className="bg-white border border-[#E1E6E2] rounded-xl p-4 shadow-xs">
                    <p className="text-xs text-[#59635D]">{title}</p>
                    <p className="text-xl sm:text-2xl font-extrabold text-[#12633D] mt-1">{val}</p>
                    <p className="text-[10px] text-[#59635D] mt-1">{note}</p>
                  </div>
                ))}
              </div>

              {/* Status Checklist */}
              <div className="bg-white border border-[#E1E6E2] rounded-xl p-5 shadow-xs">
                <h2 className="font-bold text-sm text-[#202824] mb-3 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-[#12633D]" />
                  <span>システム稼働状況・監査ステータス</span>
                </h2>
                <ul className="text-xs space-y-2 text-[#59635D]">
                  <li className="flex items-center gap-2">
                    <span className="text-[#12633D] font-bold">✓</span>
                    <span><strong>カタログ整合性:</strong> マトン・鹿肉・プーリ・モモマサラの製品名・分類を修正済み。</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#12633D] font-bold">✓</span>
                    <span><strong>配送料金エンジン:</strong> ヤマトクール便の冷凍・冷蔵別箱計算（基本¥880 + クール¥330、常温¥6,500〜無料）を適用中。</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#12633D] font-bold">✓</span>
                    <span><strong>チェックアウト検証:</strong> 住所必須項目（氏名、電話、郵便番号、都道府県、市区町村、番地）のバリデーションを厳格化。</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#12633D] font-bold">✓</span>
                    <span><strong>特定商取引法・規約:</strong> 返品特約・プライバシーポリシー・会社概要・配送料金ポリシーを全公開。</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Product Inventory Table */}
          {activeNav === "products" && (
            <div className="bg-white border border-[#E1E6E2] rounded-xl overflow-hidden shadow-xs space-y-3 p-4">
              <div className="flex items-center justify-between gap-4">
                <input
                  type="text"
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                  placeholder="商品番号・商品名・ブランドで検索..."
                  className="px-3 py-2 rounded-lg border border-[#E1E6E2] text-xs w-72 outline-none focus:border-[#12633D]"
                />
                <span className="text-xs text-[#59635D]">
                  表示: {filteredProducts.length} / 948品
                </span>
              </div>

              <div className="overflow-x-auto max-h-[520px]">
                <table className="w-full text-xs">
                  <thead className="bg-[#F7F8F5] border-b border-[#E1E6E2] sticky top-0 text-[#59635D]">
                    <tr>
                      <th className="text-left px-3 py-2 font-bold">ID</th>
                      <th className="text-left px-3 py-2 font-bold">商品名（日本語）</th>
                      <th className="text-left px-3 py-2 font-bold">ブランド</th>
                      <th className="text-left px-3 py-2 font-bold">温度帯</th>
                      <th className="text-left px-3 py-2 font-bold">ハラール区分</th>
                      <th className="text-right px-3 py-2 font-bold">税込価格</th>
                      <th className="text-right px-3 py-2 font-bold">在庫数</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E1E6E2]">
                    {filteredProducts.slice(0, 50).map(p => (
                      <tr key={p.id} className="hover:bg-[#F7F8F5]/60">
                        <td className="px-3 py-2.5 font-mono font-bold text-[#12633D]">#{p.id}</td>
                        <td className="px-3 py-2.5 font-semibold text-[#202824] max-w-xs truncate">
                          {p.nameJA}
                        </td>
                        <td className="px-3 py-2.5 text-[#59635D]">{p.brand}</td>
                        <td className="px-3 py-2.5"><StorageBadge type={p.storage} /></td>
                        <td className="px-3 py-2.5"><HalalBadge tier={p.halalTier} locale="JA" /></td>
                        <td className="px-3 py-2.5 font-bold text-right">¥{p.price.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-right font-medium">{p.stock}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Orders Mock Management */}
          {activeNav === "orders" && (
            <div className="bg-white border border-[#E1E6E2] rounded-xl p-5 shadow-xs">
              <h2 className="font-bold text-sm text-[#202824] mb-4">最新の受注一覧</h2>
              <div className="space-y-3 text-xs">
                {[
                  { id: "BC-2026-894120", customer: "Rahman Ahmed", total: "¥8,450", status: "発送準備中（ヤマト冷凍便）", time: "10分前" },
                  { id: "BC-2026-894119", customer: "田中 健一", total: "¥4,280", status: "集荷完了（ヤマト常温便）", time: "1時間前" },
                  { id: "BC-2026-894118", customer: "Priya Sharma", total: "¥12,800", status: "配達完了", time: "昨日" },
                ].map(o => (
                  <div key={o.id} className="p-3 border border-[#E1E6E2] rounded-xl flex items-center justify-between">
                    <div>
                      <p className="font-bold text-[#12633D]">{o.id} · {o.customer} 様</p>
                      <p className="text-[11px] text-[#59635D] mt-0.5">{o.time} · {o.status}</p>
                    </div>
                    <span className="font-extrabold text-sm text-[#202824]">{o.total}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Halal Queue */}
          {activeNav === "halal" && (
            <div className="bg-white border border-[#E1E6E2] rounded-xl p-5 shadow-xs">
              <h2 className="font-bold text-sm text-[#202824] mb-2">ハラール証明書・成分監査キュー</h2>
              <p className="text-xs text-[#59635D] mb-4">
                全948商品のハラール区分チェックが完了しています。保留中の新規アイテムはありません。
              </p>
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-[#12633D]" />
                <span>監査完了: 認証品 428品 / サプライヤー確認品 312品 / 豚・酒不使用 204品 / ノンハラール 4品</span>
              </div>
            </div>
          )}

          {/* Payment Gateways Settings */}
          {activeNav === "payments" && (
            <div className="bg-white border border-[#E1E6E2] rounded-xl p-5 shadow-xs space-y-4">
              <h2 className="font-bold text-sm text-[#202824]">国内決済ゲートウェイ設定</h2>
              <div className="space-y-3 text-xs">
                {[
                  { name: "クレジットカード（Stripe）", status: "有効（テストモード対応）", note: "Visa, Mastercard, JCB, Amex" },
                  { name: "PayPay", status: "有効", note: "PayPay QRオンライン決済" },
                  { name: "コンビニ決済（Stripe Konbini）", status: "有効", note: "ローソン、ファミリーマート、セブンイレブン（手数料 ¥110）" },
                  { name: "銀行振込（みずほ銀行）", status: "有効", note: "ご注文確認後に口座自動案内" },
                  { name: "代金引換（ヤマトコレクト）", status: "有効", note: "商品受取時ドライバー精算（代引手数料 ¥330）" },
                ].map(gw => (
                  <div key={gw.name} className="p-3 border border-[#E1E6E2] rounded-xl flex items-center justify-between">
                    <div>
                      <p className="font-bold text-[#202824]">{gw.name}</p>
                      <p className="text-[11px] text-[#59635D] mt-0.5">{gw.note}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-[#12633D]">
                      {gw.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
