import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Sparkles, ArrowLeft, ImageOff, LogIn, Lock, Trophy, X, Star, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { GlobalNavBar } from '@/components/layout/GlobalNavBar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Seo } from '@/components/seo/Seo';

const PROFILE_GOAL = 20;
const INITIAL_VISIBLE = 12;   // ~2 rows × 6 on desktop
const LOAD_MORE_STEP = 12;
const PAGE_CAP = 50;          // overflow → dedicated collection page

type Swipe = {
  id: string;
  card_id: string;
  card_name: string;
  card_set: string | null;
  card_image: string | null;
  card_price: number | null;
  card_rarity: string | null;
  tags: string[];
  decision: 'pull' | 'pass';
  created_at: string;
};

export default function Matches() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [swipes, setSwipes] = useState<Swipe[]>([]);
  const [vibes, setVibes] = useState<{ tag: string; count: number }[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || session.user.is_anonymous) {
        setLoading(false);
        return;
      }
      setUserId(session.user.id);
      // All swipes for this user (we segment client-side into matches / likes / passes)
      const { data: swipeRows } = await supabase
        .from('pullorpass_swipes')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      setSwipes((swipeRows as any[]) || []);

      // Vibes = adjective tags. Pull from Collector DNA tag_counts (PullOrPass aggregate)
      // and supplement with PokéYelp review tags (which are adjectives like Cozy, Cute…).
      const tagTotals: Record<string, number> = {};
      const RESERVED = new Set(['Match', 'Loved']);
      const { data: dna } = await supabase
        .from('pullorpass_dna')
        .select('tag_counts')
        .eq('user_id', session.user.id)
        .maybeSingle();
      const tc = (dna?.tag_counts as Record<string, number> | null) || {};
      Object.entries(tc).forEach(([t, n]) => {
        if (!RESERVED.has(t)) tagTotals[t] = (tagTotals[t] ?? 0) + (Number(n) || 0);
      });
      const { data: yelp } = await supabase
        .from('pokeyelp_reviews')
        .select('tags, custom_tags')
        .eq('user_id', session.user.id);
      (yelp || []).forEach((r: any) => {
        [...(r.tags || []), ...(r.custom_tags || [])].forEach((t: string) => {
          if (!t || RESERVED.has(t)) return;
          tagTotals[t] = (tagTotals[t] ?? 0) + 1;
        });
      });
      const topVibes = Object.entries(tagTotals)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      setVibes(topVibes);
      setLoading(false);
    })();
  }, []);

  // Segment swipes
  const matches = swipes.filter((s) => (s.tags || []).includes('Match'));
  const likes   = swipes.filter((s) => s.decision === 'pull' && !(s.tags || []).includes('Match'));
  const passes  = swipes.filter((s) => s.decision === 'pass');

  // Aggregate aesthetic insights from matched cards
  const setCounts: Record<string, number> = {};
  let totalPrice = 0;
  let priced = 0;
  matches.forEach((m) => {
    if (m.card_set) setCounts[m.card_set] = (setCounts[m.card_set] ?? 0) + 1;
    if (m.card_price) { totalPrice += Number(m.card_price); priced++; }
  });
  const topSets = Object.entries(setCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const avgPrice = priced > 0 ? totalPrice / priced : 0;

  const matchCount = matches.length;
  const remainingToProfile = Math.max(0, PROFILE_GOAL - matchCount);
  const profileUnlocked = matchCount >= PROFILE_GOAL;

  return (
    <>
      <Seo title="Your Matches — Collector Aesthetic | PokeIQ" description="See the Pokémon cards that matched your taste and unlock your Collector Aesthetic Profile." />
      <div className="min-h-screen bg-background flex flex-col">
        <GlobalNavBar />
        <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6">
          <div className="mb-6">
            <Link to="/swipe" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to swiping
            </Link>
            <div className="flex items-center gap-2 mt-2">
              <Heart className="w-6 h-6 text-primary fill-primary" />
              <h1 className="text-2xl font-bold text-foreground">Your Matches</h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              The cards PokeIQ thinks <em>actually</em> match your taste.
            </p>
          </div>

          {loading && (
            <Card className="p-10 text-center text-muted-foreground text-sm">Loading your matches…</Card>
          )}

          {!loading && !userId && (
            <Card className="p-8 text-center space-y-4 border-primary/30 bg-primary/5">
              <Lock className="w-8 h-8 mx-auto text-primary" />
              <h3 className="text-lg font-bold text-foreground">Sign up to see your Matches</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Your matches are saved to your Collector Profile. Create a free account to start building yours.
              </p>
              <Button onClick={() => navigate('/auth')} size="lg" className="gap-2">
                <LogIn className="w-4 h-4" /> Sign up free
              </Button>
            </Card>
          )}

          {!loading && userId && (
            <>
              {/* Aesthetic profile progress */}
              <Card className={`p-5 mb-5 ${profileUnlocked ? 'border-amber-400/40 bg-amber-400/5' : 'border-primary/30 bg-primary/5'}`}>
                <div className="flex items-start gap-4">
                  {profileUnlocked ? <Trophy className="w-8 h-8 text-amber-400 flex-shrink-0" /> : <Sparkles className="w-8 h-8 text-primary flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-foreground">
                      {profileUnlocked ? 'Your Collector Aesthetic is unlocked' : 'Your Collector Aesthetic Profile'}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {profileUnlocked
                        ? "Below are the vibes, sets, and price tier PokeIQ has learned about your taste."
                        : `Do ${remainingToProfile} more matches to unlock your Collector Aesthetic Profile — your vibes, the sets you gravitate to, and the cards that actually feel like you.`}
                    </p>
                    <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full ${profileUnlocked ? 'bg-amber-400' : 'bg-primary'}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (matchCount / PROFILE_GOAL) * 100)}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">
                      {matchCount} / {PROFILE_GOAL} matches
                    </p>
                  </div>
                </div>
              </Card>

              {/* Aesthetic insights (always show what we have) */}
              {(matches.length > 0 || vibes.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
                  <Card className="p-4">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">Vibes you love</p>
                    {vibes.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Review more cards on Earn Credits to teach PokeIQ your vibe</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {vibes.map((v) => (
                          <Badge key={v.tag} variant="secondary" className="text-[10px]">{v.tag} · {v.count}</Badge>
                        ))}
                      </div>
                    )}
                  </Card>
                  <Card className="p-4">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">Sets you gravitate to</p>
                    {topSets.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Match more cards to learn</p>
                    ) : (
                      <div className="space-y-1">
                        {topSets.map(([s, n]) => (
                          <div key={s} className="flex items-center justify-between text-xs">
                            <span className="text-foreground truncate pr-2">{s}</span>
                            <span className="text-muted-foreground tabular-nums">{n}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                  <Card className="p-4">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">Your price tier</p>
                    <p className="text-2xl font-bold text-primary tabular-nums">${avgPrice.toFixed(0)}</p>
                    <p className="text-[10px] text-muted-foreground">avg per match</p>
                  </Card>
                </div>
              )}

              {/* Matches → Likes → Passes */}
              <BinderView items={matches} />
              <Section
                title="Likes"
                subtitle="Cards you pulled or super-liked"
                icon={<Star className="w-4 h-4 text-amber-400 fill-amber-400" />}
                items={likes}
                emptyText="No likes yet."
                badge="like"
                category="likes"
              />
              <Section
                title="Passes"
                subtitle="Cards that didn't speak to you"
                icon={<X className="w-4 h-4 text-muted-foreground" />}
                items={passes}
                emptyText="No passes yet."
                badge="pass"
                category="passes"
              />
            </>
          )}
        </main>
      </div>
    </>
  );
}

function Section({
  title, subtitle, icon, items, emptyText, badge, category,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  items: Swipe[];
  emptyText: string;
  badge: 'match' | 'like' | 'pass';
  category: 'matches' | 'likes' | 'passes';
}) {
  const [visible, setVisible] = useState(INITIAL_VISIBLE);
  const cappedTotal = Math.min(items.length, PAGE_CAP);
  const shown = items.slice(0, Math.min(visible, cappedTotal));
  const canLoadMore = visible < cappedTotal;
  const hasOverflow = items.length > PAGE_CAP;
  return (
    <section className="mb-10">
      <div className="flex items-end justify-between mb-2 gap-3">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <span className="text-xs text-muted-foreground tabular-nums">· {items.length}</span>
        </div>
        {hasOverflow && (
          <Link to={`/matches/${category}`} className="text-xs text-primary hover:underline inline-flex items-center gap-1">
            See complete {category} <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-3">{subtitle}</p>
      {items.length === 0 ? (
        <Card className="p-6 text-center text-xs text-muted-foreground">{emptyText}</Card>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            {shown.map((m) => <SwipeThumb key={m.id} m={m} badge={badge} />)}
          </div>
          {(canLoadMore || hasOverflow) && (
            <div className="flex items-center justify-center gap-3 mt-5">
              {canLoadMore && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setVisible((v) => Math.min(v + LOAD_MORE_STEP, cappedTotal))}
                >
                  Load more · {Math.min(LOAD_MORE_STEP, cappedTotal - visible)} more
                </Button>
              )}
              {!canLoadMore && hasOverflow && (
                <Link to={`/matches/${category}`}>
                  <Button size="sm" className="gap-2">
                    See complete {category} <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function SwipeThumb({ m, badge }: { m: Swipe; badge: 'match' | 'like' | 'pass' }) {
  const [err, setErr] = useState(false);
  const dim = badge === 'pass';
  const superLiked = (m.tags || []).includes('Loved');
  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.03 }}
      transition={{ type: 'spring', stiffness: 280, damping: 20 }}
      className="space-y-1.5 group"
    >
      <div className={`relative aspect-[2.5/3.5] rounded-xl overflow-hidden bg-muted/30 shadow-md transition-shadow duration-300 group-hover:shadow-[0_12px_40px_-12px_hsl(var(--primary)/0.45)] ring-1 ring-border/40 group-hover:ring-primary/40 ${dim ? 'opacity-50 grayscale group-hover:opacity-80 group-hover:grayscale-0' : ''}`}>
        {m.card_image && !err ? (
          <img src={m.card_image} alt={m.card_name} className="w-full h-full object-cover" onError={() => setErr(true)} />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><ImageOff className="w-5 h-5 text-muted-foreground" /></div>
        )}
        {/* Super Like star (only in Likes section) */}
        {badge === 'like' && superLiked && (
          <div className="absolute top-1.5 right-1.5 z-10">
            <div className="bg-background/70 backdrop-blur-sm rounded-full p-1 shadow-lg ring-1 ring-amber-400/50">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.7)]" />
            </div>
          </div>
        )}
        {badge === 'match' && (
          <div className="absolute top-1.5 right-1.5 bg-primary/90 rounded-full p-1 shadow-md">
            <Heart className="w-3 h-3 text-white fill-white" />
          </div>
        )}
        {badge === 'like' && !superLiked && (
          <div className="absolute top-1.5 right-1.5 bg-primary/80 rounded-full p-1 shadow-md">
            <Heart className="w-3 h-3 text-white fill-white" />
          </div>
        )}
        {badge === 'pass' && (
          <div className="absolute top-1.5 right-1.5 bg-muted-foreground/80 rounded-full p-1 shadow-md">
            <X className="w-3 h-3 text-background" />
          </div>
        )}
      </div>
      <p className="text-xs text-foreground truncate font-medium">{m.card_name}</p>
      <p className="text-[10px] text-muted-foreground truncate">
        {m.card_set ?? '—'}{m.card_price ? ` · $${Number(m.card_price).toFixed(0)}` : ''}
      </p>
    </motion.div>
  );
}