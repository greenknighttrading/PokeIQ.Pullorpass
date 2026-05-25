import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Sparkles, ArrowLeft, ImageOff, LogIn, Lock, ChevronLeft, ChevronRight, Wand2, Brain, Palette, Layers, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { GlobalNavBar } from '@/components/layout/GlobalNavBar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Seo } from '@/components/seo/Seo';
import { buildTasteProfile, AttrCount, TasteProfile } from '@/lib/tasteProfile';
import { fetchLikes, LikedCard, ERA_LABELS, PRICE_TIER_LABEL } from '@/lib/likesService';
import { recommendForUser, RecommendedCard } from '@/lib/recommendCards';

type FacetKey = 'all' | 'artist' | 'set' | 'era' | 'type' | 'rarity' | 'priceTier';
const FACETS: { key: FacetKey; label: string; icon: React.ReactNode }[] = [
  { key: 'all',       label: 'All',         icon: <Layers className="w-3 h-3" /> },
  { key: 'artist',    label: 'Artist',      icon: <Palette className="w-3 h-3" /> },
  { key: 'set',       label: 'Set',         icon: <Layers className="w-3 h-3" /> },
  { key: 'era',       label: 'Era',         icon: <Layers className="w-3 h-3" /> },
  { key: 'type',      label: 'Type',        icon: <Zap className="w-3 h-3" /> },
  { key: 'rarity',    label: 'Rarity',      icon: <Sparkles className="w-3 h-3" /> },
  { key: 'priceTier', label: 'Price tier',  icon: <Layers className="w-3 h-3" /> },
];

export default function Matches() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [likes, setLikes] = useState<LikedCard[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendedCard[]>([]);

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
    })();
  }, []);

  const taste = useMemo(() => buildTasteProfile(likes), [likes]);

  return (
    <>
      <Seo title="Your Likes — Taste Profile | PokeIQ" description="Every card you've liked, with a taste profile built from real card metadata." />
      <div className="min-h-screen bg-background flex flex-col">
        <GlobalNavBar />
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
          <div className="mb-6">
            <Link to="/swipe" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to swiping
            </Link>
            <div className="flex items-center gap-2 mt-2">
              <Heart className="w-6 h-6 text-primary fill-primary" />
              <h1 className="text-2xl font-bold text-foreground">Your Likes</h1>
              <span className="text-sm text-muted-foreground tabular-nums">· {likes.length}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Every card you've liked. PokeIQ learns from the real metadata — artist, set, era, type, rarity — to build a grounded taste profile.{' '}
              <Link to="/earn" className="text-primary hover:underline font-medium">Earn more swipes →</Link>
            </p>
          </div>

          {loading && <Card className="p-10 text-center text-muted-foreground text-sm">Loading your likes…</Card>}

          {!loading && !userId && (
            <Card className="p-8 text-center space-y-4 border-primary/30 bg-primary/5">
              <Lock className="w-8 h-8 mx-auto text-primary" />
              <h3 className="text-lg font-bold text-foreground">Sign up to see your Likes</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Your likes are saved to your Collector Profile. Create a free account to start building yours.
              </p>
              <Button onClick={() => navigate('/auth')} size="lg" className="gap-2">
                <LogIn className="w-4 h-4" /> Sign up free
              </Button>
            </Card>
          )}

          {!loading && userId && (
            <>
              {recommendations.length > 0 && <RecommendationsBanner items={recommendations} />}
              <TasteProfilePanel taste={taste} />
              <BinderView likes={likes} taste={taste} />
            </>
          )}
        </main>
      </div>
    </>
  );
}

