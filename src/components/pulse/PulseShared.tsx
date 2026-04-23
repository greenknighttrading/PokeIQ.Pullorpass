import React from 'react';
import { cn } from '@/lib/utils';

/* ── Masthead ── */
export function Masthead({ title, subtitle }: { title: string; subtitle?: string }) {
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  return (
    <div className="text-center pb-2 mb-1 border-b border-border/50">
      <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-0.5">{dateStr}</p>
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{title}</h1>
      <p className="text-xs text-muted-foreground mt-0.5">{subtitle || 'Smart Signals, Clear Action'}</p>
    </div>
  );
}

/* ── Section Divider ── */
export function SectionRule({ title, icon: Icon }: { title: string; icon?: any }) {
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
export function SentimentGauge({ upPct, upCount, downCount, label }: { upPct: number; upCount: number; downCount: number; label: string }) {
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
export function MarketOverviewBanner({ dbCounts }: { dbCounts: { cards: number; cardsUpPct: number; cardsUp: number; cardsDown: number } }) {
  return (
    <div className="glass-card rounded-xl p-2 space-y-0.5 flex flex-col">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Market Pulse</span>
      </div>
      <div className="flex flex-col items-center text-center flex-1 justify-center">
        <SentimentGauge upPct={dbCounts.cardsUpPct} upCount={dbCounts.cardsUp} downCount={dbCounts.cardsDown} label="7D Trend" />
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">{dbCounts.cards.toLocaleString()} cards tracked</span>
        </div>
      </div>
    </div>
  );
}

/* ── Trend dot helper ── */
export function getTrendDotColor(card: { price_change_7d?: number | null; price_change_30d?: number | null }) {
  const c7 = card.price_change_7d ?? 0;
  const c30 = card.price_change_30d ?? 0;
  const trendScore = Math.min(100, Math.max(0,
    (c7 > 20 ? 20 : c7 > 10 ? 15 : c7 > 3 ? 10 : c7 > 0 ? 5 : 0) +
    (c30 > 20 ? 30 : c30 > 10 ? 22 : c30 > 3 ? 15 : c30 > 0 ? 8 : 0)
  ));
  if (trendScore >= 25) return 'bg-success';
  if (trendScore >= 12) return 'bg-yellow-400';
  return 'bg-destructive';
}

/* ── Sealed keyword regex ── */
export const SEALED_NAME_RE = /\b(booster|box|pack|deck|tin|etb|elite\s*trainer|collection|bundle|case|chest|blister|sealed|lunchbox|multipack|prerelease|toolkit|ultra\s*premium|stadium|kit)\b/i;
