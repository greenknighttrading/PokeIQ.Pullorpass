/* PokeIQ Scoring Engine — FINAL PRODUCTION SPEC
 * Final Score = Asset Quality (60%) + Entry Timing (40%)
 */

export interface MoverCard {
  id: string;
  card_id: string;
  name: string;
  set_name: string | null;
  rarity: string | null;
  tcgplayer_id: string | null;
  price: number | null;
  price_change_7d: number | null;
  price_change_30d: number | null;
  price_change_90d: number | null;
  product_type: string;
  image_url?: string | null;
  min_price_7d?: number | null;
  max_price_7d?: number | null;
  min_price_30d?: number | null;
  max_price_30d?: number | null;
  min_price_90d?: number | null;
  max_price_90d?: number | null;
  trend_slope_30d?: number | null;
  cov_price_30d?: number | null;
}

// ─── Era Mapping ────────────────────────────────────────────────────────────

const ERA_KEYWORDS: { era: string; score: number; keywords: string[] }[] = [
  { era: 'WOTC', score: 30, keywords: ['base set', 'jungle', 'fossil', 'team rocket', 'gym heroes', 'gym challenge', 'neo genesis', 'neo discovery', 'neo revelation', 'neo destiny', 'expedition', 'aquapolis', 'skyridge', 'legendary collection', 'shadowless', '1st edition'] },
  { era: 'EX', score: 25, keywords: ['ex ruby', 'ex sapphire', 'ex sandstorm', 'ex dragon', 'ex team magma', 'ex hidden legends', 'ex firered', 'ex leafgreen', 'ex team rocket returns', 'ex deoxys', 'ex emerald', 'ex unseen forces', 'ex delta species', 'ex legend maker', 'ex holon phantoms', 'ex crystal guardians', 'ex dragon frontiers', 'ex power keepers'] },
  { era: 'DP', score: 22, keywords: ['diamond & pearl', 'diamond and pearl', 'mysterious treasures', 'secret wonders', 'great encounters', 'majestic dawn', 'legends awakened', 'stormfront'] },
  { era: 'HGSS', score: 22, keywords: ['heartgold', 'soulsilver', 'hgss', 'unleashed', 'undaunted', 'triumphant', 'call of legends'] },
  { era: 'BW', score: 20, keywords: ['black & white', 'black and white', 'noble victories', 'next destinies', 'dark explorers', 'dragons exalted', 'boundaries crossed', 'plasma storm', 'plasma freeze', 'plasma blast', 'legendary treasures'] },
  { era: 'XY', score: 18, keywords: ['xy', 'flashfire', 'furious fists', 'phantom forces', 'primal clash', 'roaring skies', 'ancient origins', 'breakthrough', 'breakpoint', 'fates collide', 'steam siege', 'evolutions', 'generations'] },
  { era: 'SM', score: 15, keywords: ['sun & moon', 'sun and moon', 'guardians rising', 'burning shadows', 'shining legends', 'crimson invasion', 'ultra prism', 'forbidden light', 'celestial storm', 'dragon majesty', 'lost thunder', 'team up', 'unbroken bonds', 'unified minds', 'hidden fates', 'cosmic eclipse'] },
  { era: 'SWSH', score: 10, keywords: ['sword & shield', 'sword and shield', 'rebel clash', 'darkness ablaze', 'champions path', 'vivid voltage', 'shining fates', 'battle styles', 'chilling reign', 'evolving skies', 'celebrations', 'fusion strike', 'brilliant stars', 'astral radiance', 'lost origin', 'silver tempest', 'crown zenith'] },
  { era: 'SV', score: 5, keywords: ['scarlet & violet', 'scarlet and violet', 'paldea evolved', 'obsidian flames', '151', 'paradox rift', 'paldean fates', 'temporal forces', 'twilight masquerade', 'shrouded fable', 'stellar crown', 'surging sparks', 'prismatic evolutions', 'journey together', 'destined rivals', 'perfect order', 'ascended heroes'] },
];

