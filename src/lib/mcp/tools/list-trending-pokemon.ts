import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

declare const process: { env: Record<string, string | undefined> };

function sb() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_trending_pokemon",
  title: "List trending Pokemon",
  description:
    "Return the top trending Pokemon over the last 7 days, ranked by average price change across their cards (PokeIQ Greatest Hits index).",
  inputSchema: {
    limit: z.number().int().min(1).max(50).default(15).describe("Max Pokemon to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }) => {
    const client = sb();
    const { data: latest } = await client
      .from("greatest_hits_cache")
      .select("snapshot_date")
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!latest?.snapshot_date) {
      return { content: [{ type: "text", text: "No trending data available." }], structuredContent: { trending: [] } };
    }
    const { data, error } = await client
      .from("greatest_hits_cache")
      .select("pokemon_name,avg_change_7d,card_count")
      .eq("snapshot_date", latest.snapshot_date)
      .order("avg_change_7d", { ascending: false })
      .limit(limit);
    if (error) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }
    const payload = { snapshot_date: latest.snapshot_date, trending: data ?? [] };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});