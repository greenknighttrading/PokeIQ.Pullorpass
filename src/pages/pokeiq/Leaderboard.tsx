import { useMemo, useState } from 'react';
import { Crown, Trophy, BookOpen, Tag, Sparkles, Users, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface Collector {
  rank: number;
  name: string;
  title: string;
  tier: 'Expert' | 'Advanced' | 'Rising';
  pokemonId: number;
  cardsSwiped: number;
  cardsTagged: number;
}

// Cards tagged = 5× points of cards swiped (per spec)
// Total points = cardsSwiped * 1 + cardsTagged * 5
function pts(c: Pick<Collector, 'cardsSwiped' | 'cardsTagged'>) {
  return c.cardsSwiped + c.cardsTagged * 5;
}

const baseCollectors: Omit<Collector, 'rank'>[] = [
  { name: 'mike_chen', title: 'Investor', tier: 'Expert', pokemonId: 25, cardsSwiped: 2568, cardsTagged: 790 },
  { name: 'sarah.kim', title: 'Archivist', tier: 'Expert', pokemonId: 94, cardsSwiped: 2279, cardsTagged: 701 },
  { name: 'jrodriguez', title: 'Curator', tier: 'Expert', pokemonId: 59, cardsSwiped: 1934, cardsTagged: 551 },
  { name: 'emma_w', title: 'Dreamer', tier: 'Advanced', pokemonId: 151, cardsSwiped: 1578, cardsTagged: 456 },
  { name: 'david.p', title: 'Hunter', tier: 'Advanced', pokemonId: 143, cardsSwiped: 1289, cardsTagged: 398 },
  { name: 'alex_t', title: 'Analyst', tier: 'Advanced', pokemonId: 197, cardsSwiped: 1196, cardsTagged: 347 },
  { name: 'rachel.lee', title: 'Explorer', tier: 'Rising', pokemonId: 282, cardsSwiped: 1042, cardsTagged: 302 },
  { name: 'tom_brady', title: 'Flipper', tier: 'Rising', pokemonId: 6, cardsSwiped: 975, cardsTagged: 262 },
  { name: 'nina_g', title: 'Showman', tier: 'Rising', pokemonId: 65, cardsSwiped: 864, cardsTagged: 237 },
  { name: 'chris.h', title: 'Monk', tier: 'Rising', pokemonId: 196, cardsSwiped: 797, cardsTagged: 211 },
  { name: 'jessica_m', title: 'Minimalist', tier: 'Rising', pokemonId: 9, cardsSwiped: 742, cardsTagged: 186 },
  { name: 'ryan_ok', title: 'Gambler', tier: 'Rising', pokemonId: 38, cardsSwiped: 680, cardsTagged: 168 },
];

const collectors: Collector[] = baseCollectors
  .map((c) => ({ ...c, rank: 0 }))
  .sort((a, b) => pts(b) - pts(a))
  .map((c, i) => ({ ...c, rank: i + 1 }));

const tierBadge = (tier: Collector['tier']) =>
  tier === 'Expert'
    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
    : tier === 'Advanced'
    ? 'bg-violet-500/15 text-violet-300 border-violet-500/30'
    : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';

const pointsColor = (rank: number) =>
  rank === 1 ? 'text-amber-400' : rank === 2 ? 'text-violet-300' : rank === 3 ? 'text-orange-300' : 'text-primary';

const avatarUrl = (id: number) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;

function MedalIcon({ rank }: { rank: number }) {
  const colors = ['bg-amber-500/20 text-amber-400 border-amber-400/40', 'bg-slate-400/20 text-slate-200 border-slate-300/40', 'bg-orange-500/20 text-orange-300 border-orange-400/40'];
  return (
    <div className={cn('w-9 h-9 rounded-full border flex items-center justify-center font-bold text-sm', colors[rank - 1])}>
      {rank}
    </div>
  );
}

export default function Leaderboard() {
  const sorted = useMemo(() => {
    const arr = [...collectors].sort((a, b) => b.cardsSwiped - a.cardsSwiped);
    return arr.map((c, i) => ({ ...c, rank: i + 1 }));
  }, []);

  const totals = collectors.reduce(
    (acc, c) => ({ swiped: acc.swiped + c.cardsSwiped, tagged: acc.tagged + c.cardsTagged }),
    { swiped: 0, tagged: 0 }
  );

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-8 max-w-[1500px] mx-auto">
      <Link
        to="/arena"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Arena
      </Link>
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        {/* Main column */}
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2">Leaderboard</div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Collector Leaderboard</h1>
            <Crown className="w-6 h-6 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
            Top collectors shaping the future of PokeIQ. Swipe, tag, and help build smarter recommendations for everyone.
          </p>

          <div className="rounded-xl border border-border/60 bg-card/30 overflow-hidden">
            <div className="overflow-x-auto">
              <div className="min-w-[640px]">
                <div className="grid grid-cols-[60px_minmax(200px,1fr)_minmax(90px,auto)_minmax(90px,auto)_minmax(100px,auto)] gap-3 px-5 py-3 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border/60">
                  <div>Rank</div>
                  <div>Collector</div>
                  <div className="flex items-center gap-1.5"><BookOpen className="w-3 h-3" /> Swiped</div>
                  <div className="flex items-center gap-1.5"><Tag className="w-3 h-3" /> Tagged</div>
                  <div className="flex items-center gap-1.5 justify-end"><Sparkles className="w-3 h-3" /> Points</div>
                </div>
                {sorted.map((c) => (
                  <div
                    key={c.name}
                    className="grid grid-cols-[60px_minmax(200px,1fr)_minmax(90px,auto)_minmax(90px,auto)_minmax(100px,auto)] gap-3 px-5 py-3 border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors items-center"
                  >
                    <div>{c.rank <= 3 ? <MedalIcon rank={c.rank} /> : <div className="text-sm text-muted-foreground font-medium pl-2">{c.rank}</div>}</div>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-muted/40 overflow-hidden shrink-0 flex items-center justify-center">
                        <img src={avatarUrl(c.pokemonId)} alt="" className="w-full h-full object-contain" loading="lazy" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold truncate">{c.name}</span>
                          <span className={cn('text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded border whitespace-nowrap', tierBadge(c.tier))}>{c.tier}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">{c.title}</div>
                      </div>
                    </div>
                    <div className="text-sm tabular-nums">{c.cardsSwiped.toLocaleString()}</div>
                    <div className="text-sm tabular-nums">{c.cardsTagged.toLocaleString()}</div>
                    <div className={cn('text-right text-sm font-bold tabular-nums whitespace-nowrap', pointsColor(c.rank))}>
                      {pts(c).toLocaleString()} <span className="text-[10px] font-normal text-muted-foreground">pts</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-5 py-3 text-[11px] text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 justify-center text-center border-t border-border/40">
              <Trophy className="w-3 h-3" /> Leaderboard updates every hour · Points are earned by swiping, tagging, and helping train PokeIQ ·
              <Link to="/pokeyelp" className="text-primary hover:underline">Learn more</Link>
            </div>
          </div>
        </div>

        {/* Side column */}
        <aside className="space-y-4">

          <div className="rounded-xl border border-border/60 bg-card/30 p-5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3">Leaderboard Insights</div>
            <div className="space-y-4">
              <div className="flex items-center gap-3 my-[8px] py-[5px]">
                <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center"><BookOpen className="w-4 h-4 text-primary" /></div>
                <div>
                  <div className="font-bold tabular-nums">{(totals.swiped / 1000).toFixed(1)}K+</div>
                  <div className="text-[11px] text-muted-foreground">Total cards swiped by all collectors</div>
                </div>
              </div>
              <div className="flex items-center gap-3 my-[8px] py-[5px]">
                <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center"><Tag className="w-4 h-4 text-primary" /></div>
                <div>
                  <div className="font-bold tabular-nums">{(totals.tagged / 1000).toFixed(1)}K+</div>
                  <div className="text-[11px] text-muted-foreground">Total cards tagged by the community</div>
                </div>
              </div>
              <div className="flex items-center gap-3 my-[8px] py-[5px]">
                <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center"><Users className="w-4 h-4 text-primary" /></div>
                <div>
                  <div className="font-bold tabular-nums">{collectors.length}+</div>
                  <div className="text-[11px] text-muted-foreground">Active collectors on PokeIQ</div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-primary/30 bg-gradient-to-b from-primary/10 to-primary/5 p-5">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <div className="font-semibold text-sm">How to Climb the Ranks</div>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1.5">
              <li>• Swipe more cards</li>
              <li>• Tag cards to help the community (5× points)</li>
              <li>• Stay consistent and level up!</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}