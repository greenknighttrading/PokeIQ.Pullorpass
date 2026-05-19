import React, { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Loader2, Search, PlusCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWatchlist } from '@/hooks/useWatchlist';

interface SearchResult {
  id: string;
  name: string;
  set_name: string;
  number: string | null;
  rarity: string | null;
  tcgplayerId: string | null;
  variants: Array<{
    condition: string;
    printing: string;
    language: string;
    price: number | null;
  }>;
}

interface Props {
  onAdded?: () => void;
}

export default function WatchlistSearch({ onAdded }: Props) {
  const { isInWatchlist, addToWatchlist } = useWatchlist();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const { data } = await supabase.functions.invoke('justtcg', {
        body: { action: 'search', query: q, limit: 15 },
      });
      setResults(data?.data ?? []);
      setOpen(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (query.length >= 2) {
      debounceRef.current = setTimeout(() => search(query), 400);
    } else {
      setResults([]);
      setOpen(false);
    }
    return () => clearTimeout(debounceRef.current);
  }, [query, search]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function handleAdd(r: SearchResult) {
    const variant = r.variants?.find(v => v.condition === 'Near Mint') || r.variants?.find(v => v.condition === 'Sealed') || r.variants?.[0];
    const productType = variant?.condition === 'Sealed' ? 'sealed' : 'card';

    await addToWatchlist({
      card_id: r.id,
      name: r.name,
      set_name: r.set_name || null,
      product_type: productType,
      tcgplayer_id: r.tcgplayerId ?? null,
      rarity: r.rarity ?? null,
    });
    onAdded?.();
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search cards & products to add…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          className="pl-9"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full max-h-72 overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
          {results.map(r => {
            const variant = r.variants?.find(v => v.condition === 'Near Mint') || r.variants?.[0];
            const imgUrl = r.tcgplayerId
              ? `https://product-images.tcgplayer.com/fit-in/100x100/${r.tcgplayerId}.jpg`
              : null;
            const alreadyAdded = isInWatchlist(r.id);

            return (
              <button
                key={r.id}
                onClick={() => !alreadyAdded && handleAdd(r)}
                disabled={alreadyAdded}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors border-b border-border last:border-0',
                  alreadyAdded ? 'opacity-60 cursor-default' : 'hover:bg-accent/10 cursor-pointer'
                )}
              >
                {imgUrl && (
                  <img referrerPolicy="no-referrer" src={imgUrl} alt="" className="w-10 h-14 object-contain rounded flex-shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {r.set_name}{r.number ? ` · #${r.number}` : ''}{r.rarity ? ` · ${r.rarity}` : ''}
                  </p>
                </div>
                {variant?.price != null && (
                  <span className="text-xs font-medium text-muted-foreground tabular-nums flex-shrink-0">
                    ${variant.price.toFixed(2)}
                  </span>
                )}
                {alreadyAdded ? (
                  <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
                ) : (
                  <PlusCircle className="w-5 h-5 text-accent flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
