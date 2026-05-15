import React from 'react';
import { GlobalNavBar } from '@/components/layout/GlobalNavBar';
import { Seo } from '@/components/seo/Seo';
import PokeIQDailyTab from '@/components/buylist/PokeIQDailyTab';
import '@/styles/mintd-skin.css';

export default function MintdDaily() {
  const handleClick = (e: React.MouseEvent) => {
    // Allow normal interactions with links/buttons/inputs
    const target = e.target as HTMLElement;
    if (target.closest('a, button, input, textarea, select, [role="button"], [role="link"]')) return;
    window.open('https://pokeiq.com', '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className="mintd-skin min-h-screen bg-background text-foreground flex flex-col cursor-pointer"
      onClick={handleClick}
    >
      <Seo title="Mintd Daily" description="Daily snapshot of the Pokémon TCG market." />
      <GlobalNavBar />

      <main className="flex-1">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <PokeIQDailyTab mastheadTitle="The Mintd Brief" mastheadSubtitle="Powered by PokeIQ" hideWatchlist />
        </div>
      </main>
    </div>
  );
}