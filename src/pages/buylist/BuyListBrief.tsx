import React from 'react';
import { GlobalNavBar } from '@/components/layout/GlobalNavBar';
import { Seo } from '@/components/seo/Seo';
import EditorsPicksTab from '@/components/buylist/EditorsPicksTab';

export default function BuyListBrief() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Seo title="Market News — PokeIQ" description="Your daily newspaper-style snapshot of the Pokémon TCG market." />
      <GlobalNavBar />

      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          <EditorsPicksTab />
        </div>
      </main>
    </div>
  );
}
