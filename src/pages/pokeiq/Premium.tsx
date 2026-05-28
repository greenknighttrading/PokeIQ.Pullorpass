import { useState } from 'react';
import {
  Crown,
  Check,
  Sparkles,
  Heart,
  BarChart3,
  FileText,
  Rss,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Flame,
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
      </div>

      {/* Premium feature previews */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-violet-300 mb-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/30">
          <Sparkles className="w-3 h-3" /> Premium features
        </div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
          Budget smarter and build a collection <br className="hidden sm:block" />that fits your lifestyle and personality
        </h2>
        <p className="text-sm text-muted-foreground mt-2">
          Powerful tools designed to help collectors make smarter decisions.
        </p>
      </div>

      <div className="flex flex-col gap-5 mb-10">
        <PullOrPassCard />
        <FeatureCard
          icon={BarChart3}
          title="Advanced portfolio analytics"
          badge="BETA"
          description="Track Health Score, era allocation, value-over-time, and risk exposure across your entire collection — the full Portfolio Review at your fingertips."
          chips={['Health Score', 'Era allocation', 'Value over time']}
          preview={<AnalyticsPreview />}
        />
        <FeatureCard
          icon={FileText}
          title="Collector Report Card"
          description="Your Collector Archetype meets your portfolio. We use your DNA — Investor, Archivist, Gambler — to tailor every recommendation in your monthly briefing."
          chips={['Archetype-driven', 'Tailored picks', 'Monthly briefing']}
          preview={<ReportPreview />}
        />
        <FeatureCard
          icon={Rss}
          title="Custom Smart Feed"
          description="Daily curated picks based on your budget, taste, and the cards trending in your favorite sets."
          chips={['Daily picks', 'Budget-aware', 'Trend-driven']}
          preview={<SmartFeedPreview />}
        />
      </div>

      {/* Billing toggle — sits right above the pricing widget */}
      <div className="flex justify-center mb-4">
        <div className="inline-flex items-center bg-card/60 border border-border/60 rounded-full p-1">
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

      {/* Pricing CTA + Unlimited Pull or Pass perks */}
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
            className="w-full max-w-sm mx-auto gap-2 bg-violet-500 hover:bg-violet-600 text-white border-0 mb-8"
            style={{ boxShadow: '0 0 30px rgba(139, 92, 246, 0.45)' }}
          >
            <Crown className="w-4 h-4" /> Get Premium
          </Button>

          {/* Unlimited Pull or Pass — included perks */}
          <div className="pt-6 border-t border-violet-500/25 text-left max-w-md mx-auto">
            <div className="flex items-center gap-2 mb-3 justify-center">
              <Heart className="w-4 h-4 text-violet-300" />
              <span className="text-sm font-semibold">Unlimited Pull or Pass included</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
              {coreFeatures.map((f) => (
                <div key={f} className="flex items-start gap-2 text-xs">
                  <Check className="w-3.5 h-3.5 text-violet-300 shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  badge,
  description,
  chips,
  preview,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  badge?: string;
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
          <h3 className="text-xl font-semibold mb-2 flex items-center gap-2 flex-wrap">
            {title}
            {badge && (
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
                {badge}
              </span>
            )}
          </h3>
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

function PullOrPassCard() {
  return (
    <div className="relative rounded-2xl border border-border/60 bg-card/40 p-6 md:p-7 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-fuchsia-500/5 pointer-events-none" />
      <div className="relative grid md:grid-cols-[1fr,1.1fr] gap-6 items-center">
        <div>
          <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-violet-500/15 border border-violet-500/30 mb-3">
            <Heart className="w-4 h-4 text-violet-300" />
          </div>
          <h3 className="text-xl font-semibold mb-2 flex items-center gap-2 flex-wrap">
            Unlimited Pull or Pass
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
              CORE
            </span>
          </h3>
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
            The complete Pull or Pass experience. Unlimited swipes, custom filters, and profile analytics.
          </p>
          <div className="grid sm:grid-cols-2 gap-x-4 gap-y-2">
            {coreFeatures.map((f) => (
              <div key={f} className="flex items-start gap-2 text-xs">
                <Check className="w-3.5 h-3.5 text-violet-300 shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{f}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="relative">
          <PullOrPassPreview />
        </div>
      </div>
    </div>
  );
}

function PullOrPassPreview() {
  return (
    <PreviewShell>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Heart className="w-4 h-4 text-violet-300" />
          <span className="text-xs font-semibold">Pull or Pass</span>
        </div>
        <span className="text-[10px] text-amber-400 flex items-center gap-1">
          <Flame className="w-3 h-3" /> Streak 12
        </span>
      </div>

      {/* Active card with swipe overlay */}
      <div className="relative rounded-lg border border-violet-500/30 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 p-4 mb-3 overflow-hidden">
        <div className="absolute top-2 right-2 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
          PULL
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-14 rounded bg-gradient-to-br from-amber-300/40 to-orange-400/30 border border-amber-300/40 shrink-0" />
          <div>
            <div className="text-xs font-semibold">Mew GG10/GG70</div>
            <div className="text-[10px] text-violet-300">Crown Zenith · GG</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">$45 market</div>
          </div>
        </div>
      </div>

      {/* Custom filters */}
      <div className="flex flex-wrap gap-1.5">
        {['Vintage only', '>$50', 'Slabs'].map((f) => (
          <span key={f} className="text-[9px] uppercase tracking-wider px-2 py-1 rounded-full bg-violet-500/10 border border-violet-500/25 text-violet-200">
            {f}
          </span>
        ))}
      </div>
    </PreviewShell>
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
  // Mirrors the actual Portfolio Review: Health Score donut, total value,
  // era allocation bar, and value-over-time sparkline.
  const score = 87;
  const circ = 2 * Math.PI * 28;
  const offset = circ - (score / 100) * circ;
  const eras: { label: string; pct: number; color: string }[] = [
    { label: 'Vintage', pct: 42, color: 'hsl(265 85% 65%)' },
    { label: 'Classic', pct: 22, color: 'hsl(290 75% 65%)' },
    { label: 'Modern',  pct: 26, color: 'hsl(190 80% 60%)' },
    { label: 'Sealed',  pct: 10, color: 'hsl(155 70% 55%)' },
  ];
  let acc = 0;
  return (
    <PreviewShell>
      {/* Top row: Health Score donut + portfolio value */}
      <div className="flex items-center gap-4 mb-3">
        <div className="relative w-[68px] h-[68px] shrink-0">
          <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
            <circle cx="32" cy="32" r="28" stroke="hsl(var(--border))" strokeWidth="6" fill="none" opacity="0.4" />
            <circle
              cx="32" cy="32" r="28"
              stroke="rgb(167,139,250)" strokeWidth="6" fill="none"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-base font-bold leading-none">{score}</span>
            <span className="text-[8px] text-muted-foreground leading-none mt-0.5">/100</span>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Portfolio value</div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold">$12,480</span>
            <span className="text-[10px] text-emerald-400 flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3" />+4.2%
            </span>
          </div>
          <div className="text-[9px] text-violet-300 mt-0.5">Well Balanced</div>
        </div>
      </div>

      {/* Value over time sparkline */}
      <svg viewBox="0 0 200 40" className="w-full h-10 mb-3">
        <defs>
          <linearGradient id="apv" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgb(139,92,246)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="rgb(139,92,246)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M0,30 L20,26 L40,28 L60,20 L80,22 L100,14 L120,16 L140,10 L160,12 L180,6 L200,8 L200,40 L0,40 Z" fill="url(#apv)" />
        <path d="M0,30 L20,26 L40,28 L60,20 L80,22 L100,14 L120,16 L140,10 L160,12 L180,6 L200,8" stroke="rgb(167,139,250)" strokeWidth="1.5" fill="none" />
      </svg>

      {/* Era allocation stacked bar */}
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Era allocation</span>
      </div>
      <div className="w-full h-2 rounded-full overflow-hidden flex bg-card/60 border border-border/50 mb-2">
        {eras.map((e) => (
          <div key={e.label} style={{ width: `${e.pct}%`, background: e.color }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {eras.map((e) => (
          <div key={e.label} className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: e.color }} />
            {e.label} <span className="text-foreground font-medium">{e.pct}%</span>
          </div>
        ))}
      </div>
    </PreviewShell>
  );
}

function ReportPreview() {
  // Personalised report driven by the user's Collector Archetype.
  return (
    <PreviewShell>
      <div className="flex items-center gap-2 mb-3">
        <FileText className="w-4 h-4 text-violet-300" />
        <span className="text-xs font-semibold">Your November Report</span>
        <span className="ml-auto text-[10px] text-muted-foreground">2026</span>
      </div>

      {/* Archetype badge */}
      <div className="rounded-md border border-violet-500/30 bg-violet-500/10 p-2.5 mb-3">
        <div className="flex items-center justify-between mb-1">
          <div className="text-[9px] uppercase tracking-wider text-violet-300">Your archetype</div>
          <div className="text-[9px] text-muted-foreground">92% match</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-500 flex items-center justify-center text-[11px] font-bold text-white">
            IN
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold">The Investor</div>
            <div className="text-[9px] text-muted-foreground truncate">Patient · Vintage-leaning · Long holds</div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <ReportRow label="Portfolio value" value="$12,480" trend="+8.4%" up />
        <ReportRow label="Top mover" value="Charizard ex 199" trend="+22%" up />
        <ReportRow label="Underperformer" value="Pikachu V 043" trend="-6%" />
        <div className="rounded-md bg-violet-500/10 border border-violet-500/25 p-2 mt-3">
          <div className="text-[10px] uppercase tracking-wider text-violet-300 mb-0.5">Recommended for an Investor</div>
          <div className="text-xs">Add 12% Vintage exposure — accumulate WOTC slabs on dips.</div>
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

