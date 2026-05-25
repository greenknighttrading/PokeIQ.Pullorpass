import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export interface MatchPulseEvent { key: number }

/**
 * Lightweight, non-blocking "PokeIQ Match" microinteraction.
 * Renders a brief floating label + sparkle burst that does NOT
 * interrupt the swipe flow.
 */
export function MatchPulse({ event }: { event: MatchPulseEvent | null }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-start justify-center">
      <AnimatePresence>
        {event && (
          <motion.div
            key={event.key}
            initial={{ opacity: 0, y: -8, scale: 0.9 }}
            animate={{ opacity: 1, y: 80, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.95 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mt-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/15 backdrop-blur border border-primary/40 shadow-[0_0_30px_hsl(var(--primary)/0.45)]"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] uppercase tracking-[0.25em] font-semibold text-primary">
              PokeIQ Match
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
