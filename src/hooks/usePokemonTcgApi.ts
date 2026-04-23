import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PokemonCard {
  id: string;
  internalId: number;
  name: string;
  nameNumbered: string;
  supertype: string;
  hp: string | number;
  number: string;
  artist: string;
  rarity: string;
  slug: string;
  cardType: string;
  set: {
    id: string;
    name: string;
    series: string;
    code: string;
    releaseDate: string;
    images: {
      logo: string | null;
    };
  };
  images: {
    small: string | null;
    large: string | null;
  };
  tcgplayer: {
    marketPrice: number | null;
    midPrice: number | null;
    currency: string;
  } | null;
  cardmarket: {
    lowestNearMint: number | null;
    avg30: number | null;
    avg7: number | null;
    currency: string;
  } | null;
  marketPrice: number | null;
  links: Record<string, string>;
  tcggoUrl: string | null;
}

interface PokemonSet {
  id: string;
  name: string;
  series: string;
  code: string;
  releaseDate: string;
  images: {
    logo: string | null;
  };
}

interface ApiResponse<T> {
  data: T;
  totalCount?: number;
  page?: number;
  pageSize?: number;
}

async function callPokemonTcgApi<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('pokemon-tcg', {
    body,
  });

  if (error) {
    throw new Error(error.message || 'Failed to call Pokemon TCG API');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data;
}

// Hook to search cards by name
export function useSearchCards(query: string, enabled = true) {
  return useQuery({
    queryKey: ['pokemon-tcg', 'search', query],
    queryFn: () => callPokemonTcgApi<ApiResponse<PokemonCard[]>>({
      action: 'searchByName',
      query,
    }),
    enabled: enabled && query.length >= 2,
    staleTime: 1000 * 60 * 5,
  });
}

// Hook to search cards by set and name
export function useSearchCardsBySetAndName(setName: string, cardName: string, enabled = true) {
  return useQuery({
    queryKey: ['pokemon-tcg', 'searchBySet', setName, cardName],
    queryFn: () => callPokemonTcgApi<ApiResponse<PokemonCard[]>>({
      action: 'searchBySetAndName',
      query: JSON.stringify({ setName, cardName }),
    }),
    enabled: enabled && (setName.length >= 2 || cardName.length >= 2),
    staleTime: 1000 * 60 * 5,
  });
}

// Hook to get a specific card by ID
export function useGetCard(cardId: string, enabled = true) {
  return useQuery({
    queryKey: ['pokemon-tcg', 'card', cardId],
    queryFn: () => callPokemonTcgApi<{ data: PokemonCard }>({
      action: 'getCard',
      cardId,
    }),
    enabled: enabled && !!cardId,
    staleTime: 1000 * 60 * 30,
  });
}

// Hook to get all sets
export function useGetSets() {
  return useQuery({
    queryKey: ['pokemon-tcg', 'sets'],
    queryFn: () => callPokemonTcgApi<ApiResponse<PokemonSet[]>>({
      action: 'getSets',
    }),
    staleTime: 1000 * 60 * 60,
  });
}

// Mutation for one-off searches (useful for autocomplete)
export function useCardSearchMutation() {
  return useMutation({
    mutationFn: (query: string) => callPokemonTcgApi<ApiResponse<PokemonCard[]>>({
      action: 'searchByName',
      query,
      pageSize: 10,
    }),
  });
}

export type { PokemonSet, ApiResponse };
