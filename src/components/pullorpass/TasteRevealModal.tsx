import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { computeTasteArchetype } from '@/lib/pokeiq/tasteArchetype';
import { REVEAL_EVENT } from '@/lib/tasteReveal';

interface Reveal {
  count: number;
  headline: string;
  sub: string;
  chips: string[];
}

async function buildReveal(count: number): Promise<Reveal> {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  let headline = `${count} swipes in — your taste is taking shape`;
  let sub = 'Keep going to unlock your taste archetype.';
  const chips: string[] = [];
  if (uid) {
    const [arch, likes] = await Promise.all([
      computeTasteArchetype(uid).catch(() => null),
      supabase.from('pokeiq_likes').select('pokemon_name, set_name').eq('user_id', uid).limit(500),
    ]);
    if (arch?.leading && arch.confidence > 0) {
      headline = `You lean ${arch.leading.name}`;
      sub = `${Math.round(arch.leading.share * 100)}% match • ${arch.leading.description ?? ''}`.trim();
    }
    const tally = (k: 'pokemon_name' | 'set_name') => {
      const m = new Map<string, number>();
      (likes.data ?? []).forEach((r: any) => r[k] && m.set(r[k], (m.get(r[k]) ?? 0) + 1));
      return [...m.entries()].sort((a, b) => b[1] - a[1]);
    };
    const topMon = tally('pokemon_name')[0];
    const topSet = tally('set_name')[0];
    if (topMon) chips.push(`Top Pokémon: ${topMon[0]}`);
    if (topSet) chips.push(`Favorite set: ${topSet[0]}`);
    if (!arch?.leading && topMon) sub = `You keep coming back to ${topMon[0]}.`;
  }
  return { count, headline, sub, chips };
}

export function TasteRevealModal() {
  const navigate = useNavigate();
  const [reveal, setReveal] = useState<Reveal | null>(null);

  useEffect(() => {
    const h = (e: Event) => { buildReveal((e as CustomEvent).detail).then(setReveal); };
    window.addEventListener(REVEAL_EVENT, h);
    return () => window.removeEventListener(REVEAL_EVENT, h);
  }, []);

  if (!reveal) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 md:pl-[16rem] lg:pl-[17rem]" onClick={() => setReveal(null)}>
      <div className="w-full max-w-sm rounded-2xl border border-primary/40 bg-card p-6 text-center shadow-[0_0_40px_hsl(var(--primary)/0.25)]" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 w-11 h-11 rounded-full bg-primary/15 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <p className="text-[11px] uppercase tracking-[0.25em] text-primary font-semibold">Taste reveal • {reveal.count} swipes</p>
        <h2 className="mt-2 text-xl font-bold">{reveal.headline}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{reveal.sub}</p>
        {reveal.chips.length > 0 && (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {reveal.chips.map((c) => (
              <span key={c} className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs">{c}</span>
            ))}
          </div>
        )}
        <div className="mt-5 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => { setReveal(null); navigate('/profile'); }}>See profile</Button>
          <Button className="flex-1" onClick={() => setReveal(null)}>Keep swiping</Button>
        </div>
      </div>
    </div>
  );
}
