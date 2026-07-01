const IMPACT_URL = "https://partner.tcgplayer.com/c/7227808/1780961/21018";

/**
 * Wrap any TCGplayer product/search URL with the PokeIQ affiliate redirect.
 * Use this everywhere we link users out to tcgplayer.com.
 */
export function getAffiliateUrl(tcgplayerUrl: string): string {
  return `${IMPACT_URL}?u=${encodeURIComponent(tcgplayerUrl)}`;
}