import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/* ── Types ── */

export interface PPTCard {
  id: string;
  tcgPlayerId: string;
  name: string;
  setName: string;
  cardNumber: string;
  totalSetNumber: string;
  rarity: string;
  cardType: string;
  pokemonType: string;
  energyType: string[];
  hp: number;
  stage: string;
  flavorText: string;
  artist: string;
  tcgPlayerUrl: string;
  prices: {
    market: number | null;
    low: number | null;
    listings: number | null;
    sellers: number | null;
    primaryCondition: string;
    primaryPrinting: string;
    lastUpdated: string;
  };
  imageCdnUrl: string;
  imageCdnUrl200: string;
  imageCdnUrl400: string;
  imageCdnUrl800: string;
  priceHistory?: Array<{
    date: string;
    price: number;
    condition: string;
  }>;
  ebayData?: any;
}

export interface PPTSet {
  id: string;
  name: string;
  tcgPlayerId: string;
  totalCards: number;
  releaseDate: string;
  series: string;
  logoUrl: string;
}

export interface PPTSealedProduct {
  id: string;
  tcgPlayerId: string;
  name: string;
  setName: string;
  category: string;
  prices: {
    market: number | null;
    low: number | null;
  };
  imageCdnUrl: string;
}

interface PPTResponse<T> {
  data: T;
  metadata: {
    total: number;
    count: number;
    limit: number;
    offset: number;
    hasMore: boolean;
    language: string;
  };
}

/* ── Core caller ── */

async function callPPT<T>(action: string, params?: Record<string, any>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('pokemon-price-tracker', {
    body: { action, params },
  });

  if (error) throw new Error(error.message || 'Failed to call Pokemon Price Tracker API');
  if (data?.error) throw new Error(data.error);
  return data;
}

/* ── Hooks ── */

/** Search cards with flexible params */
export function usePPTSearchCards(search: string, options?: {
  language?: string;
  limit?: number;
  includeHistory?: boolean;
  days?: number;
  minPrice?: number;
  maxPrice?: number;
}, enabled = true) {
  return useQuery({
    queryKey: ['ppt', 'search', search, options],
    queryFn: () => callPPT<PPTResponse<PPTCard[]>>('searchCards', { search, ...options }),
    enabled: enabled && search.length >= 2,
    staleTime: 1000 * 60 * 5,
  });
}

/** Get a specific card by TCGPlayer ID with optional history & eBay data */
export function usePPTGetCard(tcgPlayerId: string, options?: {
  language?: string;
  includeHistory?: boolean;
  includeEbay?: boolean;
  days?: number;
}, enabled = true) {
  return useQuery({
    queryKey: ['ppt', 'card', tcgPlayerId, options],
    queryFn: () => callPPT<PPTResponse<PPTCard>>('getCardById', { tcgPlayerId, ...options }),
    enabled: enabled && !!tcgPlayerId,
    staleTime: 1000 * 60 * 10,
  });
}

/** Get all sets */
export function usePPTGetSets(language = 'english') {
  return useQuery({
    queryKey: ['ppt', 'sets', language],
    queryFn: () => callPPT<PPTResponse<PPTSet[]>>('getSets', { language, limit: 200 }),
    staleTime: 1000 * 60 * 60,
  });
}

/** Get sealed products */
export function usePPTGetSealedProducts(params?: Record<string, any>) {
  return useQuery({
    queryKey: ['ppt', 'sealed', params],
    queryFn: () => callPPT<PPTResponse<PPTSealedProduct[]>>('getSealedProducts', params),
    staleTime: 1000 * 60 * 30,
  });
}

/** Get graded population data */
export function usePPTGetPopulation(params: Record<string, any>, enabled = true) {
  return useQuery({
    queryKey: ['ppt', 'population', params],
    queryFn: () => callPPT<any>('getPopulation', params),
    enabled,
    staleTime: 1000 * 60 * 60,
  });
}

/** Direct function call (non-hook) for use in callbacks */
export const pptApi = {
  searchCards: (search: string, params?: Record<string, any>) =>
    callPPT<PPTResponse<PPTCard[]>>('searchCards', { search, ...params }),
  getCardById: (tcgPlayerId: string, params?: Record<string, any>) =>
    callPPT<PPTResponse<PPTCard>>('getCardById', { tcgPlayerId, ...params }),
  getSets: (params?: Record<string, any>) =>
    callPPT<PPTResponse<PPTSet[]>>('getSets', params),
  getSealedProducts: (params?: Record<string, any>) =>
    callPPT<PPTResponse<PPTSealedProduct[]>>('getSealedProducts', params),
  getPopulation: (params?: Record<string, any>) =>
    callPPT<any>('getPopulation', params),
  parseTitle: (title: string) =>
    callPPT<any>('parseTitle', { title }),
};
