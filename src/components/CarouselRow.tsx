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
  const rafRef = useRef<number | null>(null);
  const isAnimatingRef = useRef(false);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const update = useCallback(() => {
    const el = scrollerRef.current;
    if (!el || isAnimatingRef.current) return;
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
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [update, children]);

  const getAlignedTarget = (el: HTMLDivElement, rawTarget: number) => {
    const max = el.scrollWidth - el.clientWidth;
    const clampedTarget = Math.max(0, Math.min(max, rawTarget));
    const scrollerLeft = el.getBoundingClientRect().left;
    const candidates = [0, max, ...Array.from(el.children).map((child) => {
      const childLeft = child.getBoundingClientRect().left;
      return Math.max(0, Math.min(max, childLeft - scrollerLeft + el.scrollLeft));
    })];

    return candidates.reduce((closest, candidate) => (
      Math.abs(candidate - clampedTarget) < Math.abs(closest - clampedTarget) ? candidate : closest
    ), clampedTarget);
  };

  const page = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el || isAnimatingRef.current) return;

    const start = el.scrollLeft;
    const max = el.scrollWidth - el.clientWidth;
    const rawTarget = start + dir * el.clientWidth;
    const target = getAlignedTarget(el, rawTarget);
    const distance = target - start;
    if (Math.abs(distance) < 1) return;

    isAnimatingRef.current = true;
    setIsAnimating(true);

    const previousSnapType = el.style.scrollSnapType;
    const previousScrollBehavior = el.style.scrollBehavior;
    el.style.scrollSnapType = 'none';
    el.style.scrollBehavior = 'auto';

    const duration = 720; // ms — one premium, continuous Netflix-style glide
    const startTime = performance.now();

    // Ease-in-out cubic keeps the entire row moving as one continuous motion.
    const easeInOutCubic = (t: number) => (
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
    );

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeInOutCubic(progress);
      el.scrollLeft = start + distance * eased;

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        el.scrollLeft = target;
        el.style.scrollSnapType = previousSnapType;
        el.style.scrollBehavior = previousScrollBehavior;
        isAnimatingRef.current = false;
        rafRef.current = null;
        setIsAnimating(false);
        update();
      }
    };

    rafRef.current = requestAnimationFrame(step);
  };

  return (
    <div className={cn('relative group/carousel', className)}>
      <div
        ref={scrollerRef}
        className="flex gap-4 overflow-x-auto pb-4 snap-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
          disabled={isAnimating}
          onClick={() => page(-1)}
          className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full bg-background/80 backdrop-blur border border-border text-foreground shadow-lg opacity-0 group-hover/carousel:opacity-100 focus-visible:opacity-100 hover:bg-background hover:scale-105 transition-all disabled:pointer-events-none"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}
      {canRight && (
        <button
          type="button"
          aria-label={`Scroll ${ariaLabel} right`}
          disabled={isAnimating}
          onClick={() => page(1)}
          className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full bg-background/80 backdrop-blur border border-border text-foreground shadow-lg opacity-0 group-hover/carousel:opacity-100 focus-visible:opacity-100 hover:bg-background hover:scale-105 transition-all disabled:pointer-events-none"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

export default CarouselRow;