import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2, TrendingUp, TrendingDown,
  Zap, LogIn, PlusCircle, CheckCircle,
  SlidersHorizontal, ChevronDown, Newspaper, ExternalLink, Layers, CreditCard,
  Briefcase, AlertTriangle, Lock, ArrowDownRight, ArrowUpRight, ShoppingCart,
} from 'lucide-react';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MoverCard, getImageUrl, getChangeForTime } from './shared/signalHelpers';
import { useWatchlist } from '@/hooks/useWatchlist';
import SetsExplorer from './SetsExplorer';

/* ── Types ── */
interface Headline {
  title: string;
  url: string;
  excerpt: string;
  date: string;
  category: string;
}

/* ── Helpers ── */

/* ── Masthead ── */
function Masthead({ title }: { title: string }) {
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  return (
    <div className="text-center pb-4 mb-2 border-b border-border/50">
      <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">{dateStr}</p>
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">{title}</h1>
      <p className="text-xs text-muted-foreground mt-1.5">The Market Snapshot</p>
    </div>
  );
}

/* ── Section Divider ── */
function SectionRule({ title, icon: Icon }: { title: string; icon?: any }) {
  return (
    <div className="flex items-center gap-3 mt-14 mb-6 pt-4">
      <div className="h-px flex-1 bg-border/50" />
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-primary" />}
        <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{title}</span>
      </div>
      <div className="h-px flex-1 bg-border/50" />
    </div>
  );
}

/* ── Half-Dial Gauge with gradient ── */
function SentimentGauge({ upPct, upCount, downCount, label }: { upPct: number; upCount: number; downCount: number; label: string }) {
  const angle = ((upPct / 100) * 180) - 90;
  const isGreedy = upPct >= 55;
  const isFearful = upPct < 45;
  const sentimentLabel = isGreedy ? 'Greed' : isFearful ? 'Fear' : 'Neutral';
  const sentimentColor = isGreedy ? 'text-success' : isFearful ? 'text-destructive' : 'text-warning';
  const sentimentCaption = isGreedy
    ? 'Greed is driving the Pokémon market'
    : isFearful
    ? 'Fear is gripping the Pokémon market'
    : 'The Pokémon market is holding steady';
  const gaugeId = `gauge-${label.replace(/\s/g, '')}`;

  return (
    <div className="flex flex-col items-center">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Fear & Greed Index</p>
      <svg viewBox="0 0 200 115" className="w-40 h-22">
        <defs>
          <linearGradient id={gaugeId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--destructive))" />
            <stop offset="35%" stopColor="hsl(var(--destructive))" stopOpacity="0.6" />
            <stop offset="50%" stopColor="hsl(var(--warning))" />
            <stop offset="65%" stopColor="hsl(var(--success))" stopOpacity="0.6" />
            <stop offset="100%" stopColor="hsl(var(--success))" />
          </linearGradient>
        </defs>
        <path d="M 15 100 A 85 85 0 0 1 185 100" fill="none" stroke="hsl(var(--muted)/0.3)" strokeWidth="14" strokeLinecap="round" />
        <path d="M 15 100 A 85 85 0 0 1 185 100" fill="none" stroke={`url(#${gaugeId})`} strokeWidth="14" strokeLinecap="round" />
        <line x1="15" y1="100" x2="15" y2="88" stroke="hsl(var(--muted-foreground))" strokeWidth="1" opacity="0.4" />
        <line x1="100" y1="15" x2="100" y2="27" stroke="hsl(var(--muted-foreground))" strokeWidth="1" opacity="0.4" />
        <line x1="185" y1="100" x2="185" y2="88" stroke="hsl(var(--muted-foreground))" strokeWidth="1" opacity="0.4" />
        <g transform={`rotate(${angle}, 100, 100)`}>
          <line x1="100" y1="100" x2="100" y2="28" stroke="hsl(var(--foreground))" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="100" cy="100" r="5" fill="hsl(var(--foreground))" />
        </g>
        <text x="15" y="112" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="8" opacity="0.7">Fear</text>
        <text x="185" y="112" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="8" opacity="0.7">Greed</text>
      </svg>
      <p className="text-[10px] text-muted-foreground text-center max-w-[180px]">{sentimentCaption}</p>
      <div className="flex items-center gap-3 mt-0.5">
        <span className="text-[10px] tabular-nums text-success font-semibold">↑ {upCount.toLocaleString()}</span>
        <span className="text-[10px] tabular-nums text-destructive font-semibold">↓ {downCount.toLocaleString()}</span>
      </div>
    </div>
  );
}

/* ── Market Overview Banner ── */
function MarketOverviewBanner({ dbCounts }: { dbCounts: { cards: number; cardsUpPct: number; cardsUp: number; cardsDown: number } }) {

  return (
    <div className="glass-card rounded-xl p-2.5 space-y-1 flex flex-col">
      <div className="flex items-center gap-2">
        <Zap className="w-3.5 h-3.5 text-warning" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Market Overview</span>
      </div>

      <div className="flex flex-col items-center text-center space-y-1 flex-1 justify-center">
        <SentimentGauge upPct={dbCounts.cardsUpPct} upCount={dbCounts.cardsUp} downCount={dbCounts.cardsDown} label="7D Trend" />
        <div className="flex items-center gap-1.5">
          <CreditCard className="w-3 h-3 text-muted-foreground" />
          <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">{dbCounts.cards.toLocaleString()} cards tracked</span>
        </div>
      </div>
    </div>
  );
}

