import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Crown, Check, X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const coreFeatures = [
  'Unlimited Pull or Pass swipes',
  'Advanced recommendation engine',
  'Collector DNA insights',
  'Taste evolution tracking',
  'Recommendation tuning',
  'Personalized card discoveries',
  'Collector similarity matching',
  'Community leaderboard boosts',
  'Early access archetypes',
  'Enhanced card intelligence',
  'Premium binder customization',
  'AI-powered collector insights',
  'Swipe streak rewards',
];

const includedFeatures = [
  'Advanced portfolio analytics',
  'Personalised PokeIQ Report',
  'Health Score & risk analysis',
  'Portfolio Rebalancer (Asset + Era)',
  'Era Allocation breakdown',
  'Top Movers in your bag',
  'Card Scanner Pro (confidence + comps)',
  'Smart Feed with daily picks',
  'Sealed vs Cards comparison tool',
  'Pack Gains EV calculator',
  'Market News & daily briefs',
  'Buy List with curated picks',
  'Movers, Sets Explorer & Watchlist',
  'Priority support',
];

const excludedFeatures = [
  'Physical card grading service',
  'In-person consignment',
];

const advancedTools = [
  { href: '/home', title: 'Overview Dashboard' },
  { href: '/collection', title: 'Manage Collection' },
  { href: '/winners', title: 'Position Details' },
  { href: '/insights', title: 'Signals' },
  { href: '/rebalance', title: 'Asset Rebalancer' },
  { href: '/era-allocation', title: 'Era Allocation' },
  { href: '/report', title: 'Generate Report' },
  { href: '/smart-feed', title: 'Smart Feed' },
  { href: '/daily-report', title: 'Market News' },
  { href: '/tools/sealed-vs-cards', title: 'Sealed vs Cards' },
  { href: '/pack-gains', title: 'Pack Gains' },
  { href: '/buylist/list', title: 'Buy List' },
  { href: '/buylist/movers', title: 'Movers' },
  { href: '/buylist/sets', title: 'Sets Explorer' },
  { href: '/buylist/scanner', title: 'Card Scanner' },
  { href: '/buylist/watchlist', title: 'Watchlist' },
];

export default function Premium() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual');
  const monthlyPrice = 5;
  const annualTotal = 49;
  const annualMonthly = (annualTotal / 12).toFixed(2); // 4.08
  const shown = billing === 'annual' ? annualMonthly : monthlyPrice.toFixed(2);

  return (
    <div className="px-6 lg:px-10 py-10 max-w-[1100px] mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-primary mb-3">
          <Crown className="w-3.5 h-3.5" /> PokeIQ Premium
        </div>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-3">
          Unlock the full collector toolkit
        </h1>
        <p className="text-sm text-muted-foreground max-w-xl mx-auto">
          Advanced portfolio analytics, your personalised PokeIQ Report, and every collecting & budgeting tool — all in beta, shaped by your feedback.
        </p>

        {/* Billing toggle */}
        <div className="mt-6 inline-flex items-center bg-card/60 border border-border/60 rounded-full p-1">
          <button
            onClick={() => setBilling('monthly')}
            className={cn(
              'px-4 py-1.5 rounded-full text-xs font-medium transition-all',
              billing === 'monthly' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling('annual')}
            className={cn(
              'px-4 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5',
              billing === 'annual' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
            )}
          >
            Annual
            <span className={cn(
              'text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full',
              billing === 'annual' ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-primary/20 text-primary'
            )}>
              Save 18%
            </span>
          </button>
        </div>
      </div>

      {/* Pricing card */}
      <div className="relative max-w-md mx-auto rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 via-card/60 to-card/30 p-7 mb-10 overflow-hidden">
        <div className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-primary text-primary-foreground">
          Most popular
        </div>
        <div className="text-lg font-semibold mb-4">Premium</div>
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-5xl font-bold">${shown}</span>
          <span className="text-sm text-muted-foreground">/ month</span>
        </div>
        <div className="text-xs text-muted-foreground mb-4">
          {billing === 'annual'
            ? `$${annualTotal} billed annually`
            : 'Billed monthly · cancel anytime'}
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Full analytics suite for smart collectors.
        </p>

        <Button size="lg" className="w-full mb-6 gap-2">
          <Crown className="w-4 h-4" /> Get Premium
        </Button>

        <div className="text-xs font-semibold uppercase tracking-wider text-foreground/80 mb-3">Includes:</div>
        <ul className="space-y-2 mb-5">
          {includedFeatures.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm">
              <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>{f}</span>
            </li>
          ))}
          {excludedFeatures.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground/60">
              <X className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Advanced tools preview */}
      <div>
        <h2 className="text-lg font-bold mb-1">All Premium tools</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Every advanced page below is included with Premium. All currently in <span className="text-primary font-semibold">beta</span>.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {advancedTools.map((t) => (
            <Link
              key={t.href}
              to={t.href}
              className="group flex items-center justify-between rounded-lg border border-border/50 bg-card/30 px-3 py-2.5 text-xs font-medium hover:border-primary/40 hover:bg-card/60 transition-colors"
            >
              <span className="truncate">{t.title}</span>
              <ArrowRight className="w-3 h-3 text-muted-foreground group-hover:text-primary shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}