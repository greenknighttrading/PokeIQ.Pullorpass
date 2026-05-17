import React from 'react';
import { Seo } from '@/components/seo/Seo';
import PokeIQDailyTab from '@/components/buylist/PokeIQDailyTab';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import '@/styles/mintd-skin.css';

export default function MintdDaily() {
  const [open, setOpen] = React.useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
  };

  const confirmLeave = () => {
    setOpen(false);
    window.open('https://pokeiq.com', '_blank', 'noopener,noreferrer');
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

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>You're leaving Mintd Card Show</AlertDialogTitle>
            <AlertDialogDescription>
              You are now leaving Mintd Card Show and going into the PokeIQ app.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.stopPropagation(); confirmLeave(); }}>
              Continue to PokeIQ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}