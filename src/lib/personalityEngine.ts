// PokeIQ Collector Personality Engine — V4
// Identity-first: 9 archetypes, 24 questions, no modifiers.

export interface QuizQuestion {
  id: number;
  text: string;
  section: string;
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  // Section 1 — Patience & Decision Making
  { id: 1, text: "I'm comfortable holding cards for years without needing immediate results.", section: "Patience & Decision Making" },
  { id: 2, text: "I rarely panic when Pokémon prices suddenly rise or fall.", section: "Patience & Decision Making" },
  { id: 3, text: "I would rather miss an opportunity than make a rushed purchase.", section: "Patience & Decision Making" },
  { id: 4, text: "I prefer steady growth over quick wins.", section: "Patience & Decision Making" },

  // Section 2 — Emotional Connection
  { id: 5, text: "Some cards feel meaningful to me beyond their market value.", section: "Emotional Connection" },
  { id: 6, text: "My favorite cards usually have a personal story or emotional connection.", section: "Emotional Connection" },
  { id: 7, text: "I care more about owning cards I truly love than owning the \u201Cbest investments.\u201D", section: "Emotional Connection" },
  { id: 8, text: "The memories attached to a card can matter as much as the card itself.", section: "Emotional Connection" },

  // Section 3 — Risk & Activity
  { id: 9, text: "I enjoy buying, selling, or trading cards regularly.", section: "Risk & Activity" },
  { id: 10, text: "I like keeping part of my collection flexible in case new opportunities appear.", section: "Risk & Activity" },
  { id: 11, text: "I'm comfortable taking risks on cards or products others overlook.", section: "Risk & Activity" },
  { id: 12, text: "I enjoy the excitement of making a bold collecting move.", section: "Risk & Activity" },

  // Section 4 — Identity & Presentation
  { id: 13, text: "I enjoy organizing my collection in a visually satisfying way.", section: "Identity & Presentation" },
  { id: 14, text: "I want my collection to feel intentional, not random.", section: "Identity & Presentation" },
  { id: 15, text: "Owning iconic or centerpiece cards matters to me.", section: "Identity & Presentation" },
  { id: 16, text: "I care about how my collection looks when displayed as a whole.", section: "Identity & Presentation" },

  // Section 5 — Discovery & Exploration
  { id: 17, text: "I enjoy exploring newer or less proven Pokémon products.", section: "Discovery & Exploration" },
  { id: 18, text: "I often research cards deeply before making decisions.", section: "Discovery & Exploration" },
  { id: 19, text: "I enjoy discovering trends before they become mainstream.", section: "Discovery & Exploration" },
  { id: 20, text: "I like learning parts of the hobby most collectors overlook.", section: "Discovery & Exploration" },

  // Section 6 — Structure & Balance
  { id: 21, text: "I prefer balancing my collection across different eras or product types.", section: "Structure & Balance" },
  { id: 22, text: "I usually think about how new purchases fit into my collection as a whole.", section: "Structure & Balance" },
  { id: 23, text: "I see my Pokémon collection as something I'm building long-term.", section: "Structure & Balance" },
  { id: 24, text: "I enjoy refining and improving my collection over time.", section: "Structure & Balance" },
];

export type LikertValue = 1 | 2 | 3 | 4 | 5;
export type Answers = Record<number, LikertValue>;

export type PersonalityType =
  | 'Investor'
  | 'Archivist'
  | 'Dreamer'
  | 'Flipper'
  | 'Analyst'
  | 'Hunter'
  | 'Explorer'
  | 'Curator'
  | 'Diplomat';

export interface TraitScores {
  patience: number;
  activity: number;
  emotion: number;
  analysis: number;
  conviction: number;
  structure: number;
  curiosity: number;
  balance: number;
}

export interface ProductAllocation {
  sealedPct: number;
  gradedPct: number;
  rawPct: number;
}

export interface EraAllocation {
  vintage: number;
  classic: number;
  modern: number;
  ultraModern: number;
  current: number;
}

