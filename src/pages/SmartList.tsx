import React from 'react';
import { TrendingUp } from 'lucide-react';
import { Seo } from '@/components/seo/Seo';
import MarketMoversCategories from '@/components/buylist/MarketMoversCategories';

export default function SmartList() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Seo title="Smart List — PokeIQ" description="Discover trending Pokémon TCG cards with category-based market analysis." />
      <main>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-6">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-foreground">Smart List</h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Discover trending cards across key categories</p>
            </div>
          </div>

          <MarketMoversCategories />

          <p className="text-xs text-muted-foreground text-center mt-8">
            ⚠️ Education only. Not financial advice. Always DYOR.
          </p>
        </div>
      </main>
    </div>
  );
}