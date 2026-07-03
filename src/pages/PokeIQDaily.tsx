import React from 'react';
import { Link } from 'react-router-dom';
import { ScanLine } from 'lucide-react';
import { Seo } from '@/components/seo/Seo';
import PokeIQDailyTab from '@/components/buylist/PokeIQDailyTab';

export default function PokeIQDaily() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Seo title="The Pulse — PokeIQ" description="Your daily newspaper-style snapshot of the Pokémon TCG market." />
      <main className="flex-1">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-end mb-4">
            <Link
              to="/buylist/scanner"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border/60 bg-card/40 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors"
            >
              <ScanLine className="w-4 h-4" />
              Card Search
            </Link>
          </div>
          <PokeIQDailyTab />
        </div>
      </main>
    </div>
  );
}