export interface PersonalityResult {
  type: PersonalityType;
  traits: TraitScores;
  productAllocation: ProductAllocation;
  eraAllocation: EraAllocation;
  summary: string;
  strength: string;
  weakness: string;
  dangerZone: string;
  recommendedAction: string;
  // Kept for SimulatorContext null-checks and any legacy reads.
  primaryType?: PersonalityType;
}

// ---------- Static content per archetype ----------

export interface PersonalityInfo {
  emoji: string;
  philosophy: string;       // one-liner
  summary: string;          // emotionally resonant short paragraph
  coreTraits: string[];     // 4 chips
  strength: string;
  weakness: string;
  collectionStyle: string[];
  famousBehavior: string;
  dangerZone: string;
  recommendedAction: string;
}

export const PERSONALITY_INFO: Record<PersonalityType, PersonalityInfo> = {
  Investor: {
    emoji: '\uD83E\uDDF1',
    philosophy: 'Slow and steady wins.',
    summary: "The Investor is patient, disciplined, and long-term focused. You trust time more than hype, stay emotionally steady, and avoid impulsive decisions. You collect for stability, value preservation, and slow compounding — and you sleep just fine while it happens.",
    coreTraits: ['Patient', 'Stable', 'Risk-aware', 'Long-term focused'],
    strength: 'Strong emotional discipline during volatility.',
    weakness: 'May miss fast-moving opportunities.',
    collectionStyle: ['Sealed-heavy', 'Long-term holds', 'Stable allocations'],
    famousBehavior: 'Still holding sealed from years ago.',
    dangerZone: 'Holding so long you forget to ever take a win — patience can quietly turn into stagnation.',
    recommendedAction: 'Pick one proven sealed product to add this quarter, then let it sit untouched.',
  },
  Archivist: {
    emoji: '\uD83D\uDCDA',
    philosophy: 'Some cards deserve preservation.',
    summary: "The Archivist values significance, rarity, legacy, and iconic ownership. You believe certain cards matter culturally and deserve preservation. Your collection feels important and intentional — built around grails, trophy cards, and centerpieces that everyone notices first.",
    coreTraits: ['Legacy-focused', 'Selective', 'Preservation-minded', 'Significance-driven'],
    strength: 'Builds memorable collections with meaningful pieces.',
    weakness: 'Can overvalue prestige or iconic status.',
    collectionStyle: ['High-end slabs', 'Grails', 'Iconic cards', 'Showcase pieces'],
    famousBehavior: 'Owns one card everyone asks about immediately.',
    dangerZone: 'Chasing prestige at any price — paying premiums for status rather than value.',
    recommendedAction: 'Define your next grail and the max you\u2019ll pay before you start hunting it.',
  },
  Dreamer: {
    emoji: '\uD83C\uDF1F',
    philosophy: 'I collect what I love.',
    summary: "The Dreamer is emotionally driven and passion-first. You collect because of favorite Pokémon, nostalgia, artwork, and memories. Your collection reflects identity and emotion more than market logic — and that\u2019s exactly the point.",
    coreTraits: ['Emotional', 'Passionate', 'Nostalgic', 'Authentic'],
    strength: 'Deep emotional satisfaction and personal connection.',
    weakness: 'Can become overly attached to cards.',
    collectionStyle: ['Character-focused', 'Art-focused', 'Personal collections'],
    famousBehavior: 'Bought the card because it made them feel something.',
    dangerZone: 'Overpaying because a card hits the heart — emotion outrunning common sense.',
    recommendedAction: 'Keep collecting what you love, but set a soft monthly budget for emotional buys.',
  },
  Flipper: {
    emoji: '\u26A1',
    philosophy: 'Movement creates opportunity.',
    summary: "The Flipper thrives on activity, momentum, and market movement. You enjoy buying, selling, trading, and rotating inventory. You move fast, stay plugged into trends, and trust momentum over patience.",
    coreTraits: ['Active', 'Opportunistic', 'Fast-moving', 'Momentum-driven'],
    strength: 'Executes quickly on opportunities.',
    weakness: 'Can overtrade or miss long-term compounding.',
    collectionStyle: ['High liquidity', 'Frequent rotation', 'Modern-heavy'],
    famousBehavior: 'Sold the card before reading the attack.',
    dangerZone: 'Trading for the sake of trading — fees and small losses quietly eat the edge.',
    recommendedAction: 'Pick one high-conviction card to actually hold for 12 months while you keep flipping the rest.',
  },
  Analyst: {
    emoji: '\uD83E\uDDE0',
    philosophy: 'The numbers tell the story.',
    summary: "The Analyst is research-driven and highly analytical. You enjoy spreadsheets, population reports, market inefficiencies, probability, and trend analysis. You trust information over emotion, and your edge comes from doing the homework no one else does.",
    coreTraits: ['Analytical', 'Strategic', 'Logical', 'Research-driven'],
    strength: 'Excellent at identifying hidden value.',
    weakness: 'Can overanalyze and hesitate too long.',
    collectionStyle: ['Research-heavy', 'Data-driven purchases', 'Balanced product mix'],
    famousBehavior: 'Has a spreadsheet for their spreadsheet.',
    dangerZone: 'Analysis paralysis — researching a buy until the window quietly closes.',
    recommendedAction: 'Give yourself a 48-hour decision rule on any card under your conviction threshold.',
  },
  Hunter: {
    emoji: '\uD83C\uDFAF',
    philosophy: "I\u2019d rather be right than diversified.",
    summary: "The Hunter is conviction-driven and highly selective. You don\u2019t buy often, but when you do, you go big. You prefer concentrated positions, sniper-like purchases, and high-conviction plays over spreading thin.",
    coreTraits: ['Focused', 'Conviction-driven', 'Selective', 'Aggressive'],
    strength: 'Strong instinct for high-conviction opportunities.',
    weakness: 'Higher concentration risk.',
    collectionStyle: ['Big purchases', 'Focused holdings', 'Anchor positions'],
    famousBehavior: 'Owns three cards worth more than everything else combined.',
    dangerZone: 'One bad conviction call wiping out a disproportionate share of the collection.',
    recommendedAction: 'Cap any single position at a clear % of your total collection value.',
  },
  Explorer: {
    emoji: '\uD83C\uDF0A',
    philosophy: 'The next big thing starts small.',
    summary: "The Explorer loves discovery, experimentation, and emerging trends. You enjoy new sets, niche products, and unconventional opportunities. You\u2019re energized by uncertainty and curiosity, and you tend to be early on the things others later call obvious.",
    coreTraits: ['Curious', 'Experimental', 'Trend-aware', 'Early-moving'],
    strength: 'Finds opportunities before most collectors.',
    weakness: 'Can chase too many ideas at once.',
    collectionStyle: ['Ultra-modern heavy', 'Experimental products', 'Emerging trends'],
    famousBehavior: 'Already collecting the set nobody understands yet.',
    dangerZone: 'Spreading across too many bets so no winner ever moves the needle.',
    recommendedAction: 'Cull your experimental bets to your top 3 conviction ideas each quarter.',
  },
  Curator: {
    emoji: '\uD83C\uDFDB\uFE0F',
    philosophy: 'A collection should tell a story.',
    summary: "The Curator values presentation, cohesion, and aesthetics. You care about visual organization, binder layouts, thematic collections, and intentional presentation. Your collection feels carefully constructed and visually meaningful.",
    coreTraits: ['Organized', 'Aesthetic-focused', 'Intentional', 'Structured'],
    strength: 'Builds visually memorable and cohesive collections.',
    weakness: 'Can overfocus on perfection and presentation.',
    collectionStyle: ['Themed binders', 'Organized displays', 'Cohesive layouts'],
    famousBehavior: 'Owns twelve binders and color-coded all of them.',
    dangerZone: 'Optimizing the binder more than the collection — perfection over progress.',
    recommendedAction: 'Pick one theme to complete fully this quarter instead of starting a new one.',
  },
  Diplomat: {
    emoji: '\u2696\uFE0F',
    philosophy: 'Balance survives.',
    summary: "The Diplomat values flexibility, resilience, and diversification. You prefer balanced allocations, multiple eras, and multiple product types — and you rarely go all-in on a single strategy. You\u2019re built to weather every market mood.",
    coreTraits: ['Balanced', 'Adaptable', 'Diversified', 'Stable'],
    strength: 'Strong resilience across changing markets.',
    weakness: 'Can struggle to fully commit to one direction.',
    collectionStyle: ['Diversified holdings', 'Balanced allocations', 'Multi-era exposure'],
    famousBehavior: 'Owns a little bit of everything.',
    dangerZone: 'Spreading so thin no single position ever meaningfully wins.',
    recommendedAction: 'Pick one era or product type to overweight slightly for the next 6 months.',
  },
};

