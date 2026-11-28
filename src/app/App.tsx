import { useState, useEffect } from "react";
import {
  Home, LayoutGrid, Tag, ShoppingCart, User,
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
import { Footer } from "./components/Footer";
import { LegalModal } from "./components/LegalModal";
import { ProductDetailModal } from "./components/ProductDetailModal";
import { Toaster } from "./components/ui/sonner";
import { AdminApp } from "../admin/AdminApp";

export default function App() {
  const [locale, setLocale] = useState<Locale>("JA");
  const [view, setView] = useState<View>("home");
  const [selectedProductId, setSelectedProductId] = useState<string>("0023"); // default to mutton shank
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [legalModalTopic, setLegalModalTopic] = useState<LegalTopic>(null);
  const [popupProduct, setPopupProduct] = useState<Product | null>(null);

  const handleOpenProductPopup = (productOrId: Product | string) => {
    const p = typeof productOrId === "string"
      ? ALL_PRODUCTS.find(item => item.id === productOrId)
      : productOrId;
    if (p) {
      setPopupProduct(p);
    }
  };

  // ── URL Hash Synchronization ──────────────────────────────────────────────
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.pathname.startsWith("/admin")) {
        setView("admin");
        return;
      }
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
        setView("admin");
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
  }, []);

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

  return (
    <div className="min-h-screen bg-white text-[#202824] flex flex-col font-sans selection:bg-[#12633D]/20">
      <Toaster richColors position="top-right" />
      {/* If in Admin View */}
      {view === "admin" ? (
        <AdminApp
          onBackToStore={() => {
            if (window.location.pathname.startsWith("/admin")) {
              window.history.replaceState(null, "", "/");
            }
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

          {/* Main Routing Body with Smooth Page Transitions */}
          <main key={view} className="flex-1 animate-view-ltr">
            {view === "home" && (
              <Homepage
                locale={locale}
                onAdd={addToCart}
                onSelectProduct={id => {
                  setSelectedProductId(id);
                  setView("pdp");
                }}
                onOpenProductPopup={handleOpenProductPopup}
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
                onOpenProductPopup={handleOpenProductPopup}
                setView={setView}
                onOpenLegal={topic => setLegalModalTopic(topic)}
              />
            )}

            {view === "pdp" && (
              <PDPPage
                locale={locale}
                productId={selectedProductId}
                onAdd={addToCart}
                onSelectProduct={setSelectedProductId}
                onOpenProductPopup={handleOpenProductPopup}
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
                onOpenProductPopup={handleOpenProductPopup}
                setView={setView}
              />
            )}
          </main>

          {/* Public Storefront Footer */}
          <Footer
            locale={locale}
            onOpenLegal={topic => setLegalModalTopic(topic)}
            setView={setView}
            setSelectedCategory={setSelectedCategory}
            onOpenAdminPrompt={() => setView("admin")}
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

      {/* Product Detail Pop-Up Modal */}
      {popupProduct && (
        <ProductDetailModal
          product={popupProduct}
          locale={locale}
          onClose={() => setPopupProduct(null)}
          onAdd={addToCart}
          onGoToPDP={id => {
            setSelectedProductId(id);
            setView("pdp");
            setPopupProduct(null);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      )}

      {/* Legal & Policy Modal */}
      <LegalModal
        locale={locale}
        topic={legalModalTopic}
        onClose={() => setLegalModalTopic(null)}
      />
    </div>
  );
}
