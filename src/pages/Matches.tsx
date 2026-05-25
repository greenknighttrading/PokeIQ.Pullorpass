import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowLeft, ImageOff, LogIn, Lock, ChevronLeft, ChevronRight, Wand2, Palette, Layers, Zap, BookOpen, Clock, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { GlobalNavBar } from '@/components/layout/GlobalNavBar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Seo } from '@/components/seo/Seo';
import { buildTasteProfile, AttrCount, TasteProfile } from '@/lib/tasteProfile';
import { fetchLikes, LikedCard, ERA_LABELS, PRICE_TIER_LABEL, backfillMissingTypes } from '@/lib/likesService';
import { recommendForUser, RecommendedCard } from '@/lib/recommendCards';
import { CardDetailModal, CardDetailSeed } from '@/components/cards/CardDetailModal';
import tasteHeroArt from '@/assets/taste-hero-art.jpg';

type FacetKey = 'all' | 'artist' | 'set' | 'era' | 'type' | 'rarity' | 'priceTier';
const FACETS: { key: FacetKey; label: string; icon: React.ReactNode }[] = [
  { key: 'all',       label: 'All',         icon: <Layers className="w-3.5 h-3.5" /> },
  { key: 'artist',    label: 'Artist',      icon: <Palette className="w-3.5 h-3.5" /> },
  { key: 'set',       label: 'Set',         icon: <Layers className="w-3.5 h-3.5" /> },
  { key: 'era',       label: 'Era',         icon: <Layers className="w-3.5 h-3.5" /> },
  { key: 'type',      label: 'Type',        icon: <Zap className="w-3.5 h-3.5" /> },
  { key: 'rarity',    label: 'Rarity',      icon: <Sparkles className="w-3.5 h-3.5" /> },
  { key: 'priceTier', label: 'Value',       icon: <Layers className="w-3.5 h-3.5" /> },
];

