// PokeIQ event firehose ingestion.
// Accepts a batch of validated events and writes them to pokeiq_events.
// Hot path is intentionally tiny: validate, stamp server_ts, insert.
// All aggregation (card stats, profiles, similarity, recs) is done by cron.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_EVENT_TYPES = new Set([
  "card_view",
  "card_hover",
  "card_swipe",
  "tag_vote",
  "tag_reject",
  "tag_custom",
  "scan",
  "recommendation_shown",
  "recommendation_click",
  "profile_view",
  "binder_view",
  "session_start",
  "session_end",
]);

interface IncomingEvent {
  event_type: string;
  card_id?: string | null;
  tag_id?: string | null;
  payload?: Record<string, unknown>;
  source_page?: string | null;
  session_id?: string | null;
  client_ts?: string | null;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function validateEvent(e: unknown, idx: number): { ok: true; value: IncomingEvent } | { ok: false; error: string } {
  if (!e || typeof e !== "object") return { ok: false, error: `event[${idx}] not an object` };
  const ev = e as Record<string, unknown>;
  const t = ev.event_type;
  if (typeof t !== "string" || !ALLOWED_EVENT_TYPES.has(t)) {
    return { ok: false, error: `event[${idx}].event_type invalid` };
  }
  if (ev.card_id != null && typeof ev.card_id !== "string") {
    return { ok: false, error: `event[${idx}].card_id must be string` };
  }
  if (ev.tag_id != null && typeof ev.tag_id !== "string") {
    return { ok: false, error: `event[${idx}].tag_id must be string` };
  }
  if (ev.payload != null && (typeof ev.payload !== "object" || Array.isArray(ev.payload))) {
    return { ok: false, error: `event[${idx}].payload must be object` };
  }
  // Cap payload size to keep the firehose cheap.
  if (ev.payload) {
    const s = JSON.stringify(ev.payload);
    if (s.length > 4000) return { ok: false, error: `event[${idx}].payload too large` };
  }
  return {
    ok: true,
    value: {
      event_type: t,
      card_id: (ev.card_id as string | null) ?? null,
      tag_id: (ev.tag_id as string | null) ?? null,
      payload: (ev.payload as Record<string, unknown>) ?? {},
      source_page: typeof ev.source_page === "string" ? ev.source_page : null,
      session_id: typeof ev.session_id === "string" ? ev.session_id : null,
      client_ts: typeof ev.client_ts === "string" ? ev.client_ts : null,
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return jsonResponse({ error: "Missing auth" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userResp, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userResp?.user) return jsonResponse({ error: "Unauthenticated" }, 401);
    const userId = userResp.user.id;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON" }, 400);
    }

    const events = Array.isArray((body as any)?.events) ? (body as any).events : null;
    if (!events) return jsonResponse({ error: "events[] required" }, 400);
    if (events.length === 0) return jsonResponse({ accepted: 0 });
    if (events.length > 100) return jsonResponse({ error: "max 100 events per batch" }, 400);

    const batchId = (body as any)?.batch_id && typeof (body as any).batch_id === "string"
      ? (body as any).batch_id
      : crypto.randomUUID();

    const rows: Array<Record<string, unknown>> = [];
    for (let i = 0; i < events.length; i++) {
      const v = validateEvent(events[i], i);
      if (!v.ok) return jsonResponse({ error: v.error }, 400);
      rows.push({
        user_id: userId,
        event_type: v.value.event_type,
        card_id: v.value.card_id,
        tag_id: v.value.tag_id,
        payload: v.value.payload,
        source_page: v.value.source_page,
        session_id: v.value.session_id,
        client_ts: v.value.client_ts,
        ingest_batch_id: batchId,
      });
    }

    // Use service role for the insert so we bypass per-row RLS overhead
    // (we've already verified user identity above).
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { error } = await admin.from("pokeiq_events").insert(rows);
    if (error) {
      console.error("ingest-events insert error", error);
      return jsonResponse({ error: "Insert failed" }, 500);
    }

    return jsonResponse({ accepted: rows.length, batch_id: batchId });
  } catch (e) {
    console.error("ingest-events fatal", e);
    return jsonResponse({ error: "Internal error" }, 500);
  }
});
