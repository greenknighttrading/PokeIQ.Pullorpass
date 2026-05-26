import { Link } from 'react-router-dom';
import { Crown, BarChart3, PieChart, FileText, Sparkles, ArrowRight, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

const tools = [
  { href: '/rebalance', icon: PieChart, title: 'Portfolio Rebalancer', desc: 'See exactly where to put this month\'s budget across assets and eras.' },
  { href: '/report', icon: FileText, title: 'PokeIQ Report', desc: 'Personalised narrative + Buy / Hold / Weak signals on every card you own.' },
  { href: '/insights', icon: BarChart3, title: 'Advanced Portfolio Metrics', desc: 'Health Score, allocation balance, era diversification, risk analysis.' },
  { href: '/era-allocation', icon: Sparkles, title: 'Era Allocation', desc: 'Drill into how your collection is spread across Pokémon eras.' },
  { href: '/winners', icon: Zap, title: 'Top Movers in Your Bag', desc: 'Which of your cards are heating up — and which are bleeding value.' },
  { href: '/buylist/scanner', icon: BarChart3, title: 'Card Scanner Pro', desc: 'Deep scan with confidence intervals, comp history, and signal context.' },
];

export default function Premium() {
  return (
    <div className="px-6 lg:px-10 py-8 max-w-[1400px] mx-auto">
      <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2">Premium</div>
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">PokeIQ Premium</h1>
        <Crown className="w-7 h-7 text-primary" />
      </div>
      <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
        Advanced portfolio analytics, your personalised PokeIQ Report, and the full collecting & budgeting toolkit.
        All Premium tools are currently in <span className="text-primary font-semibold">beta</span> — your feedback shapes them.
      </p>

      <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-6 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-primary font-semibold mb-1">Go Premium</div>
          <div className="text-xl font-bold">$5 / month · $49 / year</div>
          <div className="text-xs text-muted-foreground mt-1">Unlimited swipes, every analytics tool, priority support.</div>
        </div>
        <Button size="lg" className="gap-2">
          <Crown className="w-4 h-4" /> Upgrade Now
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tools.map((t) => {
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              to={t.href}
              className="group rounded-xl border border-border/60 bg-card/30 p-5 transition-all hover:border-primary/40 hover:bg-card/50"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">Beta</span>
              </div>
              <div className="font-semibold mb-1">{t.title}</div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">{t.desc}</p>
              <div className="flex items-center gap-1 text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                Open <ArrowRight className="w-3 h-3" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}