import React from 'react';
import { Seo } from '@/components/seo/Seo';
import PokeIQDailyTab from '@/components/buylist/PokeIQDailyTab';
import '@/styles/mintd-skin.css';

export default function MintdDaily() {
  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Allow Latest News links (and anything explicitly marked) to behave normally
    if (target.closest('[data-mintd-allow="true"]')) return;
    e.preventDefault();
    e.stopPropagation();
    // Use native confirm so the prompt is rendered by the browser chrome
    // and is always visible even when this page is embedded in an iframe
    // (e.g. inside a Wix site) where a fixed-position modal would be
    // centered inside the iframe and scrolled off-screen.
    const ok = window.confirm(
      "You're leaving Mintd Card Show.\n\nYou are now leaving Mintd Card Show and going into the PokeIQ app.",
    );
    if (ok) {
      window.open('https://pokeiq.com', '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      className="mintd-skin min-h-screen bg-background text-foreground flex flex-col cursor-pointer"
      onClick={handleClick}
      onClickCapture={handleClick}
    >
      <Seo title="Mintd Daily" description="Daily snapshot of the Pokémon TCG market." />

      <main className="flex-1">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <PokeIQDailyTab mastheadTitle="The Mintd Brief" mastheadSubtitle="Powered by PokeIQ" hideWatchlist />
        </div>
      </main>
    </div>
  );
}