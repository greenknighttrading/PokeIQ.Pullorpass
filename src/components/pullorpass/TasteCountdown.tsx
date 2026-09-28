import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { getRevealCount, REVEAL_EVERY, REVEAL_PROGRESS_EVENT } from '@/lib/tasteReveal';

/** Small pill: "7 swipes until your taste reveal" with a thin progress bar. */
export function TasteCountdown() {
  const [n, setN] = useState(getRevealCount());
  useEffect(() => {
    const h = (e: Event) => setN((e as CustomEvent).detail);
    window.addEventListener(REVEAL_PROGRESS_EVENT, h);
    return () => window.removeEventListener(REVEAL_PROGRESS_EVENT, h);
  }, []);
  const done = n % REVEAL_EVERY;
  const left = REVEAL_EVERY - done;
  const first = n < REVEAL_EVERY;
  return (
    <div className="mx-auto mt-1 flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">
      <Sparkles className="h-3 w-3" />
      <span>
        {left} swipe{left === 1 ? '' : 's'} until {first ? 'your taste type is revealed' : 'your next taste reveal'}
      </span>
      <span className="h-1 w-10 overflow-hidden rounded-full bg-primary/20">
        <span className="block h-full bg-primary transition-all" style={{ width: `${(done / REVEAL_EVERY) * 100}%` }} />
      </span>
    </div>
  );
}
