// Guest-swipe backfill.
//
// Brand-new visitors can swipe before signing up. Their swipes live only
// in localStorage (`pop_results_v1` for the last completed round and
// `pop_today_swiped_<date>` for everything swiped today). After signup we
// need those swipes to count toward their account so the Matches/Smart
// Profile pages aren't empty.
//
// This helper runs once per user/device (gated by a localStorage flag),
// inserts the cached swipes into `pullorpass_swipes`, hydrates likes via
// `saveLike`, and upserts the DNA row so archetype/round counts are
// populated.

import { supabase } from '@/integrations/supabase/client';
import { saveLike } from '@/lib/likesService';
import { analyzeRound, type SwipeRecord, type SwipeCard, type Decision } from '@/lib/pullorpass';

const FLAG_PREFIX = 'pop_guest_backfilled_';

type CachedSwipe = {
  card_id: string;
  name: string;
  set_name: string | null;
  image_url: string | null;
  price: number | null;
  rarity: string | null;
  decision: Decision;
  tags?: string[];
};

function readTodaySwipes(): CachedSwipe[] {
  const out: CachedSwipe[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith('pop_today_swiped_')) continue;
      try {
        const arr = JSON.parse(localStorage.getItem(k) || '[]');
        if (Array.isArray(arr)) out.push(...arr);
      } catch {}
    }
  } catch {}
  return out;
}

function readLastResultsRecords(): SwipeRecord[] {
  try {
    const raw = localStorage.getItem('pop_results_v1');
    if (!raw) return [];
    const v = JSON.parse(raw);
    if (Array.isArray(v?.records)) return v.records as SwipeRecord[];
  } catch {}
  return [];
}

export async function backfillGuestSwipes(userId: string): Promise<void> {
  if (!userId || typeof window === 'undefined') return;
  const flag = FLAG_PREFIX + userId;
  try { if (localStorage.getItem(flag) === '1') return; } catch {}

  // Tags only live in pop_results_v1 — index them by card_id.
  const tagsByCard = new Map<string, string[]>();
  for (const r of readLastResultsRecords()) {
    if (r?.card?.card_id && Array.isArray(r.tags) && r.tags.length) {
      tagsByCard.set(r.card.card_id, r.tags);
    }
  }

  // Build a deduped list of swipes (last decision wins per card).
  const byCard = new Map<string, CachedSwipe>();
  for (const s of readTodaySwipes()) {
    if (!s?.card_id || (s.decision !== 'pull' && s.decision !== 'pass')) continue;
    byCard.set(s.card_id, s);
  }
  // Fold in any results-only records that weren't already captured.
  for (const r of readLastResultsRecords()) {
    const c = r?.card;
    if (!c?.card_id || (r.decision !== 'pull' && r.decision !== 'pass')) continue;
    if (!byCard.has(c.card_id)) {
      byCard.set(c.card_id, {
        card_id: c.card_id,
        name: c.name,
        set_name: c.set_name ?? null,
        image_url: c.image_url ?? null,
        price: c.price ?? null,
        rarity: c.rarity ?? null,
        decision: r.decision,
        tags: r.tags,
      });
    }
  }

  if (byCard.size === 0) {
    try { localStorage.setItem(flag, '1'); } catch {}
    return;
  }

  // Skip cards already in the user's swipe history (e.g. they signed in
  // on a device that previously had a different account swipe these).
  const cardIds = Array.from(byCard.keys());
  try {
    const { data: existing } = await supabase
      .from('pullorpass_swipes')
      .select('card_id')
      .eq('user_id', userId)
      .in('card_id', cardIds);
    (existing ?? []).forEach((r: any) => byCard.delete(r.card_id));
  } catch (e) {
    console.warn('[backfill] existing-swipe lookup failed', e);
  }

  if (byCard.size === 0) {
    try { localStorage.setItem(flag, '1'); } catch {}
    return;
  }

  const roundId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : '00000000-0000-4000-8000-' + Date.now().toString().padStart(12, '0');
  const rows = Array.from(byCard.values()).map((s) => ({
    user_id: userId,
    round_id: roundId,
    card_id: s.card_id,
    card_name: s.name,
    card_set: s.set_name,
    card_image: s.image_url,
    card_price: s.price,
    card_rarity: s.rarity,
    decision: s.decision,
    tags: s.tags ?? tagsByCard.get(s.card_id) ?? [],
  }));

  const { error: insErr } = await supabase.from('pullorpass_swipes').insert(rows);
  if (insErr) {
    console.warn('[backfill] swipe insert failed', insErr);
    return; // don't set flag — let it retry next time
  }

  // Hydrate likes for every pulled card.
  const pulls = rows.filter((r) => r.decision === 'pull');
  for (const r of pulls) {
    try {
      await saveLike(userId, {
        card_id: r.card_id,
        card_name: r.card_name,
        set_name: r.card_set,
        image_url: r.card_image,
        price: r.card_price,
        rarity: r.card_rarity,
        source: (r.tags || []).includes('Loved') ? 'super_like' : 'swipe',
      });
    } catch (e) { console.warn('[backfill] saveLike failed', e); }
  }

  // Upsert DNA so archetype + counts are populated.
  try {
    const records: SwipeRecord[] = rows.map((r) => ({
      card: {
        card_id: r.card_id,
        name: r.card_name,
        set_name: r.card_set,
        image_url: r.card_image,
        price: r.card_price ?? 0,
        rarity: r.card_rarity,
      } as SwipeCard,
      decision: r.decision as Decision,
      tags: r.tags ?? [],
    }));
    const analysis = analyzeRound(records);
    const { data: existingDna } = await supabase
      .from('pullorpass_dna')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    const tagCounts: Record<string, number> = (existingDna?.tag_counts as any) || {};
    analysis.topTags.forEach((t) => { tagCounts[t.tag] = (tagCounts[t.tag] ?? 0) + t.count; });
    await supabase.from('pullorpass_dna').upsert({
      user_id: userId,
      tag_counts: tagCounts,
      traits: { topTrait: analysis.topTrait },
      pull_count: (existingDna?.pull_count ?? 0) + analysis.pulls,
      pass_count: (existingDna?.pass_count ?? 0) + analysis.passes,
      rounds_completed: (existingDna?.rounds_completed ?? 0) + (analysis.pulls + analysis.passes > 0 ? 1 : 0),
      archetype: analysis.archetype?.name ?? existingDna?.archetype ?? null,
    });
  } catch (e) {
    console.warn('[backfill] DNA upsert failed', e);
  }

  try { localStorage.setItem(flag, '1'); } catch {}
}