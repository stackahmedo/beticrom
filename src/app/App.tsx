import { useState, useEffect } from "react";
import {
  Home, LayoutGrid, Tag, ShoppingCart, User, Lock, X, AlertCircle,
} from "lucide-react";

import {
  ALL_PRODUCTS,
  type Product,
  type Locale,
} from "../data/products";

import type { View, CartItem, LegalTopic } from "./types";
import { Header } from "./components/Header";
import { Homepage } from "./components/Homepage";
import { CategoryPage } from "./components/CategoryPage";
import { PDPPage } from "./components/PDPPage";
import { CartPage } from "./components/CartPage";
import { CheckoutPage } from "./components/CheckoutPage";
import { AccountPage } from "./components/AccountPage";
import { AdminPanel } from "./components/AdminPanel";
import { Footer } from "./components/Footer";
import { LegalModal } from "./components/LegalModal";

const ADMIN_PASSCODE = "beticrom-admin-2026";

export default function App() {
  const [locale, setLocale] = useState<Locale>("JA");
  const [view, setView] = useState<View>("home");
  const [selectedProductId, setSelectedProductId] = useState<string>("0023"); // default to mutton shank
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [legalModalTopic, setLegalModalTopic] = useState<LegalTopic>(null);

  // Admin authentication state
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPromptOpen, setAdminPromptOpen] = useState(false);
  const [adminPasscodeInput, setAdminPasscodeInput] = useState("");
  const [adminAuthError, setAdminAuthError] = useState("");

  // ── URL Hash Synchronization ──────────────────────────────────────────────
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "");
      if (!hash) return;

      if (hash.startsWith("product=")) {
        const id = hash.replace("product=", "");
        if (ALL_PRODUCTS.some(p => p.id === id)) {
          setSelectedProductId(id);
          setView("pdp");
        }
      } else if (hash.startsWith("category=")) {
        const cat = hash.replace("category=", "");
        setSelectedCategory(cat);
        setView("category");
      } else if (hash === "cart") {
        setView("cart");
      } else if (hash === "checkout") {
        setView("checkout");
      } else if (hash === "account") {
        setView("account");
      } else if (hash === "admin") {
        if (!isAdminAuthenticated) {
          setAdminPromptOpen(true);
        } else {
          setView("admin");
        }
      } else if (hash === "guide") {
        setLegalModalTopic("guide");
      } else if (hash === "tokushoho") {
        setLegalModalTopic("tokushoho");
      } else if (hash === "shipping") {
        setLegalModalTopic("shipping");
      }
    };

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [isAdminAuthenticated]);

  // Update hash when view or primary state changes
  useEffect(() => {
    if (view === "home") {
      window.history.replaceState(null, "", window.location.pathname);
    } else if (view === "pdp") {
      window.history.replaceState(null, "", `#product=${selectedProductId}`);
    } else if (view === "category") {
      window.history.replaceState(null, "", `#category=${selectedCategory}`);
    } else if (view === "cart") {
      window.history.replaceState(null, "", "#cart");
    } else if (view === "checkout") {
      window.history.replaceState(null, "", "#checkout");
    } else if (view === "account") {
      window.history.replaceState(null, "", "#account");
    } else if (view === "admin") {
      window.history.replaceState(null, "", "#admin");
    }
  }, [view, selectedProductId, selectedCategory]);

  // Scroll to top on view change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [view, selectedProductId]);

  // ── Cart Operations ────────────────────────────────────────────────────────
  const addToCart = (product: Product, quantity = 1) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [...prev, { product, quantity }];
    });
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCartItems(prev => prev.filter(item => item.product.id !== productId));
    } else {
      setCartItems(prev =>
        prev.map(item => (item.product.id === productId ? { ...item, quantity } : item))
      );
    }
  };

  const removeCartItem = (productId: string) => {
    setCartItems(prev => prev.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  // ── Admin Authentication Handler ───────────────────────────────────────────
  const handleAdminAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPasscodeInput === ADMIN_PASSCODE) {
      setIsAdminAuthenticated(true);
      setAdminPromptOpen(false);
      setAdminAuthError("");
      setView("admin");
    } else {
      setAdminAuthError("パスコードが一致しません。正しい管理者パスコードを入力してください。");
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#202824] flex flex-col font-sans selection:bg-[#12633D]/20">
      {/* If in Admin View */}
      {view === "admin" && isAdminAuthenticated ? (
        <AdminPanel
          setView={setView}
          onLogout={() => {
            setIsAdminAuthenticated(false);
            setView("home");
          }}
        />
      ) : (
        <>
          {/* Public Storefront Header */}
          <Header
            locale={locale}
            setLocale={setLocale}
            cartCount={cartCount}
            view={view}
            setView={setView}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onSelectProduct={id => {
              setSelectedProductId(id);
              setView("pdp");
            }}
            onOpenLegal={topic => setLegalModalTopic(topic)}
          />

          {/* Main Routing Body */}
          <main className="flex-1">
            {view === "home" && (
              <Homepage
                locale={locale}
                onAdd={addToCart}
                onSelectProduct={id => {
                  setSelectedProductId(id);
                  setView("pdp");
                }}
                setView={setView}
                setSelectedCategory={setSelectedCategory}
                onOpenLegal={topic => setLegalModalTopic(topic)}
              />
            )}

            {view === "category" && (
              <CategoryPage
                locale={locale}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onAdd={addToCart}
                onSelectProduct={id => {
                  setSelectedProductId(id);
                  setView("pdp");
                }}
                setView={setView}
              />
            )}

            {view === "pdp" && (
              <PDPPage
                locale={locale}
                productId={selectedProductId}
                onAdd={addToCart}
                onSelectProduct={setSelectedProductId}
                setView={setView}
                setSelectedCategory={setSelectedCategory}
                onOpenLegal={topic => setLegalModalTopic(topic)}
              />
            )}

            {view === "cart" && (
              <CartPage
                locale={locale}
                cartItems={cartItems}
                onUpdateQty={updateCartQuantity}
                onRemove={removeCartItem}
                setView={setView}
                onOpenLegal={topic => setLegalModalTopic(topic)}
              />
            )}

            {view === "checkout" && (
              <CheckoutPage
                locale={locale}
                cartItems={cartItems}
                onClearCart={clearCart}
                setView={setView}
              />
            )}

            {view === "account" && (
              <AccountPage
                locale={locale}
                onAdd={addToCart}
                onSelectProduct={id => {
                  setSelectedProductId(id);
                  setView("pdp");
                }}
                setView={setView}
              />
            )}
          </main>

          {/* Public Storefront Footer */}
          <Footer
            locale={locale}
            onOpenLegal={topic => setLegalModalTopic(topic)}
            setView={setView}
            onOpenAdminPrompt={() => {
              if (isAdminAuthenticated) {
                setView("admin");
              } else {
                setAdminPromptOpen(true);
              }
            }}
          />

          {/* Mobile Sticky Bottom Navigation */}
          <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#E1E6E2] z-40 flex items-center justify-around py-1 shadow-lg">
            <button
              onClick={() => {
                setSelectedCategory("all");
                setView("home");
              }}
              className={`flex flex-col items-center gap-0.5 py-1.5 px-3 text-[10px] font-bold cursor-pointer transition-colors ${
                view === "home" ? "text-[#12633D]" : "text-[#59635D]"
              }`}
            >
              <Home size={18} />
              <span>ホーム</span>
            </button>

            <button
              onClick={() => {
                setSelectedCategory("all");
                setView("category");
              }}
              className={`flex flex-col items-center gap-0.5 py-1.5 px-3 text-[10px] font-bold cursor-pointer transition-colors ${
                view === "category" ? "text-[#12633D]" : "text-[#59635D]"
              }`}
            >
              <LayoutGrid size={18} />
              <span>商品一覧</span>
            </button>

            <button
              onClick={() => {
                setSelectedCategory("deals");
                setView("category");
              }}
              className="flex flex-col items-center gap-0.5 py-1.5 px-3 text-[10px] font-bold text-[#C92A2A] cursor-pointer"
            >
              <Tag size={18} />
              <span>セール</span>
            </button>

            <button
              onClick={() => setView("cart")}
              className={`flex flex-col items-center gap-0.5 py-1.5 px-3 text-[10px] font-bold cursor-pointer relative transition-colors ${
                view === "cart" ? "text-[#12633D]" : "text-[#59635D]"
              }`}
            >
              <ShoppingCart size={18} />
              <span>カート</span>
              {cartCount > 0 && (
                <span className="absolute top-1 right-2 w-4 h-4 rounded-full bg-[#12633D] text-white text-[9px] font-extrabold flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setView("account")}
              className={`flex flex-col items-center gap-0.5 py-1.5 px-3 text-[10px] font-bold cursor-pointer transition-colors ${
                view === "account" ? "text-[#12633D]" : "text-[#59635D]"
              }`}
            >
              <User size={18} />
              <span>マイページ</span>
            </button>
          </nav>
        </>
      )}

      {/* Legal & Policy Modal */}
      <LegalModal
        topic={legalModalTopic}
        onClose={() => setLegalModalTopic(null)}
      />

      {/* Admin Passcode Gate Modal */}
      {adminPromptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E1E6E2]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-[#12633D] font-extrabold text-sm">
                <Lock size={16} />
                <span>Beticrom 管理者認証</span>
              </div>
              <button
                onClick={() => {
                  setAdminPromptOpen(false);
                  setAdminAuthError("");
                }}
                className="text-[#59635D] hover:text-[#202824] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-[#59635D] leading-relaxed mb-4">
              社内管理機能へのアクセスには管理者パスコードが必要です。スタッフ認証を行ってください。<br />
              <span className="text-[10px] text-[#12633D] font-mono mt-1 block">
                （デモ用認証パスコード: beticrom-admin-2026）
              </span>
            </p>

            <form onSubmit={handleAdminAuthSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#202824] block mb-1">
                  管理者パスコード
                </label>
                <input
                  type="password"
                  value={adminPasscodeInput}
                  onChange={e => setAdminPasscodeInput(e.target.value)}
                  placeholder="パスコードを入力"
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E1E6E2] text-xs outline-none focus:border-[#12633D]"
                  autoFocus
                />
                {adminAuthError && (
                  <p className="text-xs text-[#C92A2A] font-medium mt-1 flex items-center gap-1">
                    <AlertCircle size={12} />
                    <span>{adminAuthError}</span>
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAdminPromptOpen(false);
                    setAdminAuthError("");
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-[#E1E6E2] text-xs font-bold text-[#59635D] hover:bg-[#F7F8F5] cursor-pointer"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#12633D] text-white text-xs font-bold hover:bg-[#0b4f2a] shadow-xs cursor-pointer"
                >
                  ログイン
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
