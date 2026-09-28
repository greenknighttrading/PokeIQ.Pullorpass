const KEY = 'pop_reveal_count';
export const REVEAL_EVENT = 'pokeiq:taste-reveal';
export const REVEAL_PROGRESS_EVENT = 'pokeiq:taste-progress';
export const REVEAL_EVERY = 25;

export function getRevealCount(): number {
  try { return Number(localStorage.getItem(KEY) || '0'); } catch { return 0; }
}

/** Count successful swipes; every 25th fires a taste reveal. */
export function bumpRevealCounter() {
  try {
    const n = getRevealCount() + 1;
    localStorage.setItem(KEY, String(n));
    window.dispatchEvent(new CustomEvent(REVEAL_PROGRESS_EVENT, { detail: n }));
    if (n % REVEAL_EVERY === 0) window.dispatchEvent(new CustomEvent(REVEAL_EVENT, { detail: n }));
  } catch {}
}
