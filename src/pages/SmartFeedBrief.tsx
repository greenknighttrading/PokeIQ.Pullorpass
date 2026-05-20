import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Seo } from '@/components/seo/Seo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Newspaper, TrendingUp, TrendingDown, Sparkles, AlertTriangle, Lightbulb, ExternalLink } from 'lucide-react';
import { loadBriefFromSession, type SmartBrief } from '@/lib/smartBrief';
import { cn } from '@/lib/utils';

function ConfidenceBadge({ level }: { level: SmartBrief['strongestSignals'][number]['confidence'] }) {
  const cls =
    level === 'High' ? 'bg-success/15 text-success border-success/30'
    : level === 'Medium' ? 'bg-primary/15 text-primary border-primary/30'
    : level === 'Speculative' ? 'bg-destructive/15 text-destructive border-destructive/30'
    : 'bg-warning/15 text-warning border-warning/30';
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border', cls)}>
      {level} Confidence
    </span>
  );
}

function SectionHeader({ kicker, title, icon: Icon }: { kicker: string; title: string; icon: any }) {
  return (
    <div className="mb-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-3.5 h-3.5 text-primary" />
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">{kicker}</span>
      </div>
      <h2 className="text-2xl sm:text-3xl font-black leading-tight">{title}</h2>
    </div>
  );
}

