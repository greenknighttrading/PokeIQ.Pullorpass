import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ImageOff, Plus, X, Sparkles, Coins, RotateCw, LogIn, Check, MessageSquare, Wand2, Filter } from 'lucide-react';
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

interface Suggestion {
  tag: string;
  category: string;
  reason: string;
}

const MAX_CUSTOM = 5;

// Eras based on set-name keyword matching (loose)
const ERAS: { id: string; label: string; match: RegExp }[] = [
  { id: 'vintage', label: 'Vintage (1999-2003)', match: /base set|jungle|fossil|team rocket|gym|neo |expedition|aquapolis|skyridge|legendary collection/i },
  { id: 'ex',      label: 'EX Era (2003-2007)', match: /\bex (ruby|sandstorm|dragon|team magma|hidden legends|fire red|deoxys|emerald|unseen forces|delta|legend maker|holon|crystal guardians|dragon frontiers|power keepers)/i },
  { id: 'dp',      label: 'DP / Platinum (2007-2011)', match: /diamond|pearl|platinum|mysterious treasures|secret wonders|stormfront|majestic dawn|legends awakened|rising rivals|supreme victors|arceus|heartgold|soulsilver|hgss|call of legends/i },
  { id: 'bw',      label: 'Black & White (2011-2013)', match: /black & white|emerging powers|noble victories|next destinies|dark explorers|dragons exalted|boundaries crossed|plasma|legendary treasures/i },
  { id: 'xy',      label: 'XY (2013-2016)', match: /\bxy\b|flashfire|furious fists|phantom forces|primal clash|roaring skies|ancient origins|breakthrough|breakpoint|fates collide|steam siege|evolutions|generations|double crisis|kalos starter/i },
  { id: 'sm',      label: 'Sun & Moon (2016-2019)', match: /sun & moon|sun and moon|guardians rising|burning shadows|crimson invasion|ultra prism|forbidden light|celestial storm|lost thunder|team up|unbroken bonds|unified minds|cosmic eclipse|hidden fates|shining legends|detective pikachu|dragon majesty/i },
  { id: 'swsh',    label: 'Sword & Shield (2020-2022)', match: /sword & shield|rebel clash|darkness ablaze|vivid voltage|battle styles|chilling reign|evolving skies|fusion strike|brilliant stars|astral radiance|lost origin|silver tempest|crown zenith|shining fates|celebrations|champion's path/i },
  { id: 'sv',      label: 'Scarlet & Violet (2023+)', match: /scarlet & violet|paldea|obsidian flames|151|paradox rift|temporal forces|twilight masquerade|shrouded fable|stellar crown|surging sparks|prismatic|journey together|destined rivals/i },
];

function classifyEra(setName: string | null): string | null {
  if (!setName) return null;
  for (const e of ERAS) if (e.match.test(setName)) return e.id;
  return null;
}

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

  // AI suggestions — single-select (tap = applicable)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [suggestLoading, setSuggestLoading] = useState(false);

  const [custom, setCustom] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState('');
  const [comment, setComment] = useState('');
  const [reviewedCount, setReviewedCount] = useState(0);
  const [imgErr, setImgErr] = useState(false);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [minPrice, setMinPrice] = useState<string>('5');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [setQuery, setSetQuery] = useState<string>('');
  const [eraId, setEraId] = useState<string>('');

  const fetchCredits = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from('pokeiq_credits').select('credits').eq('user_id', uid).maybeSingle();
    setCredits(data?.credits ?? 0);
  }, []);

  const loadPool = useCallback(async () => {
    setLoading(true);
    const minP = Number(minPrice) || 5;
    const maxP = Number(maxPrice) || 0;
    let q = supabase
      .from('market_snapshots')
      .select('card_id, tcgplayer_id, name, set_name, price, rarity')
      .eq('game', 'Pokemon')
      .eq('product_type', 'card')
      .gt('price', minP)
      .not('tcgplayer_id', 'is', null)
      .limit(800);

    if (maxP > minP) q = q.lt('price', maxP);
    if (setQuery.trim()) q = q.ilike('set_name', `%${setQuery.trim()}%`);

    const { data, error } = await q;
    if (error || !data) {
      toast.error('Could not load cards');
      setLoading(false);
      return;
    }
    const EXCLUDE = /reverse holo|1st edition|\bcode\b|energy|trainer/i;
    let items: YelpCard[] = data
      .filter((c) => c.tcgplayer_id && c.price && !EXCLUDE.test(c.name))
      .map((c) => ({
        card_id: c.card_id,
        name: c.name,
        set_name: c.set_name,
        image_url: tcgImage(c.tcgplayer_id),
        price: Number(c.price),
        rarity: c.rarity,
      }));

    if (eraId) items = items.filter((c) => classifyEra(c.set_name) === eraId);

    items = items.sort(() => Math.random() - 0.5).slice(0, 40);

    if (items.length === 0) {
      toast.message('No cards match your filters', { description: 'Try widening price or clearing filters.' });
    }
    setPool(items);
    setIndex(0);
    setLoading(false);
  }, [minPrice, maxPrice, setQuery, eraId]);

  const fetchSuggestions = useCallback(async (card: YelpCard) => {
    setSuggestLoading(true);
    setSuggestions([]);
    setSelected(new Set());
    try {
      const { data, error } = await supabase.functions.invoke('pokeyelp-suggest-tags', {
        body: { name: card.name, set_name: card.set_name, rarity: card.rarity, price: card.price },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setSuggestions(Array.isArray(data?.suggestions) ? data.suggestions : []);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? 'Could not generate tags');
    } finally {
      setSuggestLoading(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && !session.user.is_anonymous) {
        setUserId(session.user.id);
        fetchCredits(session.user.id);
      }
    });
    loadPool();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = pool[index];

  useEffect(() => {
    if (current) fetchSuggestions(current);
  }, [current?.card_id, fetchSuggestions]);

  const toggleTag = (t: string) => {
    setSelected((p) => {
      const n = new Set(p);
      if (n.has(t)) n.delete(t); else n.add(t);
      return n;
    });
  };

  const addCustom = () => {
    const v = customInput.trim();
    if (!v) return;
    if (custom.includes(v)) { setCustomInput(''); return; }
    if (custom.length >= MAX_CUSTOM) {
      toast.message(`Max ${MAX_CUSTOM} custom tags`);
      return;
    }
    setCustom((p) => [...p, v]);
    setCustomInput('');
  };

  const removeCustom = (t: string) => setCustom((p) => p.filter((x) => x !== t));

  const nextCard = useCallback(() => {
    setSelected(new Set());
    setSuggestions([]);
    setCustom([]);
    setCustomInput('');
    setComment('');
    setImgErr(false);
    if (index + 1 >= pool.length) loadPool();
    else setIndex(index + 1);
  }, [index, pool.length, loadPool]);

  const submit = async () => {
    if (!current) return;
    if (!userId) {
      toast.message('Sign up to earn PokeIQ credits', {
        description: 'Your review will not be saved without an account.',
        action: { label: 'Sign up', onClick: () => navigate('/auth') },
      });
      nextCard();
      return;
    }

    // 1 credit per card reviewed
    const earned = 1;
    const applicableTags = Array.from(selected);

    const tagPayload = [
      ...applicableTags,
      ...(comment.trim() ? [`__comment__:${comment.trim().slice(0, 500)}`] : []),
    ];

    const { error } = await supabase.from('pokeyelp_reviews').insert({
      user_id: userId,
      card_id: current.card_id,
      card_name: current.name,
      card_set: current.set_name,
      card_image: current.image_url,
      card_price: current.price,
      tags: tagPayload,
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
    toast.success('+1 PokeIQ credit');
    setReviewedCount((c) => c + 1);
    nextCard();
  };

  const skip = () => nextCard();

  const activeFiltersCount = useMemo(() => {
    let n = 0;
    if (Number(minPrice) > 5) n++;
    if (maxPrice) n++;
    if (setQuery.trim()) n++;
    if (eraId) n++;
    return n;
  }, [minPrice, maxPrice, setQuery, eraId]);

  const clearFilters = () => {
    setMinPrice('5'); setMaxPrice(''); setSetQuery(''); setEraId('');
  };

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
                Tap any AI tag that fits. Earn 1 credit per card reviewed.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline" size="sm"
                onClick={() => setShowFilters((s) => !s)}
                className="gap-1.5 h-8"
              >
                <Filter className="w-3.5 h-3.5" />
                Filters
                {activeFiltersCount > 0 && (
                  <span className="ml-1 text-[10px] font-bold bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>
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

          {/* Filters panel */}
          <AnimatePresence initial={false}>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <Card className="p-4 mb-4 space-y-3">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">Price range ($)</p>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number" inputMode="decimal" min={0}
                          value={minPrice}
                          onChange={(e) => setMinPrice(e.target.value)}
                          placeholder="min" className="h-9 text-sm"
                        />
                        <span className="text-xs text-muted-foreground">–</span>
                        <Input
                          type="number" inputMode="decimal" min={0}
                          value={maxPrice}
                          onChange={(e) => setMaxPrice(e.target.value)}
                          placeholder="max" className="h-9 text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">Set contains</p>
                      <Input
                        value={setQuery}
                        onChange={(e) => setSetQuery(e.target.value)}
                        placeholder="e.g. Evolving Skies, 151"
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">Era</p>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => setEraId('')}
                        className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                          !eraId ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-foreground border-border hover:bg-muted'
                        }`}
                      >
                        Any era
                      </button>
                      {ERAS.map((e) => (
                        <button
                          key={e.id}
                          onClick={() => setEraId(e.id)}
                          className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                            eraId === e.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-foreground border-border hover:bg-muted'
                          }`}
                        >
                          {e.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Button size="sm" onClick={() => { loadPool(); setShowFilters(false); }} className="gap-1.5">
                      <Check className="w-3.5 h-3.5" /> Apply
                    </Button>
                    <Button size="sm" variant="ghost" onClick={clearFilters}>Clear</Button>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {loading && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm">Loading cards…</p>
            </div>
          )}

          {!loading && !current && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground py-12">
              <p className="text-sm">No cards match your filters.</p>
              <Button size="sm" variant="outline" onClick={clearFilters}>Clear filters</Button>
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
                      AI suggested tags
                    </p>
                    <span className="text-[10px] font-bold tabular-nums px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {selected.size} selected
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Tap any tag that fits this card. Skip the ones that don't.
                  </p>

                  <div className="min-h-[140px]">
                    {suggestLoading && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground py-6 justify-center">
                        <Wand2 className="w-4 h-4 animate-pulse text-primary" />
                        AI is reading the card…
                      </div>
                    )}

                    {!suggestLoading && suggestions.length === 0 && (
                      <div className="text-xs text-muted-foreground py-6 text-center">
                        No suggestions yet.
                        <Button
                          variant="link" size="sm" className="ml-1 h-auto p-0"
                          onClick={() => current && fetchSuggestions(current)}
                        >
                          Try again
                        </Button>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <AnimatePresence initial={false}>
                        {suggestions.map((s) => {
                          const on = selected.has(s.tag);
                          return (
                            <motion.button
                              key={s.tag}
                              initial={{ opacity: 0, scale: 0.92 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0 }}
                              onClick={() => toggleTag(s.tag)}
                              className={`px-3 py-1.5 text-sm rounded-full border transition-all active:scale-95 ${
                                on
                                  ? 'bg-primary text-primary-foreground border-primary'
                                  : 'bg-background text-foreground border-border hover:bg-muted'
                              }`}
                            >
                              {s.tag}
                            </motion.button>
                          );
                        })}
                      </AnimatePresence>
                    </div>
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
                        placeholder="e.g. Mona Lisa pose"
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

                    {/* Optional comment */}
                    <div className="mt-4">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground inline-flex items-center gap-1 mb-1.5">
                        <MessageSquare className="w-3 h-3" /> Optional comment
                      </p>
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
                  <Button onClick={submit} className="flex-[2] gap-1.5">
                    <Coins className="w-4 h-4" />
                    Submit (+1 credit)
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