import React from 'react';
import { GlobalNavBar } from '@/components/layout/GlobalNavBar';
import { Seo } from '@/components/seo/Seo';
import PokeIQDailyTab from '@/components/buylist/PokeIQDailyTab';

export default function MintdDaily() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Seo title="Mintd Daily" description="Daily snapshot of the Pokémon TCG market." />
      <GlobalNavBar />

      <main className="flex-1">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <PokeIQDailyTab />
        </div>
      </main>
    </div>
  );
}