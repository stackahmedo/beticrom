import { useState } from "react";
import { User, Package, Clock, MapPin, ChevronRight, ShoppingBag } from "lucide-react";
import { ALL_PRODUCTS, type Product, type Locale } from "../../data/products";
import { ProductCard } from "./ProductCard";
import type { View } from "../types";

interface AccountPageProps {
  locale: Locale;
  onAdd: (product: Product) => void;
  onSelectProduct: (id: string) => void;
  onOpenProductPopup?: (product: Product) => void;
  setView: (v: View) => void;
}

export function AccountPage({
  locale,
  onAdd,
  onSelectProduct,
  onOpenProductPopup,
  setView,
}: AccountPageProps) {
  const recentOrders = [
    {
      id: "BC-2026-892104",
      date: "2026年10月12日",
      status: "配達完了（ヤマト宅急便）",
      total: "¥6,890",
      items: "マトン スネ肉 骨付きシャンク 1kg, Kaalar バスマティ米 5kg ほか3点",
    },
    {
      id: "BC-2026-874012",
      date: "2026年9月28日",
      status: "配達完了（ヤマト冷凍クール便）",
      total: "¥4,580",
      items: "アループリ 10枚入, ダールプリ 10枚入 ほか2点",
    },
  ];

  const reorderEssentials = ALL_PRODUCTS.slice(0, 6);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24 sm:pb-16 space-y-8">
      {/* User Header */}
      <div className="bg-white border border-[#E1E6E2] rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#12633D] text-white flex items-center justify-center font-extrabold text-xl shadow-xs">
            R
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-[#202824]">
              Rahman Ahmed 様
            </h1>
            <p className="text-xs text-[#59635D]">
              会員ID: #BC-MEMBER-7821 · 東京都葛飾区
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-[#F7F8F5] border border-[#E1E6E2] text-xs text-center">
            <span className="text-[#59635D] block text-[10px]">保有クーポン</span>
            <span className="font-bold text-[#12633D]">BETICROM500</span>
          </div>
        </div>
      </div>

      {/* Order History */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-extrabold text-[#202824]">
            最近のご注文履歴
          </h2>
          <span className="text-xs text-[#59635D]">過去2件の注文</span>
        </div>

        <div className="space-y-3">
          {recentOrders.map(order => (
            <div
              key={order.id}
              className="bg-white border border-[#E1E6E2] rounded-xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-[#12633D]">
                    {order.id}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-[#12633D]">
                    {order.status}
                  </span>
                </div>
                <p className="text-xs text-[#59635D]">{order.date}</p>
                <p className="text-xs font-medium text-[#202824]">{order.items}</p>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E1E6E2]">
                <span className="text-base font-extrabold text-[#202824]">
                  {order.total}
                </span>
                <button
                  type="button"
                  onClick={() => onAdd(ALL_PRODUCTS[0])}
                  className="px-4 py-2 rounded-lg bg-[#12633D] text-white text-xs font-bold hover:bg-[#0b4f2a] transition-all cursor-pointer shadow-xs"
                >
                  再注文する
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reorder Essentials */}
      <div className="space-y-4">
        <h2 className="text-base sm:text-lg font-extrabold text-[#202824]">
          よく購入される定番食材
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {reorderEssentials.map(p => (
            <ProductCard
              key={p.id}
              product={p}
              locale={locale}
              onAdd={onAdd}
              onView={() => {
                if (onOpenProductPopup) {
                  onOpenProductPopup(p);
                } else {
                  onSelectProduct(p.id);
                  setView("pdp");
                }
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
