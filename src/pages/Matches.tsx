import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, Sparkles, ArrowLeft, ImageOff, LogIn, Lock, Trophy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { GlobalNavBar } from '@/components/layout/GlobalNavBar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Seo } from '@/components/seo/Seo';

const PROFILE_GOAL = 20;

type Swipe = {
  id: string;
  card_id: string;
  card_name: string;
  card_set: string | null;
  card_image: string | null;
  card_price: number | null;
  card_rarity: string | null;
  tags: string[];
  created_at: string;
};

export default function Matches() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<Swipe[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || session.user.is_anonymous) {
        setLoading(false);
        return;
      }
      setUserId(session.user.id);
      const { data } = await supabase
        .from('pullorpass_swipes')
        .select('*')
        .eq('user_id', session.user.id)
        .contains('tags', ['Match'])
        .order('created_at', { ascending: false });
      setMatches((data as any[]) || []);
      setLoading(false);
    })();
  }, []);

  // Aggregate aesthetic insights
  const setCounts: Record<string, number> = {};
  const rarityCounts: Record<string, number> = {};
  let totalPrice = 0;
  let priced = 0;
  matches.forEach((m) => {
    if (m.card_set) setCounts[m.card_set] = (setCounts[m.card_set] ?? 0) + 1;
    if (m.card_rarity) rarityCounts[m.card_rarity] = (rarityCounts[m.card_rarity] ?? 0) + 1;
    if (m.card_price) { totalPrice += Number(m.card_price); priced++; }
  });
  const topSets = Object.entries(setCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topRarities = Object.entries(rarityCounts).sort((a, b) => b[1] - a[1]).slice(0, 4);
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
              {matches.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
                  <Card className="p-4">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">Vibes you love</p>
                    {topRarities.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Match more cards to learn</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {topRarities.map(([r, n]) => (
                          <Badge key={r} variant="secondary" className="text-[10px]">{r} · {n}</Badge>
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

              {/* Matched cards grid */}
              {matches.length === 0 ? (
                <Card className="p-10 text-center space-y-3">
                  <Heart className="w-8 h-8 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No matches yet. Keep swiping — PokeIQ surfaces a match when it spots a pattern in your taste.
                  </p>
                  <Link to="/swipe">
                    <Button size="lg" className="gap-2"><Heart className="w-4 h-4" /> Start swiping</Button>
                  </Link>
                </Card>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {matches.map((m) => (
                    <MatchThumb key={m.id} m={m} />
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
}

function MatchThumb({ m }: { m: Swipe }) {
  const [err, setErr] = useState(false);
  return (
    <div className="space-y-1">
      <div className="relative aspect-[2.5/3.5] rounded-lg overflow-hidden bg-muted/30 shadow-md">
        {m.card_image && !err ? (
          <img src={m.card_image} alt={m.card_name} className="w-full h-full object-cover" onError={() => setErr(true)} />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><ImageOff className="w-5 h-5 text-muted-foreground" /></div>
        )}
        <div className="absolute top-1 right-1 bg-primary/90 rounded-full p-1">
          <Heart className="w-3 h-3 text-white fill-white" />
        </div>
      </div>
      <p className="text-[11px] text-foreground truncate">{m.card_name}</p>
      <p className="text-[10px] text-muted-foreground truncate">
        {m.card_set ?? '—'}{m.card_price ? ` · $${Number(m.card_price).toFixed(0)}` : ''}
      </p>
    </div>
  );
}