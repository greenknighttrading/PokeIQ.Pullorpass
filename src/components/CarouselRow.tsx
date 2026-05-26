import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CarouselRowProps {
  children: React.ReactNode;
  ariaLabel?: string;
  className?: string;
}

/**
 * Netflix-style horizontal carousel.
 * - Native horizontal scroll (touch swipe friendly)
 * - Arrow buttons on hover (desktop) that page by ~one viewport
 * - Edge gradient fades signal more content
 */
export function CarouselRow({ children, ariaLabel = 'cards', className }: CarouselRowProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft < max - 4);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, [update, children]);

  const page = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    // Scroll by ~45% of visible width for a relaxed, smooth feel
    el.scrollBy({ left: dir * el.clientWidth * 0.45, behavior: 'smooth' });
  };

  return (
    <div className={cn('relative group/carousel', className)}>
      <div
        ref={scrollerRef}
        className="flex gap-4 overflow-x-auto pb-4 snap-x scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>

      {/* Edge fades */}
      <div
        className={cn(
          'pointer-events-none absolute left-0 top-0 bottom-4 w-12 bg-gradient-to-r from-background to-transparent transition-opacity duration-200',
          canLeft ? 'opacity-100' : 'opacity-0',
        )}
      />
      <div
        className={cn(
          'pointer-events-none absolute right-0 top-0 bottom-4 w-12 bg-gradient-to-l from-background to-transparent transition-opacity duration-200',
          canRight ? 'opacity-100' : 'opacity-0',
        )}
      />

      {/* Arrows — hidden on mobile, fade in on hover for desktop */}
      {canLeft && (
        <button
          type="button"
          aria-label={`Scroll ${ariaLabel} left`}
          onClick={() => page(-1)}
          className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full bg-background/80 backdrop-blur border border-border text-foreground shadow-lg opacity-0 group-hover/carousel:opacity-100 focus-visible:opacity-100 hover:bg-background hover:scale-105 transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}
      {canRight && (
        <button
          type="button"
          aria-label={`Scroll ${ariaLabel} right`}
          onClick={() => page(1)}
          className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full bg-background/80 backdrop-blur border border-border text-foreground shadow-lg opacity-0 group-hover/carousel:opacity-100 focus-visible:opacity-100 hover:bg-background hover:scale-105 transition-all"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

export default CarouselRow;