function getEraScore(setName: string | null): number {
  if (!setName) return 10; // unknown → middle
  const lower = setName.toLowerCase();
  for (const entry of ERA_KEYWORDS) {
    for (const kw of entry.keywords) {
      if (lower.includes(kw)) return entry.score;
    }
  }
  return 5; // default to current/in-print
}

function isLikelyOutOfPrint(setName: string | null): boolean | null {
  if (!setName) return null;
  const lower = setName.toLowerCase();
  // Current in-print sets (SV era, last ~2 years)
  const inPrintKeywords = ['surging sparks', 'prismatic evolutions', 'journey together', 'destined rivals', 'perfect order', 'ascended heroes', 'stellar crown', 'shrouded fable', 'twilight masquerade'];
  for (const kw of inPrintKeywords) {
    if (lower.includes(kw)) return false; // in print
  }
  // Older eras are definitely out of print
  for (const entry of ERA_KEYWORDS) {
    if (entry.score >= 15) { // SM and older
      for (const kw of entry.keywords) {
        if (lower.includes(kw)) return true; // out of print
      }
    }
  }
  return null; // unknown
}

function getAgeEstimateFromEra(eraScore: number): number {
  if (eraScore >= 30) return 20; // WOTC ~20+ years
  if (eraScore >= 25) return 17; // EX ~17 years
  if (eraScore >= 22) return 14; // DP/HGSS ~14 years
  if (eraScore >= 20) return 12; // BW ~12 years
  if (eraScore >= 18) return 9;  // XY ~9 years
  if (eraScore >= 15) return 6;  // SM ~6 years
  if (eraScore >= 10) return 3;  // SWSH ~3 years
  return 1; // SV/Current ~1 year
}

// ─── PART 1: Asset Quality Score (0–100) ────────────────────────────────────
// Weights: Age (30) + Trend & Stability (45) + Print Status (25) = 100

function getAssetScore(card: MoverCard): number {
  const eraScore = getEraScore(card.set_name);
  const ageYears = getAgeEstimateFromEra(eraScore);

  // 1) Age Score (max 30) — diminishing returns after 10 years
  let ageScore: number;
  if (ageYears < 1) ageScore = 0;
  else if (ageYears < 2) ageScore = 10;
  else if (ageYears < 5) ageScore = 15;
  else if (ageYears < 10) ageScore = 20;
  else ageScore = 30;

  // 2) Trend & Stability (max 45) — CoV of 30d prices + positive drift bonus
  let stabilityScore: number;
  const cov = card.cov_price_30d ?? null;
  if (cov == null) {
    stabilityScore = 22; // fallback: no 30d history
  } else {
    if (cov < 0.08) stabilityScore = 45;
    else if (cov < 0.15) stabilityScore = 38;
    else if (cov < 0.25) stabilityScore = 30;
    else if (cov < 0.40) stabilityScore = 18;
    else stabilityScore = 8;
  }
  // Positive drift bonus: +3 if 90d change is positive
  const c90 = card.price_change_90d ?? 0;
  if (c90 > 0) stabilityScore += 3;
  stabilityScore = Math.max(0, Math.min(45, stabilityScore));

  // 3) Print Status (max 25)
  const oop = isLikelyOutOfPrint(card.set_name);
  let printScore: number;
  if (oop === true) printScore = 25;
  else if (oop === false) printScore = 0;
  else printScore = 12; // unknown

  return Math.max(0, Math.min(100, ageScore + stabilityScore + printScore));
}

// ─── PART 2: Entry Timing Score (0–100) ─────────────────────────────────────
// Raw max = 150 → normalized to 100

