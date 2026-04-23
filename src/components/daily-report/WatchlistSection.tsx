import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Eye, TrendingUp, TrendingDown, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useWatchlist } from '@/hooks/useWatchlist';
import { MoverCard, getImageUrl, getChangeForTime } from '@/components/buylist/shared/signalHelpers';

export function WatchlistSection() {
  const navigate = useNavigate();
  const { items: watchlistItems, loading: wlLoading } = useWatchlist();
  const [watchlistData, setWatchlistData] = useState<MoverCard[]>([]);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthed(!!session?.user && !session.user.is_anonymous);
    });
  }, []);

  useEffect(() => {
    if (!isAuthed || watchlistItems.length === 0) return;
    const cardIds = watchlistItems.map(i => i.card_id);
    supabase
      .from('market_snapshots')
      .select('id, card_id, name, set_name, rarity, tcgplayer_id, price, price_change_7d, price_change_30d, price_change_90d, product_type, image_url')
      .in('card_id', cardIds)
      .then(({ data }) => {
        setWatchlistData((data ?? []) as unknown as MoverCard[]);
      });
  }, [isAuthed, watchlistItems]);

  const deduped = useMemo(() => {
    const seen = new Set<string>();
    return watchlistData.filter(c => {
      const key = c.card_id || c.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [watchlistData]);

  const sorted = useMemo(() => [...deduped].sort((a, b) =>
    Math.abs(getChangeForTime(b, '7d') ?? 0) - Math.abs(getChangeForTime(a, '7d') ?? 0)
  ).slice(0, 8), [deduped]);

  return (
    <div className="rounded-xl border border-border/40 bg-card/60 p-5 sm:p-6">
      <div className="flex items-center justify-end mb-5">
        <Link to="/buylist/watchlist" className="text-[11px] text-primary hover:underline flex items-center gap-1">
          View All <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {!isAuthed || sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sign in and add items to your watchlist to track price movements.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {sorted.map(card => {
            const imgUrl = getImageUrl(card);
            const change = card.price_change_7d ?? 0;
            const isUp = change >= 0;
            return (
              <button
                key={card.card_id || card.id}
                onClick={() => navigate(`/buylist/mover/${card.card_id || card.id}`)}
                className="rounded-xl border border-border/20 bg-secondary/10 p-4 flex flex-col items-center text-center hover:border-primary/30 transition-all group"
              >
                <p className="text-xs font-bold truncate max-w-full group-hover:text-primary transition-colors">{card.name}</p>
                <p className="text-[10px] text-muted-foreground truncate max-w-full mt-0.5 mb-3">{card.set_name}</p>
                {imgUrl ? (
                  <img src={imgUrl} alt="" className="w-16 h-22 object-contain rounded-lg mb-2"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-16 h-22 rounded-lg bg-muted flex items-center justify-center text-[9px] text-muted-foreground mb-2">No img</div>
                )}
                <div className="flex items-center gap-1.5 mb-2">
                  {isUp ? <TrendingUp className="w-4 h-4 text-success" /> : <TrendingDown className="w-4 h-4 text-destructive" />}
                  <span className={cn('text-lg font-black tabular-nums', isUp ? 'text-success' : 'text-destructive')}>
                    {isUp ? '+' : ''}{change.toFixed(1)}%
                  </span>
                </div>
                <span className="text-xs font-bold tabular-nums">${(card.price ?? 0).toFixed(2)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
