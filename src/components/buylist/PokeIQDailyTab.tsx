import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import PulseCard from './PulseCard';
import { useNavigate } from 'react-router-dom';
import {
  Loader2, TrendingUp, TrendingDown, Eye,
  Zap, LogIn, PlusCircle, CheckCircle,
  SlidersHorizontal, ChevronDown, Newspaper, ExternalLink, Layers, CreditCard,
  Briefcase, AlertTriangle, Lock, ArrowDownRight, ArrowUpRight, ShoppingCart,
  Flame, Star, ChevronLeft, ChevronRight, Heart,
} from 'lucide-react';
import sv151Logo from '@/assets/sv-151-logo.png';
import tcgplayerLogo from '@/assets/tcgplayer-logo.png';
import ebayLogo from '@/assets/ebay-logo.svg';
import svBaseLogo from '@/assets/set-scarlet-violet.png';
import paldeaEvolvedLogo from '@/assets/set-paldea-evolved.png';
import obsidianFlamesLogo from '@/assets/set-obsidian-flames.png';
import paradoxRiftLogo from '@/assets/set-paradox-rift.png';
import paldeanFatesLogo from '@/assets/set-paldean-fates.png';
import temporalForcesLogo from '@/assets/set-temporal-forces.png';
import fusionStrikeLogo from '@/assets/set-fusion-strike.png';
import astralRadianceLogo from '@/assets/set-astral-radiance.png';
import lostOriginLogo from '@/assets/set-lost-origin.png';
import crownZenithLogo from '@/assets/set-crown-zenith.png';
import silverTempestLogo from '@/assets/set-silver-tempest.png';
import evolvingSkiesLogo from '@/assets/set-evolving-skies.png';
import chillingReignLogo from '@/assets/set-chilling-reign.png';
import brilliantStarsLogo from '@/assets/set-brilliant-stars.png';
import celebrationsLogo from '@/assets/set-celebrations.png';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MoverCard, getImageUrl, getChangeForTime, getBuyScore, getRecommendation } from './shared/signalHelpers';
import { useWatchlist } from '@/hooks/useWatchlist';
import SetsExplorer from './SetsExplorer';
import EraTimeline from './EraTimeline';

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
function Masthead({ title, subtitle }: { title: string; subtitle?: string }) {
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  return (
    <div className="text-center pb-2 mb-1 border-b border-border/50">
      <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-0.5">{dateStr}</p>
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{title}</h1>
      <p className="text-xs text-muted-foreground mt-0.5">{subtitle ?? 'Smart Signals, Clear Action'}</p>
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

/* ── Half-Dial Gauge with gradient (compact) ── */
function SentimentGauge({ upPct, upCount, downCount, label }: { upPct: number; upCount: number; downCount: number; label: string }) {
  const angle = ((upPct / 100) * 180) - 90;
  const isGreedy = upPct >= 55;
  const isFearful = upPct < 45;
  const sentimentCaption = isGreedy
    ? 'Buyers control the market'
    : isFearful
    ? 'Sellers control the market'
    : 'Market is holding steady';
  const gaugeId = `gauge-${label.replace(/\s/g, '')}`;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 240 155" className="w-40 h-[90px]">
        <defs>
          <linearGradient id={gaugeId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--destructive))" />
            <stop offset="35%" stopColor="hsl(var(--destructive))" stopOpacity="0.6" />
            <stop offset="50%" stopColor="hsl(var(--warning))" />
            <stop offset="65%" stopColor="hsl(var(--success))" stopOpacity="0.6" />
            <stop offset="100%" stopColor="hsl(var(--success))" />
          </linearGradient>
        </defs>
        <path d="M 20 125 A 100 100 0 0 1 220 125" fill="none" stroke="hsl(var(--muted)/0.3)" strokeWidth="18" strokeLinecap="round" />
        <path d="M 20 125 A 100 100 0 0 1 220 125" fill="none" stroke={`url(#${gaugeId})`} strokeWidth="18" strokeLinecap="round" />
        <g transform={`rotate(${angle}, 120, 125)`}>
          <line x1="120" y1="125" x2="120" y2="65" stroke="hsl(var(--foreground))" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="120" cy="125" r="4" fill="hsl(var(--foreground))" />
        </g>
        <text x="20" y="145" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="8" opacity="0.7">Fear</text>
        <text x="220" y="145" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="8" opacity="0.7">Greed</text>
      </svg>
      <p className="text-[11px] text-muted-foreground text-center max-w-[160px] leading-tight">{sentimentCaption}</p>
      <div className="flex items-center gap-2 mt-0.5">
        <span className="text-[11px] tabular-nums text-success font-semibold">↑ {upCount.toLocaleString()}</span>
        <span className="text-[11px] tabular-nums text-destructive font-semibold">↓ {downCount.toLocaleString()}</span>
      </div>
    </div>
  );
}

/* ── Market Overview Banner ── */
function MarketOverviewBanner({ dbCounts }: { dbCounts: { cards: number; cardsUpPct: number; cardsUp: number; cardsDown: number } }) {
  return (
    <div className="glass-card rounded-xl p-2 space-y-0.5 flex flex-col h-full">
      <div className="flex items-center gap-2">
        <Zap className="w-3.5 h-3.5 text-warning" />
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Market Pulse</span>
      </div>
      <div className="flex flex-col items-center text-center flex-1 justify-center">
        <SentimentGauge upPct={dbCounts.cardsUpPct} upCount={dbCounts.cardsUp} downCount={dbCounts.cardsDown} label="7D Trend" />
        <div className="flex items-center gap-1.5">
          <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">{dbCounts.cards.toLocaleString()} cards tracked</span>
        </div>
      </div>
    </div>
  );
}