function getTimingScore(card: MoverCard): number {
  const price = card.price;
  const c30 = card.price_change_30d ?? 0;
  const c90 = card.price_change_90d ?? 0;

  // High/Low for 90d range (fall back to 30d)
  const high90 = card.max_price_90d ?? card.max_price_30d ?? null;
  const low90 = card.min_price_90d ?? card.min_price_30d ?? null;

  // 1) Drawdown from 90d High (max 40)
  let drawdownScore = 5;
  if (price != null && high90 != null && high90 > 0) {
    const drawdown = (high90 - price) / high90;
    if (drawdown < 0.10) drawdownScore = 5;
    else if (drawdown < 0.25) drawdownScore = 15;
    else if (drawdown < 0.40) drawdownScore = 25;
    else if (drawdown < 0.60) drawdownScore = 35;
    else drawdownScore = 40;
  }

  // 2) Position in 90d Range (max 30)
  let rangeScore = 15;
  if (price != null && low90 != null && high90 != null && high90 > low90) {
    const pos = (price - low90) / (high90 - low90);
    if (pos <= 0.10) rangeScore = 30;
    else if (pos <= 0.30) rangeScore = 22;
    else if (pos <= 0.60) rangeScore = 15;
    else if (pos <= 0.80) rangeScore = 8;
    else rangeScore = 0;
  }

  // 3) Distance from 90d MA (max 25)
  let distanceScore = 10;
  if (price != null && c90 !== 0) {
    const estMa90 = price / (1 + c90 / 100);
    if (estMa90 > 0) {
      const distance = (price - estMa90) / estMa90;
      if (distance < -0.15) distanceScore = 25;
      else if (distance < 0) distanceScore = 18;
      else if (distance <= 0.15) distanceScore = 10;
      else distanceScore = 0;
    }
  }

  // 4) Acceleration vs Spike (max 20)
  let accelerationScore = 10;
  if (c90 !== 0 || c30 !== 0) {
    const ratio = Math.abs(c30) / Math.max(Math.abs(c90), 0.01);
    if (ratio < 1.2) accelerationScore = 20;
    else if (ratio <= 2.0) accelerationScore = 10;
    else accelerationScore = 0;
  }

  // 5) Momentum Confirmation (max 20)
  let momentumScore = 0;
  if (c90 > 0) momentumScore += 10;
  if (c30 > 0) momentumScore += 10;

  // 6) Breakout Bonus (+15)
  let breakoutBonus = 0;
  if (price != null && low90 != null && high90 != null && high90 > low90) {
    const pos = (price - low90) / (high90 - low90);
    if (pos > 0.90 && c90 > 20 && c30 > 10) {
      breakoutBonus = 15;
    }
  }

  // 7) Falling Knife Penalty (-15)
  const fallingKnifePenalty = (c30 < -40 && c90 < -40) ? 15 : 0;

  // Normalize to 0–100 (raw max = 150)
  const rawTiming = drawdownScore + rangeScore + distanceScore + accelerationScore + momentumScore + breakoutBonus;
  let timingScore = (rawTiming / 150) * 100;
  timingScore -= fallingKnifePenalty;
  return Math.max(0, Math.min(100, Math.round(timingScore)));
}

// ─── New Release Detection ──────────────────────────────────────────────────
// Sets released within the last ~30 days have inflated prices → penalty of -10

const NEW_RELEASE_KEYWORDS = ['perfect order', 'ascended heroes'];

function isNewRelease(setName: string | null): boolean {
  if (!setName) return false;
  const lower = setName.toLowerCase();
  return NEW_RELEASE_KEYWORDS.some(kw => lower.includes(kw));
}

// ─── PART 3: Final Buy Score ────────────────────────────────────────────────

export interface BuyScoreResult {
  assetScore: number;
  timingScore: number;
  buyScore: number;
  isNewRelease?: boolean;
}

export function getBuyScore(card: MoverCard): BuyScoreResult {
  const assetScore = getAssetScore(card);
  const timingScore = getTimingScore(card);
  let buyScore = Math.round(assetScore * 0.6 + timingScore * 0.4);

  // New release penalty: prices are inflated in the first month
  const newRelease = isNewRelease(card.set_name);
  if (newRelease) {
    buyScore = Math.max(0, buyScore - 10);
  }

  return { assetScore, timingScore, buyScore, isNewRelease: newRelease };
}

