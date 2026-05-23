import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Loader2, ImageOff, Plus, X, Sparkles, Coins, RotateCw, LogIn, Check, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { GlobalNavBar } from '@/components/layout/GlobalNavBar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

// Curated review-tag vocabulary — optimized for fast, low-thought tagging
const TAG_GROUPS: { label: string; description: string; tags: string[] }[] = [
  {
    label: 'Emotional Tone',
    description: 'How the card emotionally feels',
    tags: ['Nostalgic', 'Cozy', 'Peaceful', 'Exciting', 'Powerful', 'Dark', 'Chaotic', 'Joyful', 'Lonely', 'Adventurous', 'Mysterious', 'Relaxing', 'Hopeful', 'Intimidating'],
  },
  {
    label: 'Aesthetic Style',
    description: 'How the artwork visually feels',
    tags: ['Cute', 'Beautiful', 'Colorful', 'Minimalist', 'Detailed', 'Clean', 'Cinematic', 'Playful', 'Epic', 'Dreamlike', 'Vintage', 'Modern', 'Soft', 'Aggressive'],
  },
  {
    label: 'Collector Appeal',
    description: 'What type of collector appeal it has',
    tags: ['Grail', 'Display piece', 'Binder card', 'Investment', 'Chase card', 'Sleeper', 'Underrated', 'Overrated', 'Personal favorite', 'Trade bait'],
  },
  {
    label: 'Vibe / Cultural Energy',
    description: 'Social and emotional identity',
    tags: ['Main character energy', 'Childhood vibes', 'Rich collector energy', 'Anime opening vibes', 'Rainy day vibes', 'Sunday morning vibes', 'Cozy collector vibes', 'Casino energy'],
  },
];

const ALL_TAGS = TAG_GROUPS.flatMap((g) => g.tags);
const MIN_TAGS = 3;
const MAX_TAGS = 10;

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
  const [comment, setComment] = useState('');
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
  const totalTags = selected.length + custom.length;
  const remaining = Math.max(0, MIN_TAGS - totalTags);
  const atMax = totalTags >= MAX_TAGS;

  const toggle = (t: string) => {
    setSelected((p) => {
      if (p.includes(t)) return p.filter((x) => x !== t);
      if (totalTags >= MAX_TAGS) {
        toast.message(`Max ${MAX_TAGS} tags per review`);
        return p;
      }
      return [...p, t];
    });
  };

  const addCustom = () => {
    const v = customInput.trim();
    if (!v) return;
    if (custom.includes(v) || ALL_TAGS.map((s) => s.toLowerCase()).includes(v.toLowerCase())) {
      setCustomInput('');
      return;
    }
    if (totalTags >= MAX_TAGS) {
      toast.message(`Max ${MAX_TAGS} tags per review`);
      return;
    }
    setCustom((p) => [...p, v]);
    setCustomInput('');
  };

  const removeCustom = (t: string) => setCustom((p) => p.filter((x) => x !== t));

  const submit = async () => {
    if (!current) return;
    if (totalTags < MIN_TAGS) {
      toast.error(`Pick at least ${MIN_TAGS} tags to submit`);
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
    // +1 base, +1 per custom tag (cap 3), +1 if a comment was left
    const earned = 1 + Math.min(custom.length, 3) + (comment.trim().length >= 8 ? 1 : 0);
    const { error } = await supabase.from('pokeyelp_reviews').insert({
      user_id: userId,
      card_id: current.card_id,
      card_name: current.name,
      card_set: current.set_name,
      card_image: current.image_url,
      card_price: current.price,
      tags: comment.trim() ? [...selected, `__comment__:${comment.trim().slice(0, 500)}`] : selected,
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
    setComment('');
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
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      Tap how this card feels
                    </p>
                    <span
                      className={`text-[10px] font-bold tabular-nums px-2 py-0.5 rounded-full ${
                        totalTags >= MIN_TAGS
                          ? 'bg-primary/15 text-primary'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {totalTags}/{MAX_TAGS}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Pick {MIN_TAGS}–{MAX_TAGS} tags across any category. Trust your gut — first reaction is best.
                  </p>

                  <div className="space-y-3 max-h-[44vh] overflow-y-auto pr-1">
                    {TAG_GROUPS.map((g) => (
                      <div key={g.label}>
                        <div className="flex items-baseline gap-2 mb-1.5">
                          <p className="text-[10px] uppercase tracking-wide text-foreground/80 font-semibold">
                            {g.label}
                          </p>
                          <p className="text-[10px] text-muted-foreground">{g.description}</p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {g.tags.map((t) => {
                            const on = selected.includes(t);
                            const disabled = !on && atMax;
                            return (
                              <button
                                key={t}
                                onClick={() => toggle(t)}
                                disabled={disabled}
                                className={`px-2.5 py-1 text-xs rounded-full border transition-all active:scale-95 ${
                                  on
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : disabled
                                      ? 'bg-background text-muted-foreground/50 border-border/50 cursor-not-allowed'
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
                        disabled={atMax}
                      />
                      <Button onClick={addCustom} size="sm" variant="outline" className="gap-1" disabled={atMax}>
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

                    {/* Optional comment */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground inline-flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" /> Optional comment
                        </p>
                        <span className="text-[10px] text-muted-foreground">+1 credit if 8+ chars</span>
                      </div>
                      <Textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value.slice(0, 500))}
                        placeholder="Any extra thoughts? (optional)"
                        className="text-sm min-h-[60px]"
                      />
                    </div>
                  </div>
                </Card>

                <div className="flex gap-2">
                  <Button variant="ghost" onClick={skip} className="flex-1 gap-1">
                    <RotateCw className="w-3.5 h-3.5" /> Skip
                  </Button>
                  <Button onClick={submit} className="flex-[2] gap-1.5" disabled={totalTags < MIN_TAGS}>
                    <Coins className="w-4 h-4" />
                    {totalTags < MIN_TAGS
                      ? `Pick ${remaining} more tag${remaining === 1 ? '' : 's'}`
                      : `Submit Review (+${1 + Math.min(custom.length, 3) + (comment.trim().length >= 8 ? 1 : 0)})`}
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
