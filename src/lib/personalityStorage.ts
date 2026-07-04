import { supabase } from '@/integrations/supabase/client';

const LEGACY_KEY = 'personalityResult';
const keyFor = (userId: string | null) =>
  userId ? `personalityResult:${userId}` : LEGACY_KEY;

export async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    const u = data?.session?.user;
    if (!u || u.is_anonymous) return null;
    return u.id;
  } catch {
    return null;
  }
}

/**
 * Read the saved personality result for the currently signed-in user.
 * Returns null when no user is signed in, or when this user has not taken
 * the test yet. The legacy unscoped key is intentionally ignored — a result
 * left in localStorage by a previous account must NOT leak into a new one.
 */
export async function readPersonalityForCurrentUser<T = any>(): Promise<T | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (raw) return JSON.parse(raw) as T;
    // Fallback: adopt legacy unscoped result (from before per-user scoping).
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      try { localStorage.setItem(keyFor(userId), legacy); } catch {}
      return JSON.parse(legacy) as T;
    }
    return null;
  } catch {
    return null;
  }
}

export function readPersonalityForUserSync<T = any>(userId: string | null): T | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(keyFor(userId));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writePersonalityForUser(userId: string | null, result: unknown) {
  if (!userId) return;
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(result));
  } catch {}
}