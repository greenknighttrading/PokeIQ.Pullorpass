import { useState } from 'react';
import {
  Crown,
  Check,
  Sparkles,
  Heart,
  BarChart3,
  FileText,
  Rss,
  ShoppingBag,
  LayoutGrid,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Flame,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const coreFeatures = [
  'Unlimited Pull or Pass swipes',
  'Advanced recommendation engine',
  'Collector DNA insights',
  'Personalized card discoveries',
  'Community leaderboard boosts',
  'AI-powered collector insights',
  'Swipe streak rewards',
];

export default function Premium() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual');
  const monthlyPrice = 5;
  const annualTotal = 49;
  const annualMonthly = (annualTotal / 12).toFixed(2); // 4.08
  const shown = billing === 'annual' ? annualMonthly : monthlyPrice.toFixed(2);

  return (
    <div className="px-6 lg:px-10 py-10 max-w-[820px] mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-violet-300 mb-3">
          <Crown className="w-3.5 h-3.5" /> PokeIQ Premium
        </div>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-3">
          Unlock the full collector toolkit
        </h1>
        <p className="text-sm text-muted-foreground max-w-xl mx-auto">
          The complete Pull or Pass experience — plus advanced portfolio analytics as a bonus.
        </p>

        {/* Billing toggle */}
        <div className="mt-6 inline-flex items-center bg-card/60 border border-border/60 rounded-full p-1">
          <button
            onClick={() => setBilling('annual')}
            className={cn(
              'px-4 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5',
              billing === 'annual' ? 'bg-violet-500 text-white' : 'text-muted-foreground'
            )}
          >
            Annual
            <span className={cn(
              'text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full',
              billing === 'annual' ? 'bg-white/20 text-white' : 'bg-violet-500/20 text-violet-300'
            )}>
              Save 18%
            </span>
          </button>
          <button
            onClick={() => setBilling('monthly')}
            className={cn(
              'px-4 py-1.5 rounded-full text-xs font-medium transition-all',
              billing === 'monthly' ? 'bg-violet-500 text-white' : 'text-muted-foreground'
            )}
          >
            Monthly
          </button>
        </div>
      </div>

      {/* Core Pull or Pass feature widget */}
      <div
        className="relative rounded-2xl border border-violet-500/40 bg-gradient-to-br from-violet-500/15 via-card/70 to-card/40 p-8 overflow-hidden mb-10"
        style={{ boxShadow: '0 0 80px rgba(139, 92, 246, 0.25), 0 0 30px rgba(167, 139, 250, 0.15) inset' }}
      >
        {/* Glow orbs */}
        <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-violet-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-fuchsia-500/20 blur-3xl" />

        <div className="relative">
          <div className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Heart className="w-5 h-5 text-violet-300" /> Unlimited Pull or Pass
          </div>
          <p className="text-sm text-muted-foreground mb-6 max-w-lg">
            Swipe as much as you want and train the recommendation engine on your taste.
          </p>
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
            {coreFeatures.map((f) => (
              <div key={f} className="flex items-start gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-violet-300 shrink-0 mt-0.5" />
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Premium feature previews */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-violet-300 mb-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/30">
          <Sparkles className="w-3 h-3" /> Premium features
        </div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
          Always know when to <br className="hidden sm:block" />buy, sell, or grade
        </h2>
        <p className="text-sm text-muted-foreground mt-2">
          Powerful tools designed to help collectors make smarter decisions.
        </p>
      </div>

      <div className="flex flex-col gap-5 mb-10">
        <FeatureCard
          icon={BarChart3}
          title="Advanced portfolio analytics"
          description="Track Health Score, risk exposure, era allocation, and momentum across your entire collection in real time."
          chips={['Health Score & risk analysis', 'Era allocation', 'Momentum tracking']}
          preview={<AnalyticsPreview />}
        />
        <FeatureCard
          icon={FileText}
          title="Personalised PokeIQ Report"
          description="A monthly briefing on your collection — wins, losses, what to hold, and where to rebalance next."
          chips={['Monthly briefing', 'Hold / rebalance calls', 'Tailored to your portfolio']}
          preview={<ReportPreview />}
        />
        <FeatureCard
          icon={Rss}
          title="Custom Smart Feed"
          description="Daily curated picks based on your budget, taste, and the cards trending in your favorite sets."
          chips={['Daily picks', 'Budget-aware', 'Trend-driven']}
          preview={<SmartFeedPreview />}
        />
        <FeatureCard
          icon={ShoppingBag}
          title="Curated Buy List"
          description="A live list of undervalued cards we'd buy right now, refreshed with arbitrage and price-spike alerts."
          chips={['Arbitrage opportunities', 'Price spike alerts', 'Refreshed daily']}
          preview={<BuyListPreview />}
        />
        <FeatureCard
          icon={LayoutGrid}
          title="Sets Explorer"
          description="Dive into every set with chase odds, sealed performance, and singles momentum side-by-side."
          chips={['Chase odds', 'Sealed vs singles', 'Set momentum']}
          preview={<SetsExplorerPreview />}
        />
      </div>

      {/* Pricing CTA */}
      <div
        className="relative rounded-2xl border border-violet-500/40 bg-gradient-to-br from-violet-500/15 via-card/70 to-card/40 p-8 overflow-hidden text-center"
        style={{ boxShadow: '0 0 80px rgba(139, 92, 246, 0.25), 0 0 30px rgba(167, 139, 250, 0.15) inset' }}
      >
        <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-violet-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="relative">
          <div className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-violet-500 text-white mb-4">
            Most popular
          </div>
          <div className="text-lg font-semibold mb-2 flex items-center justify-center gap-2">
            <Crown className="w-5 h-5 text-violet-300" /> Premium
          </div>
          <div className="flex items-baseline justify-center gap-2 mb-1">
            <span className="text-6xl font-bold">${shown}</span>
            <span className="text-sm text-muted-foreground">/ month</span>
          </div>
          <div className="text-xs text-muted-foreground mb-6">
            {billing === 'annual' ? `$${annualTotal} billed annually` : 'Billed monthly · cancel anytime'}
          </div>
          <Button
            size="lg"
            className="w-full max-w-sm mx-auto gap-2 bg-violet-500 hover:bg-violet-600 text-white border-0"
            style={{ boxShadow: '0 0 30px rgba(139, 92, 246, 0.45)' }}
          >
            <Crown className="w-4 h-4" /> Get Premium
          </Button>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  chips,
  preview,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  chips: string[];
  preview: React.ReactNode;
}) {
  return (
    <div className="relative rounded-2xl border border-border/60 bg-card/40 p-6 md:p-7 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-fuchsia-500/5 pointer-events-none" />
      <div className="relative grid md:grid-cols-[1fr,1.1fr] gap-6 items-center">
        <div>
          <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-violet-500/15 border border-violet-500/30 mb-3">
            <Icon className="w-4 h-4 text-violet-300" />
          </div>
          <h3 className="text-xl font-semibold mb-2">{title}</h3>
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{description}</p>
          <div className="flex flex-wrap gap-1.5">
            {chips.map((c) => (
              <span
                key={c}
                className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-violet-500/10 border border-violet-500/25 text-violet-200"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
        <div className="relative">{preview}</div>
      </div>
    </div>
  );
}

/* ============ Mock previews ============ */

function PreviewShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/80 p-4 shadow-[0_10px_40px_-20px_rgba(139,92,246,0.5)]">
      {children}
    </div>
  );
}

function AnalyticsPreview() {
  return (
    <PreviewShell>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Health Score</span>
        <span className="text-[10px] text-emerald-400 flex items-center gap-1"><ArrowUpRight className="w-3 h-3" />+4.2%</span>
      </div>
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-3xl font-bold">87</span>
        <span className="text-xs text-muted-foreground">/ 100</span>
      </div>
      <svg viewBox="0 0 200 60" className="w-full h-14 mb-3">
        <defs>
          <linearGradient id="apv" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgb(139,92,246)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="rgb(139,92,246)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M0,45 L20,38 L40,42 L60,30 L80,33 L100,22 L120,25 L140,15 L160,20 L180,10 L200,14 L200,60 L0,60 Z" fill="url(#apv)" />
        <path d="M0,45 L20,38 L40,42 L60,30 L80,33 L100,22 L120,25 L140,15 L160,20 L180,10 L200,14" stroke="rgb(167,139,250)" strokeWidth="1.5" fill="none" />
      </svg>
      <div className="grid grid-cols-3 gap-2 text-center">
        {[['Vintage', '42%'], ['Modern', '38%'], ['Sealed', '20%']].map(([l, v]) => (
          <div key={l} className="rounded-md bg-card/60 border border-border/50 py-1.5">
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{l}</div>
            <div className="text-xs font-semibold">{v}</div>
          </div>
        ))}
      </div>
    </PreviewShell>
  );
}

function ReportPreview() {
  return (
    <PreviewShell>
      <div className="flex items-center gap-2 mb-3">
        <FileText className="w-4 h-4 text-violet-300" />
        <span className="text-xs font-semibold">November Report</span>
        <span className="ml-auto text-[10px] text-muted-foreground">2026</span>
      </div>
      <div className="space-y-2">
        <ReportRow label="Portfolio value" value="$12,480" trend="+8.4%" up />
        <ReportRow label="Top mover" value="Charizard ex 199" trend="+22%" up />
        <ReportRow label="Underperformer" value="Pikachu V 043" trend="-6%" />
        <div className="rounded-md bg-violet-500/10 border border-violet-500/25 p-2 mt-3">
          <div className="text-[10px] uppercase tracking-wider text-violet-300 mb-0.5">Recommended action</div>
          <div className="text-xs">Rebalance 12% from Modern → Vintage</div>
        </div>
      </div>
    </PreviewShell>
  );
}

function ReportRow({ label, value, trend, up }: { label: string; value: string; trend: string; up?: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-medium">{value}</span>
        <span className={cn('text-[10px] flex items-center gap-0.5', up ? 'text-emerald-400' : 'text-rose-400')}>
          {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {trend}
        </span>
      </div>
    </div>
  );
}

function SmartFeedPreview() {
  const items = [
    { name: 'Umbreon VMAX 215', tag: 'Trending', price: '$184' },
    { name: 'Lugia V 186', tag: 'Undervalued', price: '$42' },
    { name: 'Mew ex 232', tag: 'New pick', price: '$78' },
  ];
  return (
    <PreviewShell>
      <div className="flex items-center gap-2 mb-3">
        <Flame className="w-4 h-4 text-violet-300" />
        <span className="text-xs font-semibold">Today's picks</span>
      </div>
      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.name} className="flex items-center gap-2 p-2 rounded-md bg-card/60 border border-border/50">
            <div className="w-8 h-10 rounded bg-gradient-to-br from-violet-500/30 to-fuchsia-500/20 border border-violet-500/30 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium truncate">{it.name}</div>
              <div className="text-[10px] text-violet-300">{it.tag}</div>
            </div>
            <div className="text-xs font-semibold">{it.price}</div>
          </div>
        ))}
      </div>
    </PreviewShell>
  );
}

function BuyListPreview() {
  const rows = [
    { name: 'Rayquaza VMAX', delta: '-18%', target: '$120' },
    { name: 'Giratina V Alt', delta: '-12%', target: '$310' },
    { name: 'Gardevoir ex', delta: '-9%', target: '$54' },
  ];
  return (
    <PreviewShell>
      <div className="flex items-center gap-2 mb-3">
        <ShoppingBag className="w-4 h-4 text-violet-300" />
        <span className="text-xs font-semibold">Buy List</span>
        <span className="ml-auto text-[10px] text-emerald-400">3 new alerts</span>
      </div>
      <div className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.name} className="flex items-center justify-between text-xs p-2 rounded-md bg-card/60 border border-border/50">
            <span className="font-medium truncate">{r.name}</span>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 text-[10px]">{r.delta}</span>
              <span className="font-semibold">{r.target}</span>
            </div>
          </div>
        ))}
      </div>
    </PreviewShell>
  );
}

function SetsExplorerPreview() {
  const sets = [
    { name: 'Surging Sparks', mom: '+12%', chase: '1 / 86' },
    { name: 'Paldean Fates', mom: '+6%', chase: '1 / 124' },
    { name: '151', mom: '+18%', chase: '1 / 64' },
  ];
  return (
    <PreviewShell>
      <div className="flex items-center gap-2 mb-3">
        <Star className="w-4 h-4 text-violet-300" />
        <span className="text-xs font-semibold">Top sets this week</span>
      </div>
      <div className="space-y-1.5">
        {sets.map((s) => (
          <div key={s.name} className="flex items-center justify-between text-xs p-2 rounded-md bg-card/60 border border-border/50">
            <span className="font-medium truncate">{s.name}</span>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-muted-foreground">Chase {s.chase}</span>
              <span className="text-emerald-400 text-[10px] flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" />{s.mom}
              </span>
            </div>
          </div>
        ))}
      </div>
    </PreviewShell>
  );
}