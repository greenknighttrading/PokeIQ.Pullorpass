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
  name: "get_card_prices",
  title: "Get card prices",
  description:
    "Get current market prices for all variants (condition/printing/language) of a specific card by its PokeIQ card id. Use search_cards first to find the id.",
  inputSchema: {
    card_id: z.string().min(1).describe("The card id returned by search_cards."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ card_id }) => {
    const client = sb();
    const [cardRes, variantsRes] = await Promise.all([
      client
        .from("cards_justtcg")
        .select("id,name,set_name,number,rarity")
        .eq("id", card_id)
        .maybeSingle(),
      client
        .from("variants_justtcg")
        .select("condition,printing,language,price_current,last_updated")
        .eq("card_id", card_id)
        .order("price_current", { ascending: false }),
    ]);
    if (cardRes.error) {
      return { content: [{ type: "text", text: `Error: ${cardRes.error.message}` }], isError: true };
    }
    if (!cardRes.data) {
      return { content: [{ type: "text", text: `No card with id ${card_id}` }], isError: true };
    }
    const payload = { card: cardRes.data, variants: variantsRes.data ?? [] };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});