import { useState } from 'react';
import { Crown, Check, Sparkles, Heart, BarChart3 } from 'lucide-react';
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

const bonusFeatures = [
  'Advanced portfolio analytics',
  'Personalised PokeIQ Report',
  'Health Score & risk analysis',
  'Smart Feed with daily picks',
  'Buy List with curated picks',
  'Sets Explorer',
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

      {/* Single combined widget */}
      <div
        className="relative rounded-2xl border border-violet-500/40 bg-gradient-to-br from-violet-500/15 via-card/70 to-card/40 p-8 overflow-hidden"
        style={{ boxShadow: '0 0 80px rgba(139, 92, 246, 0.25), 0 0 30px rgba(167, 139, 250, 0.15) inset' }}
      >
        {/* Glow orbs */}
        <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-violet-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-fuchsia-500/20 blur-3xl" />

        <div className="relative">
          <div className="absolute top-0 right-0 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-violet-500 text-white">
            Most popular
          </div>
          <div className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Crown className="w-5 h-5 text-violet-300" /> Premium
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-6xl font-bold">${shown}</span>
            <span className="text-sm text-muted-foreground">/ month</span>
          </div>
          <div className="text-xs text-muted-foreground mb-6">
            {billing === 'annual' ? `$${annualTotal} billed annually` : 'Billed monthly · cancel anytime'}
          </div>

          <Button
            size="lg"
            className="w-full mb-8 gap-2 bg-violet-500 hover:bg-violet-600 text-white border-0"
            style={{ boxShadow: '0 0 30px rgba(139, 92, 246, 0.45)' }}
          >
            <Crown className="w-4 h-4" /> Get Premium
          </Button>

          {/* Core Pull or Pass features */}
          <div className="flex items-center gap-2 mb-3">
            <Heart className="w-4 h-4 text-violet-300" />
            <span className="text-[11px] uppercase tracking-[0.18em] text-violet-300 font-semibold">
              Core Pull or Pass
            </span>
          </div>
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 mb-8">
            {coreFeatures.map((f) => (
              <div key={f} className="flex items-start gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-violet-300 shrink-0 mt-0.5" />
                <span>{f}</span>
              </div>
            ))}
          </div>

          {/* Bonus advanced analytics */}
          <div className="border-t border-violet-500/20 pt-6">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-violet-300" />
              <span className="text-[11px] uppercase tracking-[0.18em] text-violet-300 font-semibold">
                Bonus · Advanced Portfolio Analytics
              </span>
            </div>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
              {bonusFeatures.map((f) => (
                <div key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-violet-300/80 shrink-0 mt-0.5" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}