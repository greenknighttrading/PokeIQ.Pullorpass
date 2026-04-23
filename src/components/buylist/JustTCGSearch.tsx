import React, { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface JustTCGResult {
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

export interface SelectedProduct {
  tcgApiId: string;
  name: string;
  set_name: string;
  imageUrl: string | null;
  price: number | null;
  rarity: string | null;
  condition: string;
  category: 'Sealed' | 'Single' | 'Slab';
}

interface Props {
  onSelect: (product: SelectedProduct) => void;
  categoryHint?: 'Sealed' | 'Single' | 'Slab';
  defaultLanguage?: 'english' | 'japanese';
}

export default function JustTCGSearch({ onSelect, categoryHint, defaultLanguage }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<JustTCGResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const game = defaultLanguage === 'japanese' ? 'pokemon-japan' : 'pokemon';
      const { data } = await supabase.functions.invoke('justtcg', {
        body: { action: 'search', query: q, limit: 15, game },
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

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleSelect(r: JustTCGResult) {
    const preferredCondition = categoryHint === 'Sealed' ? 'Sealed' : 'Near Mint';
    const variant = r.variants?.find(v => v.condition === preferredCondition) || r.variants?.[0];
    const imageUrl = r.tcgplayerId
      ? `https://product-images.tcgplayer.com/fit-in/437x437/${r.tcgplayerId}.jpg`
      : null;

    // Detect category from condition/name
    let category: 'Sealed' | 'Single' | 'Slab' = categoryHint || 'Single';
    if (variant?.condition === 'Sealed') category = 'Sealed';

    onSelect({
      tcgApiId: r.id,
      name: r.name,
      set_name: r.set_name || '',
      imageUrl,
      price: variant?.price ?? null,
      rarity: r.rarity,
      condition: variant?.condition || 'Near Mint',
      category,
    });
    setQuery(r.name);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search for a product…"
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
            const preferredCondition = categoryHint === 'Sealed' ? 'Sealed' : 'Near Mint';
            const variant = r.variants?.find(v => v.condition === preferredCondition) || r.variants?.[0];
            const imgUrl = r.tcgplayerId
              ? `https://product-images.tcgplayer.com/fit-in/100x100/${r.tcgplayerId}.jpg`
              : null;
            return (
              <button
                key={r.id}
                onClick={() => handleSelect(r)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-accent/10 transition-colors border-b border-border last:border-0'
                )}
              >
                {imgUrl && (
                  <img src={imgUrl} alt="" className="w-10 h-14 object-contain rounded flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {r.set_name}{r.number ? ` · #${r.number}` : ''}{r.rarity ? ` · ${r.rarity}` : ''}
                  </p>
                </div>
                {variant?.price != null && (
                  <span className="text-sm font-medium text-accent tabular-nums flex-shrink-0">
                    ${variant.price.toFixed(2)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
