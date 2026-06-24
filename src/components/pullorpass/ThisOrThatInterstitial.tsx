import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ImageOff, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { SwipeCard } from '@/lib/pullorpass';
import { classifyEra } from '@/lib/likesService';

interface Props {
  pair: [SwipeCard, SwipeCard];
  userId: string | null;
  onComplete: () => void;
}

function CardFace({
  card,
  state,
  onPick,
}: {
  card: SwipeCard;
  state: 'idle' | 'winner' | 'loser';
  onPick: () => void;
}) {
  const [err, setErr] = useState(false);
  return (
    <motion.div
      className="flex-1 flex flex-col items-center w-full"
      animate={{
        scale: state === 'winner' ? 1.05 : state === 'loser' ? 0.95 : 1,
        opacity: state === 'loser' ? 0.55 : 1,
      }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <button
        type="button"
        onClick={state === 'idle' ? onPick : undefined}
        className="relative h-[36vh] max-h-[340px] w-auto aspect-[2.5/3.5] md:h-auto md:max-h-[480px] md:w-full md:max-w-[300px] rounded-2xl overflow-hidden bg-muted/30 border border-border focus:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.99] transition-transform"
        style={{
          boxShadow:
            state === 'winner'
              ? '0 0 0 2px hsl(var(--primary)), 0 0 40px hsl(var(--primary) / 0.55)'
              : '0 6px 24px hsl(var(--background) / 0.6)',
        }}
      >
        {card.image_url && !err ? (
          <img
            src={card.image_url}
            alt={card.name}
            className="w-full h-full object-cover"
            onError={() => setErr(true)}
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageOff className="w-10 h-10 text-muted-foreground" />
          </div>
        )}
        <AnimatePresence>
          {state === 'winner' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <div
                className="rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-2xl"
                style={{
                  width: '24%',
                  aspectRatio: '1 / 1',
                  boxShadow: '0 0 30px hsl(var(--primary) / 0.8), 0 0 0 4px hsl(var(--background) / 0.6)',
                }}
              >
                <Check className="w-1/2 h-1/2" strokeWidth={3.5} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </button>
    </motion.div>
  );
}

export function ThisOrThatInterstitial({ pair, userId, onComplete }: Props) {
  const [winnerId, setWinnerId] = useState<string | null>(null);

  const pick = (winner: SwipeCard, loser: SwipeCard) => {
    if (winnerId) return;
    setWinnerId(winner.card_id);

    if (userId) {
      const era = classifyEra(winner.set_name)?.id ?? null;
      supabase
        .from('this_or_that_matchups')
        .insert([{
          user_id: userId,
          card_a_id: pair[0].card_id,
          card_b_id: pair[1].card_id,
          winner_card_id: winner.card_id,
          loser_card_id: loser.card_id,
          winner_name: winner.name,
          winner_set: winner.set_name,
          winner_rarity: winner.rarity,
          winner_price: winner.price,
          winner_era: era,
        }])
        .then(({ error }) => {
          if (error) console.warn('matchup insert failed', error);
        });
    }

    toast.success('✨ Preference learned', { duration: 1400 });

    window.setTimeout(() => {
      onComplete();
    }, 420);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col"
    >
      <div className="max-w-4xl mx-auto w-full px-4 pt-6 pb-6 flex-1 flex flex-col">
        <div className="text-center mb-4 sm:mb-6">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-primary font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" /> This or That
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            Only one gets a binder slot.
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Which do you choose?</p>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="relative flex flex-col md:flex-row items-center justify-center gap-1 md:gap-12 w-full">
            <CardFace
              card={pair[0]}
              state={
                winnerId == null ? 'idle' : winnerId === pair[0].card_id ? 'winner' : 'loser'
              }
              onPick={() => pick(pair[0], pair[1])}
            />

            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 select-none"
            >
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 220, damping: 16 }}
                className="relative"
              >
                <div
                  className="absolute inset-0 rounded-full blur-2xl"
                  style={{ background: 'radial-gradient(circle, hsl(var(--primary)/0.55), transparent 70%)' }}
                />
                <div
                  className="relative flex items-center justify-center rounded-full px-4 py-1.5 sm:px-6 sm:py-2.5 border-2 border-primary/70 bg-background/85 backdrop-blur-md"
                  style={{
                    boxShadow:
                      '0 0 0 4px hsl(var(--background) / 0.5), 0 10px 40px hsl(var(--primary) / 0.45)',
                  }}
                >
                  <span
                    className="font-black italic tracking-tighter text-3xl sm:text-5xl bg-gradient-to-br from-primary via-primary to-accent bg-clip-text text-transparent"
                    style={{
                      textShadow: '0 2px 20px hsl(var(--primary) / 0.4)',
                      WebkitTextStroke: '1px hsl(var(--primary) / 0.3)',
                    }}
                  >
                    VS
                  </span>
                </div>
              </motion.div>
            </div>

            <CardFace
              card={pair[1]}
              state={
                winnerId == null ? 'idle' : winnerId === pair[1].card_id ? 'winner' : 'loser'
              }
              onPick={() => pick(pair[1], pair[0])}
            />
          </div>
        </div>

        <p className="text-center text-[11px] uppercase tracking-wider text-muted-foreground mt-4">
          Tap your favorite — back to swiping in a second
        </p>
      </div>
    </motion.div>
  );
}