// ---------- Scoring ----------

const norm = (v: LikertValue | undefined) => (v ? (v - 1) * 25 : 50);
const avg = (vals: number[]) => vals.reduce((s, v) => s + v, 0) / vals.length;
const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

function computeTraits(answers: Answers): TraitScores {
  const a = (id: number) => norm(answers[id]);
  return {
    patience: clamp(avg([a(1), a(2), a(3), a(4)])),
    emotion: clamp(avg([a(5), a(6), a(7), a(8)])),
    activity: clamp(avg([a(9), a(12)])),
    conviction: clamp(avg([a(11), a(12), a(15)])),
    structure: clamp(avg([a(13), a(14), a(16), a(22)])),
    curiosity: clamp(avg([a(17), a(19), a(20)])),
    analysis: clamp(avg([a(18), a(20), a(22)])),
    balance: clamp(avg([a(10), a(21), a(23), a(24)])),
  };
}

const TIE_BREAK_ORDER: PersonalityType[] = [
  'Investor', 'Archivist', 'Curator', 'Diplomat',
  'Analyst', 'Dreamer', 'Hunter', 'Explorer', 'Flipper',
];

function scoreType(t: TraitScores, type: PersonalityType): number {
  const inv = (v: number) => 100 - v;
  switch (type) {
    case 'Investor':  return t.patience * 1.2 + inv(t.activity) + t.balance * 0.8;
    case 'Archivist': return t.structure + t.conviction * 0.9 + t.emotion * 0.7 + inv(t.curiosity) * 0.4;
    case 'Dreamer':   return t.emotion * 1.5 + inv(t.analysis) * 0.6 + inv(t.activity) * 0.3;
    case 'Flipper':   return t.activity * 1.3 + inv(t.patience) * 0.9 + t.curiosity * 0.3;
    case 'Analyst':   return t.analysis * 1.2 + t.structure * 0.7 + t.curiosity * 0.6;
    case 'Hunter':    return t.conviction * 1.3 + t.activity * 0.6 + inv(t.balance) * 0.7;
    case 'Explorer':  return t.curiosity * 1.3 + t.activity * 0.5 + inv(t.patience) * 0.4;
    case 'Curator':   return t.structure * 1.2 + t.emotion * 0.6 + t.balance * 0.5;
    case 'Diplomat':  return t.balance * 1.3 + t.patience * 0.5 + inv(t.conviction) * 0.5;
  }
}

