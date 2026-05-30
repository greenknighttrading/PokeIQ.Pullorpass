import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowLeft, ImageOff, LogIn, Lock, ChevronLeft, ChevronRight, Wand2, Palette, Layers, Zap, BookOpen, Clock, ArrowRight, Heart as HeartIcon, X as XIcon, Pencil, Check, X as XClose, Mountain, Flame, Star, Crown, Eye, Target, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Seo } from '@/components/seo/Seo';
import { buildTasteProfile, AttrCount, TasteProfile } from '@/lib/tasteProfile';
import { fetchLikes, LikedCard, ERA_LABELS, PRICE_TIER_LABEL, backfillMissingTypes } from '@/lib/likesService';
import { recommendForUser, RecommendedCard } from '@/lib/recommendCards';
import { CarouselRow } from '@/components/CarouselRow';
import { CardDetailModal, CardDetailSeed } from '@/components/cards/CardDetailModal';
import tasteHeroArt from '@/assets/taste-hero-art.jpg';
import investorPortrait from '@/assets/personalities/investor.jpg';
import archivistPortrait from '@/assets/personalities/archivist.jpg';
import dreamerPortrait from '@/assets/personalities/dreamer.jpg';
import flipperPortrait from '@/assets/personalities/flipper.jpg';
import analystPortrait from '@/assets/personalities/analyst.jpg';
import hunterPortrait from '@/assets/personalities/hunter.jpg';
import explorerPortrait from '@/assets/personalities/explorer.jpg';
import curatorPortrait from '@/assets/personalities/curator.jpg';
import monkPortrait from '@/assets/personalities/monk.jpg';
import gamblerPortrait from '@/assets/personalities/gambler.jpg';
import showmanPortrait from '@/assets/personalities/showman.jpg';
import minimalistPortrait from '@/assets/personalities/minimalist.jpg';
import { cn } from '@/lib/utils';
import { PERSONALITY_INFO, PersonalityType } from '@/lib/personalityEngine';

// Map of personality type → portrait illustration (matches /personality-types).
const PERSONALITY_PORTRAITS: Record<PersonalityType, string> = {
  Investor: investorPortrait,
  Archivist: archivistPortrait,
  Dreamer: dreamerPortrait,
  Flipper: flipperPortrait,
  Analyst: analystPortrait,
  Hunter: hunterPortrait,
  Explorer: explorerPortrait,
  Curator: curatorPortrait,
  Monk: monkPortrait,
  Gambler: gamblerPortrait,
  Showman: showmanPortrait,
  Minimalist: minimalistPortrait,
};

// Grammar helper — "a" vs "an" based on first letter sound.
const articleFor = (word: string) => (/^[aeiou]/i.test(word) ? 'an' : 'a');