function TasteProfilePanel({ taste }: { taste: TasteProfile }) {
  const { totalLikes, stage, nextThreshold, insights, avgPrice } = taste;
  if (totalLikes === 0) {
    return (
      <Card className="p-6 mb-5 border-primary/20 bg-primary/5">
        <div className="flex items-center gap-2 mb-1">
          <Brain className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Taste Profile</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Like a card on swipe and PokeIQ will start learning your collecting patterns — artist, set, era, type, rarity. No vibes, just facts.
        </p>
      </Card>
    );
  }
  const stageLabel: Record<string, string> = { seedling: 'Seedling', sprouting: 'Sprouting', established: 'Established', expert: 'Expert' };
  return (
    <section className="mb-6">
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Brain className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Your Taste Profile</h2>
              <Badge variant="secondary" className="text-[10px]">{stageLabel[stage]}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Built from <span className="text-foreground font-medium">{totalLikes}</span> liked card{totalLikes === 1 ? '' : 's'}
              {avgPrice > 0 && <> · avg ${avgPrice.toFixed(0)}</>}
              {nextThreshold && totalLikes < nextThreshold && <> · {nextThreshold - totalLikes} more to next stage</>}
            </p>
          </div>
        </div>
        {insights.length > 0 && (
          <ul className="space-y-1.5 mb-4">
            {insights.map((i, k) => (
              <li key={k} className="text-sm text-foreground flex gap-2">
                <Sparkles className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" /><span>{i}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <AttrBlock title="Top artists"  icon={<Palette className="w-3 h-3" />} items={taste.topArtists} />
          <AttrBlock title="Top sets"     icon={<Layers className="w-3 h-3" />}  items={taste.topSets} />
          <AttrBlock title="Top eras"     icon={<Layers className="w-3 h-3" />}  items={taste.topEras} />
          <AttrBlock title="Top types"    icon={<Zap className="w-3 h-3" />}     items={taste.topPokemonTypes} />
          <AttrBlock title="Top rarities" icon={<Sparkles className="w-3 h-3" />} items={taste.topRarities} />
          <AttrBlock title="Price tier"   icon={<Layers className="w-3 h-3" />}  items={taste.priceDistribution} />
        </div>
        {stage === 'seedling' && (
          <p className="text-[11px] text-muted-foreground mt-3 italic">
            PokeIQ is learning — like {Math.max(1, 20 - totalLikes)} more card{20 - totalLikes === 1 ? '' : 's'} to unlock your first full taste profile.
          </p>
        )}
        {stage === 'expert' && (
          <p className="text-[11px] text-primary mt-3 italic">
            Vibe-based AI taste analysis unlocking soon — your profile has enough signal.
          </p>
        )}
      </Card>
    </section>
  );
}

function AttrBlock({ title, icon, items }: { title: string; icon: React.ReactNode; items: AttrCount[] }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/40 p-3">
      <div className="flex items-center gap-1.5 mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}<span>{title}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">Not enough data yet</p>
      ) : (
        <ul className="space-y-1">
          {items.slice(0, 4).map((a) => (
            <li key={a.key} className="flex items-center justify-between text-xs gap-2">
              <span className="text-foreground truncate">{a.label}</span>
              <span className="text-muted-foreground tabular-nums shrink-0">{a.count} · {a.pct}%</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RecommendationsBanner({ items }: { items: RecommendedCard[] }) {
  return (
    <section className="mb-5">
      <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 shadow-lg">
        <div className="flex items-center gap-2 mb-1">
          <Wand2 className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Recommended for you</h2>
        </div>
        <p className="text-[11px] text-muted-foreground mb-3">
          Picked by matching the artists, sets, types, and rarities you keep liking.
        </p>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 [scrollbar-width:thin]">
          {items.map((r) => <RecCard key={r.card_id} r={r} />)}
        </div>
      </div>
    </section>
  );
}

function RecCard({ r }: { r: RecommendedCard }) {
  const [err, setErr] = useState(false);
  return (
    <motion.div whileHover={{ y: -4, scale: 1.04 }} transition={{ type: 'spring', stiffness: 280, damping: 20 }} className="shrink-0 w-[120px] space-y-1.5">
      <div className="relative aspect-[2.5/3.5] rounded-lg overflow-hidden bg-muted/30 ring-1 ring-primary/30 shadow-md">
        {r.image_url && !err ? (
          <img src={r.image_url} alt={r.card_name} className="w-full h-full object-cover" onError={() => setErr(true)} />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><ImageOff className="w-5 h-5 text-muted-foreground" /></div>
        )}
      </div>
      <p className="text-[11px] text-foreground truncate font-medium">{r.card_name}</p>
      <p className="text-[10px] text-muted-foreground truncate">{r.set_name ?? '—'}{r.price ? ` · $${Number(r.price).toFixed(0)}` : ''}</p>
      <p className="text-[9px] text-primary/80 truncate italic">{r.reason}</p>
    </motion.div>
  );
}

const CARDS_PER_PAGE = 9;
const CARDS_PER_SPREAD = CARDS_PER_PAGE * 2;

function BinderView({ likes, taste }: { likes: LikedCard[]; taste: TasteProfile }) {
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
    <section className="mb-10">
      <div className="flex items-end justify-between mb-2 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Heart className="w-4 h-4 text-primary fill-primary" />
          <h2 className="text-base font-semibold text-foreground">Your binder</h2>
          <span className="text-xs text-muted-foreground tabular-nums">
            · {filtered.length}{value ? ` of ${likes.length}` : ''}
          </span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mb-3">Every card you've liked — organized like a real binder. Filter by any hard attribute.</p>

      {likes.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {FACETS.map((f) => {
            const active = facet === f.key;
            return (
              <button
                key={f.key}
                onClick={() => { setFacet(f.key); setValue(''); }}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors inline-flex items-center gap-1.5 ${
                  active ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:text-foreground hover:border-primary/40'
                }`}
              >
                {f.icon}{f.label}
              </button>
            );
          })}
        </div>
      )}

      {facet !== 'all' && facetOptions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {facetOptions.map((o) => {
            const active = value === o.key;
            return (
              <button
                key={o.key}
                onClick={() => setValue(active ? '' : o.key)}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                  active ? 'bg-primary text-primary-foreground border-primary' : 'bg-background/40 text-foreground/80 border-border hover:border-primary/40'
                }`}
              >
                {labelFor(o.key)} <span className="tabular-nums opacity-70">· {o.count}</span>
              </button>
            );
          })}
        </div>
      )}

      {likes.length === 0 ? (
        <Card className="p-6 text-center text-xs text-muted-foreground">
          No likes yet. Start swiping to build your binder.
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-6 text-center text-xs text-muted-foreground">
          No cards match this filter yet.
        </Card>
      ) : (
        <div className="relative">
          <div className="relative rounded-2xl p-3 sm:p-5 shadow-2xl border border-border/60"
               style={{ background: 'linear-gradient(145deg, hsl(var(--card)) 0%, hsl(var(--muted)/0.6) 100%)', perspective: '1800px' }}>
            <div className="hidden sm:block absolute top-3 bottom-3 left-1/2 -translate-x-1/2 w-2 rounded-full bg-gradient-to-b from-border/40 via-border to-border/40 shadow-inner pointer-events-none z-10" />
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div
                key={spread} custom={dir}
                initial={{ rotateY: dir === 1 ? 35 : -35, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                exit={{ rotateY: dir === 1 ? -35 : 35, opacity: 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <BinderPage cards={leftCards} pageNumber={spread * 2 + 1} side="left" />
                <BinderPage cards={rightCards} pageNumber={spread * 2 + 2} side="right" />
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="flex items-center justify-between mt-3">
            <Button variant="outline" size="sm" onClick={() => go(-1)} disabled={spread === 0} className="gap-1">
              <ChevronLeft className="w-4 h-4" /> Prev
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums">
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

function BinderPage({ cards, pageNumber, side }: { cards: LikedCard[]; pageNumber: number; side: 'left' | 'right' }) {
  const slots = Array.from({ length: CARDS_PER_PAGE }, (_, i) => cards[i] ?? null);
  return (
    <div className="relative rounded-xl p-2.5 sm:p-3 bg-background/60 ring-1 ring-border/50 shadow-inner"
         style={{ backgroundImage: 'radial-gradient(hsl(var(--muted-foreground)/0.08) 1px, transparent 1px)', backgroundSize: '14px 14px' }}>
      <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
        {slots.map((c, i) => <BinderSlot key={c?.id ?? `empty-${pageNumber}-${i}`} like={c} />)}
      </div>
      <p className={`text-[10px] text-muted-foreground tabular-nums mt-2 ${side === 'left' ? 'text-left' : 'text-right'}`}>Page {pageNumber}</p>
    </div>
  );
}

function BinderSlot({ like }: { like: LikedCard | null }) {
  const [err, setErr] = useState(false);
  if (!like) return <div className="aspect-[2.5/3.5] rounded-md bg-muted/30 ring-1 ring-dashed ring-border/40" />;
  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -3, zIndex: 5 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className="relative aspect-[2.5/3.5] rounded-md overflow-hidden bg-muted/40 ring-1 ring-border/40 shadow-sm hover:shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.5)] hover:ring-primary/50"
      title={[like.card_name, like.set_name, like.artist && `by ${like.artist}`].filter(Boolean).join(' · ')}
    >
      {like.image_url && !err ? (
        <img src={like.image_url} alt={like.card_name} className="w-full h-full object-cover" onError={() => setErr(true)} />
      ) : (
        <div className="w-full h-full flex items-center justify-center"><ImageOff className="w-4 h-4 text-muted-foreground" /></div>
      )}
    </motion.div>
  );
}