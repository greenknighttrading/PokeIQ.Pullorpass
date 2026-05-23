import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Loader2, ImageOff, Plus, X, Sparkles, Coins, RotateCw, LogIn, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { GlobalNavBar } from '@/components/layout/GlobalNavBar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Seo } from '@/components/seo/Seo';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface YelpCard {
  card_id: string;
  name: string;
  set_name: string | null;
  image_url: string | null;
  price: number;
  rarity: string | null;
}

// Curated review-tag vocabulary
const TAG_GROUPS: { label: string; tags: string[] }[] = [
  { label: 'Art & Aesthetics', tags: ['Stunning Art', 'Iconic Pose', 'Beautiful Background', 'Full Art', 'Alt Art', 'Textured', 'Holographic'] },
  { label: 'Vibe', tags: ['Cozy', 'Powerful', 'Cute', 'Epic', 'Nostalgic', 'Dreamy', 'Funny', 'Chaotic'] },
  { label: 'Collectibility', tags: ['Chase Card', 'Investment', 'Long-term Hold', 'Set Staple', 'Underrated', 'Overrated', 'Sleeper'] },
  { label: 'Condition / Print', tags: ['Print-Quality', 'Centering Issues', 'Hard to Grade', 'PSA 10 Worthy'] },
  { label: 'Audience', tags: ['Casual Friendly', 'Whale Bait', 'Tournament Worthy', 'Display-Worthy'] },
];

const ALL_TAGS = TAG_GROUPS.flatMap((g) => g.tags);

function tcgImage(id: string | null): string | null {
  if (!id) return null;
  return `https://tcgplayer-cdn.tcgplayer.com/product/${id}_in_1000x1000.jpg`;
}

