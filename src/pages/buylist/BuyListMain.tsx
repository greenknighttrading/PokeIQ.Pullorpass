import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBuyList } from '@/contexts/BuyListContext';
import { Seo } from '@/components/seo/Seo';
import { GlobalNavBar } from '@/components/layout/GlobalNavBar';
import { supabase } from '@/integrations/supabase/client';
import EditorsPicksTab from '@/components/buylist/EditorsPicksTab';

function useIsAuthenticated() {
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthed(!!session?.user && !session.user.is_anonymous);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session?.user && !session.user.is_anonymous);
    });
    return () => subscription.unsubscribe();
  }, []);
  return authed;
}

export default function BuyListMain() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Seo title="News — PokeIQ" description="Your daily snapshot of the Pokémon TCG market." />
      <GlobalNavBar />

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <EditorsPicksTab />

          <p className="text-xs text-muted-foreground text-center mt-8">
            ⚠️ Education only. Not financial advice. Always DYOR.
          </p>
        </div>
      </main>
    </div>
  );
}
