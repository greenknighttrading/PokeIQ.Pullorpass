import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SetSelectorProps {
  value: string | null;
  onChange: (setName: string) => void;
}

export function SetSelector({ value, onChange }: SetSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Get sets that have BOTH sealed and card data in market_snapshots
  const { data: sets, isLoading } = useQuery({
    queryKey: ['sealed-vs-cards-sets'],
    queryFn: async () => {
      // Get sets with sealed products
      const { data: sealedSets } = await supabase
        .from('market_snapshots')
        .select('set_name')
        .neq('product_type', 'card')
        .not('set_name', 'is', null)
        .gt('price', 0);

      const sealedSetNames = new Set((sealedSets ?? []).map(s => s.set_name!));

      // Get sets with cards
      const { data: cardSets } = await supabase
        .from('market_snapshots')
        .select('set_name')
        .eq('product_type', 'card')
        .not('set_name', 'is', null)
        .gt('price', 0);

      const cardSetNames = new Set((cardSets ?? []).map(s => s.set_name!));

      // Intersection: sets that have both
      const both = [...sealedSetNames].filter(s => cardSetNames.has(s)).sort();
      return both;
    },
    staleTime: 1000 * 60 * 30,
  });

  const filtered = useMemo(() => {
    if (!sets) return [];
    if (!search) return sets;
    const q = search.toLowerCase();
    return sets.filter(s => s.toLowerCase().includes(q));
  }, [sets, search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between text-left font-normal h-11"
        >
          {value || 'Select a set...'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search sets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
        </div>
        <ScrollArea className="max-h-64">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Loading sets...</div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">No sets found</div>
          ) : (
            filtered.map((setName) => (
              <button
                key={setName}
                onClick={() => { onChange(setName); setOpen(false); setSearch(''); }}
                className={cn(
                  'flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-muted/50 transition-colors',
                  value === setName && 'bg-primary/10 text-primary'
                )}
              >
                <Check className={cn('h-4 w-4 shrink-0', value === setName ? 'opacity-100' : 'opacity-0')} />
                {setName}
              </button>
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