/* ── Sets Snapshot Card (replaces Portfolio Snapshot in PokeIQ Daily) ── */
function SetsSnapshotCard({ topSets }: { topSets?: { name: string; pct: number; value: number }[] }) {
  const setsRef = useRef<HTMLDivElement>(null);

  const scrollToSets = () => {
    const el = document.getElementById('sets-explorer-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  // Show up to 5 sets
  const displaySets = topSets?.slice(0, 4) ?? [];

  return (
    <div className="glass-card rounded-xl p-2 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-1">
        <Layers className="w-3.5 h-3.5 text-primary" />
        <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Sets Snapshot · 7D</span>
      </div>
      <div className="flex-1 flex flex-col justify-center space-y-0.5 px-0.5">
        {displaySets.length > 0 ? displaySets.map((s, i) => (
          <button
            key={i}
            onClick={scrollToSets}
            className="flex items-center justify-between py-1 px-1.5 rounded-md hover:bg-muted/30 transition-colors"
          >
            <span className="text-sm text-foreground font-medium truncate max-w-[200px]">{s.name}</span>
            <span className="flex items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground tabular-nums">${s.value >= 1000 ? `${(s.value / 1000).toFixed(1)}k` : s.value.toFixed(0)}</span>
              <span className={cn('text-xs font-bold tabular-nums', s.pct >= 0 ? 'text-success' : 'text-destructive')}>
                {s.pct >= 0 ? '+' : ''}{s.pct.toFixed(1)}%
              </span>
            </span>
          </button>
        )) : (
          <p className="text-xs text-muted-foreground text-center py-2">Loading sets…</p>
        )}
      </div>
      <button onClick={scrollToSets} className="text-[11px] font-semibold text-primary hover:underline pt-1 border-t border-border/30 text-center">
        View All Sets →
      </button>
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

    // Play Pull or Pass CTA — always shown in the SECOND slot (inserted after sort)
    const pullOrPassSignal: Signal = {
      weight: 0,
      icon: <Heart className="w-3 h-3 text-primary" />,
      iconBg: 'bg-gradient-to-r from-primary/25 via-cyan-400/25 to-purple-500/25',
      title: 'Play Pull or Pass',
      detail: 'Swipe cards · build your DNA',
    };

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

    const sortedSignals = [...signals].sort((a, b) => b.weight - a.weight);
    // Force Pull or Pass into the 2nd position
    const withPoP = [...sortedSignals];
    withPoP.splice(1, 0, pullOrPassSignal);
    return withPoP.slice(0, 15);
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
      '🏆 Greatest Hits': '/smartlist',
      '✏️ Create Your Own': '/smartlist',
      '🧠 Know Your Personality?': '/personality-test',
      'Play Pull or Pass': '/swipe',
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
              className={cn(
                'flex items-center gap-1.5 shrink-0 hover:opacity-80 transition-opacity',
                s.title === 'Play Pull or Pass' && 'ring-1 ring-primary/40 rounded-full px-2.5 py-1 bg-gradient-to-r from-primary/15 via-cyan-400/15 to-purple-500/15 shadow-[0_0_10px_hsl(var(--primary)/0.15)]'
              )}
            >
              <div className={cn('w-5 h-5 rounded flex items-center justify-center', s.iconBg)}>{s.icon}</div>
              <span
                className="text-[13px] font-semibold whitespace-nowrap"
                style={s.title === 'Play Pull or Pass' ? {
                  backgroundImage: 'linear-gradient(100deg, hsl(var(--primary)) 0%, #b8fff0 25%, hsl(var(--primary)) 50%, #c7a8ff 75%, hsl(var(--primary)) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                } : undefined}
              >{s.title}</span>
              <span className="text-xs text-muted-foreground whitespace-nowrap">{s.detail}</span>
            </button>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

/* ── Market Ticker (public / guest — broad market signals) ── */
function MarketTicker({ dbCounts, allMovers, topSets, greatestHitsData }: { dbCounts: { cards: number; cardsUpPct: number; cardsUp: number; cardsDown: number }; allMovers: MoverCard[]; topSets?: { name: string; pct: number; value: number }[]; greatestHitsData?: { name: string; avgChange7d: number; count: number }[] }) {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const posRef = useRef(0);
  const pausedRef = useRef(false);

  const signals = useMemo(() => {
    interface Signal { icon: React.ReactNode; iconBg: string; title: string; detail: string; href?: string; }
    const s: Signal[] = [];

    // Market sentiment
    const isGreedy = dbCounts.cardsUpPct >= 55;
    const isFearful = dbCounts.cardsUpPct < 45;
    const sentiment = isGreedy ? 'Buyers' : isFearful ? 'Sellers' : 'Neutral';
    const sentimentIcon = isGreedy ? <TrendingUp className="w-3.5 h-3.5 text-success" /> : isFearful ? <TrendingDown className="w-3.5 h-3.5 text-destructive" /> : <Zap className="w-3.5 h-3.5 text-warning" />;
    const sentimentBg = isGreedy ? 'bg-success/10' : isFearful ? 'bg-destructive/10' : 'bg-warning/10';
    s.push({ icon: sentimentIcon, iconBg: sentimentBg, title: 'Market Pulse', detail: `${sentiment} · ${dbCounts.cardsUpPct}% up` });

    // Play Pull or Pass CTA — always shown in the SECOND slot
    s.push({
      icon: <Heart className="w-3.5 h-3.5 text-primary" />,
      iconBg: 'bg-gradient-to-r from-primary/30 via-cyan-400/30 to-purple-500/30',
      title: 'Play Pull or Pass',
      detail: 'Discover your collecting taste →',
      href: '/swipe',
    });

    // Top gaining and top losing set — placed early for visibility
    if (topSets && topSets.length > 0) {
      const sortedByPct = [...topSets].sort((a, b) => b.pct - a.pct);
      const topGainer = sortedByPct[0];
      const topLoser = sortedByPct[sortedByPct.length - 1];
      if (topGainer && topGainer.pct > 0) {
        const valueStr = topGainer.value >= 1000 ? `$${(topGainer.value / 1000).toFixed(1)}k` : `$${topGainer.value.toFixed(0)}`;
        s.push({
          icon: <TrendingUp className="w-3.5 h-3.5 text-success" />,
          iconBg: 'bg-success/10',
          title: `🔥 ${topGainer.name}`,
          detail: `Top Gainer · +${topGainer.pct.toFixed(1)}% 7D · ${valueStr}`,
          href: '/buylist/sets',
        });
      }
      if (topLoser && topLoser.pct < 0) {
        const valueStr = topLoser.value >= 1000 ? `$${(topLoser.value / 1000).toFixed(1)}k` : `$${topLoser.value.toFixed(0)}`;
        s.push({
          icon: <TrendingDown className="w-3.5 h-3.5 text-destructive" />,
          iconBg: 'bg-destructive/10',
          title: `📉 ${topLoser.name}`,
          detail: `Top Loser · ${topLoser.pct.toFixed(1)}% 7D · ${valueStr}`,
          href: '/buylist/sets',
        });
      }
    }

    // Greatest Hits index insights — mix up and down
    if (greatestHitsData && greatestHitsData.length > 0) {
      for (const gh of greatestHitsData.slice(0, 4)) {
        const ghUp = gh.avgChange7d >= 0;
        s.push({
          icon: ghUp ? <TrendingUp className="w-3.5 h-3.5 text-success" /> : <TrendingDown className="w-3.5 h-3.5 text-destructive" />,
          iconBg: ghUp ? 'bg-success/10' : 'bg-destructive/10',
          title: `${gh.name} Index`,
          detail: `${ghUp ? '+' : ''}${gh.avgChange7d.toFixed(1)}% avg · ${gh.count} cards`,
        });
      }
    }

    // Prime Window sets with real 30D data
    const primeSetNames = PRIME_SETS.slice(0, 2);
    if (topSets && topSets.length > 0) {
      for (const ps of primeSetNames) {
        const matchedSet = topSets.find(ts => ts.name.toLowerCase().includes(ps.setKey.split(' ').slice(-1)[0]));
        const pct = matchedSet?.pct;
        const detail = pct != null ? `Prime Window · ${pct >= 0 ? '+' : ''}${pct.toFixed(1)}% 7D` : `In the 2-3yr sweet spot`;
        s.push({
          icon: <Star className="w-3.5 h-3.5 text-warning" />,
          iconBg: 'bg-warning/10',
          title: `${ps.name}`,
          detail,
        });
      }
    }

    // A pullback card from allMovers (notable decline)
    const pullbackCard = allMovers
      .filter(m => (m.price_change_7d ?? 0) < -3 && (m.price ?? 0) > 30)
      .sort((a, b) => (a.price_change_7d ?? 0) - (b.price_change_7d ?? 0))[0];
    if (pullbackCard) {
      s.push({
        icon: <TrendingDown className="w-3.5 h-3.5 text-destructive" />,
        iconBg: 'bg-destructive/10',
        title: 'Notable Pullback',
        detail: `${pullbackCard.name} ${(pullbackCard.price_change_7d ?? 0).toFixed(1)}% · $${(pullbackCard.price ?? 0).toFixed(0)}`,
      });
    }

    // A spotlight card from allMovers (top gainer over $30)
    const spotlightCard = allMovers
      .filter(m => (m.price_change_7d ?? 0) > 3 && (m.price ?? 0) > 30)
      .sort((a, b) => (b.price_change_7d ?? 0) - (a.price_change_7d ?? 0))[0];
    if (spotlightCard) {
      s.push({
        icon: <Flame className="w-3.5 h-3.5 text-warning" />,
        iconBg: 'bg-warning/10',
        title: 'Spotlight Pick',
        detail: `${spotlightCard.name} +${(spotlightCard.price_change_7d ?? 0).toFixed(1)}% · $${(spotlightCard.price ?? 0).toFixed(0)}`,
      });
    }

    // Cards tracked
    s.push({ icon: <CreditCard className="w-3.5 h-3.5 text-primary" />, iconBg: 'bg-primary/10', title: 'Cards Tracked', detail: `${dbCounts.cards.toLocaleString()} cards in the index` });

    // Signup CTA
    s.push({ icon: <Star className="w-3.5 h-3.5 text-primary" />, iconBg: 'bg-primary/10', title: 'Customize The Pulse', detail: 'Sign up free →' });

    return s;
  }, [dbCounts, allMovers, topSets, greatestHitsData]);

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
      className="overflow-hidden py-2 mb-3 border-b border-border/30"
      onMouseEnter={() => { pausedRef.current = true; }}
      onMouseLeave={() => { pausedRef.current = false; }}
    >
      <div ref={scrollRef} className="flex items-center gap-4 overflow-hidden scrollbar-none">
        {duped.map((s, i) => (
          <React.Fragment key={i}>
            {i > 0 && <div className="w-px h-4 bg-border/30 shrink-0" />}
            <button
              onClick={() => s.href && navigate(s.href)}
              className={cn(
                'flex items-center gap-1.5 shrink-0 hover:opacity-80 transition-opacity',
                s.title === 'Play Pull or Pass' && 'ring-1 ring-primary/40 rounded-full px-2.5 py-1 bg-gradient-to-r from-primary/15 via-cyan-400/15 to-purple-500/15 shadow-[0_0_10px_hsl(var(--primary)/0.15)]'
              )}
            >
              <div className={cn('w-5 h-5 rounded flex items-center justify-center', s.iconBg)}>{s.icon}</div>
              <span
                className="text-[13px] font-semibold whitespace-nowrap"
                style={s.title === 'Play Pull or Pass' ? {
                  backgroundImage: 'linear-gradient(100deg, hsl(var(--primary)) 0%, #b8fff0 25%, hsl(var(--primary)) 50%, #c7a8ff 75%, hsl(var(--primary)) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                } : undefined}
              >{s.title}</span>
              <span className="text-xs text-muted-foreground whitespace-nowrap">{s.detail}</span>
            </button>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

/* ── PokeBeach News Section (compact, wider column) ── */
function PokeBeachNews({ headlines }: { headlines: Headline[] }) {
  if (headlines.length === 0) return null;

  return (
    <div className="glass-card rounded-xl p-2 space-y-0.5 flex flex-col">
      <div className="flex items-center gap-2 mb-0.5">
        <Newspaper className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Latest News</span>
      </div>
      <div className="flex-1 divide-y divide-border/60">
       {headlines.slice(0, 3).map((h, i) => (
          <a
            key={i}
            href={h.url}
            target="_blank"
            rel="noopener noreferrer"
             data-mintd-allow="true"
            className="block px-1.5 py-1.5 hover:bg-muted/30 transition-all group"
          >
            <div className="flex items-center gap-2 mb-0.5">
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0">{h.category}</Badge>
              <span className="text-[10px] text-muted-foreground shrink-0">{h.date}</span>
            </div>
            <p className="text-[13px] font-semibold leading-snug group-hover:text-primary transition-colors truncate">{h.title}</p>
          </a>
        ))}
      </div>
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground pt-0.5 border-t border-border/30 justify-end">
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

  const shown = cards.slice(0, visible);
  const hasMore = visible < cards.length;

  return (
    <div>
      <p className={cn('text-base font-bold mt-6 mb-4', color)}>{label}</p>
      {cards.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">No data</p>
      ) : (
        <>
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
        </>
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
        <Button variant="outline" size="sm" onClick={() => navigate('/smartlist')}>
          <SlidersHorizontal className="w-4 h-4 mr-2" /> Browse Smart List
        </Button>
      </div>
    );
  }



  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold">Your Items ({items.length})</p>
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

/* ── Prime Window — Sets 2-3 years old, breaking-news style ── */
const PRIME_SETS = [
  { name: 'Crown Zenith', age: '2 yrs', setKey: 'crown zenith' },
  { name: '151', age: '2 yrs', setKey: 'scarlet & violet 151' },
  { name: 'Paldea Evolved', age: '2 yrs', setKey: 'paldea evolved' },
  { name: 'Obsidian Flames', age: '2 yrs', setKey: 'obsidian flames' },
  { name: 'Scarlet & Violet', age: '2 yrs', setKey: 'scarlet & violet base set' },
  { name: 'Paradox Rift', age: '2 yrs', setKey: 'paradox rift' },
  { name: 'Paldean Fates', age: '2 yrs', setKey: 'paldean fates' },
  { name: 'Temporal Forces', age: '2 yrs', setKey: 'temporal forces' },
  { name: 'Evolving Skies', age: '3 yrs', setKey: 'evolving skies' },
  { name: 'Celebrations', age: '3 yrs', setKey: 'celebrations' },
  { name: 'Fusion Strike', age: '3 yrs', setKey: 'fusion strike' },
  { name: 'Brilliant Stars', age: '3 yrs', setKey: 'brilliant stars' },
  { name: 'Astral Radiance', age: '3 yrs', setKey: 'astral radiance' },
  { name: 'Lost Origin', age: '3 yrs', setKey: 'lost origin' },
  { name: 'Silver Tempest', age: '3 yrs', setKey: 'silver tempest' },
];

/* Strip common set prefixes like "SV01:", "SWSH08:", "SV:" for fuzzy matching */
function stripSetPrefix(name: string): string {
  return name.replace(/^(sv\d*(?:\.\d+)?|swsh\d*(?:\.\d+)?|me\d*|sve|mee|sm\d*|xy\d*|bw\d*):\s*/i, '').toLowerCase();
}

function PrimeWindowWidget() {
  const navigate = useNavigate();
  const [setData, setSetData] = useState<{ name: string; age: string; logoUrl: string | null; pct7d: number | null; pct30d: number | null }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [setsRes, pptSetsRes] = await Promise.all([
        supabase.functions.invoke('justtcg', { body: { action: 'getSets' } }),
        supabase.functions.invoke('pokemon-price-tracker', { body: { action: 'getSets', params: { language: 'english', limit: 200 } } }),
      ]);
      const setsApi = Array.isArray(setsRes.data?.data) ? setsRes.data.data : [];
      const pptSets = Array.isArray(pptSetsRes.data?.data) ? pptSetsRes.data.data : [];

      if (cancelled) return;

      const result = PRIME_SETS.map(ps => {
        // Match by stripping prefixes (e.g. "SV01: Scarlet & Violet Base Set" → "scarlet & violet base set")
        const matchSet = (s: any) => {
          const raw = s.name?.toLowerCase() || '';
          const stripped = stripSetPrefix(raw);
          // Exact stripped match
          if (stripped === ps.setKey) return true;
          // Partial match but exclude trainer gallery / classic collection sub-sets
          if (stripped.includes(ps.setKey) && !stripped.includes('trainer gallery') && !stripped.includes('classic collection') && !stripped.includes('promo') && !stripped.includes('energies') && !stripped.includes('galarian gallery')) return true;
          return false;
        };
        const apiMatch = setsApi.find(matchSet);
        const pptMatch = pptSets.find(matchSet);
        const LOCAL_LOGOS: Record<string, string> = {
          'crown zenith': crownZenithLogo,
          'scarlet & violet 151': sv151Logo,
          'scarlet & violet base set': svBaseLogo,
          'paldea evolved': paldeaEvolvedLogo,
          'obsidian flames': obsidianFlamesLogo,
          'paradox rift': paradoxRiftLogo,
          'paldean fates': paldeanFatesLogo,
          'temporal forces': temporalForcesLogo,
          'fusion strike': fusionStrikeLogo,
          'astral radiance': astralRadianceLogo,
          'lost origin': lostOriginLogo,
          'silver tempest': silverTempestLogo,
          'evolving skies': evolvingSkiesLogo,
          'chilling reign': chillingReignLogo,
          'brilliant stars': brilliantStarsLogo,
          'celebrations': celebrationsLogo,
        };
        let logoUrl: string | null = LOCAL_LOGOS[ps.setKey] || null;
        if (!logoUrl) {
          logoUrl = pptMatch?.imageCdnUrl800 || pptMatch?.imageCdnUrl400 || pptMatch?.logoUrl || pptMatch?.logo_url || null;
          if (!logoUrl) {
            logoUrl = apiMatch?.logo_url || null;
          }
        }
        return {
          name: ps.name,
          age: ps.age,
          logoUrl,
          pct7d: apiMatch?.set_value_change_7d_pct ?? null,
          pct30d: apiMatch?.set_value_change_30d_pct ?? null,
        };
      });

      // Fallback: any set missing 7d/30d data → fetch median changes from market_snapshots
      const needFallback = result.some(r => r.pct7d == null || r.pct30d == null);
      if (needFallback) {
        try {
          const { data: stats } = await supabase.rpc('get_set_stats');
          if (Array.isArray(stats)) {
            for (let i = 0; i < result.length; i++) {
              const r = result[i];
              if (r.pct7d != null && r.pct30d != null) continue;
              const setKey = PRIME_SETS[i].setKey;
              const match = stats.find((s: any) => {
                const stripped = stripSetPrefix(s.set_name?.toLowerCase() || '');
                if (stripped === setKey) return true;
                if (stripped.includes(setKey) && !stripped.includes('trainer gallery') && !stripped.includes('classic collection') && !stripped.includes('galarian gallery')) return true;
                return false;
              });
              if (match) {
                if (r.pct7d == null && match.median_7d != null) r.pct7d = Number(match.median_7d);
                if (r.pct30d == null && match.median_30d != null) r.pct30d = Number(match.median_30d);
              }
            }
          }
        } catch (e) { /* ignore */ }
      }

      setSetData(result);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(3);

  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth;
      setPerPage(w < 640 ? 1 : w < 1024 ? 2 : 3);
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const totalPages = Math.ceil(setData.length / perPage);
  const visible = setData.slice(page * perPage, page * perPage + perPage);

  return (
    <div className="glass-card rounded-xl p-3 flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Flame className="w-4 h-4 text-warning shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground shrink-0">Prime Window</span>
          <span className="hidden lg:inline text-[10px] text-muted-foreground truncate">· Out-of-print sets entering their prime investment window</span>
        </div>
        {/* Desktop: pagination arrows */}
        <div className="hidden sm:flex items-center gap-1 shrink-0">
          <span className="text-[9px] text-muted-foreground tabular-nums mr-1">{page + 1}/{totalPages}</span>
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-1 rounded-lg hover:bg-muted/40 transition-colors text-muted-foreground hover:text-foreground disabled:opacity-30">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="p-1 rounded-lg hover:bg-muted/40 transition-colors text-muted-foreground hover:text-foreground disabled:opacity-30">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground mb-1.5 lg:hidden">Out-of-print sets entering their prime investment window</p>
      {loading ? (
        <div className="flex-1 flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          {/* Mobile: horizontal scroll */}
          <div className="sm:hidden flex-1 min-h-0 flex gap-2 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1 touch-pan-x">
            {setData.map((s, i) => (
              <button
                key={i}
                onClick={() => navigate(`/buylist/scanner?search=${encodeURIComponent(s.name)}&type=all`)}
                className="flex flex-col items-center justify-center text-center p-1 rounded-xl hover:bg-muted/20 transition-all group shrink-0 w-[calc((100%-1rem)/3)]"
              >
                <div className="w-full h-14 flex items-center justify-center overflow-hidden rounded-lg mb-1">
                  {s.logoUrl ? (
                    <img referrerPolicy="no-referrer" src={s.logoUrl} alt={s.name} className="max-w-full max-h-full object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <Layers className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <p className="text-[10px] font-bold truncate max-w-full group-hover:text-primary transition-colors leading-tight">{s.name}</p>
                <p className="text-[9px] text-muted-foreground">{s.age} old</p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className={cn('text-xs font-black tabular-nums', (s.pct30d ?? s.pct7d) != null ? ((s.pct30d ?? s.pct7d ?? 0) >= 0 ? 'text-success' : 'text-destructive') : 'text-muted-foreground/40')}>
                    {(s.pct30d ?? s.pct7d) != null ? `${(s.pct30d ?? s.pct7d ?? 0) >= 0 ? '+' : ''}${(s.pct30d ?? s.pct7d ?? 0).toFixed(1)}%` : '—'}
                  </span>
                  <span className="text-[8px] text-muted-foreground">{s.pct30d != null ? '30D' : '7D'}</span>
                </div>
              </button>
            ))}
          </div>
          {/* Desktop: paginated grid */}
          <div className="hidden sm:flex flex-1 min-h-0 gap-2">
            {visible.map((s, i) => (
              <button
                key={i}
                onClick={() => navigate(`/buylist/scanner?search=${encodeURIComponent(s.name)}&type=all`)}
                className="flex flex-col items-center justify-center text-center p-1 rounded-xl hover:bg-muted/20 transition-all group flex-1 min-h-0"
              >
                <div className="w-full flex-1 min-h-0 flex items-center justify-center overflow-hidden rounded-lg mb-1">
                  {s.logoUrl ? (
                    <img referrerPolicy="no-referrer" src={s.logoUrl} alt={s.name} className="max-w-full max-h-full object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <Layers className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <p className="text-xs font-bold truncate max-w-full group-hover:text-primary transition-colors leading-tight">{s.name}</p>
                <p className="text-[9px] text-muted-foreground">{s.age} old</p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className={cn('text-sm font-black tabular-nums', (s.pct30d ?? s.pct7d) != null ? ((s.pct30d ?? s.pct7d ?? 0) >= 0 ? 'text-success' : 'text-destructive') : 'text-muted-foreground/40')}>
                    {(s.pct30d ?? s.pct7d) != null ? `${(s.pct30d ?? s.pct7d ?? 0) >= 0 ? '+' : ''}${(s.pct30d ?? s.pct7d ?? 0).toFixed(1)}%` : '—'}
                  </span>
                  <span className="text-[8px] text-muted-foreground">{s.pct30d != null ? '30D' : '7D'}</span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Greatest Hits Index — iconic Pokemon name trackers ── */
const GREAT_HITS_NAMES = ['umbreon', 'charizard', 'eevee', 'pikachu', 'rayquaza', 'mewtwo'];

function GreatestHitsIndex() {
  const navigate = useNavigate();
  const [indexData, setIndexData] = useState<{ name: string; avgChange7d: number; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Try reading from cache first
      const { data: cached } = await supabase
        .from('greatest_hits_cache')
        .select('pokemon_name, avg_change_7d, card_count, snapshot_date')
        .order('snapshot_date', { ascending: false })
        .limit(GREAT_HITS_NAMES.length);

      if (!cancelled && cached && cached.length >= GREAT_HITS_NAMES.length) {
        // Use cached data — map to display format
        const results = GREAT_HITS_NAMES.map(name => {
          const row = cached.find(c => c.pokemon_name === name);
          return {
            name: name.charAt(0).toUpperCase() + name.slice(1),
            avgChange7d: row?.avg_change_7d ?? 0,
            count: row?.card_count ?? 0,
          };
        }).sort((a, b) => b.avgChange7d - a.avgChange7d);
        setIndexData(results);
        setLoading(false);

        // Trigger background refresh (fire & forget) so cache stays fresh
        supabase.functions.invoke('compute-greatest-hits').catch(() => {});
        return;
      }

      // No cache — compute inline (first load / cold start)
      const { data: latestRow } = await supabase.from('market_snapshots')
        .select('snapshot_date').eq('product_type', 'card').order('snapshot_date', { ascending: false }).limit(1).single();
      const latestDate = latestRow?.snapshot_date;

      const results = await Promise.all(
        GREAT_HITS_NAMES.map(async (pokeName) => {
          let query = supabase
            .from('market_snapshots')
            .select('price_change_7d')
            .ilike('name', `%${pokeName}%`)
            .not('price_change_7d', 'is', null)
            .eq('product_type', 'card');
          if (latestDate) query = query.eq('snapshot_date', latestDate);
          const { data } = await query;
          const changes = (data ?? []).map(c => c.price_change_7d as number).filter(v => v != null);
          const avg = changes.length > 0 ? changes.reduce((a, b) => a + b, 0) / changes.length : 0;
          return {
            name: pokeName.charAt(0).toUpperCase() + pokeName.slice(1),
            avgChange7d: avg,
            count: changes.length,
          };
        })
      );

      if (cancelled) return;
      setIndexData([...results].sort((a, b) => b.avgChange7d - a.avgChange7d));
      setLoading(false);

      // Cache the results for next time
      supabase.functions.invoke('compute-greatest-hits').catch(() => {});
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="glass-card rounded-xl p-2 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-1">
        <Star className="w-4 h-4 text-primary" />
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Greatest Hits Index</span>
      </div>
      <p className="text-[10px] text-muted-foreground mb-1">Avg 7-day price movement across all cards featuring these Pokémon</p>
      {loading ? (
        <div className="flex-1 flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="flex-1 flex flex-col">
          <div className="grid grid-cols-[1fr_60px_50px] gap-1 px-2 pb-0.5 border-b border-border/40">
            <span className="text-[9px] font-semibold uppercase text-muted-foreground">Pokémon</span>
            <span className="text-[9px] font-semibold uppercase text-muted-foreground text-right">7D Avg</span>
            <span className="text-[9px] font-semibold uppercase text-muted-foreground text-right">Cards</span>
          </div>
          <div className="flex-1 flex flex-col justify-evenly">
            {indexData.map((row, i) => (
              <button
                key={i}
                onClick={() => navigate(`/buylist/scanner?search=${row.name.toLowerCase()}`)}
                className="w-full grid grid-cols-[1fr_60px_50px] gap-1 px-2 py-0.5 rounded-md hover:bg-muted/30 transition-colors items-center"
              >
                <span className="text-xs font-bold text-left">{row.name}</span>
                <span className={cn('text-xs font-bold tabular-nums text-right', row.avgChange7d >= 0 ? 'text-success' : 'text-destructive')}>
                  {row.avgChange7d >= 0 ? '+' : ''}{row.avgChange7d.toFixed(1)}%
                </span>
                <span className="text-[10px] text-muted-foreground tabular-nums text-right">{row.count}</span>
              </button>
            ))}
          </div>
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
          .eq('game', 'Pokemon')
          .gt('price', 50).or(nameFilter)
          .not('price_change_7d', 'is', null)
          .gt('price_change_7d', 0).lte('price_change_7d', 50)
          .order('price_change_7d', { ascending: false }).limit(50),
        supabase.from('market_snapshots').select(select)
          .eq('game', 'Pokemon')
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

      const mixed = [...gainers.slice(0, 4), ...losers.slice(0, 2)].slice(0, 6);
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
        {ghCards.slice(0, 5).map(card => {
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
        {/* 6th slot: Signup CTA */}
        <button
          onClick={() => navigate('/auth')}
          className="glass-card rounded-xl p-3 flex flex-col items-center justify-center text-center hover:border-primary/30 transition-all group border-dashed border-2 border-border/40"
        >
          <PlusCircle className="w-10 h-10 text-primary/60 mb-3 group-hover:text-primary transition-colors" />
          <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">Customize this page</p>
          <p className="text-[10px] text-muted-foreground mt-1">Sign up to PokeIQ</p>
        </button>
      </div>

    </div>
  );
}

/* ── Login CTA removed — replaced by signup card in GreatestHitsRow ── */

/* ── Investing Ideas — daily rotating picks from Prime Window sets ── */
function InvestingIdeas() {
  const navigate = useNavigate();
  const [sealedPicks, setSealedPicks] = useState<MoverCard[]>([]);
  const [cardPicks, setCardPicks] = useState<MoverCard[]>([]);
  const [setName, setSetName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Pick a set based on day of year — rotates daily
      const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
      const setIndex = dayOfYear % PRIME_SETS.length;
      const todaySet = PRIME_SETS[setIndex];
      setSetName(todaySet.name);

      // Use a seed from the day to shuffle consistently
      const seed = dayOfYear * 137;

      const MAX_PICK_CARDS = 9;

      // Recent snapshots can be incomplete (sync still running), so look back 120 days
      // and keep the most recent row per card_id rather than locking to one date.
      // A wide window protects against gaps between sync runs.
      const sinceDate = new Date(Date.now() - 120 * 86400_000).toISOString().slice(0, 10);
      const dedupeLatest = <T extends { card_id: string; snapshot_date?: string }>(rows: T[]): T[] => {
        const map = new Map<string, T>();
        for (const r of rows) {
          const prev = map.get(r.card_id);
          if (!prev || (r.snapshot_date ?? '') > (prev.snapshot_date ?? '')) map.set(r.card_id, r);
        }
        return Array.from(map.values());
      };

      const SELECT_COLS = 'id, card_id, name, set_name, rarity, tcgplayer_id, price, price_change_7d, price_change_30d, price_change_90d, product_type, image_url, min_price_30d, max_price_30d, cov_price_30d, trend_slope_30d, snapshot_date';

      const [sealedRes, cardsRes] = await Promise.all([
        supabase.from('market_snapshots')
          .select(SELECT_COLS)
          .ilike('set_name', `%${todaySet.setKey}%`)
          .eq('product_type', 'sealed')
          .gt('price', 50)
          .gte('snapshot_date', sinceDate)
          .order('snapshot_date', { ascending: false })
          .order('price', { ascending: false })
          .limit(200),
        supabase.from('market_snapshots')
          .select(SELECT_COLS)
          .ilike('set_name', `%${todaySet.setKey}%`)
          .eq('product_type', 'card')
          .gt('price', 10)
          .gte('snapshot_date', sinceDate)
          .order('snapshot_date', { ascending: false })
          .order('price', { ascending: false })
          .limit(400),
      ]);

      if (cancelled) return;

      // Seeded shuffle
      const seededShuffle = (arr: any[], s: number) => {
        const shuffled = [...arr];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.abs((s * (i + 1) * 2654435761) % (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
      };

      // Reclassify: move sealed-like products out of card picks
      // Anything with these keywords is sealed, not a raw card
      const SEALED_NAME_RE = /\b(booster|box|pack|deck|tin|etb|elite\s*trainer|collection|bundle|case|chest|blister|sealed|lunchbox|multipack|prerelease|toolkit|ultra\s*premium|stadium|kit)\b/i;
      const allSealed = dedupeLatest((sealedRes.data ?? []) as any[]);
      const allCards = dedupeLatest((cardsRes.data ?? []) as any[]);
      const misclassified = allCards.filter(c => SEALED_NAME_RE.test(c.name));
      const pureCards = allCards.filter(c => !SEALED_NAME_RE.test(c.name));
      const combinedSealed = [...allSealed, ...misclassified];

      const sealedData = seededShuffle(combinedSealed, seed).slice(0, MAX_PICK_CARDS) as MoverCard[];
      let cardsData = seededShuffle(pureCards, seed + 1).slice(0, MAX_PICK_CARDS) as MoverCard[];
      let finalSealed = sealedData;

      // Fallback: if spotlight set has too few cards in market_snapshots,
      // backfill with top-priced cards from sister sets sharing the same
      // series prefix (e.g. "SWSH12: Silver Tempest" → other "SWSH%" sets).
      if (cardsData.length < MAX_PICK_CARDS) {
        const existingIds = new Set(cardsData.map(c => c.card_id));
        const fallbackSets = PRIME_SETS.filter(s => s.setKey !== todaySet.setKey);
        const fallbackResults = await Promise.all(
          fallbackSets.map(s => supabase.from('market_snapshots')
            .select(SELECT_COLS)
            .ilike('set_name', `%${s.setKey}%`)
            .eq('product_type', 'card')
            .gt('price', 10)
            .gte('snapshot_date', sinceDate)
            .order('snapshot_date', { ascending: false })
            .order('price', { ascending: false })
            .limit(40))
        );
        const fallbackCards = dedupeLatest(fallbackResults.flatMap(res => (res.data ?? []) as any[]));
        const filler = seededShuffle(fallbackCards, seed + 7)
          .filter(c => !existingIds.has(c.card_id) && !SEALED_NAME_RE.test(c.name))
          .slice(0, MAX_PICK_CARDS - cardsData.length) as MoverCard[];
        cardsData = [...cardsData, ...filler];
      }

      // Same fallback for sealed: backfill from sister PRIME sets when spotlight is sparse.
      if (finalSealed.length < MAX_PICK_CARDS) {
        const existingIds = new Set(finalSealed.map(c => c.card_id));
        const fallbackSets = PRIME_SETS.filter(s => s.setKey !== todaySet.setKey);
        const fallbackResults = await Promise.all(
          fallbackSets.map(s => supabase.from('market_snapshots')
            .select(SELECT_COLS)
            .ilike('set_name', `%${s.setKey}%`)
            .eq('product_type', 'sealed')
            .gt('price', 50)
            .gte('snapshot_date', sinceDate)
            .order('snapshot_date', { ascending: false })
            .order('price', { ascending: false })
            .limit(20))
        );
        const fallbackSealed = dedupeLatest(fallbackResults.flatMap(res => (res.data ?? []) as any[]));
        const filler = seededShuffle(fallbackSealed, seed + 11)
          .filter(c => !existingIds.has(c.card_id))
          .slice(0, MAX_PICK_CARDS - finalSealed.length) as MoverCard[];
        finalSealed = [...finalSealed, ...filler];
      }

      setSealedPicks(finalSealed);
      setCardPicks(cardsData);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /><span className="text-xs">Loading investing ideas…</span>
      </div>
    );
  }

  const getTrendDot = (card: MoverCard) => {
    const c7 = card.price_change_7d ?? 0;
    const c30 = card.price_change_30d ?? 0;
    // Trend Signal thresholds matching Sets Explorer
    const trendScore = Math.min(100, Math.max(0,
      (c7 > 20 ? 20 : c7 > 10 ? 15 : c7 > 3 ? 10 : c7 > 0 ? 5 : 0) +
      (c30 > 20 ? 30 : c30 > 10 ? 22 : c30 > 3 ? 15 : c30 > 0 ? 8 : 0)
    ));
    // ≥25 green, ≥12 yellow, else red
    if (trendScore >= 25) return 'bg-success';
    if (trendScore >= 12) return 'bg-yellow-400';
    return 'bg-destructive';
  };

  const renderCard = (card: MoverCard, type: 'sealed' | 'card') => {
    return <PulseCard card={card} type={type} navigate={navigate} getTrendDot={getTrendDot} />;
  };

  const PicksCarousel = ({ items, type, label, icon: Icon, priceLabel }: { items: MoverCard[]; type: 'sealed' | 'card'; label: string; icon: any; priceLabel: string }) => {
    const [page, setPage] = useState(0);
    const [perPage, setPerPage] = useState(3);

    useEffect(() => {
      const onResize = () => {
        const w = window.innerWidth;
        setPerPage(w < 640 ? 1 : w < 1024 ? 2 : 3);
      };
      onResize();
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }, []);

    const totalPages = Math.ceil(items.length / perPage);
    const visible = items.slice(page * perPage, page * perPage + perPage);

    return (
      <div>
        <div className="flex items-center justify-between min-h-8 mb-2">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
            <span className="text-[10px] text-muted-foreground">{priceLabel}</span>
          </div>
          {totalPages > 1 && (
            <div className="hidden sm:flex items-center gap-1">
              <span className="text-[9px] text-muted-foreground tabular-nums mr-1">{page + 1}/{totalPages}</span>
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-1 rounded-lg hover:bg-muted/40 transition-colors text-muted-foreground hover:text-foreground disabled:opacity-30">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="p-1 rounded-lg hover:bg-muted/40 transition-colors text-muted-foreground hover:text-foreground disabled:opacity-30">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
        {items.length > 0 ? (
          <>
            {/* Mobile: horizontal scroll */}
            <div className="sm:hidden flex gap-3 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1 touch-pan-x">
              {items.map(c => (
                <div key={c.id} className="shrink-0 w-[calc((100%-0.75rem)/2)]">
                  {renderCard(c, type)}
                </div>
              ))}
            </div>
            {/* Desktop: paginated grid */}
            <div className="hidden sm:grid gap-3" style={{ gridTemplateColumns: `repeat(${perPage}, minmax(0, 1fr))` }}>
              {visible.map(c => <div key={c.id} className="h-full">{renderCard(c, type)}</div>)}
            </div>
          </>
        ) : (
          <p className="text-xs text-muted-foreground py-4 text-center">No {type === 'sealed' ? 'sealed products' : 'cards'} found</p>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Today's spotlight:</span>
          <Badge variant="secondary" className="text-xs">{setName}</Badge>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success" /> Buy Trend</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400" /> Hold Trend</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive" /> Down Trend</span>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PicksCarousel items={sealedPicks} type="sealed" label="Sealed Products" icon={Briefcase} priceLabel="· Over $50" />
        <PicksCarousel items={cardPicks} type="card" label="Card Picks" icon={CreditCard} priceLabel="· Over $10" />
      </div>
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
      <MoversList cards={gainers} label="▲ Gainers · 7D" color="text-success" isAuthed={isAuthed} onLoginPrompt={onLoginPrompt} maxVisible={5} />
      <MoversList cards={losers} label="▼ Pullbacks · 7D" color="text-warning" isAuthed={isAuthed} onLoginPrompt={onLoginPrompt} maxVisible={5} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════════════════════ */
export default function PokeIQDailyTab({ mastheadTitle, mastheadSubtitle, hideWatchlist = false }: { mastheadTitle?: string; mastheadSubtitle?: string; hideWatchlist?: boolean } = {}) {
  const navigate = useNavigate();
  const [allMovers, setAllMovers] = useState<MoverCard[]>([]);
  const [headlines, setHeadlines] = useState<Headline[]>([]);
  const [dbCounts, setDbCounts] = useState<{ cards: number; cardsUpPct: number; cardsUp: number; cardsDown: number }>({ cards: 0, cardsUpPct: 50, cardsUp: 0, cardsDown: 0 });
  const [topSets, setTopSets] = useState<{ name: string; pct: number; value: number }[]>([]);
  const [greatestHitsData, setGreatestHitsData] = useState<{ name: string; avgChange7d: number; count: number }[]>([]);
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

    // Try to restore cached data instantly
    let hasCachedData = false;
    try {
      const cached = sessionStorage.getItem('pulse-cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.allMovers?.length > 0) { setAllMovers(parsed.allMovers); hasCachedData = true; }
        if (parsed.headlines?.length > 0) setHeadlines(parsed.headlines);
        if (parsed.dbCounts) setDbCounts(parsed.dbCounts);
        if (parsed.topSets?.length > 0) setTopSets(parsed.topSets);
        if (parsed.greatestHitsData?.length > 0) setGreatestHitsData(parsed.greatestHitsData);
        if (hasCachedData) setLoading(false); // Show cached data immediately

        // If cache is recent (< 5 min), skip background refresh
        if (hasCachedData && parsed.cachedAt && Date.now() - parsed.cachedAt < 5 * 60 * 1000) {
          setLoading(false);
          return;
        }
      }
    } catch {}

    (async () => {
      // Try sentiment cache first
      const { data: sentimentCached } = await supabase
        .from('sentiment_cache')
        .select('*')
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .single();

      if (!cancelled && sentimentCached) {
        setDbCounts({
          cards: sentimentCached.cards_total,
          cardsUpPct: sentimentCached.cards_up_pct,
          cardsUp: sentimentCached.cards_up,
          cardsDown: sentimentCached.cards_down,
        });
      }

      const { data: latestRow } = await supabase.from('market_snapshots')
        .select('snapshot_date')
        .gt('price', 5)
        .not('price_change_7d', 'is', null)
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      const latestDate = latestRow?.snapshot_date;

      const moverSelect = 'id, card_id, name, set_name, rarity, tcgplayer_id, price, price_change_7d, price_change_30d, price_change_90d, product_type, image_url, printing';
      const qGainers = supabase.from('market_snapshots')
        .select(moverSelect)
        .eq('game', 'Pokemon')
        .not('price_change_7d', 'is', null).gt('price', 5).gt('price_change_7d', 0).lte('price_change_7d', 2000)
        .not('product_type', 'ilike', '%graded%');
      const qLosers = supabase.from('market_snapshots')
        .select(moverSelect)
        .eq('game', 'Pokemon')
        .not('price_change_7d', 'is', null).gt('price', 5).lt('price_change_7d', 0).gte('price_change_7d', -2000)
        .not('product_type', 'ilike', '%graded%');

      if (latestDate) {
        qGainers.eq('snapshot_date', latestDate);
        qLosers.eq('snapshot_date', latestDate);
      }

      // If no sentiment cache, compute live
      const needsSentiment = true; // Always compute live to ensure full market coverage
      const sentimentPromises: Array<Promise<any>> = [];
      if (needsSentiment && latestDate) {
        // Cover the totality of the market (cards + sealed, excluding graded slabs)
        const inTypes = ['card', 'sealed'];
        sentimentPromises.push(
          Promise.resolve(supabase.from('market_snapshots').select('id', { count: 'exact', head: true }).not('price', 'is', null).gt('price', 0).in('product_type', inTypes).eq('snapshot_date', latestDate)),
          Promise.resolve(supabase.from('market_snapshots').select('id', { count: 'exact', head: true }).not('price', 'is', null).gt('price', 0).in('product_type', inTypes).gt('price_change_7d', 0).eq('snapshot_date', latestDate)),
          Promise.resolve(supabase.from('market_snapshots').select('id', { count: 'exact', head: true }).not('price', 'is', null).gt('price', 0).in('product_type', inTypes).lt('price_change_7d', 0).eq('snapshot_date', latestDate)),
        );
      }

      const [allGainersRes, allLosersRes, headlinesRes, setsRes, ...sentimentRes] = await Promise.all([
        qGainers.order('price_change_7d', { ascending: false }).limit(50),
        qLosers.order('price_change_7d', { ascending: true }).limit(50),
        supabase.functions.invoke('scrape-pokebeach'),
        supabase.functions.invoke('justtcg', { body: { action: 'getSets' } }),
        ...sentimentPromises,
      ]);

      if (cancelled) return;

      const isExcluded = (m: any) => {
        const n = (m.name || '').toLowerCase();
        const r = (m.rarity || '').toLowerCase();
        const p = (m.printing || '').toLowerCase();
        if (n.includes('reverse holo') || r.includes('reverse holo') || p.includes('reverse holo')) return true;
        if (n.includes('1st edition') || p.includes('1st edition')) return true;
        return false;
      };
      const dedup = (arr: any[]) => {
        const seen = new Set<string>();
        return arr.filter(m => {
          if (isExcluded(m)) return false;
          const k = m.tcgplayer_id || m.card_id || m.id;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        }) as MoverCard[];
      };

      const newMovers = [...dedup(allGainersRes.data ?? []), ...dedup(allLosersRes.data ?? [])];
      setAllMovers(newMovers);

      let newDbCounts = dbCounts;
      if (needsSentiment && sentimentRes.length === 3) {
        const cardTotal = sentimentRes[0].count ?? 0;
        const cardsUpTotal = sentimentRes[1].count ?? 0;
        const cardsDownTotal = sentimentRes[2].count ?? 0;
        // Only override cached values if live query actually returned data
        if (cardTotal > 0) {
          const cardsMoving = cardsUpTotal + cardsDownTotal || 1;
          newDbCounts = {
            cards: cardTotal,
            cardsUpPct: Math.round((cardsUpTotal / cardsMoving) * 100),
            cardsUp: cardsUpTotal,
            cardsDown: cardsDownTotal,
          };
          setDbCounts(newDbCounts);
        }
        // else: keep the cached sentiment values already set above
      }

      const pbData = headlinesRes.data;
      let newHeadlines = headlines;
      if (pbData?.success && Array.isArray(pbData.headlines)) {
        newHeadlines = pbData.headlines;
        setHeadlines(newHeadlines);
      }

      // Extract top set trends
      const setsData = Array.isArray(setsRes.data?.data) ? setsRes.data.data : [];
      // Total cards available across all JustTCG sets (totality of the catalog)
      const justTcgTotalCards = setsData.reduce((sum: number, s: any) => sum + (Number(s.cards_count) || 0) + (Number(s.sealed_count) || 0), 0);
      if (justTcgTotalCards > 0) {
        // Scale up/down proportionally so they reflect the same universe as the displayed total
        const snapshotTotal = newDbCounts.cards || 0;
        if (snapshotTotal > 0 && justTcgTotalCards > snapshotTotal) {
          const ratio = justTcgTotalCards / snapshotTotal;
          newDbCounts = {
            ...newDbCounts,
            cards: justTcgTotalCards,
            cardsUp: Math.round(newDbCounts.cardsUp * ratio),
            cardsDown: Math.round(newDbCounts.cardsDown * ratio),
          };
        } else {
          newDbCounts = { ...newDbCounts, cards: justTcgTotalCards };
        }
        setDbCounts(newDbCounts);
      }
      const validSets = setsData
        .filter((s: any) => s.set_value_usd >= 4000 && s.set_value_change_7d_pct != null && !/^misc/i.test(s.name))
        .sort((a: any, b: any) => Math.abs(b.set_value_change_7d_pct) - Math.abs(a.set_value_change_7d_pct))
        .slice(0, 5)
        .map((s: any) => ({ name: s.name, pct: s.set_value_change_7d_pct, value: s.set_value_usd }));
      setTopSets(validSets);

      // Fetch greatest hits data for ticker
      const { data: ghCached } = await supabase
        .from('greatest_hits_cache')
        .select('pokemon_name, avg_change_7d, card_count, snapshot_date')
        .order('snapshot_date', { ascending: false })
        .limit(6);
      let newGhData = greatestHitsData;
      if (!cancelled && ghCached && ghCached.length > 0) {
        newGhData = ghCached.map(c => ({
          name: c.pokemon_name.charAt(0).toUpperCase() + c.pokemon_name.slice(1),
          avgChange7d: c.avg_change_7d,
          count: c.card_count,
        }));
        setGreatestHitsData(newGhData);
      }

      // Persist to sessionStorage for instant back-navigation
      try {
        sessionStorage.setItem('pulse-cache', JSON.stringify({
          allMovers: newMovers,
          headlines: newHeadlines,
          dbCounts: newDbCounts,
          topSets: validSets,
          greatestHitsData: newGhData,
          cachedAt: Date.now(),
        }));
      } catch {}

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
    <div className="space-y-4">
      <Masthead title={mastheadTitle ?? 'The Pulse'} subtitle={mastheadSubtitle} />

      {/* Action Center Ticker — portfolio insights for logged in, market insights for guests */}
      {isAuthed ? <ActionTicker /> : <MarketTicker dbCounts={dbCounts} allMovers={allMovers} topSets={topSets} greatestHitsData={greatestHitsData} />}

      {/* Sets Snapshot + Market Overview + Latest News */}
      <div className="grid grid-cols-1 lg:grid-cols-[30%_22%_48%] gap-3 items-stretch">
        <div className="hidden lg:block">
          <SetsSnapshotCard topSets={topSets} />
        </div>
        <MarketOverviewBanner dbCounts={dbCounts} />
        <PokeBeachNews headlines={headlines} />
      </div>
      {/* Prime Window + Greatest Hits Index */}
      <div className="grid grid-cols-1 lg:grid-cols-[60%_40%] gap-4 items-stretch">
        <PrimeWindowWidget />
        <GreatestHitsIndex />
      </div>

      {/* Watchlist / Greatest Hits Row */}
      {/* Investing Ideas — daily rotating picks */}
      <SectionRule title="Market Spotlight · 7D" icon={ShoppingCart} />
      <InvestingIdeas />

      {/* Sets Explorer + Era Timeline */}
      <div id="sets-explorer-section" />
      <SectionRule title="Sets Overview" icon={Layers} />
      <EraTimeline />
      <div className="mt-3">
        <SetsExplorer initialLimit={5} />
      </div>

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
