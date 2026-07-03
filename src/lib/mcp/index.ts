import { defineMcp } from "@lovable.dev/mcp-js";
import searchCards from "./tools/search-cards";
import getCardPrices from "./tools/get-card-prices";
import listTrendingPokemon from "./tools/list-trending-pokemon";

export default defineMcp({
  name: "pokeiq-mcp",
  title: "PokeIQ MCP",
  version: "0.1.0",
  instructions:
    "Tools for the PokeIQ Pokemon card market intelligence app. Use `search_cards` to find cards by name, `get_card_prices` to look up current market prices for a card's variants, and `list_trending_pokemon` to see which Pokemon are hottest over the last 7 days.",
  tools: [searchCards, getCardPrices, listTrendingPokemon],
});