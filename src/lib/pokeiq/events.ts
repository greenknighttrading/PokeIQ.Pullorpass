// Client-side event tracking — fire-and-forget, batched, debounced.
// Buffers events for up to 3s or 20 events, then flushes to the
// ingest-events edge function. Uses sendBeacon on page hide so we don't
// lose the final batch.

import { supabase } from "@/integrations/supabase/client";
import type { TrackedEvent, EventType } from "./types";

const MAX_BATCH = 20;
const FLUSH_INTERVAL_MS = 3000;

// Per-card debounce so hover/view spam doesn't flood the firehose.
const DEBOUNCE_MS = 30_000;
const debounceMap = new Map<string, number>();

let buffer: TrackedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let sessionId: string | null = null;

function getSessionId(): string {
  if (sessionId) return sessionId;
  try {
    const stored = sessionStorage.getItem("pokeiq_session_id");
    if (stored) {
      sessionId = stored;
      return stored;
    }
    const fresh = crypto.randomUUID();
    sessionStorage.setItem("pokeiq_session_id", fresh);
    sessionId = fresh;
    return fresh;
  } catch {
    if (!sessionId) sessionId = crypto.randomUUID();
    return sessionId;
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flush();
  }, FLUSH_INTERVAL_MS);
}

async function flush(useBeacon = false): Promise<void> {
  if (buffer.length === 0) return;
  const events = buffer;
  buffer = [];

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      // No auth — drop events silently. We don't queue across sessions.
      return;
    }

    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ingest-events`;
    const body = JSON.stringify({ events, batch_id: crypto.randomUUID() });

    if (useBeacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
      // sendBeacon can't set Authorization; pass token in URL? No.
      // Fallback to keepalive fetch which does support headers.
      try {
        void fetch(url, {
          method: "POST",
          keepalive: true,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body,
        });
      } catch {
        // ignore
      }
      return;
    }

    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body,
    });
  } catch (e) {
    // Silent — events are non-critical telemetry.
    if (import.meta.env.DEV) console.warn("[pokeiq.events] flush failed", e);
  }
}

function shouldDebounce(event: TrackedEvent): boolean {
  if (event.event_type !== "card_view" && event.event_type !== "card_hover") return false;
  if (!event.card_id) return false;
  const key = `${event.event_type}:${event.card_id}`;
  const now = Date.now();
  const last = debounceMap.get(key) ?? 0;
  if (now - last < DEBOUNCE_MS) return true;
  debounceMap.set(key, now);
  return false;
}

export function track(
  event_type: EventType,
  fields: Omit<TrackedEvent, "event_type" | "session_id" | "client_ts"> = {},
): void {
  const event: TrackedEvent = {
    event_type,
    ...fields,
    session_id: getSessionId(),
    client_ts: new Date().toISOString(),
    source_page: fields.source_page ?? (typeof window !== "undefined" ? window.location.pathname : null),
  };

  if (shouldDebounce(event)) return;

  buffer.push(event);
  if (buffer.length >= MAX_BATCH) {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    void flush();
  } else {
    scheduleFlush();
  }
}

// Convenience helpers — keep call sites tiny.
export function trackSwipe(
  card_id: string,
  action: "pull" | "pass" | "love" | "super_like",
  extra: Record<string, unknown> = {},
) {
  track("card_swipe", { card_id, payload: { action, ...extra } });
}

export function trackScan(card_id: string, extra: Record<string, unknown> = {}) {
  track("scan", { card_id, payload: extra });
}

export function trackTagVote(
  card_id: string,
  tag_id: string | null,
  text: string,
  source: "user" | "ai",
) {
  track("tag_vote", { card_id, tag_id, payload: { text, source } });
}

export function trackRecImpression(card_id: string, surface: string, slot: number) {
  track("recommendation_shown", { card_id, payload: { surface, slot } });
}

export function trackRecClick(card_id: string, surface: string, slot: number) {
  track("recommendation_click", { card_id, payload: { surface, slot } });
}

// Flush on page hide so we don't lose the tail of a session.
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => void flush(true));
  window.addEventListener("beforeunload", () => void flush(true));
}