export default function SmartFeedBrief() {
  const navigate = useNavigate();
  const [brief, setBrief] = useState<SmartBrief | null>(null);

  useEffect(() => {
    setBrief(loadBriefFromSession());
  }, []);

  if (!brief) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
          <Newspaper className="w-10 h-10 text-muted-foreground mx-auto" />
          <h1 className="text-xl font-bold">No brief loaded</h1>
          <p className="text-sm text-muted-foreground">
            Open the Smart Feed to generate today's news brief, then click the brief widget at the top.
          </p>
          <Button onClick={() => navigate('/smart-feed')}>Go to Smart Feed</Button>
        </div>
      </AppLayout>
    );
  }

  const dateLabel = new Date(brief.generatedAt).toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <AppLayout>
      <Seo title="Smart Feed Brief — PokeIQ" description="Daily Pokémon Market Intelligence — your personalized briefing." />
      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <button
          onClick={() => navigate('/smart-feed')}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Smart Feed
        </button>

        {/* Masthead */}
        <header className="border-b-2 border-border pb-5 mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Newspaper className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Smart Feed · News Brief
            </span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black leading-[1.05] tracking-tight">
            Daily Pokémon Market Intelligence
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>{dateLabel}</span>
            <span>·</span>
            <Badge variant="outline" className="text-[10px]">Budget ${brief.budget}/mo</Badge>
            <Badge variant="outline" className="text-[10px]">Era: {brief.eraLabel}</Badge>
          </div>
        </header>

        {/* 1 — Opening Snapshot */}
        <section className="mb-10">
          <SectionHeader kicker="01 · While you slept" title="Opening Snapshot" icon={Sparkles} />
          <div className="space-y-3 text-base sm:text-lg leading-relaxed text-foreground/90">
            {brief.snapshot.map((s, i) => (
              <p key={i}>{s}</p>
            ))}
          </div>
        </section>

        {/* 2 — What Changed Today */}
        {brief.whatChanged.length > 0 && (
          <section className="mb-10">
            <SectionHeader kicker="02 · Movement" title="What Changed Today" icon={TrendingUp} />
            <ul className="space-y-2">
              {brief.whatChanged.map((c, i) => (
                <li key={i} className="flex gap-3 items-start">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  <span className="text-sm sm:text-base text-foreground/90">{c}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 3 — Strongest Signals */}
        {brief.strongestSignals.length > 0 && (
          <section className="mb-10">
            <SectionHeader kicker="03 · Signal" title="Strongest Signals" icon={TrendingUp} />
            <div className="space-y-4">
              {brief.strongestSignals.map((sig, i) => (
                <div key={i} className="glass-card rounded-xl p-5 border border-border">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h3 className="text-lg font-bold leading-tight">{sig.name}</h3>
                      {sig.setName && (
                        <p className="text-xs text-muted-foreground mt-0.5">{sig.setName}</p>
                      )}
                    </div>
                    <span className={cn('text-sm font-black tabular-nums', sig.change7d >= 0 ? 'text-success' : 'text-destructive')}>
                      {sig.change7d >= 0 ? '+' : ''}{sig.change7d.toFixed(1)}% (7D)
                    </span>
                  </div>
                  <p className="text-sm text-foreground/85 mb-3">
                    <span className="font-semibold text-foreground">Why it matters: </span>
                    {sig.why}
                  </p>
                  <ConfidenceBadge level={sig.confidence} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 4 — Weakening Areas */}
        {brief.weakening.length > 0 && (
          <section className="mb-10">
            <SectionHeader kicker="04 · Caution" title="Weakening Areas" icon={TrendingDown} />
            <div className="space-y-4">
              {brief.weakening.map((w, i) => (
                <div key={i} className="border-l-2 border-warning/60 pl-4 py-1">
                  <h3 className="text-base font-bold">{w.name}</h3>
                  <p className="text-sm text-foreground/80 mt-1">{w.detail}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 5 — Opportunity */}
        {brief.opportunity && (
          <section className="mb-10">
            <SectionHeader kicker="05 · Single pick" title="Opportunity of the Day" icon={Sparkles} />
            <div className="glass-card rounded-xl p-6 border-2 border-primary/30 bg-primary/[0.03]">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-xl font-black leading-tight">{brief.opportunity.name}</h3>
                  {brief.opportunity.setName && (
                    <p className="text-xs text-muted-foreground mt-0.5">{brief.opportunity.setName}</p>
                  )}
                </div>
                <span className="text-lg font-black tabular-nums">${brief.opportunity.price.toFixed(2)}</span>
              </div>
              <p className="text-sm text-foreground/85 mb-2">
                <span className="font-semibold text-foreground">Why it stands out: </span>
                {brief.opportunity.why}
              </p>
              <p className="text-sm text-foreground/85 mb-3">
                <span className="font-semibold text-foreground">Risk: </span>
                {brief.opportunity.risk}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Confidence</span>
                <span className="text-sm font-black tabular-nums text-primary">
                  {brief.opportunity.confidence.toFixed(1)}/10
                </span>
              </div>
            </div>
          </section>
        )}

        {/* 6 — Insight */}
        <section className="mb-10">
          <SectionHeader kicker="06 · Editorial" title="Today's Insight" icon={Lightbulb} />
          <blockquote className="text-lg sm:text-xl font-medium leading-relaxed text-foreground/90 border-l-2 border-primary pl-5 italic">
            {brief.insight}
          </blockquote>
        </section>

        {/* 7 — Quick News */}
        {brief.quickNews.length > 0 && (
          <section className="mb-10">
            <SectionHeader kicker="07 · Around the market" title="Quick News" icon={Newspaper} />
            <div className="space-y-4">
              {brief.quickNews.map((n, i) => (
                <div key={i}>
                  {n.url ? (
                    <a href={n.url} target="_blank" rel="noopener noreferrer" className="text-base font-bold hover:text-primary inline-flex items-start gap-1.5">
                      {n.title}
                      <ExternalLink className="w-3 h-3 mt-1 shrink-0 opacity-60" />
                    </a>
                  ) : (
                    <span className="text-base font-bold">{n.title}</span>
                  )}
                  <p className="text-sm text-foreground/75 mt-1">{n.why}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 8 — Closing */}
        <footer className="border-t-2 border-border pt-6 mt-12 text-center">
          <p className="text-lg sm:text-xl font-serif italic text-foreground/85">{brief.closing}</p>
          <p className="text-[10px] text-muted-foreground mt-4 uppercase tracking-wider">
            Education only. Not financial advice. Always DYOR.
          </p>
          <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground mt-2">
            <AlertTriangle className="w-3 h-3" />
            <span>Generated from live market data · {new Date(brief.generatedAt).toLocaleTimeString()}</span>
          </div>
        </footer>
      </article>
    </AppLayout>
  );
}