// Take first N sentences from a paragraph.
const firstSentences = (text: string, n = 2) => {
  const parts = text.match(/[^.!?]+[.!?]+/g);
  if (!parts) return text;
  return parts.slice(0, n).join(' ').trim();
};

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
  const [passes, setPasses] = useState<LikedCard[]>([]);
  const [cardsSwiped, setCardsSwiped] = useState<number>(0);
  const [recommendations, setRecommendations] = useState<RecommendedCard[]>([]);
  const [openSeed, setOpenSeed] = useState<CardDetailSeed | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || session.user.is_anonymous) { setLoading(false); return; }
      const uid = session.user.id;
      setUserId(uid);

      // ── Stale-while-revalidate cache (sessionStorage) ──
      const cacheKey = `matches:v1:${uid}`;
      let cached: {
        likes: LikedCard[];
        passes: LikedCard[];
        recommendations: RecommendedCard[];
        likedCount: number;
        latestLikedAt: string | null;
      } | null = null;
      try {
        const raw = sessionStorage.getItem(cacheKey);
        if (raw) cached = JSON.parse(raw);
      } catch {}
      if (cached) {
        setLikes(cached.likes);
        setPasses(cached.passes);
        setRecommendations(cached.recommendations);
        setLoading(false);
      }

      const liked = await fetchLikes(uid);
      const latestLikedAt = liked.reduce<string | null>(
        (m, l) => (l.liked_at && (!m || l.liked_at > m) ? l.liked_at : m),
        null,
      );
      const unchanged =
        cached &&
        cached.likedCount === liked.length &&
        cached.latestLikedAt === latestLikedAt;

      setLikes(liked);
      // Total swipes for this user (likes + passes + supers across all time)
      try {
        const { count } = await supabase
          .from('pullorpass_swipes')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', uid);
        setCardsSwiped(count ?? 0);
      } catch (e) { console.warn('count swipes failed', e); }
      // Fetch recent passes from pullorpass_swipes
      let mapped: LikedCard[] = cached?.passes ?? [];
      try {
        const { data: passRows } = await supabase
          .from('pullorpass_swipes')
          .select('card_id, card_name, card_set, card_image, card_price, card_rarity, created_at')
          .eq('user_id', uid)
          .eq('decision', 'pass')
          .order('created_at', { ascending: false })
          .limit(40);
        mapped = (passRows ?? []).map((r: any) => ({
          id: `pass-${r.card_id}-${r.created_at}`,
          user_id: uid,
          card_id: r.card_id,
          card_name: r.card_name,
          pokemon_name: null,
          artist: null,
          set_name: r.card_set ?? null,
          set_id: null,
          era: null,
          release_year: null,
          card_type: null,
          pokemon_type: null,
          rarity: r.card_rarity ?? null,
          language: null,
          card_number: null,
          variant: null,
          product_category: null,
          price: Number(r.card_price) || null,
          price_tier: null,
          image_url: r.card_image ?? null,
          source: 'pass',
          liked_at: r.created_at,
        }));
        setPasses(mapped);
      } catch (e) { console.warn('fetch passes failed', e); }
      let recs: RecommendedCard[] = cached?.recommendations ?? [];
      if (liked.length > 0 && !unchanged) {
        try {
          recs = await recommendForUser(liked, 12);
          setRecommendations(recs);
        } catch (e) { console.warn('recommend failed', e); }
      }
      setLoading(false);

      try {
        sessionStorage.setItem(cacheKey, JSON.stringify({
          likes: liked,
          passes: mapped,
          recommendations: recs,
          likedCount: liked.length,
          latestLikedAt,
        }));
      } catch {}

      // Background backfill — populate pokemon_type/artist for older likes
      // that were saved before cards_ppt had data. Refreshes the UI when done.
      if (liked.length > 0) {
        backfillMissingTypes(uid, liked, { max: 60 })
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
      <Seo title="Your Collector DNA | PokeIQ" description="Your personal Pokémon collector identity — built from every card you've liked." />
      <div className="min-h-screen bg-background flex flex-col gap-0">
        <main className="flex-1 w-full mx-auto px-5 sm:px-8 py-8 sm:py-10" style={{ maxWidth: '1380px' }}>
          <Link to="/swipe" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-6">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to swiping
          </Link>

          {loading && <Card className="p-10 text-center text-muted-foreground text-sm">Loading your collection…</Card>}

          {!loading && !userId && (
            <Card className="p-10 text-center space-y-4 border-primary/30 bg-primary/5 max-w-xl mx-auto mt-12">
              <Lock className="w-10 h-10 mx-auto text-primary" />
              <h3 className="text-2xl font-bold text-foreground">Sign up to see your Collector DNA</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Your DNA profile is saved to your Collector account. Create one free to start building yours.
              </p>
              <Button onClick={() => navigate('/auth')} size="lg" className="gap-2">
                <LogIn className="w-4 h-4" /> Sign up free
              </Button>
            </Card>
          )}

          {!loading && userId && (
            <div className="space-y-8 sm:space-y-10">
              <TasteHero taste={taste} cardsSwiped={cardsSwiped} />
              {(likes.length > 0 || passes.length > 0) && (
                <RecentlyLiked likes={likes} passes={passes} onOpen={setOpenSeed} />
              )}
              {recommendations.length > 0 && <RecommendedRow items={recommendations} onOpen={setOpenSeed} />}
              <BinderView likes={likes} taste={taste} onOpen={setOpenSeed} userId={userId} />
              <DeepTasteInsights taste={taste} />
              <div className="-mt-8 sm:-mt-10">
                <DailyLimitWidget />
              </div>
            </div>
          )}
        </main>
        <CardDetailModal open={!!openSeed} seed={openSeed} onClose={() => setOpenSeed(null)} />
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// SECTION 1 — DNA Profile Hero
// ─────────────────────────────────────────────────────────────

const STAGE_LABEL: Record<string, string> = {
  seedling: 'Seedling', sprouting: 'Sprouting', established: 'Established', expert: 'Expert',
};

// ─────────────────────────────────────────────────────────────
// Editable username card — stores in auth user_metadata.display_name
// ─────────────────────────────────────────────────────────────
function UsernameInline() {
  const [email, setEmail] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? '');
      const display = (user.user_metadata as { display_name?: string } | null)?.display_name
        || (user.email ? user.email.split('@')[0] : '')
        || 'Collector';
      setName(display);
      setDraft(display);
    })();
  }, []);

  const save = async () => {
    const trimmed = draft.trim();
    if (!trimmed) { toast({ title: 'Username required', variant: 'destructive' }); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ data: { display_name: trimmed } });
    setSaving(false);
    if (error) { toast({ title: 'Could not save', description: error.message, variant: 'destructive' }); return; }
    setName(trimmed);
    setEditing(false);
    toast({ title: 'Username updated' });
  };

  const initial = (name || 'C').charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-3">
      <div className="w-11 h-11 rounded-full bg-primary/20 border border-primary/30 text-primary flex items-center justify-center text-base font-bold shrink-0">
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="flex items-center gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={32}
              placeholder="Choose a username"
              className="h-9 max-w-xs"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setEditing(false); setDraft(name); } }}
            />
            <Button size="icon" variant="ghost" onClick={save} disabled={saving} className="h-9 w-9">
              <Check className="w-4 h-4 text-success" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => { setEditing(false); setDraft(name); }} className="h-9 w-9">
              <XClose className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm sm:text-base font-semibold text-foreground truncate">{name}</span>
            <button onClick={() => setEditing(true)} className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted/40 transition-colors">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {email && <p className="text-[11px] text-muted-foreground truncate">{email}</p>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Personality test CTA — sits at the bottom of the Smart Profile.
