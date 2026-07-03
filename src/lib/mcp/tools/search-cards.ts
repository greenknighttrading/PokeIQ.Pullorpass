import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

function sb() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "search_cards",
  title: "Search Pokemon cards",
  description:
    "Search the PokeIQ card catalog by name. Returns up to `limit` matching Pokemon cards with set, number, and rarity.",
  inputSchema: {
    query: z.string().min(1).describe("Card name or partial name to search for."),
    limit: z.number().int().min(1).max(50).default(10).describe("Max cards to return."),
    include_sealed: z.boolean().default(false).describe("Include sealed products in results."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit, include_sealed }) => {
    const client = sb();
    let q = client
      .from("cards_justtcg")
      .select("id,tcgplayer_id,name,set_name,set_code,number,rarity,is_sealed,game")
      .ilike("name", `%${query}%`)
      .eq("game", "pokemon")
      .limit(limit);
    if (!include_sealed) q = q.eq("is_sealed", false);
    const { data, error } = await q;
    if (error) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { cards: data ?? [] },
    };
  },
});