export default function PokeYelp() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [pool, setPool] = useState<YelpCard[]>([]);
  const [index, setIndex] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [credits, setCredits] = useState<number>(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [custom, setCustom] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState('');
  const [reviewedCount, setReviewedCount] = useState(0);
  const [imgErr, setImgErr] = useState(false);

  const fetchCredits = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from('pokeiq_credits').select('credits').eq('user_id', uid).maybeSingle();
    setCredits(data?.credits ?? 0);
  }, []);

  const loadPool = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('market_snapshots')
      .select('card_id, tcgplayer_id, name, set_name, price, rarity')
      .eq('game', 'Pokemon')
      .eq('product_type', 'card')
      .gt('price', 5)
      .not('tcgplayer_id', 'is', null)
      .limit(800);

    if (error || !data) {
      toast.error('Could not load cards');
      setLoading(false);
      return;
    }
    const EXCLUDE = /reverse holo|1st edition|\bcode\b|energy|trainer/i;
    const items: YelpCard[] = data
      .filter((c) => c.tcgplayer_id && c.price && !EXCLUDE.test(c.name))
      .map((c) => ({
        card_id: c.card_id,
        name: c.name,
        set_name: c.set_name,
        image_url: tcgImage(c.tcgplayer_id),
        price: Number(c.price),
        rarity: c.rarity,
      }))
      .sort(() => Math.random() - 0.5)
      .slice(0, 40);
    setPool(items);
    setIndex(0);
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && !session.user.is_anonymous) {
        setUserId(session.user.id);
        fetchCredits(session.user.id);
      }
    });
    loadPool();
  }, [loadPool, fetchCredits]);

  const current = pool[index];

  const toggle = (t: string) =>
    setSelected((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));

  const addCustom = () => {
    const v = customInput.trim();
    if (!v || custom.includes(v) || ALL_TAGS.map(s => s.toLowerCase()).includes(v.toLowerCase())) {
      setCustomInput('');
      return;
    }
    setCustom((p) => [...p, v]);
    setCustomInput('');
  };

  const removeCustom = (t: string) => setCustom((p) => p.filter((x) => x !== t));

  const submit = async () => {
    if (!current) return;
    if (selected.length === 0 && custom.length === 0) {
      toast.error('Add at least one tag to review this card');
      return;
    }
    if (!userId) {
      toast.message('Sign up to earn PokeIQ credits', {
        description: 'Your review will not be saved without an account.',
        action: { label: 'Sign up', onClick: () => navigate('/auth') },
      });
      nextCard();
      return;
    }
    const earned = 1 + Math.min(custom.length, 2);
    const { error } = await supabase.from('pokeyelp_reviews').insert({
      user_id: userId,
      card_id: current.card_id,
      card_name: current.name,
      card_set: current.set_name,
      card_image: current.image_url,
      card_price: current.price,
      tags: selected,
      custom_tags: custom,
      credits_awarded: earned,
    });
    if (error) {
      toast.error('Could not save review');
      return;
    }
    const newCredits = credits + earned;
    setCredits(newCredits);
    await supabase.from('pokeiq_credits').upsert({
      user_id: userId, credits: newCredits, updated_at: new Date().toISOString(),
    });
    toast.success(`+${earned} PokeIQ credits`);
    setReviewedCount((c) => c + 1);
    nextCard();
  };

  const nextCard = () => {
    setSelected([]);
    setCustom([]);
    setCustomInput('');
    setImgErr(false);
    if (index + 1 >= pool.length) loadPool();
    else setIndex(index + 1);
  };

  const skip = () => nextCard();

  return (
    <>
      <Seo
        title="PokeYelp — Review Pokémon Cards, Earn Credits | PokeIQ"
        description="Tag and review random Pokémon cards. Help build the most accurate community database and earn PokeIQ credits as you go."
      />
      <div className="min-h-screen bg-background flex flex-col">
        <GlobalNavBar />

        <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6 flex flex-col select-none">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h1 className="text-2xl font-bold text-foreground">PokeYelp</h1>
              <p className="text-xs text-muted-foreground">
                Tag real cards to make PokeIQ smarter — earn credits per review.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Card className="px-3 py-1.5 flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-bold tabular-nums">{credits}</span>
                <span className="text-[10px] uppercase text-muted-foreground">Credits</span>
              </Card>
              {reviewedCount > 0 && (
                <Card className="px-3 py-1.5 flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-primary" />
                  <span className="text-sm font-bold tabular-nums">{reviewedCount}</span>
                  <span className="text-[10px] uppercase text-muted-foreground">Reviewed</span>
                </Card>
              )}
            </div>
          </div>

          {loading && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm">Loading random cards…</p>
            </div>
          )}

          {!loading && current && (
            <motion.div
              key={current.card_id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid md:grid-cols-[260px_1fr] gap-5 items-start"
            >
              {/* Card image */}
              <div className="space-y-2">
                <div className="aspect-[2.5/3.5] rounded-2xl overflow-hidden bg-muted/30 shadow-xl">
                  {current.image_url && !imgErr ? (
                    <img
                      src={current.image_url}
                      alt={current.name}
                      className="w-full h-full object-cover"
                      onError={() => setImgErr(true)}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                      <ImageOff className="w-8 h-8" />
                      <span className="text-xs">No image</span>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground truncate">{current.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {current.set_name ?? 'Unknown set'} · ${current.price.toFixed(2)}
                    {current.rarity && ` · ${current.rarity}`}
                  </p>
                </div>
              </div>

              {/* Tag picker */}
              <div className="space-y-4">
                <Card className="p-4">
                  <p className="text-sm font-semibold text-foreground mb-1">
                    How would you review this card?
                  </p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Pick any tags that fit. Or add your own — custom tags earn extra credits.
                  </p>

                  <div className="space-y-3 max-h-[44vh] overflow-y-auto pr-1">
                    {TAG_GROUPS.map((g) => (
                      <div key={g.label}>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">
                          {g.label}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {g.tags.map((t) => {
                            const on = selected.includes(t);
                            return (
                              <button
                                key={t}
                                onClick={() => toggle(t)}
                                className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                                  on
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'bg-background text-foreground border-border hover:bg-muted'
                                }`}
                              >
                                {t}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Custom tags */}
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">
                      Add your own tag
                    </p>
                    <div className="flex gap-2">
                      <Input
                        value={customInput}
                        onChange={(e) => setCustomInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustom())}
                        placeholder="e.g. Mona Lisa Pose"
                        maxLength={40}
                        className="h-9 text-sm"
                      />
                      <Button onClick={addCustom} size="sm" variant="outline" className="gap-1">
                        <Plus className="w-3.5 h-3.5" /> Add
                      </Button>
                    </div>
                    {custom.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {custom.map((t) => (
                          <span
                            key={t}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full bg-amber-400/15 text-amber-400 border border-amber-400/40"
                          >
                            <Sparkles className="w-3 h-3" />
                            {t}
                            <button onClick={() => removeCustom(t)} aria-label="Remove">
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>

                <div className="flex gap-2">
                  <Button variant="ghost" onClick={skip} className="flex-1 gap-1">
                    <RotateCw className="w-3.5 h-3.5" /> Skip
                  </Button>
                  <Button onClick={submit} className="flex-[2] gap-1.5">
                    <Coins className="w-4 h-4" />
                    Submit Review (+{1 + Math.min(custom.length, 2)})
                  </Button>
                </div>

                {!userId && (
                  <Card className="p-4 border-primary/40 bg-primary/5 text-center">
                    <p className="text-xs text-muted-foreground mb-2">
                      Sign up to keep your credits and track your contributions.
                    </p>
                    <Button onClick={() => navigate('/auth')} size="sm" className="gap-1.5">
                      <LogIn className="w-3.5 h-3.5" /> Sign up to earn credits
                    </Button>
                  </Card>
                )}
              </div>
            </motion.div>
          )}
        </main>
      </div>
    </>
  );
}