function PortfolioSnapshotCard({ dbCounts, topSets }: { dbCounts?: { cards: number; cardsUpPct: number; cardsUp: number; cardsDown: number }; topSets?: { name: string; pct: number }[] }) {
  const { isDataLoaded, summary, items } = usePortfolio();
  const navigate = useNavigate();

  // Fetch market index total value
  const [marketValue, setMarketValue] = useState<number | null>(null);
  useEffect(() => {
    supabase.from('market_index').select('total_market_value').order('date', { ascending: false }).limit(1).single()
      .then(({ data }) => { if (data) setMarketValue(data.total_market_value); });
  }, []);

  if (!isDataLoaded || !summary) {
    return (
      <button
        onClick={() => navigate('/about')}
        className="glass-card rounded-xl p-2.5 flex flex-col hover:border-primary/30 transition-all group"
      >
        <div className="flex items-center gap-2 mb-2">
          <Briefcase className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Portfolio Snapshot</span>
        </div>
        <div className="flex-1 flex flex-col justify-center space-y-2.5 px-1">
          {marketValue != null && (
            <div>
              <p className="text-lg font-black tabular-nums leading-tight">${(marketValue / 1e6).toFixed(1)}M</p>
              <p className="text-[10px] text-muted-foreground">Total Market Value</p>
            </div>
          )}
          {topSets && topSets.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Set Trends · 7D</p>
              {topSets.map((s, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground truncate max-w-[110px]">{s.name}</span>
                  <span className={cn('text-[10px] font-bold tabular-nums flex items-center gap-0.5', s.pct >= 0 ? 'text-success' : 'text-destructive')}>
                    {s.pct >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                    {s.pct >= 0 ? '+' : ''}{s.pct.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="pt-1.5 border-t border-border/30">
            <p className="text-xs font-bold text-muted-foreground group-hover:text-foreground transition-colors">Upload Portfolio →</p>
            <p className="text-[10px] text-muted-foreground">See your personalized snapshot</p>
          </div>
        </div>
      </button>
    );
  }

  const totalValue = summary.totalMarketValue;
  const totalGain = summary.unrealizedPL;
  const gainPct = summary.unrealizedPLPercent;
  const totalItems = summary.totalHoldings;
  const totalCost = summary.totalCostBasis;
  const isUp = totalGain >= 0;

  return (
    <div className="glass-card rounded-xl p-2.5 flex flex-col">
      <div className="flex items-center gap-2 mb-2">
        <Briefcase className="w-3.5 h-3.5 text-primary" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Portfolio Snapshot</span>
      </div>

      <div className="flex flex-col justify-center flex-1 space-y-3 px-1">
        {/* Top row: Total Value (left) + 7D Change (right) */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-2xl font-black tabular-nums leading-tight">${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Market Value</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-black tabular-nums leading-tight text-muted-foreground/40">—</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">7D Change</p>
          </div>
        </div>

        {/* Total gain underneath */}
        <p className={`text-sm font-bold tabular-nums ${isUp ? 'text-success' : 'text-destructive'}`}>
          {isUp ? '+' : ''}${Math.abs(totalGain).toLocaleString(undefined, { maximumFractionDigits: 0 })} ({isUp ? '+' : ''}{gainPct.toFixed(1)}%)
        </p>

        {/* Bottom stats row */}
        <div className="flex items-center justify-between pt-2.5 border-t border-border/30">
          <div>
            <span className="text-sm font-bold tabular-nums">{totalItems}</span>
            <p className="text-[10px] text-muted-foreground mt-0.5">Holdings</p>
          </div>
          <div className="text-center">
            <span className="text-sm font-bold tabular-nums">${totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            <p className="text-[10px] text-muted-foreground mt-0.5">Cost Basis</p>
          </div>
          <div className="text-right">
            <span className="text-sm font-bold tabular-nums text-success">{summary.holdingsInProfitPercent.toFixed(0)}%</span>
            <p className="text-[10px] text-muted-foreground mt-0.5">In Profit</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Action Center Ticker (horizontal strip) ── */
function ActionTicker() {
  const { concentration, milestones, items, isDataLoaded, summary } = usePortfolio();
  const scrollRef = useRef<HTMLDivElement>(null);
  const posRef = useRef(0);
  const pausedRef = useRef(false);
  const [, setTick] = useState(0); // force re-render trigger not needed for scroll
  const navigate = useNavigate();

  const sorted = useMemo(() => {
    if (!isDataLoaded) return [];
    interface Signal { weight: number; icon: React.ReactNode; iconBg: string; title: string; detail: string; itemId?: string; }
    const signals: Signal[] = [];

    // Profit Lock
    const profitLockItems = (milestones ?? []).filter(
      (m: any) => m.item.gainPercent > 300 && m.sellHalfProfit > 250 && m.item.quantity > 1
    );
    for (const m of profitLockItems) {
      signals.push({ weight: 10, icon: <Lock className="w-3 h-3 text-success" />, iconBg: 'bg-success/10', title: 'Lock Profit', detail: m.item.productName, itemId: m.item.id });
    }

    // Over-Concentration
    if (concentration && concentration.top1Percent > 25) {
      const concItem = (items ?? []).find((i: any) => i.productName === concentration.top1Name);
      signals.push({ weight: 9, icon: <AlertTriangle className="w-3 h-3 text-warning" />, iconBg: 'bg-warning/10', title: 'Over-Concentration', detail: `${concentration.top1Name} ${concentration.top1Percent.toFixed(0)}%`, itemId: concItem?.id });
    }

    // Multiple weak trends (top 3)
    const weakItems = (items ?? []).filter((i: any) => i.gainPercent < -10).sort((a: any, b: any) => a.gainPercent - b.gainPercent);
    for (const w of weakItems.slice(0, 3)) {
      signals.push({ weight: 7, icon: <ArrowDownRight className="w-3 h-3 text-destructive" />, iconBg: 'bg-destructive/10', title: 'Weak Trend', detail: `${w.productName} ${w.gainPercent.toFixed(1)}%`, itemId: w.id });
    }

    // Buy Opportunity
    signals.push({ weight: 5, icon: <ShoppingCart className="w-3 h-3 text-primary" />, iconBg: 'bg-primary/10', title: 'Buy Opportunity', detail: 'Check watchlist buy zones' });

    // Multiple new highs (top 3)
    const highItems = (items ?? []).filter((i: any) => i.gainPercent > 50).sort((a: any, b: any) => b.gainPercent - a.gainPercent);
    for (const h of highItems.slice(0, 3)) {
      signals.push({ weight: 3, icon: <ArrowUpRight className="w-3 h-3 text-success" />, iconBg: 'bg-success/10', title: 'New High', detail: `${h.productName} +${h.gainPercent.toFixed(0)}%`, itemId: h.id });
    }

    // Portfolio summary signal — links to portfolio
    if (summary) {
      const isUp = summary.unrealizedPL >= 0;
      signals.push({ weight: 6, icon: <Briefcase className="w-3 h-3 text-primary" />, iconBg: 'bg-primary/10', title: 'Portfolio', detail: `${isUp ? '+' : ''}${summary.unrealizedPLPercent.toFixed(1)}% · $${summary.totalMarketValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}` });
    }

    // Greatest Hits smart list
    signals.push({ weight: 4, icon: <Layers className="w-3 h-3 text-warning" />, iconBg: 'bg-warning/10', title: '🏆 Greatest Hits', detail: 'Top cards trending now' });

    // Create Your Own smart list
    signals.push({ weight: 3, icon: <PlusCircle className="w-3 h-3 text-primary" />, iconBg: 'bg-primary/10', title: '✏️ Create Your Own', detail: 'Build a custom smart list' });

    // Personality test
    signals.push({ weight: 2, icon: <Zap className="w-3 h-3 text-accent" />, iconBg: 'bg-accent/10', title: '🧠 Know Your Personality?', detail: 'Take the collector quiz' });

    return [...signals].sort((a, b) => b.weight - a.weight).slice(0, 15);
  }, [isDataLoaded, concentration, milestones, items, summary]);

  const duped = useMemo(() => [...sorted, ...sorted], [sorted]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || sorted.length === 0) return;
    let raf: number;
    const speed = 0.4;
    const tick = () => {
      if (!pausedRef.current) {
        posRef.current += speed;
        const half = el.scrollWidth / 2;
        if (half > 0 && posRef.current >= half) posRef.current = 0;
        el.scrollLeft = posRef.current;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [sorted]);

  if (!isDataLoaded || sorted.length === 0) return null;

  const getHref = (s: typeof sorted[number]) => {
    const base: Record<string, string> = {
      'Lock Profit': '/winners',
      'Over-Concentration': '/rebalance',
      'Weak Trend': '/winners',
      'Buy Opportunity': '/buylist/watchlist',
      'New High': '/winners',
      'Portfolio': '/home',
      '🏆 Greatest Hits': '/buylist/movers',
      '✏️ Create Your Own': '/buylist/movers',
      '🧠 Know Your Personality?': '/personality-test',
    };
    const path = base[s.title] || '/daily-report';
    if (s.itemId && (s.title === 'Lock Profit' || s.title === 'Weak Trend' || s.title === 'New High' || s.title === 'Over-Concentration')) {
      return `${path}?highlight=${encodeURIComponent(s.itemId)}`;
    }
    return path;
  };

  return (
    <div
      className="overflow-hidden py-2 mb-3 border-b border-border/30 cursor-pointer"
      onMouseEnter={() => { pausedRef.current = true; }}
      onMouseLeave={() => { pausedRef.current = false; }}
    >
      <div ref={scrollRef} className="flex items-center gap-4 overflow-hidden scrollbar-none">
        {duped.map((s, i) => (
          <React.Fragment key={i}>
            {i > 0 && <div className="w-px h-4 bg-border/30 shrink-0" />}
            <button
              onClick={() => navigate(getHref(s))}
              className="flex items-center gap-1.5 shrink-0 hover:opacity-80 transition-opacity"
            >
              <div className={cn('w-5 h-5 rounded flex items-center justify-center', s.iconBg)}>{s.icon}</div>
              <span className="text-[11px] font-semibold text-foreground whitespace-nowrap">{s.title}</span>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">{s.detail}</span>
            </button>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

/* ── Market Ticker (public / guest — broad market signals) ── */
function MarketTicker({ dbCounts, allMovers }: { dbCounts: { cards: number; cardsUpPct: number; cardsUp: number; cardsDown: number }; allMovers: MoverCard[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const posRef = useRef(0);
  const pausedRef = useRef(false);
  const navigate = useNavigate();

  const signals = useMemo(() => {
    interface Signal { icon: React.ReactNode; iconBg: string; title: string; detail: string; href: string; }
    const s: Signal[] = [];

    // Market sentiment
    const isGreedy = dbCounts.cardsUpPct >= 55;
    const isFearful = dbCounts.cardsUpPct < 45;
    const sentiment = isGreedy ? 'Greed' : isFearful ? 'Fear' : 'Neutral';
    const sentimentIcon = isGreedy ? <TrendingUp className="w-3 h-3 text-success" /> : isFearful ? <TrendingDown className="w-3 h-3 text-destructive" /> : <Zap className="w-3 h-3 text-warning" />;
    const sentimentBg = isGreedy ? 'bg-success/10' : isFearful ? 'bg-destructive/10' : 'bg-warning/10';
    s.push({ icon: sentimentIcon, iconBg: sentimentBg, title: 'Market Pulse', detail: `${sentiment} · ${dbCounts.cardsUpPct}% up`, href: '/pokeiq-daily' });

    // Cards tracked
    s.push({ icon: <CreditCard className="w-3 h-3 text-primary" />, iconBg: 'bg-primary/10', title: 'Cards Tracked', detail: `${dbCounts.cards.toLocaleString()} cards`, href: '/buylist/scanner' });

    // Gainers vs losers
    s.push({ icon: <ArrowUpRight className="w-3 h-3 text-success" />, iconBg: 'bg-success/10', title: 'Gainers', detail: `${dbCounts.cardsUp.toLocaleString()} cards trending up`, href: '/buylist/movers' });
    s.push({ icon: <ArrowDownRight className="w-3 h-3 text-destructive" />, iconBg: 'bg-destructive/10', title: 'Pullbacks', detail: `${dbCounts.cardsDown.toLocaleString()} cards trending down`, href: '/buylist/movers' });

    // Top movers from allMovers
    const gainers = allMovers.filter(m => (m.price_change_7d ?? 0) > 0).sort((a, b) => (b.price_change_7d ?? 0) - (a.price_change_7d ?? 0));
    const losers = allMovers.filter(m => (m.price_change_7d ?? 0) < 0).sort((a, b) => (a.price_change_7d ?? 0) - (b.price_change_7d ?? 0));

    for (const g of gainers.slice(0, 3)) {
      s.push({ icon: <TrendingUp className="w-3 h-3 text-success" />, iconBg: 'bg-success/10', title: 'Hot Mover', detail: `${g.name} +${(g.price_change_7d ?? 0).toFixed(1)}%`, href: `/buylist/mover/${g.card_id || g.id}` });
    }
    for (const l of losers.slice(0, 2)) {
      s.push({ icon: <TrendingDown className="w-3 h-3 text-destructive" />, iconBg: 'bg-destructive/10', title: 'Pullback', detail: `${l.name} ${(l.price_change_7d ?? 0).toFixed(1)}%`, href: `/buylist/mover/${l.card_id || l.id}` });
    }

    // Smart tracker teasers to encourage sign-up
    s.push({ icon: <Briefcase className="w-3 h-3 text-primary" />, iconBg: 'bg-primary/10', title: '📊 Portfolio Tracker', detail: 'Upload & track your collection value', href: '/' });
    s.push({ icon: <PlusCircle className="w-3 h-3 text-primary" />, iconBg: 'bg-primary/10', title: '⭐ Watchlist Alerts', detail: 'Get notified on price moves', href: '/auth' });
    s.push({ icon: <Lock className="w-3 h-3 text-success" />, iconBg: 'bg-success/10', title: '🔒 Profit Signals', detail: 'Know when to lock in gains', href: '/auth' });
    s.push({ icon: <AlertTriangle className="w-3 h-3 text-warning" />, iconBg: 'bg-warning/10', title: '⚠️ Risk Alerts', detail: 'Spot over-concentration early', href: '/auth' });

    // Greatest Hits & Create Your Own smart lists
    s.push({ icon: <Layers className="w-3 h-3 text-warning" />, iconBg: 'bg-warning/10', title: '🏆 Greatest Hits', detail: 'Top cards trending now', href: '/buylist/movers' });
    s.push({ icon: <PlusCircle className="w-3 h-3 text-primary" />, iconBg: 'bg-primary/10', title: '✏️ Create Your Own', detail: 'Build a custom smart list', href: '/buylist/movers' });

    // Personality test
    s.push({ icon: <Zap className="w-3 h-3 text-warning" />, iconBg: 'bg-warning/10', title: '🧠 Know Your Personality?', detail: 'Take the collector quiz', href: '/personality-test' });

    // Explore prompt
    s.push({ icon: <SlidersHorizontal className="w-3 h-3 text-primary" />, iconBg: 'bg-primary/10', title: 'Explore', detail: 'Browse all sets & cards', href: '/buylist/sets' });

    return s;
  }, [dbCounts, allMovers]);

  const duped = useMemo(() => [...signals, ...signals], [signals]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || signals.length === 0) return;
    let raf: number;
    const speed = 0.4;
    const tick = () => {
      if (!pausedRef.current) {
        posRef.current += speed;
        const half = el.scrollWidth / 2;
        if (half > 0 && posRef.current >= half) posRef.current = 0;
        el.scrollLeft = posRef.current;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [signals]);

  if (signals.length === 0) return null;

  return (
    <div
      className="overflow-hidden py-2 mb-3 border-b border-border/30 cursor-pointer"
      onMouseEnter={() => { pausedRef.current = true; }}
      onMouseLeave={() => { pausedRef.current = false; }}
    >
      <div ref={scrollRef} className="flex items-center gap-4 overflow-hidden scrollbar-none">
        {duped.map((s, i) => (
          <React.Fragment key={i}>
            {i > 0 && <div className="w-px h-4 bg-border/30 shrink-0" />}
            <button
              onClick={() => navigate(s.href)}
              className="flex items-center gap-1.5 shrink-0 hover:opacity-80 transition-opacity"
            >
              <div className={cn('w-5 h-5 rounded flex items-center justify-center', s.iconBg)}>{s.icon}</div>
              <span className="text-[11px] font-semibold text-foreground whitespace-nowrap">{s.title}</span>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">{s.detail}</span>
            </button>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

/* ── PokeBeach News Section (compact, for sidebar) ── */
function PokeBeachNews({ headlines }: { headlines: Headline[] }) {
  if (headlines.length === 0) return null;

  return (
    <div className="glass-card rounded-xl p-2.5 space-y-1 flex flex-col">
      <div className="flex items-center gap-2 mb-0.5">
        <Newspaper className="w-3.5 h-3.5 text-primary" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Latest News</span>
      </div>
      <div className="space-y-1 flex-1">
        {headlines.slice(0, 3).map((h, i) => (
          <a
            key={i}
            href={h.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-2 py-1.5 rounded-lg hover:bg-muted/30 transition-all group"
          >
            <div className="flex items-center gap-2 mb-0.5">
              <Badge variant="outline" className="text-[9px] px-1.5 py-0">{h.category}</Badge>
              <span className="text-[9px] text-muted-foreground">{h.date}</span>
            </div>
            <p className="text-xs font-semibold leading-snug group-hover:text-primary transition-colors">{h.title}</p>
          </a>
        ))}
      </div>
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground pt-1 border-t border-border/30">
        <ExternalLink className="w-3 h-3" />
        <span>via pokebeach.com</span>
      </div>
    </div>
  );
}

/* ── Watchlist Add Button (inline) ── */
function InlineWatchlistBtn({ card, isAuthed, onLoginPrompt }: { card: MoverCard; isAuthed: boolean; onLoginPrompt: () => void }) {
  const { isInWatchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const inList = isInWatchlist(card.card_id || card.id);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!isAuthed) { onLoginPrompt(); return; }
    if (inList) {
      removeFromWatchlist(card.card_id || card.id);
    } else {
      addToWatchlist({
        card_id: card.card_id || card.id,
        name: card.name,
        set_name: card.set_name,
        product_type: card.product_type,
        tcgplayer_id: card.tcgplayer_id,
        rarity: card.rarity,
      });
    }
  };

  return (
    <button onClick={handleClick} className={cn(
      'p-1 rounded-md transition-colors shrink-0',
      inList ? 'text-success hover:text-destructive' : 'text-muted-foreground hover:text-foreground'
    )} title={inList ? 'Remove from Watchlist' : 'Add to Watchlist'}>
      {inList ? <CheckCircle className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
    </button>
  );
}

/* ── Compact Movers List with + buttons ── */
function MoversList({ cards, label, color, isAuthed, onLoginPrompt, maxVisible = 10 }: { cards: MoverCard[]; label: string; color: string; isAuthed: boolean; onLoginPrompt: () => void; maxVisible?: number }) {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(maxVisible);
  if (cards.length === 0) return <p className="text-xs text-muted-foreground text-center py-4">No data</p>;

  const shown = cards.slice(0, visible);
  const hasMore = visible < cards.length;

  return (
    <div>
      <p className={cn('text-sm font-bold mt-6 mb-4', color)}>{label}</p>
      <div className="space-y-1">
        {shown.map((card, i) => {
          const imgUrl = getImageUrl(card);
          const change = card.price_change_7d ?? 0;
          const isUp = change >= 0;
          return (
            <div key={card.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/20 transition-colors group">
              <InlineWatchlistBtn card={card} isAuthed={isAuthed} onLoginPrompt={onLoginPrompt} />
              <span className="text-[10px] font-mono text-muted-foreground w-5 text-right shrink-0">{i + 1}</span>
              {imgUrl && (
                <img referrerPolicy="no-referrer" src={imgUrl} alt="" className="w-7 h-9 object-contain rounded shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
              <button
                onClick={() => navigate(`/buylist/mover/${card.card_id || card.id}`)}
                className="flex-1 min-w-0 text-left"
              >
                <p className="text-xs font-semibold truncate group-hover:text-primary transition-colors">{card.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{card.set_name}</p>
              </button>
              <div className="flex flex-col items-end shrink-0">
                <span className="text-xs font-bold tabular-nums">${(card.price ?? 0).toFixed(2)}</span>
                <span className={cn('text-[10px] font-bold tabular-nums flex items-center gap-0.5', isUp ? 'text-success' : 'text-destructive')}>
                  {isUp ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                  {isUp ? '+' : ''}{change.toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {hasMore && (
        <button onClick={() => setVisible(v => v + 10)}
          className="w-full mt-2 py-2.5 flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg border border-border/40 hover:bg-muted/20"
        >
          <ChevronDown className="w-3.5 h-3.5" /> Load More
        </button>
      )}
    </div>
  );
}

/* ── Watchlist Grid Card (matches GreatestHitsRow style) ── */
function WatchlistGridCard({ card, timePeriod, navigate }: { card: MoverCard; timePeriod: string; navigate: (path: string) => void }) {
  const imgUrl = getImageUrl(card);
  const change = getChangeForTime(card, timePeriod) ?? 0;
  const isUp = change >= 0;

  return (
    <button
      onClick={() => navigate(`/buylist/mover/${card.card_id || card.id}`)}
      className="glass-card rounded-xl p-3 flex flex-col items-center text-center hover:border-primary/30 transition-all group"
    >
      {imgUrl ? (
        <img referrerPolicy="no-referrer" src={imgUrl} alt="" className="w-20 h-28 object-contain rounded-lg mb-2"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      ) : (
        <div className="w-20 h-28 rounded-lg bg-muted flex items-center justify-center text-[9px] text-muted-foreground mb-2">No img</div>
      )}
      <p className="text-xs font-bold truncate max-w-full group-hover:text-primary transition-colors">{card.name}</p>
      <p className="text-[10px] text-muted-foreground truncate max-w-full mt-0.5">{card.set_name}</p>
      <div className="flex items-center gap-1 mt-2">
        {isUp ? <TrendingUp className="w-3.5 h-3.5 text-success" /> : <TrendingDown className="w-3.5 h-3.5 text-destructive" />}
        <span className={cn('text-sm font-black tabular-nums', isUp ? 'text-success' : 'text-destructive')}>
          {isUp ? '+' : ''}{change.toFixed(1)}%
        </span>
      </div>
      <span className="text-xs font-bold tabular-nums mt-1">${(card.price ?? 0).toFixed(2)}</span>
    </button>
  );
}

/* ── Watchlist Brief (post-login personalized view) ── */
function WatchlistBrief({ isAuthed }: { isAuthed: boolean }) {
  const { items, loading } = useWatchlist();
  const [watchlistData, setWatchlistData] = useState<MoverCard[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [timePeriod, setTimePeriod] = useState<'7d' | '30d' | '90d'>('7d');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthed || items.length === 0) return;
    setDataLoading(true);
    const cardIds = items.map(i => i.card_id);
    supabase
      .from('market_snapshots')
      .select('id, card_id, name, set_name, rarity, tcgplayer_id, price, price_change_7d, price_change_30d, price_change_90d, product_type')
      .in('card_id', cardIds)
      .then(({ data }) => {
        setWatchlistData((data ?? []) as unknown as MoverCard[]);
        setDataLoading(false);
      });
  }, [isAuthed, items]);

  const deduped = useMemo(() => {
    const seen = new Set<string>();
    return watchlistData.filter(c => {
      const key = c.card_id || c.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [watchlistData]);

  const sorted = useMemo(() => [...deduped].sort((a, b) =>
    Math.abs(getChangeForTime(b, timePeriod) ?? 0) - Math.abs(getChangeForTime(a, timePeriod) ?? 0)
  ).slice(0, 12), [deduped, timePeriod]);

  if (!isAuthed) return null;
  if (loading || dataLoading) return (
    <div className="flex items-center gap-2 justify-center py-6 text-muted-foreground">
      <Loader2 className="w-4 h-4 animate-spin" /><span className="text-xs">Loading your watchlist…</span>
    </div>
  );

  if (items.length === 0) {
    return (
      <div className="glass-card rounded-xl p-8 text-center space-y-4">
        <PlusCircle className="w-8 h-8 text-muted-foreground mx-auto" />
        <p className="text-sm font-semibold">Your watchlist is empty</p>
        <p className="text-xs text-muted-foreground">
          Use the <PlusCircle className="w-3 h-3 inline" /> button on any card below to add it to your personalized brief.
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate('/buylist/movers')}>
          <SlidersHorizontal className="w-4 h-4 mr-2" /> Browse Smart List
        </Button>
      </div>
    );
  }

  

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold">Your Watchlist ({items.length} items)</p>
          {items.length > 8 && (
            <Button variant="ghost" size="sm" onClick={() => navigate('/buylist/watchlist')} className="text-xs gap-1.5">
              View All →
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden mr-2">
            <button onClick={() => setViewMode('grid')} className={cn('p-1.5 transition-colors', viewMode === 'grid' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/30')}>
              <Layers className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setViewMode('list')} className={cn('p-1.5 transition-colors', viewMode === 'list' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/30')}>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
          {(['7d', '30d', '90d'] as const).map(t => (
            <button key={t} onClick={() => setTimePeriod(t)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                timePeriod === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted/30'
              )}
            >{t.toUpperCase()}</button>
          ))}
        </div>
      </div>
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {sorted.map(card => (
            <WatchlistGridCard key={card.card_id || card.id} card={card} timePeriod={timePeriod} navigate={navigate} />
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {sorted.map((card, i) => {
            const change = getChangeForTime(card, timePeriod) ?? 0;
            const isUp = change >= 0;
            const imgUrl = getImageUrl(card);
            return (
              <button key={card.card_id || card.id} onClick={() => navigate(`/buylist/mover/${card.card_id || card.id}`)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/20 transition-colors text-left group">
                {imgUrl && <img referrerPolicy="no-referrer" src={imgUrl} alt="" className="w-7 h-9 object-contain rounded shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate group-hover:text-primary transition-colors">{card.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{card.set_name}</p>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span className="text-xs font-bold tabular-nums">${(card.price ?? 0).toFixed(2)}</span>
                  <span className={cn('text-[10px] font-bold tabular-nums flex items-center gap-0.5', isUp ? 'text-success' : 'text-destructive')}>
                    {isUp ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                    {isUp ? '+' : ''}{change.toFixed(1)}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Greatest Hits Row (public / unsigned) ── */
function GreatestHitsRow({ isAuthed, onLoginPrompt }: { isAuthed: boolean; onLoginPrompt: () => void }) {
  const navigate = useNavigate();
  const [ghCards, setGhCards] = useState<MoverCard[]>([]);
  const [ghLoading, setGhLoading] = useState(true);

  // Fetch using the EXACT same params as Smart List > Greatest Hits
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const greatestHitsNames = ['charizard', 'umbreon', 'lugia', 'rayquaza'];
      const nameFilter = greatestHitsNames.map(n => `name.ilike.%${n}%`).join(',');
      const select = 'id, card_id, name, set_name, rarity, tcgplayer_id, price, price_change_7d, price_change_30d, price_change_90d, product_type, image_url';

      const [ghGainRes, ghPullRes] = await Promise.all([
        supabase.from('market_snapshots').select(select)
          .gt('price', 50).or(nameFilter)
          .not('price_change_7d', 'is', null)
          .gt('price_change_7d', 0).lte('price_change_7d', 50)
          .order('price_change_7d', { ascending: false }).limit(50),
        supabase.from('market_snapshots').select(select)
          .gt('price', 50).or(nameFilter)
          .not('price_change_7d', 'is', null)
          .lt('price_change_7d', 0).gte('price_change_7d', -35)
          .order('price_change_7d', { ascending: true }).limit(50),
      ]);

      if (cancelled) return;

      // Dedup by name (keep highest abs change per name) — same as Greatest Hits
      const all = [...(ghGainRes.data ?? []), ...(ghPullRes.data ?? [])] as MoverCard[];
      const nameMap = new Map<string, MoverCard>();
      for (const c of all) {
        const key = c.name.toLowerCase().trim();
        const existing = nameMap.get(key);
        if (!existing || Math.abs(c.price_change_7d ?? 0) > Math.abs(existing.price_change_7d ?? 0)) {
          nameMap.set(key, c);
        }
      }

      // Mix: 3 gainers, 2 downtrends from the deduped pool
      const deduped = Array.from(nameMap.values());
      const gainers = deduped.filter(c => (c.price_change_7d ?? 0) > 0).sort((a, b) => (b.price_change_7d ?? 0) - (a.price_change_7d ?? 0));
      const losers = deduped.filter(c => (c.price_change_7d ?? 0) < 0).sort((a, b) => (a.price_change_7d ?? 0) - (b.price_change_7d ?? 0));

      const mixed = [...gainers.slice(0, 3), ...losers.slice(0, 2)].slice(0, 5);
      setGhCards(mixed);
      setGhLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  if (ghLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /><span className="text-xs">Loading watchlist…</span>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {ghCards.map(card => {
          const imgUrl = getImageUrl(card);
          const change = card.price_change_7d ?? 0;
          const isUp = change >= 0;
          return (
            <button
              key={card.id}
              onClick={() => navigate(`/buylist/mover/${card.card_id || card.id}`)}
              className="glass-card rounded-xl p-3 flex flex-col items-center text-center hover:border-primary/30 transition-all group"
            >
              {imgUrl ? (
                <img referrerPolicy="no-referrer" src={imgUrl} alt="" className="w-20 h-28 object-contain rounded-lg mb-2"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <div className="w-20 h-28 rounded-lg bg-muted flex items-center justify-center text-[9px] text-muted-foreground mb-2">No img</div>
              )}
              <p className="text-xs font-bold truncate max-w-full group-hover:text-primary transition-colors">{card.name}</p>
              <p className="text-[10px] text-muted-foreground truncate max-w-full mt-0.5">{card.set_name}</p>
              <div className="flex items-center gap-1 mt-2">
                {isUp ? <TrendingUp className="w-3.5 h-3.5 text-success" /> : <TrendingDown className="w-3.5 h-3.5 text-destructive" />}
                <span className={cn('text-sm font-black tabular-nums', isUp ? 'text-success' : 'text-destructive')}>
                  {isUp ? '+' : ''}{change.toFixed(1)}%
                </span>
              </div>
              <span className="text-xs font-bold tabular-nums mt-1">${(card.price ?? 0).toFixed(2)}</span>
            </button>
          );
        })}

        {/* Customize Watchlist card */}
        <button
          onClick={onLoginPrompt}
          className="glass-card rounded-xl p-3 flex flex-col items-center justify-center text-center hover:border-primary/30 transition-all group border-dashed min-h-[180px]"
        >
          <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3 group-hover:bg-primary/10 transition-colors">
            <PlusCircle className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <p className="text-xs font-bold text-muted-foreground group-hover:text-foreground transition-colors">Customize</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Watchlist</p>
        </button>
      </div>

    </div>
  );
}

/* ── Login CTA (compact) ── */
function LoginCTA({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="flex items-center gap-4 glass-card rounded-xl px-5 py-4 border border-primary/20">
      <SlidersHorizontal className="w-5 h-5 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold">Customize Your Brief</p>
        <p className="text-[10px] text-muted-foreground">Sign in to build a personalized watchlist and track your picks.</p>
      </div>
      <Button size="sm" onClick={onLogin} className="gap-1.5 shrink-0">
        <LogIn className="w-3.5 h-3.5" /> Sign In
      </Button>
    </div>
  );
}

/* ── Tiered gainers: max 1 over 100%, 1 over 50%, 1 over 40%, rest 0-40% ── */
function applyGainerTiers(cards: MoverCard[]): MoverCard[] {
  const sorted = [...cards].sort((a, b) => (b.price_change_7d ?? 0) - (a.price_change_7d ?? 0));
  const result: MoverCard[] = [];
  let has100 = false, has50 = false, has40 = false;

  for (const c of sorted) {
    const ch = c.price_change_7d ?? 0;
    if (ch > 100) {
      if (!has100) { has100 = true; result.push(c); }
    } else if (ch > 50) {
      if (!has50) { has50 = true; result.push(c); }
    } else if (ch > 40) {
      if (!has40) { has40 = true; result.push(c); }
    } else if (ch > 0) {
      result.push(c);
    }
  }
  return result;
}

/* ── Simple Movers Section ── */
function MoversSection({ allMovers, isAuthed, onLoginPrompt }: { allMovers: MoverCard[]; isAuthed: boolean; onLoginPrompt: () => void }) {
  const gainers = useMemo(() =>
    applyGainerTiers(allMovers.filter(c => (c.price_change_7d ?? 0) > 0)),
    [allMovers]);

  const losers = useMemo(() =>
    allMovers.filter(c => (c.price_change_7d ?? 0) < 0).sort((a, b) => (a.price_change_7d ?? 0) - (b.price_change_7d ?? 0)),
    [allMovers]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <MoversList cards={gainers} label="▲ Top Gainers · 7D" color="text-success" isAuthed={isAuthed} onLoginPrompt={onLoginPrompt} maxVisible={5} />
      <MoversList cards={losers} label="▼ Top Pullbacks · 7D" color="text-warning" isAuthed={isAuthed} onLoginPrompt={onLoginPrompt} maxVisible={5} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════════════════════ */
export default function EditorsPicksTab() {
  const navigate = useNavigate();
  const [allMovers, setAllMovers] = useState<MoverCard[]>([]);
  const [headlines, setHeadlines] = useState<Headline[]>([]);
  const [dbCounts, setDbCounts] = useState<{ cards: number; cardsUpPct: number; cardsUp: number; cardsDown: number }>({ cards: 0, cardsUpPct: 50, cardsUp: 0, cardsDown: 0 });
  const [topSets, setTopSets] = useState<{ name: string; pct: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthed(!!session?.user && !session.user.is_anonymous);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthed(!!session?.user && !session.user.is_anonymous);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLoginPrompt = useCallback(() => navigate('/auth'), [navigate]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data: latestRow } = await supabase.from('market_snapshots')
        .select('snapshot_date').order('snapshot_date', { ascending: false }).limit(1).single();
      const latestDate = latestRow?.snapshot_date;

      const qGainers = supabase.from('market_snapshots')
        .select('id, card_id, name, set_name, rarity, tcgplayer_id, price, price_change_7d, price_change_30d, price_change_90d, product_type, image_url')
        .not('price_change_7d', 'is', null).gt('price', 5).gt('price_change_7d', 0).lte('price_change_7d', 2000)
        .not('product_type', 'ilike', '%graded%');
      const qLosers = supabase.from('market_snapshots')
        .select('id, card_id, name, set_name, rarity, tcgplayer_id, price, price_change_7d, price_change_30d, price_change_90d, product_type, image_url')
        .not('price_change_7d', 'is', null).gt('price', 5).lt('price_change_7d', 0).gte('price_change_7d', -2000)
        .not('product_type', 'ilike', '%graded%');
      const qCardCount = supabase.from('market_snapshots').select('id', { count: 'exact', head: true }).not('price', 'is', null).gt('price', 0).eq('product_type', 'card');
      const qCardsUp = supabase.from('market_snapshots').select('id', { count: 'exact', head: true }).not('price', 'is', null).gt('price', 0).eq('product_type', 'card').gt('price_change_7d', 0);
      const qCardsDown = supabase.from('market_snapshots').select('id', { count: 'exact', head: true }).not('price', 'is', null).gt('price', 0).eq('product_type', 'card').lt('price_change_7d', 0);

      if (latestDate) {
        qGainers.eq('snapshot_date', latestDate);
        qLosers.eq('snapshot_date', latestDate);
        qCardCount.eq('snapshot_date', latestDate);
        qCardsUp.eq('snapshot_date', latestDate);
        qCardsDown.eq('snapshot_date', latestDate);
      }

      const [allGainersRes, allLosersRes, cardCountRes, cardsUpRes, cardsDownRes, headlinesRes, setsRes] = await Promise.all([
        qGainers.order('price_change_7d', { ascending: false }).limit(50),
        qLosers.order('price_change_7d', { ascending: true }).limit(50),
        qCardCount,
        qCardsUp,
        qCardsDown,
        supabase.functions.invoke('scrape-pokebeach'),
        supabase.functions.invoke('justtcg', { body: { action: 'getSets' } }),
      ]);

      if (cancelled) return;

      const dedup = (arr: any[]) => {
        const seen = new Set<string>();
        return arr.filter(m => {
          const k = m.tcgplayer_id || m.card_id || m.id;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        }) as MoverCard[];
      };

      setAllMovers([...dedup(allGainersRes.data ?? []), ...dedup(allLosersRes.data ?? [])]);

      const cardTotal = cardCountRes.count ?? 0;
      const cardsUpTotal = cardsUpRes.count ?? 0;
      const cardsDownTotal = cardsDownRes.count ?? 0;
      const cardsMoving = cardsUpTotal + cardsDownTotal || 1;
      setDbCounts({
        cards: cardTotal,
        cardsUpPct: Math.round((cardsUpTotal / cardsMoving) * 100),
        cardsUp: cardsUpTotal,
        cardsDown: cardsDownTotal,
      });

      const pbData = headlinesRes.data;
      if (pbData?.success && Array.isArray(pbData.headlines)) {
        setHeadlines(pbData.headlines);
      }

      // Extract top set trends
      const setsData = Array.isArray(setsRes.data?.data) ? setsRes.data.data : [];
      const validSets = setsData
        .filter((s: any) => s.set_value_usd > 0 && s.set_value_change_7d_pct != null && !/^misc/i.test(s.name))
        .sort((a: any, b: any) => Math.abs(b.set_value_change_7d_pct) - Math.abs(a.set_value_change_7d_pct))
        .slice(0, 3)
        .map((s: any) => ({ name: s.name, pct: s.set_value_change_7d_pct }));
      setTopSets(validSets);

      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-16">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading The Pulse…</span>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      <Masthead title="Market News" />

      {/* Action Center Ticker — portfolio insights for logged in, market insights for guests */}
      {isAuthed ? <ActionTicker /> : <MarketTicker dbCounts={dbCounts} allMovers={allMovers} />}

      {/* Market Overview + Portfolio Snapshot + Latest News */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        <MarketOverviewBanner dbCounts={dbCounts} />
        <PortfolioSnapshotCard dbCounts={dbCounts} topSets={topSets} />
        <PokeBeachNews headlines={headlines} />
      </div>
      {/* Watchlist section */}
      <SectionRule title="Watchlist" icon={Zap} />
      <div className="mt-2">
        {isAuthed ? (
          <WatchlistBrief isAuthed={isAuthed} />
        ) : (
          <GreatestHitsRow isAuthed={isAuthed} onLoginPrompt={handleLoginPrompt} />
        )}
      </div>

      {/* Sets Explorer - top 5 */}
      <SectionRule title="Sets Explorer" icon={Layers} />
      <div className="mt-2"></div>
      <SetsExplorer initialLimit={5} />

      {/* Movers & Pullbacks */}
      <SectionRule title="Movers & Pullbacks" icon={Zap} />
      <MoversSection allMovers={allMovers} isAuthed={isAuthed} onLoginPrompt={handleLoginPrompt} />

      <div className="border-t border-border/30 mt-16 pt-5 text-center">
        <p className="text-[10px] text-muted-foreground">
          Data from local market snapshots · News via PokeBeach · Not financial advice · DYOR
        </p>
      </div>
    </div>
  );
}