// Keep legacy name as alias for backward compat during transition
export function getQuickScore(card: MoverCard): number {
  return getBuyScore(card).buyScore;
}

// ─── PART 4: Recommendation Labels ─────────────────────────────────────────

export function getRecommendation(score: number, card?: MoverCard): { label: string; color: string; tooltip?: string } {
  const c30 = card?.price_change_30d ?? 0;
  const c90 = card?.price_change_90d;
  const trendRef = c90 != null ? c90 : c30;
  const isDowntrend = c30 < 0 || (c90 != null && c90 < 0);
  const isUptrend = c30 > 0 && trendRef > 0;

  // Asset floor safety rule: low-quality assets cannot be Buy/Strong Buy
  const assetScore = card ? getAssetScore(card) : 100;

  // Compute drawdown tooltip if applicable
  let drawdownTooltip: string | undefined;
  if (card) {
    const price = card.price;
    const high90 = card.max_price_90d ?? card.max_price_30d ?? null;
    if (price != null && high90 != null && high90 > 0) {
      const drawdown = (high90 - price) / high90;
      const pct = Math.round(drawdown * 100);
      if (drawdown >= 0.25) drawdownTooltip = `Price is ${pct}% below its recent high — could be a good time to buy the dip.`;
    }
  }

  // Base label determination
  let label: string;
  let color: string;
  let tooltip: string | undefined;

  if (score >= 80) {
    label = 'STRONG BUY ZONE'; color = 'text-success';
    tooltip = drawdownTooltip ?? 'Strong asset at a great price. High confidence entry.';
  } else if (score >= 65) {
    label = 'BUY ZONE'; color = 'text-success';
    tooltip = drawdownTooltip ?? 'Good entry point for long-term holding.';
  } else if (isDowntrend && score >= 40) {
    label = 'BUY ZONE'; color = 'text-success';
    tooltip = drawdownTooltip ?? 'The price has dropped, which means you could be getting a discount. Score is boosted because dips on decent cards can be buying opportunities.';
  } else if (isUptrend && score >= 50) {
    label = 'MODERATE BUY'; color = 'text-blue-400';
    tooltip = drawdownTooltip ?? 'Price is rising but you may be paying a premium. Consider waiting for a dip.';
  } else if (score >= 35) {
    label = 'WAIT'; color = 'text-yellow-400';
    tooltip = drawdownTooltip ?? 'No strong buy signal right now.';
  } else {
    label = 'HIGHER RISK'; color = 'text-orange-400';
    tooltip = drawdownTooltip ?? 'Asset quality or timing risk is elevated.';
  }

  // CRITICAL SAFETY RULE — Asset Floor
  // Low-quality assets (asset_score < 30) cannot be Buy/Strong Buy
  if (assetScore < 30 && (label === 'STRONG BUY ZONE' || label === 'BUY ZONE')) {
    label = 'MODERATE BUY'; color = 'text-blue-400';
    tooltip = 'This card is newer or less proven, so the score is capped. Wait for more price history before going heavy.';
  }

  return { label, color, tooltip };
}

// ─── Shared Utilities ───────────────────────────────────────────────────────

export function getPriceRange(card: MoverCard, time: string): { min: number | null; max: number | null } {
  if (time === '7d') return { min: card.min_price_7d ?? null, max: card.max_price_7d ?? null };
  if (time === '90d') return { min: card.min_price_90d ?? null, max: card.max_price_90d ?? null };
  return { min: card.min_price_30d ?? null, max: card.max_price_30d ?? null };
}

export function getImageUrl(card: MoverCard) {
  if (card.image_url) return card.image_url;
  return card.tcgplayer_id ? `https://product-images.tcgplayer.com/fit-in/437x437/${card.tcgplayer_id}.jpg` : null;
}

export function getChangeForTime(card: MoverCard, time: string): number | null {
  if (time === '24h') return (card as any).price_change_24h ?? card.price_change_7d;
  if (time === '30d') return card.price_change_30d;
  if (time === '90d') return card.price_change_90d;
  return card.price_change_7d;
}
