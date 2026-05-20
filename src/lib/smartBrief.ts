import type { MoverCard } from '@/components/buylist/shared/signalHelpers';

export interface BriefSignal {
  name: string;
  setName?: string;
  change7d: number;
  price: number;
  why: string;
  confidence: 'High' | 'Medium' | 'Low-Medium' | 'Speculative';
  id?: string | number;
}

export interface BriefOpportunity {
  name: string;
  setName?: string;
  price: number;
  why: string;
  risk: string;
  confidence: number; // 0-10
  id?: string | number;
}

export interface BriefQuickNews {
  title: string;
  why: string;
  url?: string;
}

export interface BriefEraPerformance {
  era: string;
  label: string;
  pct7d: number;
  count: number;
  topCard?: { name: string; pct: number; price: number };
}

export interface SmartBrief {
  generatedAt: string;
  eraLabel: string;
  budget: number;
  snapshot: string[]; // 3-5 sentences
  whatChanged: string[]; // up to 4 bullets
  strongestSignals: BriefSignal[]; // 2-3
  weakening: { name: string; detail: string }[]; // 1-2
  opportunity: BriefOpportunity | null;
  insight: string;
  quickNews: BriefQuickNews[];
  closing: string;
  eraPerformance: BriefEraPerformance[];
  eraCommentary: string;
}

export interface BriefInputs {
  items: any[];
  allMovers: MoverCard[];
  dbCounts: { cards: number; cardsUp: number; cardsDown: number; cardsUpPct: number };
  topSets7d: Map<string, number>;
  sealedPicks: MoverCard[];
  cardPicks: MoverCard[];
  headlines: { title: string; url: string; excerpt?: string }[];
  summary: { totalMarketValue: number; unrealizedPL: number; unrealizedPLPercent: number } | null;
  eraLabel: string;
  budget: number;
  collectingStyle: string;
  eraPerformance?: BriefEraPerformance[];
}

// Liquidity-weighted score: filter noise by requiring real price exposure.
function liquidityScore(m: MoverCard): number {
  const p = m.price ?? 0;
  const c = Math.abs(m.price_change_7d ?? 0);
  // Penalize moves where price is tiny (low liquidity proxy)
  if (p < 10) return 0;
  return Math.log10(p + 1) * c;
}

function confidenceFor(m: MoverCard): BriefSignal['confidence'] {
  const p = m.price ?? 0;
  const c = Math.abs(m.price_change_7d ?? 0);
  if (p >= 75 && c >= 5 && c <= 40) return 'High';
  if (p >= 30 && c <= 60) return 'Medium';
  if (c > 80) return 'Speculative';
  return 'Low-Medium';
}

function closingLine(seed: number): string {
  const lines = [
    'The best collections are built patiently.',
    'Momentum changes fast. Conviction changes slower.',
    'Collect intentionally.',
    'Strong markets reward patience.',
    'Signal beats noise. Always.',
  ];
  return lines[seed % lines.length];
}

