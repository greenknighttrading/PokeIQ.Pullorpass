import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ImageOff, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface RoundCard {
  card_id: string;
  card_name: string;
  card_set: string | null;
  card_image: string | null;
  card_price: number | null;
  card_rarity: string | null;
  tags: string[];
}

export default function LastRound() {
  const [loading, setLoading] = useState(true);
  const [pulls, setPulls] = useState<RoundCard[]>([]);
  const [roundTotal, setRoundTotal] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) { setLoading(false); return; }
        const { data: latest } = await supabase
          .from('pullorpass_swipes')
          .select('round_id, created_at')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(1);
        const roundId = latest?.[0]?.round_id;
        if (!roundId) { setLoading(false); return; }
        const { data: swipes } = await supabase
          .from('pullorpass_swipes')
          .select('card_id, card_name, card_set, card_image, card_price, card_rarity, tags, decision')
          .eq('user_id', session.user.id)
          .eq('round_id', roundId)
          .order('created_at', { ascending: true });
        const all = swipes || [];
        setRoundTotal(all.length);
        setPulls(all.filter((s) => s.decision === 'pull') as RoundCard[]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="px-6 lg:px-10 py-8 max-w-[1400px] mx-auto">
      <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2">Matches</div>
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Your Latest Matches</h1>
        <Heart className="w-6 h-6 text-primary fill-primary" />
      </div>
      <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
        Cards you pulled in your most recent Pull-or-Pass round. Looking for your full DNA profile?
        <Link to="/profile" className="text-primary hover:underline ml-1">View your Profile →</Link>
      </p>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading your latest round…</div>
      ) : pulls.length === 0 ? (
        <div className="rounded-xl border border-border/60 bg-card/30 p-10 text-center">
          <Sparkles className="w-8 h-8 text-primary mx-auto mb-3" />
          <div className="font-semibold mb-1">No matches yet</div>
          <p className="text-sm text-muted-foreground mb-4">Start a Pull or Pass round and your favourites will land here.</p>
          <Link to="/swipe"><Button className="gap-2">Start swiping <ArrowRight className="w-4 h-4" /></Button></Link>
        </div>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div><span className="font-bold text-foreground tabular-nums">{pulls.length}</span> pulled</div>
            <div className="opacity-50">·</div>
            <div><span className="font-bold text-foreground tabular-nums">{roundTotal}</span> swiped this round</div>
            <div className="opacity-50">·</div>
            <div><span className="font-bold text-primary tabular-nums">{Math.round((pulls.length / Math.max(roundTotal, 1)) * 100)}%</span> match rate</div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {pulls.map((c) => (
              <div key={c.card_id} className="rounded-xl border border-border/60 bg-card/30 overflow-hidden group hover:border-primary/40 transition-colors">
                <div className="aspect-[3/4] bg-muted/30 flex items-center justify-center overflow-hidden">
                  {c.card_image ? (
                    <img src={c.card_image} alt={c.card_name} className="w-full h-full object-contain group-hover:scale-105 transition-transform" loading="lazy" />
                  ) : (
                    <ImageOff className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <div className="p-3">
                  <div className="text-sm font-semibold truncate">{c.card_name}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{c.card_set}</div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="text-xs text-muted-foreground">{c.card_rarity}</div>
                    {typeof c.card_price === 'number' && (
                      <div className="text-xs font-bold tabular-nums text-primary">${c.card_price.toFixed(2)}</div>
                    )}
                  </div>
                  {c.tags && c.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {c.tags.slice(0, 3).map((t) => (
                        <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-muted/40 text-muted-foreground">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}