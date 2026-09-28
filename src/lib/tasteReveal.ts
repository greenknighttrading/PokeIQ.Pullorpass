const KEY = 'pop_reveal_count';
export const REVEAL_EVENT = 'pokeiq:taste-reveal';
export const REVEAL_EVERY = 25;

/** Count successful swipes; every 25th fires a taste reveal. */
export function bumpRevealCounter() {
  try {
    const n = Number(localStorage.getItem(KEY) || '0') + 1;
    localStorage.setItem(KEY, String(n));
    if (n % REVEAL_EVERY === 0) window.dispatchEvent(new CustomEvent(REVEAL_EVENT, { detail: n }));
  } catch {}
}
