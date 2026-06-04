import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_EMAILS = new Set(["bryantjen06@gmail.com"]);

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function requireAdmin(req: Request) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return { error: "Unauthorized", status: 401 as const };
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return { error: "Unauthorized", status: 401 as const };
  const email = data.user.email?.toLowerCase() ?? "";
  if (!ADMIN_EMAILS.has(email)) return { error: "Forbidden", status: 403 as const };
  return { user: data.user };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const gate = await requireAdmin(req);
    if ("error" in gate) return json({ error: gate.error }, gate.status);

    const { action, payload } = await req.json();

    switch (action) {
      case "stats": {
        const [{ count: userCount }, { count: pullPassCount }, { count: superLikeSwipes }, { count: likeCount }, { data: subs }] = await Promise.all([
          supabase.auth.admin.listUsers({ page: 1, perPage: 1 }).then((r) => ({ count: (r.data as any)?.total ?? r.data.users.length })),
          supabase.from("pullorpass_swipes").select("*", { count: "exact", head: true }),
          supabase.from("pokeiq_likes").select("*", { count: "exact", head: true }).eq("source", "super_like"),
          supabase.from("pokeiq_likes").select("*", { count: "exact", head: true }).in("source", ["swipe", "super_like"]),
          supabase
            .from("subscriptions")
            .select("status,environment,current_period_end")
            .eq("environment", "live"),
        ]);
        const swipeCount = (pullPassCount ?? 0) + (superLikeSwipes ?? 0);
        const now = Date.now();
        const activePro = (subs ?? []).filter((s: any) => {
          const end = s.current_period_end ? new Date(s.current_period_end).getTime() : null;
          return ["active", "trialing", "past_due"].includes(s.status) && (!end || end > now);
        }).length;
        return json({ userCount, swipeCount, likeCount, activePro });
      }

      case "list_users": {
        const search = (payload?.search ?? "").toString().toLowerCase().trim();
        const page = Number(payload?.page ?? 1);
        const perPage = 50;
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
        if (error) return json({ error: error.message }, 500);
        let users = data.users;
        if (search) users = users.filter((u) => (u.email ?? "").toLowerCase().includes(search));
        const ids = users.map((u) => u.id);
        const [{ data: subs }, { data: swipes }, { data: superLikes }] = await Promise.all([
          supabase.from("subscriptions").select("user_id,status,current_period_end,price_id").eq("environment", "live").in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
          supabase.from("pullorpass_swipes").select("user_id").in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]).range(0, 199999),
          supabase.from("pokeiq_likes").select("user_id").eq("source", "super_like").in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]).range(0, 199999),
        ]);
        const swipeMap = new Map<string, number>();
        (swipes ?? []).forEach((s: any) => swipeMap.set(s.user_id, (swipeMap.get(s.user_id) ?? 0) + 1));
        (superLikes ?? []).forEach((s: any) => swipeMap.set(s.user_id, (swipeMap.get(s.user_id) ?? 0) + 1));
        const now = Date.now();
        const subMap = new Map<string, any>();
        (subs ?? []).forEach((s: any) => {
          const end = s.current_period_end ? new Date(s.current_period_end).getTime() : null;
          const active = ["active", "trialing", "past_due"].includes(s.status) && (!end || end > now);
          const existing = subMap.get(s.user_id);
          if (!existing || active) subMap.set(s.user_id, { ...s, active });
        });
        const rows = users.map((u) => ({
          id: u.id,
          email: u.email,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
          swipe_count: swipeMap.get(u.id) ?? 0,
          is_pro: !!subMap.get(u.id)?.active,
          price_id: subMap.get(u.id)?.price_id ?? null,
        }));
        return json({ users: rows, page });
      }

      case "user_detail": {
        const userId = payload?.userId as string;
        if (!userId) return json({ error: "Missing userId" }, 400);
        const { data: u } = await supabase.auth.admin.getUserById(userId);
        const [{ data: profile }, { data: subs }, { count: pullPassCount }, { count: superLikeCount }, { data: recentSwipes }, { count: likeCount }, { data: recentLikes }, { data: dna }] = await Promise.all([
          supabase.from("user_profiles").select("*").eq("user_id", userId).maybeSingle(),
          supabase.from("subscriptions").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
          supabase.from("pullorpass_swipes").select("*", { count: "exact", head: true }).eq("user_id", userId),
          supabase.from("pokeiq_likes").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("source", "super_like"),
          supabase.from("pullorpass_swipes").select("card_name,card_set,card_price,decision,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
          supabase.from("pokeiq_likes").select("*", { count: "exact", head: true }).eq("user_id", userId).in("source", ["swipe", "super_like"]),
          supabase.from("pokeiq_likes").select("card_name,card_set,liked_at").eq("user_id", userId).order("liked_at", { ascending: false }).limit(20),
          supabase.from("pullorpass_dna").select("*").eq("user_id", userId).maybeSingle(),
        ]);
        const swipeCount = (pullPassCount ?? 0) + (superLikeCount ?? 0);
        const { data: smartProfile } = await supabase.from("pokeiq_profiles").select("*").eq("user_id", userId).maybeSingle();
        return json({
          user: u.user,
          profile,
          subscriptions: subs,
          swipeCount,
          recentSwipes,
          likeCount,
          recentLikes,
          dna,
          smartProfile,
        });
      }

      case "grant_pro": {
        const userId = payload?.userId as string;
        if (!userId) return json({ error: "Missing userId" }, 400);
        const farFuture = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString();
        const { data: existing } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("user_id", userId)
          .eq("environment", "live")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (existing) {
          await supabase
            .from("subscriptions")
            .update({
              status: "active",
              current_period_end: farFuture,
              price_id: "pro_monthly",
            })
            .eq("id", existing.id);
        } else {
          const stub = `admin_${userId}_${Date.now()}`;
          await supabase.from("subscriptions").insert({
            user_id: userId,
            environment: "live",
            status: "active",
            stripe_subscription_id: stub,
            stripe_customer_id: stub,
            product_id: "admin_grant",
            price_id: "pro_monthly",
            current_period_end: farFuture,
          });
        }
        return json({ ok: true });
      }

      case "revoke_pro": {
        const userId = payload?.userId as string;
        if (!userId) return json({ error: "Missing userId" }, 400);
        await supabase
          .from("subscriptions")
          .update({ status: "canceled", current_period_end: new Date().toISOString() })
          .eq("user_id", userId)
          .eq("environment", "live");
        return json({ ok: true });
      }

      default:
        return json({ error: "Unknown action" }, 400);
    }
  } catch (e) {
    console.error("admin-api error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});