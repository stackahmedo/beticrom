import { useRef, useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Play, Pause } from "lucide-react";
import { type Product, type Locale } from "../../data/products";
import { ProductCard } from "./ProductCard";

interface ProductCarouselProps {
  products: Product[];
  locale: Locale;
  onAdd: (product: Product) => void;
  onViewProduct: (id: string) => void;
  showUnitPrice?: boolean;
  className?: string;
  autoPlay?: boolean;
  autoPlayInterval?: number;
}

export function ProductCarousel({
  products,
  locale,
  onAdd,
  onViewProduct,
  showUnitPrice = true,
  className = "",
  autoPlay = true,
  autoPlayInterval = 3400,
}: ProductCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const interactionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Pause auto-sliding temporarily when user manually interacts
  const pauseTemporarily = useCallback(() => {
    setIsUserInteracting(true);
    if (interactionTimerRef.current) {
      clearTimeout(interactionTimerRef.current);
    }
    interactionTimerRef.current = setTimeout(() => {
      setIsUserInteracting(false);
    }, 5000);
  }, []);

  // Smooth scroll left or right
  const handleScroll = (direction: "left" | "right") => {
    pauseTemporarily();
    const el = scrollRef.current;
    if (!el) return;
    const firstCard = el.querySelector<HTMLElement>(".snap-start");
    const cardWidth = firstCard ? firstCard.offsetWidth : 210;
    const scrollDistance = (cardWidth + 14) * 2;
    el.scrollBy({
      left: direction === "left" ? -scrollDistance : scrollDistance,
      behavior: "smooth",
    });
  };

  // Automatic right-to-left product animation
  useEffect(() => {
    if (!autoPlay || !isPlaying || isHovered || isUserInteracting) return;

    const el = scrollRef.current;
    const container = containerRef.current;
    if (!el || !container) return;

    let isVisible = true;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]) {
          isVisible = entries[0].isIntersecting;
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(container);

    const timer = setInterval(() => {
      if (!isVisible || !el) return;
      const { scrollLeft, scrollWidth, clientWidth } = el;

      // When reaching near the end, loop smoothly back to start
      if (scrollLeft + clientWidth >= scrollWidth - 16) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        // Step forward by 1 product card width + gap to advance products right-to-left
        const firstCard = el.querySelector<HTMLElement>(".snap-start");
        const cardWidth = firstCard ? firstCard.offsetWidth : 210;
        const step = cardWidth + 14;
        el.scrollBy({ left: step, behavior: "smooth" });
      }
    }, autoPlayInterval);

    return () => {
      clearInterval(timer);
      observer.disconnect();
    };
  }, [autoPlay, isPlaying, isHovered, isUserInteracting, autoPlayInterval, products.length]);

  if (!products || products.length === 0) return null;

  return (
    <div
      ref={containerRef}
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
        onTouchStart={pauseTemporarily}
        onPointerDown={pauseTemporarily}
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

      {/* Carousel Controls Footer: Auto-slide Status & Mobile Controls */}
      <div className="flex items-center justify-between mt-1 pt-1 px-1 text-xs text-[#59635D]">
        <div className="flex items-center gap-2">
          {autoPlay && (
            <button
              type="button"
              onClick={() => setIsPlaying(p => !p)}
              title={isPlaying ? "自動スライドを一時停止" : "自動スライドを再開"}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-[#E1E6E2] bg-white text-[11px] text-[#59635D] hover:text-[#12633D] hover:border-[#12633D] transition-colors cursor-pointer shadow-2xs"
            >
              {isPlaying ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <Pause size={10} className="text-[#12633D]" />
                  <span>{locale === "JA" ? "自動スライド中" : locale === "BN" ? "অটো স্লাইড" : "Auto-sliding"}</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
                  <Play size={10} className="text-neutral-500" />
                  <span>{locale === "JA" ? "一時停止中" : locale === "BN" ? "বন্ধ আছে" : "Paused"}</span>
                </>
              )}
            </button>
          )}

          <span className="hidden xs:inline-flex items-center gap-1 text-[11px] text-[#8C948F]">
            <span>←</span>
            <span>{locale === "JA" ? "左右にスワイプ可能" : locale === "BN" ? "ডানে-বামে সোয়াইপ" : "Swipe left/right"}</span>
            <span>→</span>
          </span>
        </div>

        {/* Mobile Swipe / Arrow Buttons */}
        <div className="flex md:hidden items-center gap-1.5">
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