// Collector DNA = WHAT they collect; Personality Test = HOW they collect.
// ─────────────────────────────────────────────────────────────
function PersonalityTestCTA({ personalityType }: { personalityType: string | null }) {
  if (personalityType) {
    const info = PERSONALITY_INFO[personalityType as PersonalityType];
    const article = articleFor(personalityType);
    const portrait = PERSONALITY_PORTRAITS[personalityType as PersonalityType];
    return (
      <div>
        {/* Personality — left aligned, portrait + content stacked */}
        <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-primary/10 via-card to-card p-5 sm:p-6 md:p-7">
          <div className="flex items-start gap-5 text-left">
            {portrait ? (
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-card shrink-0 border border-border/60">
                <img
                  src={portrait}
                  alt={`Illustration of ${article} ${personalityType}`}
                  width={512}
                  height={512}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover object-top"
                />
              </div>
            ) : info ? (
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-card flex items-center justify-center text-5xl shrink-0 border border-border/60">
                <span aria-hidden>{info.emoji}</span>
              </div>
            ) : null}

            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-[0.22em] text-primary font-bold mb-2">
                Collector Personality
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-[1.1]">
                You are {article}{' '}
                <span className="bg-clip-text text-transparent bg-gradient-to-br from-primary via-primary to-primary/60">
                  {personalityType}
                </span>
              </h2>
              {info?.summary && (
                <p className="mt-2 text-sm text-foreground/80 leading-relaxed">
                  {info.summary}
                </p>
              )}
              <div className="flex items-center gap-4 mt-4">
                <Button asChild size="sm" className="gap-2">
                  <Link to="/personality-types">
                    Explore your type <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
                <Link
                  to="/test"
                  className="text-xs text-muted-foreground hover:text-primary underline-offset-2 hover:underline"
                >
                  Retake the test
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link
      to="/test"
      className="group block rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-6 sm:p-7 hover:border-primary/50 transition-colors"
    >
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-xl bg-primary/20 border border-primary/30 text-primary flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-primary mb-1.5">
            Next step
          </p>
          <h3 className="text-lg sm:text-xl font-bold text-foreground">
            Take the Collector Personality Test
          </h3>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            Your Collector DNA shows <span className="text-foreground font-medium">what</span> you collect.
            The personality test reveals <span className="text-foreground font-medium">how</span> you collect —
            unlocking your archetype (Archivist, Historian, Investor, and more).
          </p>
          <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
            Start the test <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function buildIdentitySentence(t: TasteProfile): string {
  if (t.totalLikes === 0) return 'Start swiping to reveal your collector identity.';
  if (t.totalLikes < 8) return 'Your DNA is forming — keep swiping to sharpen your collector identity.';
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
  if (bits.length === 0) return 'Your DNA is eclectic — drawn to a wide range of cards and eras.';
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

function TasteHero({ taste, cardsSwiped }: { taste: TasteProfile; cardsSwiped: number }) {
  const sentence = buildIdentitySentence(taste);
  const signals = buildSignals(taste);
  const { totalLikes, stage, nextThreshold, avgPrice } = taste;

  // Personality test result (localStorage). Read once on mount + when storage changes.
  const [personalityType, setPersonalityType] = useState<string | null>(null);
  useEffect(() => {
    const read = () => {
      try {
        const raw = localStorage.getItem('personalityResult');
        if (!raw) { setPersonalityType(null); return; }
        const parsed = JSON.parse(raw);
        setPersonalityType(parsed?.type ?? null);
      } catch { setPersonalityType(null); }
    };
    read();
    window.addEventListener('storage', read);
    return () => window.removeEventListener('storage', read);
  }, []);

  const topEra = taste.topEras[0];
  const topType = taste.topPokemonTypes[0];
  const topRarity = taste.topRarities[0];
  const topArtist = taste.topArtists[0];

  const personalityInfo = personalityType ? PERSONALITY_INFO[personalityType as PersonalityType] : null;

  // DNA Match Rate = % of swipes that became likes (collector decisiveness)
  const matchRate = cardsSwiped > 0
    ? Math.round((totalLikes / cardsSwiped) * 100)
    : 0;

  // Split headline so the last word can render in the brand gradient
  const headlineParts = ['Your', 'Collector', 'DNA'];
  const headlineHead = headlineParts.slice(0, -1).join(' ');
  const headlineTail = headlineParts[headlineParts.length - 1];

  // Pills for "What You Gravitate Toward"
  const gravPills: { label: string; icon: React.ReactNode; tint: string }[] = [];
  const tier = taste.priceDistribution.find((p) => p.key !== 'unknown');
  if (tier && (tier.key === 'grail' || tier.key === 'premium')) {
    gravPills.push({ label: tier.key === 'grail' ? 'Grails' : 'Premium', icon: <Crown className="w-3.5 h-3.5 text-amber-400" />, tint: 'border-amber-400/30 bg-amber-400/5' });
  }
  if (topEra) gravPills.push({ label: `${topEra.label.split(' (')[0]} Era`, icon: <Mountain className="w-3.5 h-3.5 text-primary" />, tint: 'border-primary/30 bg-primary/5' });
  if (topType) gravPills.push({ label: `${topType.label} Types`, icon: <Flame className="w-3.5 h-3.5 text-orange-400" />, tint: 'border-orange-400/30 bg-orange-400/5' });
  if (topRarity) gravPills.push({ label: topRarity.label, icon: <Star className="w-3.5 h-3.5 text-purple-400" />, tint: 'border-purple-400/30 bg-purple-400/5' });
  if (gravPills.length === 0 && topArtist) {
    gravPills.push({ label: topArtist.label, icon: <Palette className="w-3.5 h-3.5 text-primary" />, tint: 'border-primary/30 bg-primary/5' });
  }

  return (
    <section className="relative space-y-6">
      {/* One unified hero widget — username, headline, and taste signals
          all sit on top of the background art so more of it shows through. */}
      <div className="relative overflow-hidden border border-border/60 bg-gradient-to-br from-primary/10 via-card to-card rounded-3xl shadow-none">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-32 -left-20 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
        </div>

        {/* Art composition: forest base, readability fades, then a masked
            foreground Pikachu pass so the focal point stays above the haze. */}
        <div className="absolute inset-0 pointer-events-none">
          <img
            src={tasteHeroArt}
            alt=""
            aria-hidden="true"
            width={1920}
            height={1080}
            loading="lazy"
            className="absolute inset-0 z-0 w-full h-full object-cover"
            style={{
              objectPosition: '5% 88%',
              filter: 'brightness(1.02) contrast(1.05) saturate(1.06)',
            }}
          />
          {/* Left-side readability fade keeps headline crisp */}
          <div className="absolute inset-0 z-[1] bg-gradient-to-r from-card via-card/80 md:via-card/55 to-transparent" />
          {/* Bottom fade so the stat cards sit on a clean surface */}
          <div className="absolute inset-x-0 bottom-0 z-[1] h-[55%] bg-gradient-to-t from-card via-card/85 to-transparent" />
          {/* Subtle warm rim-light around the upper-right clearing for atmosphere */}
          <div className="absolute top-[6%] right-[10%] z-[2] w-[26%] h-[34%] rounded-full bg-warning/10 blur-3xl mix-blend-screen" />
        </div>

        <div className="relative z-10 p-6 sm:p-8 md:p-10 space-y-6 min-h-[360px] md:min-h-[400px] flex flex-col gap-0 px-[40px] py-[10px]">
          {/* Username sits inside the widget now */}
          <div className="md:max-w-[62%]">
            <UsernameInline />
          </div>

          <div className="md:max-w-[62%]">
            {personalityType && (
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="text-amber-400 w-[22px] h-[19px]" />
                <span className="font-bold uppercase tracking-[0.2em] text-amber-400 text-base">
                  {personalityType}
                </span>
              </div>
            )}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground leading-[1.05]">
              {headlineHead}{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-br from-primary via-primary to-primary/60">
                {headlineTail}
              </span>
            </h1>
            <p className="mt-5 text-base text-foreground/80 leading-relaxed max-w-xl sm:text-xl font-semibold">
              {personalityInfo?.tagline ? `${personalityInfo.tagline} ` : ''}{sentence}
            </p>

            {totalLikes === 0 && (
              <div className="mt-6">
                <Button size="lg" asChild className="gap-2">
                  <Link to="/swipe">Start swiping</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Collector Stats — moved into the hero widget in place of the
              taste-signal pills. Translucent surfaces so the art still
              breathes through. */}
          <div className="mt-auto pt-10 md:pt-16 px-0 py-[4px]">
            <div className="flex items-center gap-2 mb-3">
              <ArrowRight className="w-4 h-4 text-primary rotate-[-45deg]" />
              <h2 className="text-sm font-semibold text-foreground">Collector Stats</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <HeroStat
                icon={<BookOpen className="w-6 h-6 text-primary" />}
                tint="bg-primary/15 border-primary/30"
                value={avgPrice > 0 ? `$${avgPrice.toFixed(0)}` : '—'}
                label="Avg Card Value"
              />
              <HeroStat
                icon={<HeartIcon className="w-6 h-6 text-red-400" />}
                tint="bg-red-400/15 border-red-400/30"
                value={totalLikes.toLocaleString()}
                label="Collection Likes"
              />
              <HeroStat
                icon={<Eye className="w-6 h-6 text-blue-400" />}
                tint="bg-blue-400/15 border-blue-400/30"
                value={cardsSwiped.toLocaleString()}
                label="Cards Swiped"
              />
              <HeroStat
                icon={<Target className="w-6 h-6 text-purple-400" />}
                tint="bg-purple-400/15 border-purple-400/30"
                value={cardsSwiped > 0 ? `${matchRate}%` : '—'}
                label="DNA Match Rate"
              />
            </div>

            {/* View Full DNA — plain text link inside the hero widget, below the signal cards */}
            <div className="flex justify-end pt-2">
              <button
                onClick={() => document.getElementById('deep-insights')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline underline-offset-4 text-lg px-0 py-[11px] mx-px"
              >
                View taste insights <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Personality result — sits directly under the Collector DNA widget */}
      <PersonalityTestCTA personalityType={personalityType} />
    </section>
  );
}

function SignalCard({ kicker, value, sub, icon, tint }: { kicker: string; value: string; sub: string; icon: React.ReactNode; tint: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur-md p-5 flex items-center gap-4">
      <div className={cn('w-14 h-14 rounded-2xl border flex items-center justify-center shrink-0', tint)}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-1">{kicker}</p>
        <p className="text-xl font-bold text-foreground leading-tight truncate">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{sub}</p>
      </div>
    </div>
  );
}

function CollectorStat({ icon, tint, value, label }: { icon: React.ReactNode; tint: string; value: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn('w-11 h-11 rounded-full flex items-center justify-center shrink-0', tint)}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-foreground tabular-nums leading-tight truncate">{value}</p>
        <p className="text-xs text-muted-foreground truncate">{label}</p>
      </div>
    </div>
  );
}

function HeroStat({ icon, tint, value, label }: { icon: React.ReactNode; tint: string; value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur-md px-4 py-4 sm:p-5 flex flex-row items-center gap-3 sm:gap-3.5 min-w-0 min-h-[76px]">
      <div className={cn('w-10 h-10 sm:w-[52px] sm:h-[52px] rounded-xl border flex items-center justify-center shrink-0', tint)}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p
          className="font-bold text-foreground tabular-nums leading-tight whitespace-nowrap"
          style={{ fontSize: 'clamp(1.25rem, 4.2vw, 1.5rem)', wordBreak: 'keep-all' }}
        >
          {value}
        </p>
        <p className="text-[12px] sm:text-[13px] text-muted-foreground leading-tight whitespace-nowrap">{label}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SECTION 2 — Recently Liked
// ─────────────────────────────────────────────────────────────

function RecentlyLiked({ likes, passes, onOpen }: { likes: LikedCard[]; passes: LikedCard[]; onOpen: (s: CardDetailSeed) => void }) {
  // Pulls only — super likes first, then regular pulls, newest first within each group.
  const sorted = [...likes].sort((a, b) => {
    const aSuper = a.source === 'super_like' ? 1 : 0;
    const bSuper = b.source === 'super_like' ? 1 : 0;
    if (aSuper !== bSuper) return bSuper - aSuper;
    return (b.liked_at || '').localeCompare(a.liked_at || '');
  });
  const recent = sorted.slice(0, 24);
  return (
    <section>
      <div className="mb-5">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Latest matches</h2>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Every card you pulled — super likes first.
        </p>
      </div>
      <CarouselRow ariaLabel="latest matches">
        {recent.map((c) => (
          <RecentCard
            key={`pull-${c.id}`}
            like={c}
            decision="pull"
            isSuper={c.source === 'super_like'}
            onOpen={onOpen}
          />
        ))}
      </CarouselRow>
    </section>
  );
}

function RecentCard({ like, decision, isSuper, onOpen }: { like: LikedCard; decision: 'pull' | 'pass'; isSuper?: boolean; onOpen: (s: CardDetailSeed) => void }) {
  const [err, setErr] = useState(false);
  const isPass = decision === 'pass';
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
      <div className={cn(
        "relative aspect-[2.5/3.5] rounded-xl overflow-hidden bg-muted/30 ring-1 shadow-md transition-all duration-300",
        isPass
          ? "ring-border/40 group-hover:ring-destructive/40"
          : "ring-border/60 group-hover:shadow-[0_18px_40px_-12px_hsl(var(--primary)/0.55)] group-hover:ring-primary/50"
      )}>
        {like.image_url && !err ? (
          <img src={like.image_url} alt={like.card_name} loading="lazy" decoding="async" className={cn("w-full h-full object-cover", isPass && "opacity-60 grayscale")} onError={() => setErr(true)} />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><ImageOff className="w-5 h-5 text-muted-foreground" /></div>
        )}
        <div className={cn(
          "absolute top-1.5 left-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider backdrop-blur",
          isPass
            ? "bg-destructive/80 text-destructive-foreground"
            : isSuper
              ? "bg-amber-400/90 text-background"
              : "bg-primary/80 text-primary-foreground"
        )}>
          {isPass
            ? <><XIcon className="w-2.5 h-2.5" /> Pass</>
            : isSuper
              ? <><Sparkles className="w-2.5 h-2.5" /> Super</>
              : <><HeartIcon className="w-2.5 h-2.5" /> Pull</>}
        </div>
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

function BinderView({ likes, taste, onOpen, userId }: { likes: LikedCard[]; taste: TasteProfile; onOpen: (s: CardDetailSeed) => void; userId: string }) {
  const [spread, setSpread] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [facet, setFacet] = useState<FacetKey>('all');
  const [value, setValue] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);

  // Persisted custom order (card_id list). When null, falls back to liked_at desc.
  const orderKey = `binder:order:${userId}`;
  const [customOrder, setCustomOrder] = useState<string[] | null>(() => {
    try {
      const raw = localStorage.getItem(orderKey);
      return raw ? (JSON.parse(raw) as string[]) : null;
    } catch { return null; }
  });

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

  // Apply the user's custom order on top of the default liked_at list.
  const ordered = useMemo(() => {
    if (!customOrder || customOrder.length === 0) return likes;
    const map = new Map(likes.map(l => [l.card_id, l]));
    const seen = new Set<string>();
    const out: LikedCard[] = [];
    for (const id of customOrder) {
      const l = map.get(id);
      if (l && !seen.has(id)) { out.push(l); seen.add(id); }
    }
    for (const l of likes) if (!seen.has(l.card_id)) out.push(l);
    return out;
  }, [likes, customOrder]);

  const filtered = useMemo(() => {
    if (facet === 'all' || !value) return ordered;
    return ordered.filter((c) => {
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
  }, [ordered, facet, value]);

  const totalSpreads = Math.max(1, Math.ceil(filtered.length / CARDS_PER_SPREAD));
  const start = spread * CARDS_PER_SPREAD;
  const leftCards = filtered.slice(start, start + CARDS_PER_PAGE);
  const rightCards = filtered.slice(start + CARDS_PER_PAGE, start + CARDS_PER_SPREAD);

  const go = (delta: 1 | -1) => {
    setDir(delta);
    setSpread((s) => Math.min(Math.max(0, s + delta), totalSpreads - 1));
  };

  // Reordering is only safe when there is no active filter — positions in
  // `ordered` directly map to slot indices on the page.
  const canReorder = facet === 'all' && !value;

  const reorder = (fromIdx: number, toIdx: number) => {
    if (!canReorder) return;
    if (fromIdx === toIdx) return;
    const baseIds = ordered.map(l => l.card_id);
    if (fromIdx < 0 || fromIdx >= baseIds.length) return;
    const [moved] = baseIds.splice(fromIdx, 1);
    const insertAt = Math.min(Math.max(0, toIdx), baseIds.length);
    baseIds.splice(insertAt, 0, moved);
    setCustomOrder(baseIds);
    try { localStorage.setItem(orderKey, JSON.stringify(baseIds)); } catch {}
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
            {/* Edge drop zones — turn pages by dragging a card to the edge. */}
            <EdgeDropZone
              side="left"
              visible={isDragging}
              disabled={spread === 0}
              onTrigger={() => spread > 0 && go(-1)}
            />
            <EdgeDropZone
              side="right"
              visible={isDragging}
              disabled={spread >= totalSpreads - 1}
              onTrigger={() => spread < totalSpreads - 1 && go(1)}
            />
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
                <BinderPage
                  cards={leftCards}
                  pageNumber={spread * 2 + 1}
                  side="left"
                  onOpen={onOpen}
                  baseIndex={start}
                  canReorder={canReorder}
                  onReorder={reorder}
                  onDragStart={() => setIsDragging(true)}
                  onDragEnd={() => setIsDragging(false)}
                />
                <BinderPage
                  cards={rightCards}
                  pageNumber={spread * 2 + 2}
                  side="right"
                  onOpen={onOpen}
                  baseIndex={start + CARDS_PER_PAGE}
                  canReorder={canReorder}
                  onReorder={reorder}
                  onDragStart={() => setIsDragging(true)}
                  onDragEnd={() => setIsDragging(false)}
                />
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

function BinderPage({
  cards, pageNumber, side, onOpen, baseIndex, canReorder, onReorder, onDragStart, onDragEnd,
}: {
  cards: LikedCard[];
  pageNumber: number;
  side: 'left' | 'right';
  onOpen: (s: CardDetailSeed) => void;
  baseIndex: number;
  canReorder: boolean;
  onReorder: (from: number, to: number) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const slots = Array.from({ length: CARDS_PER_PAGE }, (_, i) => cards[i] ?? null);
  return (
    <div className="relative rounded-2xl p-2 sm:p-2.5 bg-background/60 ring-1 ring-border/50 shadow-inner"
         style={{ backgroundImage: 'radial-gradient(hsl(var(--muted-foreground)/0.08) 1px, transparent 1px)', backgroundSize: '14px 14px' }}>
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        {slots.map((c, i) => (
          <BinderSlot
            key={c?.id ?? `empty-${pageNumber}-${i}`}
            like={c}
            onOpen={onOpen}
            slotIndex={baseIndex + i}
            canReorder={canReorder}
            onReorder={onReorder}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        ))}
      </div>
      <p className={`text-[10px] text-muted-foreground tabular-nums mt-1.5 ${side === 'left' ? 'text-left' : 'text-right'}`}>Page {pageNumber}</p>
    </div>
  );
}

function BinderSlot({
  like, onOpen, slotIndex, canReorder, onReorder, onDragStart, onDragEnd,
}: {
  like: LikedCard | null;
  onOpen: (s: CardDetailSeed) => void;
  slotIndex: number;
  canReorder: boolean;
  onReorder: (from: number, to: number) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const [err, setErr] = useState(false);
  const [over, setOver] = useState(false);

  const acceptDrop = (e: React.DragEvent) => {
    if (!canReorder) return;
    e.preventDefault();
    setOver(false);
    const from = Number(e.dataTransfer.getData('text/binder-index'));
    if (Number.isFinite(from)) onReorder(from, slotIndex);
  };
  const dragOver = (e: React.DragEvent) => {
    if (!canReorder) return;
    e.preventDefault();
    if (!over) setOver(true);
  };

  if (!like) {
    return (
      <Link
        to="/swipe"
        onDragOver={dragOver}
        onDragLeave={() => setOver(false)}
        onDrop={acceptDrop}
        className={`group aspect-[2.5/3.5] rounded-md bg-muted/30 ring-1 ring-dashed flex items-center justify-center transition-all ${
          over ? 'ring-primary/70 bg-primary/10' : 'ring-border/40 hover:ring-primary/40 hover:bg-primary/5'
        }`}
        title="Add a card by swiping"
        aria-label="Add a card by swiping"
      >
        <Plus className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </Link>
    );
  }

  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -3, zIndex: 5 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      draggable={canReorder}
      onDragStart={(e) => {
        if (!canReorder) return;
        (e as unknown as React.DragEvent).dataTransfer.setData('text/binder-index', String(slotIndex));
        (e as unknown as React.DragEvent).dataTransfer.effectAllowed = 'move';
        onDragStart();
      }}
      onDragEnd={() => { setOver(false); onDragEnd(); }}
      onDragOver={dragOver}
      onDragLeave={() => setOver(false)}
      onDrop={acceptDrop}
      className={`relative aspect-[2.5/3.5] rounded-md overflow-hidden bg-muted/40 ring-1 shadow-sm hover:shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.5)] cursor-pointer ${
        over ? 'ring-primary ring-2' : 'ring-border/40 hover:ring-primary/50'
      } ${canReorder ? 'cursor-grab active:cursor-grabbing' : ''}`}
      title={[like.card_name, like.set_name, like.artist && `by ${like.artist}`].filter(Boolean).join(' · ')}
      onClick={() => onOpen({
        card_id: like.card_id, card_name: like.card_name, set_name: like.set_name,
        image_url: like.image_url, price: like.price, rarity: like.rarity,
        artist: like.artist, pokemon_type: like.pokemon_type, card_number: like.card_number,
      })}
    >
      {like.image_url && !err ? (
        <img src={like.image_url} alt={like.card_name} loading="lazy" decoding="async" draggable={false} className="w-full h-full object-cover pointer-events-none" onError={() => setErr(true)} />
      ) : (
        <div className="w-full h-full flex items-center justify-center"><ImageOff className="w-4 h-4 text-muted-foreground" /></div>
      )}
    </motion.div>
  );
}

// Hover-to-turn drop zone pinned to the left/right edge of the binder spread.
// Holding a dragged card over it for ~550ms advances the page in that direction.
function EdgeDropZone({
  side, visible, disabled, onTrigger,
}: { side: 'left' | 'right'; visible: boolean; disabled: boolean; onTrigger: () => void }) {
  const timer = React.useRef<number | null>(null);
  const clear = () => { if (timer.current) { window.clearTimeout(timer.current); timer.current = null; } };
  React.useEffect(() => clear, []);

  return (
    <div
      onDragEnter={(e) => {
        if (disabled) return;
        e.preventDefault();
        clear();
        timer.current = window.setTimeout(() => { onTrigger(); clear(); }, 550);
      }}
      onDragOver={(e) => { if (!disabled) e.preventDefault(); }}
      onDragLeave={clear}
      onDrop={(e) => { e.preventDefault(); clear(); }}
      className={`absolute top-3 bottom-3 ${side === 'left' ? 'left-0' : 'right-0'} w-10 sm:w-14 z-20 rounded-${side === 'left' ? 'l' : 'r'}-3xl transition-opacity duration-200 flex items-center justify-center ${
        visible && !disabled ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      style={{
        background: side === 'left'
          ? 'linear-gradient(to right, hsl(var(--primary)/0.18), transparent)'
          : 'linear-gradient(to left, hsl(var(--primary)/0.18), transparent)',
      }}
      aria-hidden
    >
      {side === 'left'
        ? <ChevronLeft className="w-5 h-5 text-primary drop-shadow" />
        : <ChevronRight className="w-5 h-5 text-primary drop-shadow" />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Recommendations (kept between Binder and Deep Insights)
// ─────────────────────────────────────────────────────────────

function RecommendedRow({ items, onOpen }: { items: RecommendedCard[]; onOpen: (s: CardDetailSeed) => void }) {
  return (
    <section>
      <div className="mb-5">
        <div className="flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Recommended for you</h2>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Picked by matching the artists, sets, types, and rarities you keep liking.
        </p>
      </div>
      <CarouselRow ariaLabel="recommended cards">
        {items.map((r) => <RecRowCard key={r.card_id} r={r} onOpen={onOpen} />)}
      </CarouselRow>
    </section>
  );
}

function RecRowCard({ r, onOpen }: { r: RecommendedCard; onOpen: (s: CardDetailSeed) => void }) {
  const [err, setErr] = useState(false);
  return (
    <motion.button
      whileHover={{ y: -6 }}
      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      onClick={() => onOpen({
        card_id: r.card_id, card_name: r.card_name, set_name: r.set_name,
        image_url: r.image_url, price: r.price, rarity: r.rarity,
        artist: r.artist, pokemon_type: r.pokemon_type,
      })}
      className="group shrink-0 w-[170px] sm:w-[190px] snap-start text-left"
    >
      <div className="relative aspect-[2.5/3.5] rounded-xl overflow-hidden bg-muted/30 ring-1 ring-border/60 shadow-md group-hover:shadow-[0_18px_40px_-12px_hsl(var(--primary)/0.55)] group-hover:ring-primary/50 transition-all duration-300">
        {r.image_url && !err ? (
          <img src={r.image_url} alt={r.card_name} loading="lazy" decoding="async" className="w-full h-full object-cover" onError={() => setErr(true)} />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><ImageOff className="w-5 h-5 text-muted-foreground" /></div>
        )}
      </div>
      <p className="mt-2.5 text-sm text-foreground font-medium truncate">{r.card_name}</p>
      <p className="text-xs text-muted-foreground truncate">
        {r.set_name ?? '—'}{r.price ? ` · $${Number(r.price).toFixed(0)}` : ''}
      </p>
      <p className="text-[11px] text-primary/80 truncate italic mt-0.5">{r.reason}</p>
    </motion.button>
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

// ─────────────────────────────────────────────────────────────
// Daily Limit Widget — moved from Pull or Pass results
// ─────────────────────────────────────────────────────────────
export function DailyLimitWidget() {
  const DAILY_BASE_LIMIT = 20;
  const todayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  };
  const readQuota = () => {
    try {
      const raw = localStorage.getItem('pop_quota');
      if (!raw) return { date: todayKey(), used: 0, bonus: 0 };
      const q = JSON.parse(raw);
      if (q.date !== todayKey()) return { date: todayKey(), used: 0, bonus: 0 };
      return { date: q.date, used: q.used ?? 0, bonus: q.bonus ?? 0 };
    } catch { return { date: todayKey(), used: 0, bonus: 0 }; }
  };

  const [quota, setQuota] = useState(() => readQuota());
  useEffect(() => {
    const refresh = () => setQuota(readQuota());
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const dailyLimit = DAILY_BASE_LIMIT + quota.bonus;
  const remaining = Math.max(0, dailyLimit - quota.used);
  const outOfSwipes = remaining <= 0;

  // Countdown to midnight
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  const next = new Date();
  next.setHours(24, 0, 0, 0);
  const ms = Math.max(0, next.getTime() - now);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);

  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="relative rounded-2xl border border-purple-500/30 bg-transparent p-6 sm:p-8 overflow-hidden text-center mx-0">
        <div className="relative space-y-3">
          <p className="text-[11px] uppercase tracking-[0.22em] text-purple-300 font-semibold">
            {outOfSwipes ? 'Daily Limit Reached' : 'Want Another Round?'}
          </p>
          <h3 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            {outOfSwipes ? "You're out of swipes for today" : 'Keep swiping with PokeIQ Pro'}
          </h3>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Earn more swipe credits by helping train PokeIQ — or go PokeIQ Pro for unlimited swipes.
            {outOfSwipes && (
              <> Your daily swipes reset in{' '}
                <span className="font-semibold text-purple-200 tabular-nums">{h}h {m}m</span>.
              </>
            )}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 max-w-md mx-auto">
            <Link to="/earn" className="w-full sm:w-auto">
              <motion.button
                whileHover={{ y: -2, scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="w-full sm:w-auto h-11 px-8 rounded-xl border border-primary/40 bg-primary/10 text-primary font-bold text-sm inline-flex items-center justify-center gap-2 hover:bg-primary/15 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Earn Credits
              </motion.button>
            </Link>
            <motion.button
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => window.location.assign('/premium')}
              className="w-full sm:w-auto h-11 px-8 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-zinc-950 font-bold text-sm inline-flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(251,191,36,0.5)]"
            >
              <Crown className="w-4 h-4" />
              Go PokeIQ Pro
            </motion.button>
          </div>
          <p className="text-[11px] text-muted-foreground/80 pt-1">
            {outOfSwipes
              ? 'Every 20 cards you train earns +10 swipes.'
              : `You have ${remaining} swipe${remaining === 1 ? '' : 's'} left today. Every 20 cards you train earns +10 more.`}
          </p>
        </div>
      </div>
    </motion.section>
  );
}
