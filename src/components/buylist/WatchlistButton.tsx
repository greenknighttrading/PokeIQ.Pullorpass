import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWatchlist } from '@/hooks/useWatchlist';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Props {
  card: {
    card_id: string;
    name: string;
    set_name?: string | null;
    product_type?: string;
    tcgplayer_id?: string | null;
    rarity?: string | null;
  };
  size?: 'sm' | 'default';
  showLabel?: boolean;
  className?: string;
}

export default function WatchlistButton({ card, size = 'sm', showLabel = false, className }: Props) {
  const navigate = useNavigate();
  const { isInWatchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const [session, setSession] = useState<any>(null);
  const inList = isInWatchlist(card.card_id);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => setSession(s));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!session?.user) {
      navigate('/auth');
      return;
    }
    inList ? removeFromWatchlist(card.card_id) : addToWatchlist(card);
  };

  return (
    <Button
      variant="ghost"
      size={size}
      onClick={handleClick}
      className={cn(
        'gap-1.5',
        inList
          ? 'text-success hover:text-destructive'
          : 'text-muted-foreground hover:text-foreground',
        className
      )}
      title={inList ? 'Remove from Watchlist' : 'Add to Watchlist'}
    >
      {inList ? <CheckCircle className="w-5 h-5" /> : <PlusCircle className="w-5 h-5" />}
      {showLabel && (inList ? 'Watching' : 'Add to Watchlist')}
    </Button>
  );
}