function pickType(t: TraitScores): PersonalityType {
  let best: PersonalityType = 'Investor';
  let bestScore = -Infinity;
  for (const type of TIE_BREAK_ORDER) {
    const s = scoreType(t, type);
    if (s > bestScore) { best = type; bestScore = s; }
  }
  return best;
}

// ---------- Allocations ----------

const PRODUCT_BASELINES: Record<PersonalityType, ProductAllocation> = {
  Investor:  { sealedPct: 65, gradedPct: 25, rawPct: 10 },
  Archivist: { sealedPct: 15, gradedPct: 65, rawPct: 20 },
  Dreamer:   { sealedPct: 15, gradedPct: 25, rawPct: 60 },
  Flipper:   { sealedPct: 30, gradedPct: 30, rawPct: 40 },
  Analyst:   { sealedPct: 40, gradedPct: 35, rawPct: 25 },
  Hunter:    { sealedPct: 20, gradedPct: 60, rawPct: 20 },
  Explorer:  { sealedPct: 45, gradedPct: 20, rawPct: 35 },
  Curator:   { sealedPct: 25, gradedPct: 45, rawPct: 30 },
  Diplomat:  { sealedPct: 35, gradedPct: 35, rawPct: 30 },
};

const ERA_BASELINES: Record<PersonalityType, EraAllocation> = {
  Investor:  { vintage: 30, classic: 25, modern: 20, ultraModern: 20, current: 5 },
  Archivist: { vintage: 45, classic: 30, modern: 15, ultraModern: 8,  current: 2 },
  Dreamer:   { vintage: 25, classic: 30, modern: 25, ultraModern: 15, current: 5 },
  Flipper:   { vintage: 5,  classic: 10, modern: 25, ultraModern: 40, current: 20 },
  Analyst:   { vintage: 20, classic: 20, modern: 25, ultraModern: 25, current: 10 },
  Hunter:    { vintage: 25, classic: 20, modern: 20, ultraModern: 25, current: 10 },
  Explorer:  { vintage: 5,  classic: 10, modern: 20, ultraModern: 40, current: 25 },
  Curator:   { vintage: 25, classic: 25, modern: 25, ultraModern: 20, current: 5 },
  Diplomat:  { vintage: 20, classic: 20, modern: 20, ultraModern: 20, current: 20 },
};

