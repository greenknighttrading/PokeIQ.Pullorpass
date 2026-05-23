import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ImageOff } from 'lucide-react';
import type { SwipeCard } from '@/lib/pullorpass';

const CONFETTI_COUNT = 26;
const CONFETTI_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--foreground))',
];

function Confetti() {
  const pieces = React.useMemo(
    () =>
      Array.from({ length: CONFETTI_COUNT }).map((_, i) => {
        const angle = (i / CONFETTI_COUNT) * Math.PI * 2 + Math.random() * 0.4;
        const dist = 160 + Math.random() * 180;
        return {
          dx: Math.cos(angle) * dist,
          dy: Math.sin(angle) * dist - 40,
          rot: Math.random() * 540 - 270,
          delay: Math.random() * 0.15,
          size: 6 + Math.random() * 6,
          color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          shape: i % 3,
        };
      }),
    [],
  );
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
      {pieces.map((p, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 0.4 }}
          animate={{ opacity: [1, 1, 0], x: p.dx, y: p.dy, rotate: p.rot, scale: 1 }}
          transition={{ duration: 1.8, delay: p.delay, ease: [0.2, 0.7, 0.3, 1] }}
          style={{
            position: 'absolute',
            width: p.shape === 2 ? p.size * 0.4 : p.size,
            height: p.shape === 2 ? p.size * 1.6 : p.size,
            background: p.color,
            borderRadius: p.shape === 1 ? '999px' : '2px',
          }}
        />
      ))}
    </div>
  );
}

export function MatchOverlay({ card }: { card: SwipeCard | null }) {
  const [err, setErr] = React.useState(false);
  React.useEffect(() => { if (card) setErr(false); }, [card]);

  return (
    <AnimatePresence>
      {card && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <motion.div
            className="absolute inset-0 bg-background/80 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <div className="relative flex flex-col items-center gap-5 px-6 max-w-md text-center">
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-2"
            >
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-[11px] uppercase tracking-[0.3em] text-primary font-semibold">
                PokeIQ Match
              </span>
              <Sparkles className="w-5 h-5 text-primary" />
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="text-5xl md:text-6xl font-bold tracking-tight gradient-text"
            >
              It's a Match
            </motion.h2>

            <motion.div
              initial={{ opacity: 0, scale: 0.7, rotate: -4 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: 0.1, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="relative aspect-[2.5/3.5] w-44 md:w-52 rounded-2xl overflow-hidden bg-muted/30"
              style={{
                boxShadow:
                  '0 0 0 2px hsl(var(--primary) / 0.6), 0 0 60px 8px hsl(var(--primary) / 0.45), 0 20px 60px hsl(220 50% 3% / 0.6)',
              }}
            >
              {card.image_url && !err ? (
                <img
                  src={card.image_url}
                  alt={card.name}
                  className="w-full h-full object-cover"
                  onError={() => setErr(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <ImageOff className="w-8 h-8" />
                </div>
              )}
              <motion.div
                className="absolute inset-0 rounded-2xl"
                initial={{ opacity: 0.6, scale: 1 }}
                animate={{ opacity: 0, scale: 1.15 }}
                transition={{ duration: 1.4, repeat: 1, ease: 'easeOut' }}
                style={{ boxShadow: '0 0 0 3px hsl(var(--primary) / 0.7)' }}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.25, duration: 0.45 }}
              className="space-y-1"
            >
              <p className="text-sm text-foreground font-medium">
                We think this card is a great fit based on your profile.
              </p>
              <p className="text-xs text-muted-foreground">
                The more cards you review, the smarter your matches become.
              </p>
            </motion.div>
          </div>

          <Confetti />
        </motion.div>
      )}
    </AnimatePresence>
  );
}