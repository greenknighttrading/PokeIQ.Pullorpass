import { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { getRevealCount, REVEAL_EVERY, REVEAL_PROGRESS_EVENT } from '@/lib/tasteReveal';

const SHOW_EVERY = 5;
const VISIBLE_MS = 3500;

/** Pill that briefly appears every 5 swipes: "X swipes until your taste reveal". */
export function TasteCountdown() {
  const [n, setN] = useState(getRevealCount());
  const [visible, setVisible] = useState(false);
  const timer = useRef<number>();

  useEffect(() => {
    const h = (e: Event) => {
      const c = (e as CustomEvent).detail as number;
      setN(c);
      if (c % SHOW_EVERY === 0 && c % REVEAL_EVERY !== 0) {
        setVisible(true);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setVisible(false), VISIBLE_MS);
      }
    };
    window.addEventListener(REVEAL_PROGRESS_EVENT, h);
    return () => { window.removeEventListener(REVEAL_PROGRESS_EVENT, h); window.clearTimeout(timer.current); };
  }, []);

  if (!visible) return null;
  const done = n % REVEAL_EVERY;
  const left = REVEAL_EVERY - done;
  const first = n < REVEAL_EVERY;
  return (
    <div className="mx-auto mt-1 flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary animate-in fade-in">
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
