import React from 'react';
import { GlobalNavBar } from '@/components/layout/GlobalNavBar';
import { Seo } from '@/components/seo/Seo';
import { PortfolioToday } from '@/components/daily-report/PortfolioToday';
import { ActionCenter } from '@/components/daily-report/ActionCenter';
import { MarketOverviewSection } from '@/components/daily-report/MarketOverviewSection';
import { WatchlistSection } from '@/components/daily-report/WatchlistSection';
import SetsExplorer from '@/components/buylist/SetsExplorer';
import { Layers } from 'lucide-react';

export default function DailyReport() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Seo title="Market News — PokeIQ" description="Your daily portfolio snapshot and market insights." />
      <GlobalNavBar />

      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          {/* Newspaper header */}
          <div className="text-center mb-8">
            <h1
              className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Market News
            </h1>
            <p className="text-sm text-muted-foreground mt-1">The Market Snapshot</p>
            <div className="mt-3 mx-auto w-24 h-px bg-primary/40" />
          </div>

          <div className="space-y-5">
            {/* Row 1: Unified Portfolio Today */}
            <PortfolioToday />

            {/* Row 2: Action Center */}
            <ActionCenter />

            {/* Row 3: Market Overview with card images */}
            <MarketOverviewSection />

            {/* Row 4: Watchlist with card images */}
            <WatchlistSection />

            {/* Row 5: Set Analytics */}
            <div className="rounded-xl border border-border/20 bg-card/60 p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <Layers className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">Set Analytics</h2>
              </div>
              <SetsExplorer initialLimit={5} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