export default function Matches() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [likes, setLikes] = useState<LikedCard[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendedCard[]>([]);
  const [openSeed, setOpenSeed] = useState<CardDetailSeed | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || session.user.is_anonymous) { setLoading(false); return; }
      setUserId(session.user.id);
      const liked = await fetchLikes(session.user.id);
      setLikes(liked);
      if (liked.length > 0) {
        try { setRecommendations(await recommendForUser(liked, 12)); }
        catch (e) { console.warn('recommend failed', e); }
      }
      setLoading(false);

      // Background backfill — populate pokemon_type/artist for older likes
      // that were saved before cards_ppt had data. Refreshes the UI when done.
      if (liked.length > 0) {
        backfillMissingTypes(session.user.id, liked, { max: 60 })
          .then(updated => {
            if (updated !== liked) setLikes(updated);
          })
          .catch(e => console.warn('backfillMissingTypes failed', e));
      }
    })();
  }, []);

  const taste = useMemo(() => buildTasteProfile(likes), [likes]);

  return (
    <>
      <Seo title="Your Collector Taste | PokeIQ" description="Your personal Pokémon collector identity — built from every card you've liked." />
      <div className="min-h-screen bg-background flex flex-col">
        <GlobalNavBar />
        <main className="flex-1 w-full mx-auto px-5 sm:px-8 py-8 sm:py-10" style={{ maxWidth: '1380px' }}>
          <Link to="/swipe" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-6">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to swiping
          </Link>

          {loading && <Card className="p-10 text-center text-muted-foreground text-sm">Loading your collection…</Card>}

          {!loading && !userId && (
            <Card className="p-10 text-center space-y-4 border-primary/30 bg-primary/5 max-w-xl mx-auto mt-12">
              <Lock className="w-10 h-10 mx-auto text-primary" />
              <h3 className="text-2xl font-bold text-foreground">Sign up to see your Collector Taste</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Your taste profile is saved to your Collector account. Create one free to start building yours.
              </p>
              <Button onClick={() => navigate('/auth')} size="lg" className="gap-2">
                <LogIn className="w-4 h-4" /> Sign up free
              </Button>
            </Card>
          )}

          {!loading && userId && (
            <div className="space-y-8 sm:space-y-10">
              <TasteHero taste={taste} />
              {likes.length > 0 && <RecentlyLiked likes={likes} onOpen={setOpenSeed} />}
              <BinderView likes={likes} taste={taste} onOpen={setOpenSeed} />
              {recommendations.length > 0 && <RecommendationsBanner items={recommendations} onOpen={setOpenSeed} />}
              <DeepTasteInsights taste={taste} />
            </div>
          )}
        </main>
        <CardDetailModal open={!!openSeed} seed={openSeed} onClose={() => setOpenSeed(null)} />
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// SECTION 1 — Taste Profile Hero
// ─────────────────────────────────────────────────────────────

const STAGE_LABEL: Record<string, string> = {
  seedling: 'Seedling', sprouting: 'Sprouting', established: 'Established', expert: 'Expert',
};

function buildIdentitySentence(t: TasteProfile): string {
  if (t.totalLikes === 0) return 'Start swiping to reveal your collector identity.';
  if (t.totalLikes < 8) return 'A taste is forming — keep swiping to sharpen your collector identity.';
  const era = t.topEras[0];
  const rarity = t.topRarities[0];
  const artist = t.topArtists[0];
  const tier = t.priceDistribution.find((p) => p.key !== 'unknown');
  const pokemon = t.topPokemon[0];
  const bits: string[] = [];
  if (era && era.pct >= 25) bits.push(`${era.label.split(' (')[0].toLowerCase()} cards`);
  if (rarity && rarity.pct >= 25) bits.push(rarity.label.toLowerCase());
  if (pokemon && pokemon.count >= 3) bits.push(`${pokemon.label}-heavy picks`);
  if (artist && artist.count >= 3) bits.push(`art by ${artist.label}`);
  if (tier && tier.pct >= 30 && tier.key !== 'budget') bits.push(tier.label.toLowerCase());
  if (bits.length === 0) return 'Your taste is eclectic — drawn to a wide range of cards and eras.';
  const head = bits.slice(0, -1).join(', ');
  const tail = bits[bits.length - 1];
  const phrase = bits.length === 1 ? tail : `${head}, and ${tail}`;
  return `You gravitate toward ${phrase}.`;
}

function buildSignals(t: TasteProfile): { label: string; sub?: string }[] {
  const out: { label: string; sub?: string }[] = [];
  const seen = new Set<string>();
  const push = (label: string, sub?: string) => {
    const k = label.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    out.push({ label, sub });
  };
  if (t.topEras[0]) push(t.topEras[0].label.split(' (')[0], `${t.topEras[0].pct}% of likes`);
  if (t.topRarities[0]) push(t.topRarities[0].label, `${t.topRarities[0].count} cards`);
  if (t.topPokemon[0] && t.topPokemon[0].count >= 2) push(`${t.topPokemon[0].label}-heavy`, `${t.topPokemon[0].count} cards`);
  if (t.topArtists[0] && t.topArtists[0].count >= 2) push(`Art by ${t.topArtists[0].label}`, `${t.topArtists[0].count} cards`);
  const tier = t.priceDistribution.find((p) => p.key !== 'unknown');
  if (tier && tier.pct >= 20) push(tier.label, `${tier.pct}%`);
  if (t.topPokemonTypes[0] && t.topPokemonTypes[0].pct >= 20) push(`${t.topPokemonTypes[0].label} type`, `${t.topPokemonTypes[0].pct}%`);
  if (t.languageMix.find((l) => l.key === 'Japanese' && l.pct >= 20)) push('Japanese cards');
  return out.slice(0, 5);
}

function TasteHero({ taste }: { taste: TasteProfile }) {
  const sentence = buildIdentitySentence(taste);
  const signals = buildSignals(taste);
  const { totalLikes, stage, nextThreshold, avgPrice } = taste;

  // Top stats for the 4 aligned boxes below the hero
  const topEra = taste.topEras[0];
  const topType = taste.topPokemonTypes[0];
  const topArtist = taste.topArtists[0];
  const topRarity = taste.topRarities[0];
  const stats: { label: string; value: string; sub?: string }[] = [
    {
      label: 'Collection Likes',
      value: totalLikes.toLocaleString(),
      sub: `${STAGE_LABEL[stage]} collector`,
    },
    {
      label: 'Avg Card Value',
      value: avgPrice > 0 ? `$${avgPrice.toFixed(0)}` : '—',
      sub: avgPrice > 0 ? 'across your likes' : 'no priced cards yet',
    },
    {
      label: 'Top Era',
      value: topEra ? topEra.label.split(' (')[0] : '—',
      sub: topEra ? `${topEra.pct}% of likes` : 'keep swiping',
    },
    {
      label: 'Top Type',
      value: topType ? topType.label : (topRarity ? topRarity.label : (topArtist ? topArtist.label : '—')),
      sub: topType
        ? `${topType.pct}% of likes`
        : topRarity
          ? `${topRarity.count} cards`
          : topArtist
            ? `by ${topArtist.label}`
            : 'keep swiping',
    },
  ];

  return (
    <section className="relative space-y-4">
      {/* Hero card with split content/art layout */}
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-primary/10 via-card to-card">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-32 -left-20 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
        </div>

        {/* Art layer — fills the entire widget */}
        <div className="absolute inset-0 pointer-events-none">
          <img
            src={tasteHeroArt}
            alt=""
            aria-hidden="true"
            width={1920}
            height={1080}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          {/* Left-to-right dark fade so text stays readable */}
          <div className="absolute inset-0 bg-gradient-to-r from-card via-card/80 md:via-card/60 to-transparent" />
          {/* Bottom vignette for polish */}
          <div className="absolute inset-0 bg-gradient-to-t from-card/70 via-transparent to-card/20" />
        </div>

        <div className="relative p-8 sm:p-12 md:max-w-[58%]">
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="secondary" className="text-[10px] uppercase tracking-widest">
              {STAGE_LABEL[stage]} collector
            </Badge>
            {totalLikes > 0 && (
              <span className="text-xs text-muted-foreground tabular-nums">
                {totalLikes} likes{avgPrice > 0 && ` · avg $${avgPrice.toFixed(0)}`}
              </span>
            )}
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
            Your Collector Taste
          </h1>
          <p className="mt-5 text-lg sm:text-xl text-foreground/85 leading-relaxed">
            {sentence}
          </p>

          {signals.length > 0 && (
            <div className="mt-8">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3">
                You gravitate toward
              </p>
              <div className="flex flex-wrap gap-2.5">
                {signals.map((s, i) => (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="inline-flex items-baseline gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 backdrop-blur"
                  >
                    <span className="text-sm font-semibold text-foreground">{s.label}</span>
                    {s.sub && <span className="text-[10px] text-muted-foreground tabular-nums">{s.sub}</span>}
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              variant="outline"
              className="gap-2"
              onClick={() => document.getElementById('deep-insights')?.scrollIntoView({ behavior: 'smooth' })}
            >
              See full taste breakdown <ArrowRight className="w-4 h-4" />
            </Button>
            {nextThreshold && totalLikes < nextThreshold && totalLikes > 0 && (
              <span className="text-xs text-muted-foreground">
                {nextThreshold - totalLikes} more likes unlock deeper analysis
              </span>
            )}
            {totalLikes === 0 && (
              <Button size="lg" asChild className="gap-2">
                <Link to="/swipe">Start swiping</Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 4 aligned stat boxes */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + i * 0.05 }}
            className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6"
          >
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
              {s.label}
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-foreground tabular-nums truncate">
              {s.value}
            </p>
            {s.sub && (
              <p className="mt-1 text-xs text-muted-foreground truncate">{s.sub}</p>
            )}
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// SECTION 2 — Recently Liked
// ─────────────────────────────────────────────────────────────

function RecentlyLiked({ likes, onOpen }: { likes: LikedCard[]; onOpen: (s: CardDetailSeed) => void }) {
  const recent = likes.slice(0, 18);
  return (
    <section>
      <div className="mb-5">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Recently liked</h2>
        </div>
        <p className="text-sm text-muted-foreground mt-1">The latest cards that caught your eye.</p>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x [scrollbar-width:thin]">
        {recent.map((c) => <RecentCard key={c.id} like={c} onOpen={onOpen} />)}
      </div>
    </section>
  );
}

function RecentCard({ like, onOpen }: { like: LikedCard; onOpen: (s: CardDetailSeed) => void }) {
  const [err, setErr] = useState(false);
  return (
    <motion.button
      whileHover={{ y: -6 }}
      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      onClick={() => onOpen({
        card_id: like.card_id, card_name: like.card_name, set_name: like.set_name,
        image_url: like.image_url, price: like.price, rarity: like.rarity,
        artist: like.artist, pokemon_type: like.pokemon_type, card_number: like.card_number,
      })}
      className="group shrink-0 w-[170px] sm:w-[190px] snap-start text-left"
    >
      <div className="relative aspect-[2.5/3.5] rounded-xl overflow-hidden bg-muted/30 ring-1 ring-border/60 shadow-md group-hover:shadow-[0_18px_40px_-12px_hsl(var(--primary)/0.55)] group-hover:ring-primary/50 transition-all duration-300">
        {like.image_url && !err ? (
          <img src={like.image_url} alt={like.card_name} className="w-full h-full object-cover" onError={() => setErr(true)} />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><ImageOff className="w-5 h-5 text-muted-foreground" /></div>
        )}
      </div>
      <p className="mt-2.5 text-sm text-foreground font-medium truncate">{like.card_name}</p>
      <p className="text-xs text-muted-foreground truncate">
        {like.set_name ?? '—'}{like.price ? ` · $${Number(like.price).toFixed(0)}` : ''}
      </p>
    </motion.button>
  );
}

// ─────────────────────────────────────────────────────────────
// SECTION 3 — Your Binder
// ─────────────────────────────────────────────────────────────

const CARDS_PER_PAGE = 9;
const CARDS_PER_SPREAD = CARDS_PER_PAGE * 2;

function BinderView({ likes, taste, onOpen }: { likes: LikedCard[]; taste: TasteProfile; onOpen: (s: CardDetailSeed) => void }) {
  const [spread, setSpread] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [facet, setFacet] = useState<FacetKey>('all');
  const [value, setValue] = useState<string>('');

  React.useEffect(() => { setSpread(0); setDir(1); }, [facet, value]);

  const facetOptions: AttrCount[] = useMemo(() => {
    switch (facet) {
      case 'artist':    return taste.topArtists;
      case 'set':       return taste.topSets;
      case 'era':       return taste.topEras;
      case 'type':      return taste.topPokemonTypes;
      case 'rarity':    return taste.topRarities;
      case 'priceTier': return taste.priceDistribution;
      default: return [];
    }
  }, [facet, taste]);

  const filtered = useMemo(() => {
    if (facet === 'all' || !value) return likes;
    return likes.filter((c) => {
      switch (facet) {
        case 'artist':    return c.artist === value;
        case 'set':       return c.set_name === value;
        case 'era':       return c.era === value;
        case 'type':      return c.pokemon_type === value;
        case 'rarity':    return c.rarity === value;
        case 'priceTier': return c.price_tier === value;
      }
      return true;
    });
  }, [likes, facet, value]);

  const totalSpreads = Math.max(1, Math.ceil(filtered.length / CARDS_PER_SPREAD));
  const start = spread * CARDS_PER_SPREAD;
  const leftCards = filtered.slice(start, start + CARDS_PER_PAGE);
  const rightCards = filtered.slice(start + CARDS_PER_PAGE, start + CARDS_PER_SPREAD);

  const go = (delta: 1 | -1) => {
    setDir(delta);
    setSpread((s) => Math.min(Math.max(0, s + delta), totalSpreads - 1));
  };

  const labelFor = (v: string) => {
    if (facet === 'era')       return ERA_LABELS[v] ?? v;
    if (facet === 'priceTier') return PRICE_TIER_LABEL[v] ?? v;
    return v;
  };

  return (
    <section>
      <div className="mb-5">
        <div className="flex items-center gap-2 flex-wrap">
          <BookOpen className="w-5 h-5 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Your binder</h2>
          <span className="text-sm text-muted-foreground tabular-nums">
            · {filtered.length}{value ? ` of ${likes.length}` : ''}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">A curated digital binder of every card you've liked.</p>
      </div>

      {likes.length > 0 && (
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1 -mx-5 px-5 sm:-mx-8 sm:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FACETS.map((f) => {
            const active = facet === f.key;
            return (
              <button
                key={f.key}
                onClick={() => { setFacet(f.key); setValue(''); }}
                className={`shrink-0 text-sm px-4 py-2 rounded-full border transition-all inline-flex items-center gap-1.5 font-medium ${
                  active
                    ? 'bg-primary text-primary-foreground border-primary shadow-md'
                    : 'bg-card text-muted-foreground border-border hover:text-foreground hover:border-primary/40'
                }`}
              >
                {f.icon}{f.label}
              </button>
            );
          })}
        </div>
      )}

      {facet !== 'all' && facetOptions.length > 0 && (
        <div className="flex gap-2 mb-5 overflow-x-auto pb-2 -mx-5 px-5 sm:-mx-8 sm:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {facetOptions.map((o) => {
            const active = value === o.key;
            return (
              <button
                key={o.key}
                onClick={() => setValue(active ? '' : o.key)}
                className={`shrink-0 text-sm px-4 py-2 rounded-full border transition-all font-medium ${
                  active
                    ? 'bg-primary text-primary-foreground border-primary shadow-md'
                    : 'bg-background/40 text-foreground/85 border-border hover:border-primary/40'
                }`}
              >
                {labelFor(o.key)} <span className="tabular-nums opacity-70 ml-1">{o.count}</span>
              </button>
            );
          })}
        </div>
      )}

      {likes.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-base text-foreground font-medium mb-1">Your binder is empty.</p>
          <p className="text-sm text-muted-foreground mb-5">Like a card on swipe to add it to your binder.</p>
          <Button asChild><Link to="/swipe">Start swiping</Link></Button>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground border-dashed">
          No cards match this filter yet.
        </Card>
      ) : (
        <div className="relative">
          <div className="relative rounded-3xl p-3 sm:p-4 shadow-2xl border border-border/60"
               style={{ background: 'linear-gradient(145deg, hsl(var(--card)) 0%, hsl(var(--muted)/0.6) 100%)', perspective: '1800px' }}>
            <div className="hidden sm:block absolute top-3 bottom-3 left-1/2 -translate-x-1/2 w-2 rounded-full bg-gradient-to-b from-border/40 via-border to-border/40 shadow-inner pointer-events-none z-10" />
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div
                key={spread} custom={dir}
                initial={{ rotateY: dir === 1 ? 35 : -35, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                exit={{ rotateY: dir === 1 ? -35 : 35, opacity: 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <BinderPage cards={leftCards} pageNumber={spread * 2 + 1} side="left" onOpen={onOpen} />
                <BinderPage cards={rightCards} pageNumber={spread * 2 + 2} side="right" onOpen={onOpen} />
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="flex items-center justify-between mt-4">
            <Button variant="outline" size="sm" onClick={() => go(-1)} disabled={spread === 0} className="gap-1">
              <ChevronLeft className="w-4 h-4" /> Prev
            </Button>
            <span className="text-sm text-muted-foreground tabular-nums">
              Pages {spread * 2 + 1}–{Math.min(spread * 2 + 2, Math.ceil(filtered.length / CARDS_PER_PAGE))} of {Math.max(1, Math.ceil(filtered.length / CARDS_PER_PAGE))}
            </span>
            <Button variant="outline" size="sm" onClick={() => go(1)} disabled={spread >= totalSpreads - 1} className="gap-1">
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

function BinderPage({ cards, pageNumber, side, onOpen }: { cards: LikedCard[]; pageNumber: number; side: 'left' | 'right'; onOpen: (s: CardDetailSeed) => void }) {
  const slots = Array.from({ length: CARDS_PER_PAGE }, (_, i) => cards[i] ?? null);
  return (
    <div className="relative rounded-2xl p-2 sm:p-2.5 bg-background/60 ring-1 ring-border/50 shadow-inner"
         style={{ backgroundImage: 'radial-gradient(hsl(var(--muted-foreground)/0.08) 1px, transparent 1px)', backgroundSize: '14px 14px' }}>
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        {slots.map((c, i) => <BinderSlot key={c?.id ?? `empty-${pageNumber}-${i}`} like={c} onOpen={onOpen} />)}
      </div>
      <p className={`text-[10px] text-muted-foreground tabular-nums mt-1.5 ${side === 'left' ? 'text-left' : 'text-right'}`}>Page {pageNumber}</p>
    </div>
  );
}

function BinderSlot({ like, onOpen }: { like: LikedCard | null; onOpen: (s: CardDetailSeed) => void }) {
  const [err, setErr] = useState(false);
  if (!like) return <div className="aspect-[2.5/3.5] rounded-md bg-muted/30 ring-1 ring-dashed ring-border/40" />;
  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -3, zIndex: 5 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className="relative aspect-[2.5/3.5] rounded-md overflow-hidden bg-muted/40 ring-1 ring-border/40 shadow-sm hover:shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.5)] hover:ring-primary/50 cursor-pointer"
      title={[like.card_name, like.set_name, like.artist && `by ${like.artist}`].filter(Boolean).join(' · ')}
      onClick={() => onOpen({
        card_id: like.card_id, card_name: like.card_name, set_name: like.set_name,
        image_url: like.image_url, price: like.price, rarity: like.rarity,
        artist: like.artist, pokemon_type: like.pokemon_type, card_number: like.card_number,
      })}
    >
      {like.image_url && !err ? (
        <img src={like.image_url} alt={like.card_name} className="w-full h-full object-cover" onError={() => setErr(true)} />
      ) : (
        <div className="w-full h-full flex items-center justify-center"><ImageOff className="w-4 h-4 text-muted-foreground" /></div>
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// Recommendations (kept between Binder and Deep Insights)
// ─────────────────────────────────────────────────────────────

function RecommendationsBanner({ items, onOpen }: { items: RecommendedCard[]; onOpen: (s: CardDetailSeed) => void }) {
  return (
    <section>
      <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 sm:p-8 shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <Wand2 className="w-5 h-5 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Recommended for you</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Picked by matching the artists, sets, types, and rarities you keep liking.
        </p>
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 [scrollbar-width:thin]">
          {items.map((r) => <RecCard key={r.card_id} r={r} onOpen={onOpen} />)}
        </div>
      </div>
    </section>
  );
}

function RecCard({ r, onOpen }: { r: RecommendedCard; onOpen: (s: CardDetailSeed) => void }) {
  const [err, setErr] = useState(false);
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.04 }}
      transition={{ type: 'spring', stiffness: 280, damping: 20 }}
      className="shrink-0 w-[140px] space-y-1.5 cursor-pointer"
      onClick={() => onOpen({
        card_id: r.card_id, card_name: r.card_name, set_name: r.set_name,
        image_url: r.image_url, price: r.price, rarity: r.rarity,
        artist: r.artist, pokemon_type: r.pokemon_type,
      })}
    >
      <div className="relative aspect-[2.5/3.5] rounded-xl overflow-hidden bg-muted/30 ring-1 ring-primary/30 shadow-md">
        {r.image_url && !err ? (
          <img src={r.image_url} alt={r.card_name} className="w-full h-full object-cover" onError={() => setErr(true)} />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><ImageOff className="w-5 h-5 text-muted-foreground" /></div>
        )}
      </div>
      <p className="text-xs text-foreground truncate font-medium">{r.card_name}</p>
      <p className="text-[11px] text-muted-foreground truncate">{r.set_name ?? '—'}{r.price ? ` · $${Number(r.price).toFixed(0)}` : ''}</p>
      <p className="text-[10px] text-primary/80 truncate italic">{r.reason}</p>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// SECTION 4 — Deep Taste Insights (tabbed)
// ─────────────────────────────────────────────────────────────

function DeepTasteInsights({ taste }: { taste: TasteProfile }) {
  const tabs: { key: string; label: string; items: AttrCount[]; icon: React.ReactNode }[] = [
    { key: 'artists',  label: 'Artists',  items: taste.topArtists,        icon: <Palette className="w-3.5 h-3.5" /> },
    { key: 'sets',     label: 'Sets',     items: taste.topSets,           icon: <Layers className="w-3.5 h-3.5" /> },
    { key: 'eras',     label: 'Eras',     items: taste.topEras,           icon: <Layers className="w-3.5 h-3.5" /> },
    { key: 'types',    label: 'Types',    items: taste.topPokemonTypes,   icon: <Zap className="w-3.5 h-3.5" /> },
    { key: 'rarity',   label: 'Rarity',   items: taste.topRarities,       icon: <Sparkles className="w-3.5 h-3.5" /> },
    { key: 'value',    label: 'Value',    items: taste.priceDistribution, icon: <Layers className="w-3.5 h-3.5" /> },
  ];
  const hasAnyData = tabs.some((t) => t.items.length > 0);

  return (
    <section id="deep-insights">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">Deep taste insights</h2>
        <p className="text-sm text-muted-foreground mt-1">The hard patterns behind your likes.</p>
      </div>

      {!hasAnyData ? (
        <Card className="p-10 text-center border-dashed">
          <Sparkles className="w-6 h-6 text-primary mx-auto mb-3" />
          <p className="text-base text-foreground font-medium">More likes unlock deeper taste analysis.</p>
          <p className="text-xs text-muted-foreground mt-1">Keep swiping to reveal artists, sets, eras, and more.</p>
        </Card>
      ) : (
        <Tabs defaultValue="artists">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/40 p-1.5">
            {tabs.map((t) => (
              <TabsTrigger key={t.key} value={t.key} className="text-sm gap-1.5 px-4 py-2">
                {t.icon}{t.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {tabs.map((t) => (
            <TabsContent key={t.key} value={t.key} className="mt-6">
              <InsightTable items={t.items} label={t.label} />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </section>
  );
}

function InsightTable({ items, label }: { items: AttrCount[]; label: string }) {
  if (items.length === 0) {
    return (
      <Card className="p-10 text-center border-dashed">
        <p className="text-sm text-muted-foreground">More likes unlock {label.toLowerCase()} analysis.</p>
      </Card>
    );
  }
  const max = Math.max(...items.map((i) => i.count));
  return (
    <Card className="p-6 sm:p-8">
      <ul className="space-y-4">
        {items.map((a) => {
          const w = max > 0 ? (a.count / max) * 100 : 0;
          return (
            <li key={a.key} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-base font-medium text-foreground truncate">{a.label}</span>
                <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                  {a.count} <span className="opacity-60">· {a.pct}%</span>
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all" style={{ width: `${w}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