function normalize100<T extends Record<string, number>>(obj: T): T {
  const keys = Object.keys(obj) as (keyof T)[];
  const total = keys.reduce((s, k) => s + Math.max(0, obj[k] as number), 0) || 1;
  const scaled: Record<string, number> = {};
  let assigned = 0;
  keys.forEach((k, i) => {
    if (i === keys.length - 1) {
      scaled[k as string] = 100 - assigned;
    } else {
      const v = Math.round(((obj[k] as number) / total) * 100);
      scaled[k as string] = v;
      assigned += v;
    }
  });
  return scaled as T;
}

function nudgeProduct(base: ProductAllocation, t: TraitScores): ProductAllocation {
  // Slight trait-based tilt.
  const sealed = base.sealedPct + (t.patience - 50) * 0.1 - (t.activity - 50) * 0.1;
  const graded = base.gradedPct + (t.structure - 50) * 0.08 + (t.conviction - 50) * 0.05;
  const raw    = base.rawPct + (t.emotion - 50) * 0.1 + (t.activity - 50) * 0.05;
  return normalize100({
    sealedPct: clamp(sealed),
    gradedPct: clamp(graded),
    rawPct: clamp(raw),
  });
}

function nudgeEra(base: EraAllocation, t: TraitScores): EraAllocation {
  const vintage     = base.vintage + (t.patience - 50) * 0.08 + (t.emotion - 50) * 0.04;
  const classic     = base.classic + (t.emotion - 50) * 0.05;
  const modern      = base.modern;
  const ultraModern = base.ultraModern + (t.curiosity - 50) * 0.06 + (t.activity - 50) * 0.04;
  const current     = base.current + (t.curiosity - 50) * 0.08 - (t.patience - 50) * 0.05;
  return normalize100({
    vintage: clamp(vintage),
    classic: clamp(classic),
    modern: clamp(modern),
    ultraModern: clamp(ultraModern),
    current: clamp(current),
  });
}

// ---------- Public API ----------

export function calculatePersonalityResult(answers: Answers): PersonalityResult {
  const traits = computeTraits(answers);
  const type = pickType(traits);
  const info = PERSONALITY_INFO[type];
  const productAllocation = nudgeProduct(PRODUCT_BASELINES[type], traits);
  const eraAllocation = nudgeEra(ERA_BASELINES[type], traits);

  return {
    type,
    primaryType: type,
    traits,
    productAllocation,
    eraAllocation,
    summary: info.summary,
    strength: info.strength,
    weakness: info.weakness,
    dangerZone: info.dangerZone,
    recommendedAction: info.recommendedAction,
  };
}