export function generateSmartBrief(inp: BriefInputs): SmartBrief {
  const { allMovers, dbCounts, topSets7d, sealedPicks, cardPicks, headlines, summary, eraLabel, budget, collectingStyle, eraPerformance = [] } = inp;

  // Sets ranked
  const setEntries = Array.from(topSets7d.entries()).filter(([n]) => n && n.length > 1);
  const topSets = [...setEntries].sort((a, b) => b[1] - a[1]);
  const coolingSets = [...setEntries].sort((a, b) => a[1] - b[1]);
  const topSet = topSets[0];
  const secondSet = topSets[1];
  const coolingSet = coolingSets[0];

  const titleCase = (s: string) =>
    s.replace(/\b\w/g, (c) => c.toUpperCase());

  // Sentiment
  const sentiment = dbCounts.cardsUpPct >= 55 ? 'buyer-led' : dbCounts.cardsUpPct < 45 ? 'seller-led' : 'mixed';

  // Snapshot — 3-5 data-backed sentences
  const snapshot: string[] = [];
  // Lead with the general market pulse
  snapshot.push(
    `The broader Pokémon market is ${sentiment}: ${dbCounts.cardsUpPct}% of ${dbCounts.cards.toLocaleString()} tracked cards traded higher over the last 7 days, with ${dbCounts.cardsUp.toLocaleString()} up versus ${dbCounts.cardsDown.toLocaleString()} down.`
  );
  if (topSet) {
    const second = secondSet ? ` and ${titleCase(secondSet[0])} (${secondSet[1] >= 0 ? '+' : ''}${secondSet[1].toFixed(1)}%)` : '';
    snapshot.push(
      `At the set level, ${titleCase(topSet[0])} led movement, up ${topSet[1].toFixed(1)}%${second}.`
    );
  }
  if (summary) {
    const sign = summary.unrealizedPL >= 0 ? 'outperformed' : 'lagged';
    snapshot.push(
      `Your portfolio ${sign} expectations with ${summary.unrealizedPL >= 0 ? '+' : ''}${summary.unrealizedPLPercent.toFixed(1)}% unrealized P/L on $${summary.totalMarketValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} of exposure, currently weighted toward ${collectingStyle.replace('-', ' ')}.`
    );
  }
  if (coolingSet && coolingSet[1] < 0) {
    snapshot.push(`Cooling areas this week include ${titleCase(coolingSet[0])} (${coolingSet[1].toFixed(1)}%), suggesting buyers rotated away from that pocket.`);
  }

  // What changed today — comparative bullets
  const whatChanged: string[] = [];
  if (topSet && secondSet) {
    whatChanged.push(`${titleCase(topSet[0])} overtook ${titleCase(secondSet[0])} in weekly momentum`);
  }
  if (coolingSet && coolingSet[1] < 0) {
    whatChanged.push(`${titleCase(coolingSet[0])} cooled after recent gains`);
  }
  if (dbCounts.cardsUpPct >= 55) {
    whatChanged.push(`Seller pressure weakened — ${dbCounts.cardsUpPct}% of tracked cards moved higher`);
  } else if (dbCounts.cardsUpPct < 45) {
    whatChanged.push(`Buyer pressure faded — only ${dbCounts.cardsUpPct}% of tracked cards held green`);
  }
  const liquidGainers = [...allMovers]
    .filter((m) => (m.price ?? 0) >= 25 && (m.price_change_7d ?? 0) > 5 && (m.price_change_7d ?? 0) < 80)
    .sort((a, b) => liquidityScore(b) - liquidityScore(a));
  if (liquidGainers[0]) {
    whatChanged.push(`${liquidGainers[0].name} saw unusually strong transaction activity`);
  }

  // Strongest signals — liquidity weighted
  const ranked = [...allMovers]
    .filter((m) => (m.price ?? 0) >= 10 && Math.abs(m.price_change_7d ?? 0) >= 3)
    .sort((a, b) => liquidityScore(b) - liquidityScore(a));
  const speculative = [...allMovers]
    .filter((m) => (m.price_change_7d ?? 0) > 80 && (m.price ?? 0) >= 5)
    .sort((a, b) => (b.price_change_7d ?? 0) - (a.price_change_7d ?? 0));

  const strongestSignals: BriefSignal[] = [];
  for (const m of ranked.slice(0, 2)) {
    const dir = (m.price_change_7d ?? 0) >= 0 ? 'building' : 'fading';
    strongestSignals.push({
      id: m.card_id || m.id,
      name: m.name,
      setName: m.set_name,
      change7d: m.price_change_7d ?? 0,
      price: m.price ?? 0,
      why: `Momentum continues ${dir} on meaningful price exposure ($${(m.price ?? 0).toFixed(0)}), suggesting sustained demand rather than a thin-volume spike.`,
      confidence: confidenceFor(m),
    });
  }
  if (speculative[0]) {
    const m = speculative[0];
    strongestSignals.push({
      id: m.card_id || m.id,
      name: m.name,
      setName: m.set_name,
      change7d: m.price_change_7d ?? 0,
      price: m.price ?? 0,
      why: 'One of the strongest weekly moves in the market, though transaction depth at this price point remains relatively thin.',
      confidence: 'Low-Medium',
    });
  }

  // Weakening areas
  const weakening: { name: string; detail: string }[] = [];
  if (coolingSet && coolingSet[1] < 0) {
    weakening.push({
      name: titleCase(coolingSet[0]),
      detail: `Momentum continues softening (${coolingSet[1].toFixed(1)}% 7D) after several weeks of stronger prints.`,
    });
  }
  const liquidLosers = [...allMovers]
    .filter((m) => (m.price ?? 0) >= 30 && (m.price_change_7d ?? 0) < -3)
    .sort((a, b) => liquidityScore(b) - liquidityScore(a));
  if (liquidLosers[0]) {
    weakening.push({
      name: liquidLosers[0].name,
      detail: `Demand has cooled measurably this week (${(liquidLosers[0].price_change_7d ?? 0).toFixed(1)}% 7D at $${(liquidLosers[0].price ?? 0).toFixed(0)}).`,
    });
  }

  // Opportunity — single best within budget, prefer sealed if collecting style favors it
  const pool = collectingStyle === 'sealed-heavy' || collectingStyle === 'balanced'
    ? [...sealedPicks, ...cardPicks]
    : [...cardPicks, ...sealedPicks];
  const opportunityCandidate = pool
    .filter((m) => (m.price ?? 0) > 5 && (m.price ?? 0) <= budget)
    .map((m) => {
      const ch = m.price_change_7d ?? 0;
      // Score: prefer steady positive momentum, penalize speculative spikes
      const score = ch > 0 && ch < 25 ? ch * Math.log10((m.price ?? 0) + 1) : ch * 0.2;
      return { m, score };
    })
    .sort((a, b) => b.score - a.score)[0]?.m;

  const opportunity: BriefOpportunity | null = opportunityCandidate
    ? {
        id: opportunityCandidate.card_id || opportunityCandidate.id,
        name: opportunityCandidate.name,
        setName: opportunityCandidate.set_name,
        price: opportunityCandidate.price ?? 0,
        why: `Sits within your $${budget} budget with consistent positive movement (${(opportunityCandidate.price_change_7d ?? 0).toFixed(1)}% 7D) — supply appears to be tightening while price still trails comparable products.`,
        risk: 'Print volume and broader sealed sentiment can shift; size accordingly.',
        confidence: Math.min(9, Math.max(5, 6 + ((opportunityCandidate.price_change_7d ?? 0) / 20))),
      }
    : null;

  // Insight — time-specific
  const sealedAvg = sealedPicks.length
    ? sealedPicks.reduce((s, m) => s + (m.price_change_7d ?? 0), 0) / sealedPicks.length
    : 0;
  const cardAvg = cardPicks.length
    ? cardPicks.reduce((s, m) => s + (m.price_change_7d ?? 0), 0) / cardPicks.length
    : 0;
  let insight: string;
  if (sealedAvg > cardAvg + 1) {
    insight = `This week, sealed products within budget are averaging ${sealedAvg.toFixed(1)}% 7D versus ${cardAvg.toFixed(1)}% for singles — buyers currently prefer lower-variance sealed exposure over single-card speculation.`;
  } else if (cardAvg > sealedAvg + 1) {
    insight = `Singles are outpacing sealed this week (${cardAvg.toFixed(1)}% vs ${sealedAvg.toFixed(1)}% 7D in your budget band), pointing to renewed appetite for chase-card risk relative to sealed.`;
  } else {
    insight = `Sealed and singles are moving together this week (${sealedAvg.toFixed(1)}% vs ${cardAvg.toFixed(1)}% 7D), suggesting broad market direction rather than a clear style rotation.`;
  }

  // Quick news
  const quickNews: BriefQuickNews[] = (headlines || []).slice(0, 3).map((h) => ({
    title: h.title,
    url: h.url,
    why: 'Sentiment shifts around new product news often drive short-term sealed and adjacent single-card demand.',
  }));

  const seed = Math.floor(Date.now() / 86400000);

  // Era commentary
  const sortedEras = [...eraPerformance].filter(e => e.count > 0).sort((a, b) => b.pct7d - a.pct7d);
  let eraCommentary = '';
  if (sortedEras.length > 0) {
    const lead = sortedEras[0];
    const lag = sortedEras[sortedEras.length - 1];
    if (sortedEras.length >= 2 && lead.label !== lag.label) {
      eraCommentary = `${lead.label} is leading your tracked eras at ${lead.pct7d >= 0 ? '+' : ''}${lead.pct7d.toFixed(1)}% 7D, while ${lag.label} is lagging at ${lag.pct7d >= 0 ? '+' : ''}${lag.pct7d.toFixed(1)}%. Rotation is favoring ${lead.label} demand right now.`;
    } else {
      eraCommentary = `${lead.label} is averaging ${lead.pct7d >= 0 ? '+' : ''}${lead.pct7d.toFixed(1)}% 7D across ${lead.count} tracked cards — the dominant era in your view.`;
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    eraLabel,
    budget,
    snapshot: snapshot.slice(0, 5),
    whatChanged: whatChanged.slice(0, 4),
    strongestSignals: strongestSignals.slice(0, 3),
    weakening: weakening.slice(0, 2),
    opportunity,
    insight,
    quickNews,
    closing: closingLine(seed),
    eraPerformance: sortedEras,
    eraCommentary,
  };
}

const STORAGE_KEY = 'smartFeedBrief:v1';

export function saveBriefToSession(brief: SmartBrief) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(brief));
  } catch {
    /* ignore */
  }
}

export function loadBriefFromSession(): SmartBrief | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SmartBrief;
  } catch {
    return null;
  }
}