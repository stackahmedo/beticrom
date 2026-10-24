import { useRef, useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { type Product, type Locale } from "../../data/products";
import { ProductCard } from "./ProductCard";

interface ProductCarouselProps {
  products: Product[];
  locale: Locale;
  onAdd: (product: Product) => void;
  onViewProduct: (id: string) => void;
  showUnitPrice?: boolean;
  className?: string;
}

export function ProductCarousel({
  products,
  locale,
  onAdd,
  onViewProduct,
  showUnitPrice = true,
  className = "",
}: ProductCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  // Check scroll position to toggle navigation buttons
  const updateScrollButtons = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 8);
    // Allow a small 4px threshold for subpixel scrolling rounding
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 8);
  }, []);

  useEffect(() => {
    updateScrollButtons();
    const el = scrollRef.current;
    if (!el) return;

    el.addEventListener("scroll", updateScrollButtons, { passive: true });
    window.addEventListener("resize", updateScrollButtons);

    return () => {
      el.removeEventListener("scroll", updateScrollButtons);
      window.removeEventListener("resize", updateScrollButtons);
    };
  }, [updateScrollButtons, products]);

  // Smooth scroll left or right
  const handleScroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    // Scroll approximately 2.5 cards or 75% of visible width
    const scrollDistance = Math.max(el.clientWidth * 0.75, 280);
    el.scrollBy({
      left: direction === "left" ? -scrollDistance : scrollDistance,
      behavior: "smooth",
    });
  };

  if (!products || products.length === 0) return null;

  return (
    <div
      className={`relative group/carousel ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Floating Left Arrow (Desktop) */}
      <button
        type="button"
        onClick={e => {
          e.stopPropagation();
          handleScroll("left");
        }}
        disabled={!canScrollLeft}
        aria-label="Previous products (Scroll left)"
        className={`hidden md:flex absolute -left-3.5 top-[40%] -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-white border border-[#E1E6E2] items-center justify-center shadow-lg transition-all duration-200 cursor-pointer ${
          canScrollLeft
            ? "hover:bg-white hover:scale-110 hover:border-[#12633D] hover:text-[#12633D] active:scale-95 text-[#202824] opacity-95 hover:opacity-100"
            : "opacity-0 pointer-events-none text-neutral-300"
        }`}
      >
        <ChevronLeft size={20} strokeWidth={2.5} />
      </button>

      {/* Floating Right Arrow (Desktop) */}
      <button
        type="button"
        onClick={e => {
          e.stopPropagation();
          handleScroll("right");
        }}
        disabled={!canScrollRight}
        aria-label="Next products (Scroll right)"
        className={`hidden md:flex absolute -right-3.5 top-[40%] -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-white border border-[#E1E6E2] items-center justify-center shadow-lg transition-all duration-200 cursor-pointer ${
          canScrollRight
            ? "hover:bg-white hover:scale-110 hover:border-[#12633D] hover:text-[#12633D] active:scale-95 text-[#202824] opacity-95 hover:opacity-100"
            : "opacity-0 pointer-events-none text-neutral-300"
        }`}
      >
        <ChevronRight size={20} strokeWidth={2.5} />
      </button>

      {/* Scrollable Track (Swipeable, with snap and hide-scrollbar) */}
      <div
        ref={scrollRef}
        onKeyDown={e => {
          if (e.key === "ArrowLeft") handleScroll("left");
          if (e.key === "ArrowRight") handleScroll("right");
        }}
        className="flex gap-3 sm:gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory hide-scrollbar pb-3 pt-1 -mx-4 px-4 sm:mx-0 sm:px-0 touch-pan-x outline-none"
        tabIndex={0}
        role="region"
        aria-label="Product Carousel"
      >
        {products.map((p, idx) => (
          <div
            key={p.id}
            className="snap-start shrink-0 w-[155px] xs:w-[175px] sm:w-[195px] md:w-[215px] lg:w-[220px] flex flex-col"
          >
            <ProductCard
              product={p}
              index={idx}
              locale={locale}
              showUnitPrice={showUnitPrice}
              onAdd={onAdd}
              onView={() => onViewProduct(p.id)}
            />
          </div>
        ))}
      </div>

      {/* Mobile Swipe / Arrow Controls Footer */}
      <div className="flex md:hidden items-center justify-between mt-1 pt-1 px-1 text-xs text-[#59635D]">
        <span className="text-[11px] font-medium flex items-center gap-1">
          <span>←</span>
          <span>{locale === "JA" ? "左右にスワイプ" : locale === "BN" ? "ডানে-বামে সোয়াইপ করুন" : "Swipe left/right"}</span>
          <span>→</span>
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleScroll("left")}
            disabled={!canScrollLeft}
            aria-label="Previous"
            className="w-7 h-7 rounded-lg border border-[#E1E6E2] bg-white flex items-center justify-center text-[#202824] disabled:opacity-30 disabled:pointer-events-none shadow-2xs active:scale-90 cursor-pointer"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            onClick={() => handleScroll("right")}
            disabled={!canScrollRight}
            aria-label="Next"
            className="w-7 h-7 rounded-lg border border-[#E1E6E2] bg-white flex items-center justify-center text-[#202824] disabled:opacity-30 disabled:pointer-events-none shadow-2xs active:scale-90 cursor-pointer"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
