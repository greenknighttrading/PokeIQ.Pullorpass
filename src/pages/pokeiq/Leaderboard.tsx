import { useMemo, useState } from 'react';
import { Crown, Trophy, BookOpen, Tag, Sparkles, Users, ArrowRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  { name: 'VintageVibes', title: 'Vintage Hunter', tier: 'Expert', pokemonId: 25, cardsSwiped: 12842, cardsTagged: 3948 },
  { name: 'HoloChaser', title: 'Holo Collector', tier: 'Expert', pokemonId: 94, cardsSwiped: 11394, cardsTagged: 3503 },
  { name: 'ArtfulArcanine', title: 'Art Curator', tier: 'Expert', pokemonId: 59, cardsSwiped: 9672, cardsTagged: 2756 },
  { name: 'MysticMew', title: 'Mystic Seeker', tier: 'Advanced', pokemonId: 151, cardsSwiped: 7890, cardsTagged: 2278 },
  { name: 'CozyCollector', title: 'Cozy Enjoyer', tier: 'Advanced', pokemonId: 143, cardsSwiped: 6445, cardsTagged: 1989 },
  { name: 'NightShade', title: 'Dark Enthusiast', tier: 'Advanced', pokemonId: 197, cardsSwiped: 5982, cardsTagged: 1734 },
  { name: 'ShinySeeker', title: 'Shiny Collector', tier: 'Rising', pokemonId: 282, cardsSwiped: 5210, cardsTagged: 1512 },
  { name: 'DragonHeart', title: 'Dragon Tamer', tier: 'Rising', pokemonId: 6, cardsSwiped: 4876, cardsTagged: 1308 },
  { name: 'PsychicPulse', title: 'Psy Channeler', tier: 'Rising', pokemonId: 65, cardsSwiped: 4321, cardsTagged: 1186 },
  { name: 'ForestFox', title: 'Grass Wanderer', tier: 'Rising', pokemonId: 196, cardsSwiped: 3987, cardsTagged: 1054 },
  { name: 'AquaArtist', title: 'Water Trainer', tier: 'Rising', pokemonId: 9, cardsSwiped: 3712, cardsTagged: 928 },
  { name: 'EmberKnight', title: 'Fire Specialist', tier: 'Rising', pokemonId: 38, cardsSwiped: 3401, cardsTagged: 842 },
];

const collectors: Collector[] = baseCollectors
  .map((c) => ({ ...c, rank: 0 }))
  .sort((a, b) => pts(b) - pts(a))
  .map((c, i) => ({ ...c, rank: i + 1 }));

const tabs = ['Friends', 'Top Taggers', 'Top Swipers'] as const;
type Tab = (typeof tabs)[number];

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
  const [tab, setTab] = useState<Tab>('Top Swipers');

  const sorted = useMemo(() => {
    const arr = [...collectors];
    if (tab === 'Top Taggers') arr.sort((a, b) => b.cardsTagged - a.cardsTagged);
    else if (tab === 'Top Swipers') arr.sort((a, b) => b.cardsSwiped - a.cardsSwiped);
    else arr.sort((a, b) => pts(b) - pts(a));
    return arr.map((c, i) => ({ ...c, rank: i + 1 }));
  }, [tab]);

  // Mock current user
  const me = { rank: 24, percentile: 'Top 3%', name: 'PokeNovice', title: 'Rising Collector', cardsSwiped: 1250, cardsTagged: 244 };
  const myPoints = me.cardsSwiped + me.cardsTagged * 5; // 1250 + 1220 = 2470

  const totals = collectors.reduce(
    (acc, c) => ({ swiped: acc.swiped + c.cardsSwiped, tagged: acc.tagged + c.cardsTagged }),
    { swiped: 0, tagged: 0 }
  );

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-8 max-w-[1500px] mx-auto">
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

          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/30 border border-border/50 overflow-x-auto">
              {tabs.map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap',
                    tab === t ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" className="gap-2 text-xs">
              All Time <ChevronDown className="w-3 h-3" />
            </Button>
          </div>

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
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3">Your Rank</div>
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center border-2 border-primary/40">
                <div className="text-center">
                  <div className="text-xl font-bold">{me.rank}</div>
                  <div className="text-[9px] text-primary font-medium">{me.percentile}</div>
                </div>
              </div>
              <div className="w-16 h-16 rounded-full bg-muted/40 overflow-hidden flex items-center justify-center">
                <img src={avatarUrl(25)} alt="" className="w-full h-full object-contain" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{me.name}</span>
                <span className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary/15 text-primary">You</span>
              </div>
              <div className="text-xs text-muted-foreground">{me.title}</div>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Cards Swiped</span><span className="tabular-nums font-medium">{me.cardsSwiped.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Cards Tagged</span><span className="tabular-nums font-medium">{me.cardsTagged.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Total Points</span><span className="tabular-nums font-bold text-primary">{myPoints.toLocaleString()}</span></div>
            </div>
            <Link to="/profile">
              <Button variant="outline" size="sm" className="w-full mt-4 gap-2">
                View My Profile <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/30 p-5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3">Leaderboard Insights</div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center"><BookOpen className="w-4 h-4 text-primary" /></div>
                <div>
                  <div className="font-bold tabular-nums">{(totals.swiped / 1000).toFixed(1)}K+</div>
                  <div className="text-[11px] text-muted-foreground">Total cards swiped by all collectors</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center"><Tag className="w-4 h-4 text-primary" /></div>
                <div>
                  <div className="font-bold tabular-nums">{(totals.tagged / 1000).toFixed(1)}K+</div>
                  <div className="text-[11px] text-muted-foreground">Total cards tagged by the community</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
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