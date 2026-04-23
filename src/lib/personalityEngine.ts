// PokeIQ Collector Personality + Allocation Engine

export interface QuizQuestion {
  id: number;
  text: string;
  section: string;
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  // Section 1 — Time & Patience
  { id: 1, text: "I'm comfortable holding parts of my collection for many years without selling.", section: "Time & Patience" },
  { id: 2, text: "I don't feel pressure to act when prices move up or down.", section: "Time & Patience" },
  { id: 3, text: "I would rather miss a short-term opportunity than make a rushed decision.", section: "Time & Patience" },
  
  // Section 2 — Activity & Risk
  { id: 4, text: "I enjoy buying and selling cards fairly often.", section: "Activity & Risk" },
  { id: 5, text: "I like having part of my collection that I can easily sell if needed.", section: "Activity & Risk" },
  { id: 6, text: "I'm okay with one or two items making up a large part of my collection.", section: "Activity & Risk" },
  
  // Section 3 — Emotional vs Strategic
  { id: 7, text: "I collect cards mainly because they are meaningful to me personally.", section: "Emotional vs Strategic" },
  { id: 8, text: "I care more about long-term value than short-term price changes.", section: "Emotional vs Strategic" },
  { id: 9, text: "I enjoy thinking about how all the pieces of my collection fit together.", section: "Emotional vs Strategic" },
  
  // Section 4 — Product Preference
  { id: 10, text: "Sealed products feel safer to me than individual cards.", section: "Product Preference" },
  { id: 11, text: "Graded cards are important to how I want my collection to look.", section: "Product Preference" },
  { id: 12, text: "Raw cards feel more personal than graded cards.", section: "Product Preference" },
  
  // Section 5 — Era Preference
  { id: 13, text: "I feel most connected to older Pokémon eras.", section: "Era Preference" },
  { id: 14, text: "I like spreading my collection across multiple eras.", section: "Era Preference" },
  { id: 15, text: "I enjoy exploring newer or less proven Pokémon sets.", section: "Era Preference" },
  
  // Section 6 — Structure & Identity
  { id: 16, text: "I want my collection to feel organized and intentional, not random.", section: "Structure & Identity" },
  { id: 17, text: "I prefer slow, steady growth over fast gains.", section: "Structure & Identity" },
  { id: 18, text: "I see my Pokémon collection as something I'm building long-term, not just trading.", section: "Structure & Identity" },
];

export type LikertValue = 1 | 2 | 3 | 4 | 5;
export type Answers = Record<number, LikertValue>;

export type PrimaryType = 'Sentinel' | 'Politician' | 'Purist' | 'Hustler' | 'Archivist';
export type SecondaryModifier = 'Wayfinder' | 'Cartographer' | 'Detective' | 'Keystone' | 'Pathbreaker';

export interface TraitScores {
  patience: number;
  activity: number;
  conviction: number;
  balance: number;
  emotion: number;
  structure: number;
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
  primaryType: PrimaryType;
  modifiers: SecondaryModifier[];
  traits: TraitScores;
  productAllocation: ProductAllocation;
  eraAllocation: EraAllocation;
  explanations: string[];
  oneAction: string;
}

// Primary type descriptions
export const PRIMARY_TYPE_INFO: Record<PrimaryType, {
  emoji: string;
  tagline: string;
  description: string;
  fullDescription: string;
  personalityProfile: string;
  strength: string;
  tradeoff: string;
  collectingTraits: string[];
  strengths: { title: string; description: string }[];
  blindSpots: { title: string; description: string }[];
  growth: string;
  collectsBest: string[];
  drains: string[];
}> = {
  Sentinel: {
    emoji: '🛡️',
    tagline: 'Guardian of time and scarcity',
    description: 'Calm, patient, sealed-heavy. You trust time more than timing and believe the strongest move is often no move at all.',
    fullDescription: 'As a Sentinel, you are a steadfast guardian of value and time. Your mind operates on a different clock than most collectors—where others see urgency, you see opportunity to wait. You approach your collection with the quiet confidence of someone who understands that true value compounds slowly, and you\'re willing to let it.',
    personalityProfile: 'While your patience and discipline are your superpowers, they can also present unique challenges. You may sometimes miss opportunities that require quick action, or hold positions longer than optimal. Your calm demeanor serves you well during market volatility, but can occasionally mask opportunities for strategic repositioning.\n\nAt your core, you believe in the power of time and scarcity. You understand that sealed products and preserved cards gain value not just from rarity, but from the patience required to hold them. This philosophy makes you a powerful long-term collector, though it can sometimes lead to frustration when the market rewards short-term speculation.',
    strength: 'Discipline',
    tradeoff: 'Liquidity and speed',
    collectingTraits: ['Patient mindset', 'Low risk tolerance', 'Appreciation for preservation', 'Preference for stability over action'],
    strengths: [
      { title: 'Long-Term Vision', description: 'You understand how time transforms good positions into great ones.' },
      { title: 'Emotional Discipline', description: 'You\'re less likely to panic buy or sell during short-term market swings.' },
      { title: 'Preservation Focus', description: 'You naturally protect the value of your sealed and graded items.' },
      { title: 'Patience', description: 'You\'re comfortable letting collections mature instead of chasing fast flips.' },
    ],
    blindSpots: [
      { title: 'Under-Rotating Inventory', description: 'Holding too long can occasionally prevent your collection from evolving.' },
      { title: 'Missing Short-Term Opportunities', description: 'Your patience means some quick wins pass you by.' },
      { title: 'Over-Attachment to Holdings', description: 'Emotional connection to positions can cloud judgment on when to exit.' },
      { title: 'Delayed Action', description: 'Waiting for the perfect moment can mean missing good-enough moments.' },
    ],
    growth: 'Growth for you isn\'t about collecting more—it\'s about collecting with precision. The next stage is learning when patience becomes stagnation. Developing clearer rules for when to rotate positions will free up capital and keep your collection evolving.',
    collectsBest: ['Clear holding periods (1, 3, 5 year targets)', 'Periodic reviews instead of constant checking', 'Sealed-heavy allocations', 'Long time horizons with occasional strategic adjustments'],
    drains: ['Constant price watching', 'Pressure to flip quickly', 'FOMO-driven purchases', 'Short-term market volatility'],
  },
  Politician: {
    emoji: '🗳️',
    tagline: 'Master of balance and negotiation',
    description: "Evenly allocated and adaptable. You manage trade-offs instead of chasing absolutes and stay resilient through changing conditions.",
    fullDescription: 'As a Politician, you are the master diplomat of the collecting world. Your mind naturally sees all sides of every trade-off, weighing options with a precision that others find almost uncanny. You approach your collection as a carefully balanced portfolio, understanding that true strength comes from resilience, not concentration.',
    personalityProfile: 'While your balanced approach and adaptability are your superpowers, they can also present unique challenges. Your mind considers so many options that committing fully to any single strategy can feel uncomfortable. You may find yourself spreading too thin when focus would serve you better.\n\nAt your core, you believe that the best collection is one that weathers any storm. You understand that markets change, eras rotate, and today\'s hot product can become tomorrow\'s stagnant hold. This philosophy makes you remarkably resilient, though it can sometimes mean missing the biggest wins that come from concentrated conviction.',
    strength: 'Resilience',
    tradeoff: 'Rarely all-in on one idea',
    collectingTraits: ['Balanced risk tolerance', 'Systems thinking', 'Appreciation for diversification', 'Preference for stability over extremes'],
    strengths: [
      { title: 'Big-Picture Thinking', description: 'You understand how individual cards or products fit into a larger collecting vision.' },
      { title: 'Balanced Allocation', description: 'You naturally spread attention across sealed, graded, and raw rather than over-committing.' },
      { title: 'Adaptability', description: 'You adjust your strategy as market conditions change.' },
      { title: 'Risk Management', description: 'You rarely put yourself in positions of catastrophic loss.' },
    ],
    blindSpots: [
      { title: 'Decision Fatigue', description: 'With many "good options," committing to one path can feel harder than expected.' },
      { title: 'Analysis Paralysis', description: 'Sometimes overthinking prevents action on solid opportunities.' },
      { title: 'Under-Commitment', description: 'Spreading too thin can dilute your best ideas.' },
      { title: 'Missed Conviction Plays', description: 'Your balanced approach can mean missing big wins from concentrated bets.' },
    ],
    growth: 'Growth for you isn\'t about balance—you\'ve mastered that. It\'s about learning when to lean in. The next stage is developing conviction: knowing when a piece truly fits your collection and acting decisively when it does.',
    collectsBest: ['Diversified across eras and product types', 'Regular portfolio reviews', 'Clear allocation targets', 'Systematic rebalancing rules'],
    drains: ['Pressure to pick one strategy', 'All-or-nothing mentalities', 'Extreme market swings', 'Being forced to concentrate'],
  },
  Purist: {
    emoji: '🔥',
    tagline: 'Devotee of conviction and aesthetics',
    description: "Emotion-driven and belief-led. You collect what resonates, not what optimizes. Your collection is personal — and that's the point.",
    fullDescription: 'As a Purist, you are a true believer in the collecting world. Your mind is drawn to meaning over metrics, connection over calculation. You approach your collection as an extension of who you are—each piece tells a story, carries emotion, and represents something beyond its market value.',
    personalityProfile: 'While your conviction and emotional intelligence are your superpowers, they can also present unique challenges. Your deep attachment to certain pieces can make it difficult to rotate even when logic suggests you should. You may find yourself passing on "good investments" because they don\'t speak to you personally.\n\nAt your core, you believe that the best collection is one that means something. You understand that anyone can chase returns, but building something truly personal requires the courage to follow your instincts. This philosophy makes you a deeply satisfied collector, though it can sometimes mean carrying positions that others would call inefficient.',
    strength: 'Authentic conviction',
    tradeoff: 'Higher variance',
    collectingTraits: ['Emotional connection', 'Strong conviction', 'Appreciation for meaning', 'Preference for personal significance over optimization'],
    strengths: [
      { title: 'Authentic Connection', description: 'Your collection truly reflects who you are and what matters to you.' },
      { title: 'Diamond Hands', description: 'Your conviction helps you hold through volatility when you believe in a piece.' },
      { title: 'Passion-Driven', description: 'You never burn out because collecting brings you genuine joy.' },
      { title: 'Unique Perspective', description: 'You often spot value others miss because you see beyond the spreadsheet.' },
    ],
    blindSpots: [
      { title: 'Nostalgia Bias', description: 'Older eras feel safer, which can cause you to overlook select modern opportunities.' },
      { title: 'Over-Attachment', description: 'Deep emotional connection can make rotating positions feel like betrayal.' },
      { title: 'Ignoring Market Signals', description: 'Your personal conviction can sometimes override clear market feedback.' },
      { title: 'Concentration Risk', description: 'Passion for specific pieces can lead to over-allocation in one area.' },
    ],
    growth: 'Growth for you isn\'t about becoming more analytical—your instincts serve you well. It\'s about refining conviction: learning which emotional pulls lead to great pickups and which lead to regret.',
    collectsBest: ['Focus on personal connection', 'Collecting what you love first', 'Patience with personally meaningful pieces', 'Era or character-focused collections'],
    drains: ['Collecting purely for ROI', 'Social pressure to "optimize"', 'Spreadsheet-driven decisions', 'Treating cards as pure investments'],
  },
  Hustler: {
    emoji: '💼',
    tagline: 'Operator of volume and repetition',
    description: 'Active and process-driven. You stack small edges, stay in motion, and trust consistency over perfection.',
    fullDescription: 'As a Hustler, you are an operator in the collecting world. Your mind moves fast, spotting opportunities and executing before others have finished their analysis. You approach your collection as an active enterprise—always buying, always selling, always improving your position.',
    personalityProfile: 'While your activity and speed are your superpowers, they can also present unique challenges. Your constant motion means you sometimes exit positions too early, missing the compounding returns that patience provides. You may find yourself doing more transactions than necessary to justify the effort.\n\nAt your core, you believe that fortune favors the active. You understand that while others wait for perfect entries, you\'re stacking small wins that compound over time. This philosophy makes you highly productive, though it can sometimes lead to burnout or thin margins.',
    strength: 'Momentum through action',
    tradeoff: 'Burnout and thin margins',
    collectingTraits: ['Active trading mindset', 'High risk tolerance', 'Appreciation for liquidity', 'Preference for action over waiting'],
    strengths: [
      { title: 'Quick Execution', description: 'You move fast on opportunities before the market catches up.' },
      { title: 'Volume Expertise', description: 'You understand margins and can profit from small edges at scale.' },
      { title: 'Market Awareness', description: 'Your constant activity keeps you plugged into price movements.' },
      { title: 'Adaptability', description: 'You can pivot quickly when strategies stop working.' },
    ],
    blindSpots: [
      { title: 'Overtrading', description: 'Activity for its own sake can eat into profits through fees and spreads.' },
      { title: 'Burnout', description: 'Constant motion is exhausting—pace yourself or risk losing the joy.' },
      { title: 'Missing Long-Term Compounding', description: 'Exiting too early means missing the biggest gains that come from patience.' },
      { title: 'Transaction Cost Drag', description: 'High volume means fees add up faster than you might realize.' },
    ],
    growth: 'Growth for you isn\'t about doing more—you\'re already active. It\'s about doing less, better. The next stage is learning which positions deserve patience and which deserve your active attention.',
    collectsBest: ['High-liquidity products', 'Clear buy/sell rules', 'Regular profit-taking', 'Active market monitoring'],
    drains: ['Being forced to hold', 'Illiquid positions', 'Slow-moving markets', 'Long-term commitments'],
  },
  Archivist: {
    emoji: '📜',
    tagline: 'Keeper of history',
    description: 'Vintage-focused and hype-averse. You collect what lasts, building a library rather than a trading desk.',
    fullDescription: 'As an Archivist, you are the historian of the collecting world. Your mind is drawn to the stories behind the cards—the cultural context, the historical significance, the narrative that transforms cardboard into legacy. You approach your collection as a museum curator might, preserving pieces of history.',
    personalityProfile: 'While your historical perspective and curatorial eye are your superpowers, they can also present unique challenges. Your deep appreciation for vintage can make newer sets feel less appealing, even when they represent real value. You may find yourself over-indexed on older eras while modern opportunities pass by.\n\nAt your core, you believe that the best collections stand the test of time. You understand that hype fades but history endures, and you\'re building something meant to last decades, not months. This philosophy makes you a thoughtful, intentional collector, though it can sometimes mean slower portfolio growth.',
    strength: 'Stability',
    tradeoff: 'Slower growth cycles',
    collectingTraits: ['Intentional mindset', 'Appreciation for history and legacy', 'Preference for structure over chaos', 'Focus on preservation'],
    strengths: [
      { title: 'Historical Context', description: 'You recognize the cultural and historical weight of older sets and collectibles.' },
      { title: 'Era Awareness', description: 'You understand why certain eras command premiums.' },
      { title: 'Curation Skills', description: 'You build cohesive, meaningful collections rather than random accumulations.' },
      { title: 'Long-Term Stability', description: 'Your vintage-heavy approach tends to weather market turbulence better.' },
    ],
    blindSpots: [
      { title: 'Nostalgia Bias', description: 'Older eras feel safer, which can cause you to overlook select modern opportunities.' },
      { title: 'Under-Weighting Modern', description: 'New sets can have real value—don\'t dismiss them automatically.' },
      { title: 'Over-Researching', description: 'Sometimes analysis can delay action—not every pickup needs to be perfect.' },
      { title: 'High Standards', description: 'You are very picky in what you decide to do, which can slow progress.' },
    ],
    growth: 'Growth for you isn\'t about collecting more—it\'s about collecting with clarity. The next stage is refining conviction: knowing when a piece truly fits your collection and acting decisively when it does.',
    collectsBest: ['Era-focused organization', 'Periodic reviews instead of constant checking', 'Collections organized by era or purpose', 'Long time horizons with occasional strategic adjustments'],
    drains: ['Constant price watching', 'Social pressure to "keep up"', 'Chaotic or unfocused collections', 'Collecting purely for hype or validation'],
  },
};

export const MODIFIER_INFO: Record<SecondaryModifier, {
  emoji: string;
  label: string;
  description: string;
}> = {
  Wayfinder: { emoji: '🧭', label: 'Goal-Driven', description: 'Goal-driven and intentional in every move' },
  Cartographer: { emoji: '🗺️', label: 'Diversifier', description: 'Systems thinker who diversifies across eras' },
  Detective: { emoji: '🔍', label: 'Researcher', description: 'Research-driven pattern hunter' },
  Keystone: { emoji: '🏛️', label: 'Anchor Builder', description: 'Builds around few large anchor positions' },
  Pathbreaker: { emoji: '⚡', label: 'Trailblazer', description: 'Early mover into experimental territory' },
};

// Helper to convert 1-5 answer to 0-100 scale
function toPercent(value: number): number {
  return ((value - 1) / 4) * 100;
}

// Helper to get average of answers
function avg(...values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

// Calculate trait scores
export function calculateTraits(answers: Answers): TraitScores {
  const Q = (id: number) => answers[id] || 3;
  
  // Patience: Q1, Q2, Q3, Q17, Q18
  const patience = toPercent(avg(Q(1), Q(2), Q(3), Q(17), Q(18)));
  
  // Activity: Q4, Q5, inverse of Q1, Q3, Q17
  const activity = toPercent(avg(Q(4), Q(5), 6 - Q(1), 6 - Q(3), 6 - Q(17)));
  
  // Conviction: Q6, inverse of Q14
  const conviction = toPercent(avg(Q(6), 6 - Q(14)));
  
  // Balance: Q14, inverse of Q6
  const balance = toPercent(avg(Q(14), 6 - Q(6)));
  
  // Emotion: Q7, Q12
  const emotion = toPercent(avg(Q(7), Q(12)));
  
  // Structure: Q9, Q16
  const structure = toPercent(avg(Q(9), Q(16)));
  
  return {
    patience: Math.round(patience),
    activity: Math.round(activity),
    conviction: Math.round(conviction),
    balance: Math.round(balance),
    emotion: Math.round(emotion),
    structure: Math.round(structure),
  };
}

// Calculate primary type scores
function calculatePrimaryTypeScores(traits: TraitScores, answers: Answers): Record<PrimaryType, number> {
  const { patience: P, activity: A, conviction: C, balance: B, emotion: E, structure: S } = traits;
  const Q = (id: number) => toPercent(answers[id] || 3);
  
  return {
    Sentinel: 0.35 * P + 0.25 * S + 0.20 * (100 - A) + 0.20 * Q(10),
    Politician: 0.35 * B + 0.25 * S + 0.20 * P + 0.20 * A,
    Purist: 0.35 * C + 0.30 * E + 0.20 * (100 - B) + 0.15 * P,
    Hustler: 0.45 * A + 0.25 * Q(5) + 0.20 * (100 - P) + 0.10 * Q(15),
    Archivist: 0.30 * S + 0.25 * P + 0.20 * Q(13) + 0.15 * (100 - A) + 0.10 * Q(11),
  };
}

// Determine primary type with tie-breaking
function determinePrimaryType(traits: TraitScores, answers: Answers): PrimaryType {
  const scores = calculatePrimaryTypeScores(traits, answers);
  const { patience: P, activity: A, conviction: C, balance: B, emotion: E } = traits;
  
  const sortedTypes = (Object.entries(scores) as [PrimaryType, number][])
    .sort((a, b) => b[1] - a[1]);
  
  const [first, second] = sortedTypes;
  
  // If top two are within 3 points, apply tie-break
  if (second && first[1] - second[1] <= 3) {
    // Find strongest trait
    const traitLeaders: Record<string, PrimaryType[]> = {
      patience: ['Sentinel', 'Archivist'],
      activity: ['Hustler'],
      balance: ['Politician'],
      convictionEmotion: ['Purist'],
    };
    
    const CE = (C + E) / 2;
    const maxTrait = Math.max(P, A, B, CE);
    
    if (maxTrait === P && traitLeaders.patience.includes(first[0])) return first[0];
    if (maxTrait === P && traitLeaders.patience.includes(second[0])) return second[0];
    if (maxTrait === A && traitLeaders.activity.includes(first[0])) return first[0];
    if (maxTrait === A && traitLeaders.activity.includes(second[0])) return second[0];
    if (maxTrait === B && traitLeaders.balance.includes(first[0])) return first[0];
    if (maxTrait === B && traitLeaders.balance.includes(second[0])) return second[0];
    if (maxTrait === CE && traitLeaders.convictionEmotion.includes(first[0])) return first[0];
    if (maxTrait === CE && traitLeaders.convictionEmotion.includes(second[0])) return second[0];
  }
  
  return first[0];
}

// Calculate secondary modifiers
function calculateModifiers(traits: TraitScores, answers: Answers): SecondaryModifier[] {
  const { structure: S, balance: B } = traits;
  const Q = (id: number) => answers[id] || 3;
  
  const candidates: { modifier: SecondaryModifier; strength: number }[] = [];
  
  // Wayfinder: S >= 70 AND Q18 >= 4
  if (S >= 70 && Q(18) >= 4) {
    candidates.push({ modifier: 'Wayfinder', strength: S - 70 + (Q(18) - 4) * 10 });
  }
  
  // Cartographer: B >= 70 AND S >= 60
  if (B >= 70 && S >= 60) {
    candidates.push({ modifier: 'Cartographer', strength: B - 70 + S - 60 });
  }
  
  // Detective: Q2 >= 4 AND S >= 60 AND Q15 >= 4
  if (Q(2) >= 4 && S >= 60 && Q(15) >= 4) {
    candidates.push({ modifier: 'Detective', strength: S - 60 + (Q(2) - 4) * 10 + (Q(15) - 4) * 10 });
  }
  
  // Keystone: Q6 >= 4 AND Q16 >= 4
  if (Q(6) >= 4 && Q(16) >= 4) {
    candidates.push({ modifier: 'Keystone', strength: (Q(6) - 4) * 10 + (Q(16) - 4) * 10 });
  }
  
  // Pathbreaker: Q15 >= 4 AND Q4 >= 4
  if (Q(15) >= 4 && Q(4) >= 4) {
    candidates.push({ modifier: 'Pathbreaker', strength: (Q(15) - 4) * 10 + (Q(4) - 4) * 10 });
  }
  
  // Return top 2 by strength
  return candidates
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 2)
    .map(c => c.modifier);
}

// Calculate product allocation
function calculateProductAllocation(primaryType: PrimaryType, traits: TraitScores, answers: Answers): ProductAllocation {
  const Q = (id: number) => answers[id] || 3;
  
  // Step 1: Baseline by primary type
  const baselines: Record<PrimaryType, [number, number, number]> = {
    Sentinel: [55, 25, 20],
    Politician: [35, 35, 30],
    Purist: [25, 25, 50],
    Hustler: [20, 35, 45],
    Archivist: [20, 60, 20],
  };
  
  let [sealed, graded, raw] = baselines[primaryType];
  
  // Step 2: Adjust with product preference questions
  const sealedBias = (Q(10) - 3) * 6;
  const gradedBias = (Q(11) - 3) * 6;
  const rawBias = (Q(12) - 3) * 6;
  
  sealed += sealedBias;
  graded += gradedBias;
  raw += rawBias;
  
  // Step 3: Adjust with traits
  if (traits.patience >= 70) { sealed += 5; raw -= 5; }
  if (traits.activity >= 70) { raw += 5; sealed -= 5; }
  if (traits.emotion >= 70) { raw += 5; graded -= 5; }
  if (traits.structure >= 70) { graded += 5; raw -= 5; }
  
  // Step 4: Clamp and normalize
  sealed = Math.max(5, Math.min(85, sealed));
  graded = Math.max(5, Math.min(85, graded));
  raw = Math.max(5, Math.min(85, raw));
  
  const total = sealed + graded + raw;
  
  return {
    sealedPct: Math.round((sealed / total) * 100),
    gradedPct: Math.round((graded / total) * 100),
    rawPct: Math.round((raw / total) * 100),
  };
}

// Calculate era allocation
function calculateEraAllocation(primaryType: PrimaryType, traits: TraitScores, answers: Answers): EraAllocation {
  const Q = (id: number) => answers[id] || 3;
  
  // Step 1: Baseline by primary type
  const baselines: Record<PrimaryType, [number, number, number, number, number]> = {
    Sentinel: [30, 25, 20, 15, 10],
    Politician: [20, 20, 20, 20, 20],
    Purist: [15, 15, 40, 15, 15],
    Hustler: [10, 15, 20, 25, 30],
    Archivist: [30, 30, 20, 15, 5],
  };
  
  let [vintage, classic, modern, ultraModern, current] = baselines[primaryType];
  
  // Step 2: Use era preference questions to shift weights
  // Vintage tilt from Q13
  const v = (Q(13) - 3) * 5;
  vintage += v * 0.5;
  classic += v * 0.5;
  ultraModern -= v * 0.5;
  current -= v * 0.5;
  
  // Multi-era tilt from Q14
  const d = (Q(14) - 3) * 4;
  if (d > 0) {
    // Pull toward even
    const target = 20;
    vintage += (target - vintage) * 0.1 * d;
    classic += (target - classic) * 0.1 * d;
    modern += (target - modern) * 0.1 * d;
    ultraModern += (target - ultraModern) * 0.1 * d;
    current += (target - current) * 0.1 * d;
  }
  
  // Modern/experimental tilt from Q15
  const m = (Q(15) - 3) * 5;
  current += m * 0.5;
  ultraModern += m * 0.5;
  vintage -= m * 0.5;
  classic -= m * 0.5;
  
  // Step 3: Purist era concentration
  if (primaryType === 'Purist' || traits.conviction >= 70) {
    // Determine home era
    let homeEraBoost = { vintage: 0, classic: 0, modern: 0, ultraModern: 0, current: 0 };
    
    if (Q(13) >= 4 && Q(15) <= 3) {
      homeEraBoost.vintage = 15;
    } else if (Q(15) >= 4 && Q(13) <= 3) {
      homeEraBoost.current = 15;
    } else {
      homeEraBoost.modern = 15;
    }
    
    // Set home era to be largest bucket
    vintage += homeEraBoost.vintage;
    classic += homeEraBoost.classic;
    modern += homeEraBoost.modern;
    ultraModern += homeEraBoost.ultraModern;
    current += homeEraBoost.current;
  }
  
  // Step 4: Clamp and normalize
  vintage = Math.max(5, Math.min(55, vintage));
  classic = Math.max(5, Math.min(55, classic));
  modern = Math.max(5, Math.min(55, modern));
  ultraModern = Math.max(5, Math.min(55, ultraModern));
  current = Math.max(5, Math.min(55, current));
  
  const total = vintage + classic + modern + ultraModern + current;
  
  // Normalize to 100 with integer rounding
  const result = {
    vintage: Math.round((vintage / total) * 100),
    classic: Math.round((classic / total) * 100),
    modern: Math.round((modern / total) * 100),
    ultraModern: Math.round((ultraModern / total) * 100),
    current: Math.round((current / total) * 100),
  };
  
  // Adjust largest to ensure sum is 100
  const sum = Object.values(result).reduce((a, b) => a + b, 0);
  if (sum !== 100) {
    const entries = Object.entries(result) as [keyof EraAllocation, number][];
    const largest = entries.reduce((a, b) => a[1] > b[1] ? a : b);
    result[largest[0]] += (100 - sum);
  }
  
  return result;
}

// Generate explanation bullets
function generateExplanations(primaryType: PrimaryType, traits: TraitScores, answers: Answers): string[] {
  const explanations: string[] = [];
  const Q = (id: number) => answers[id] || 3;
  
  // Trait-based explanation
  const traitEntries = Object.entries(traits) as [keyof TraitScores, number][];
  const strongestTrait = traitEntries.reduce((a, b) => a[1] > b[1] ? a : b);
  
  const traitMessages: Record<keyof TraitScores, string> = {
    patience: 'You scored high on patience, preferring long holds over quick flips.',
    activity: 'You prefer an active approach, staying in motion with frequent transactions.',
    conviction: 'You have strong conviction, comfortable concentrating on what you believe in.',
    balance: 'You value balance and diversification across your collection.',
    emotion: 'Emotional connection drives your collecting decisions.',
    structure: 'You prefer an organized, intentional approach to building your collection.',
  };
  
  explanations.push(traitMessages[strongestTrait[0]]);
  
  // Product preference explanation
  if (Q(10) >= 4) {
    explanations.push('You strongly prefer sealed products as a safer anchor.');
  } else if (Q(11) >= 4) {
    explanations.push('Graded cards are central to how you view your collection.');
  } else if (Q(12) >= 4) {
    explanations.push('Raw cards feel more personal and authentic to you.');
  } else {
    explanations.push('You have a balanced view across product types.');
  }
  
  // Era preference explanation
  if (Q(13) >= 4 && Q(15) <= 3) {
    explanations.push('You lean toward older eras, valuing history and nostalgia.');
  } else if (Q(15) >= 4 && Q(13) <= 3) {
    explanations.push('You enjoy exploring newer, less proven sets.');
  } else if (Q(14) >= 4) {
    explanations.push('You prefer spreading across multiple eras for diversification.');
  } else {
    explanations.push('Your era preferences are balanced across the timeline.');
  }
  
  return explanations;
}

// Generate one action recommendation
function generateOneAction(primaryType: PrimaryType, traits: TraitScores, productAllocation: ProductAllocation): string {
  const { balance, conviction, activity, patience } = traits;
  const { sealedPct } = productAllocation;
  
  if (balance < 50 && conviction > 60) {
    return 'Add 1–2 small positions in a different era to reduce concentration risk.';
  }
  
  if (activity > 70 && patience < 40) {
    return 'Set a buy/sell rule to avoid impulse moves when prices swing.';
  }
  
  if (sealedPct < 25 && patience > 60) {
    return 'Consider adding a sealed anchor position to match your patient approach.';
  }
  
  if (conviction > 70 && balance < 40) {
    return 'Your high conviction is a strength—just ensure you have a backup plan for concentrated positions.';
  }
  
  // Default by type
  const defaults: Record<PrimaryType, string> = {
    Sentinel: 'Continue your patient approach—time is your greatest asset.',
    Politician: 'Review your allocations quarterly to maintain your balanced approach.',
    Purist: 'Document why you love each piece—your conviction is your edge.',
    Hustler: 'Track your win rate to optimize your active trading process.',
    Archivist: 'Prioritize preservation and authentication for your vintage holdings.',
  };
  
  return defaults[primaryType];
}

// Main calculation function
export function calculatePersonalityResult(answers: Answers): PersonalityResult {
  // Check for mostly neutral answers
  const neutralCount = Object.values(answers).filter(v => v === 3).length;
  
  if (neutralCount >= 14) {
    // Default to Politician with balanced allocations
    return {
      primaryType: 'Politician',
      modifiers: [],
      traits: { patience: 50, activity: 50, conviction: 50, balance: 50, emotion: 50, structure: 50 },
      productAllocation: { sealedPct: 35, gradedPct: 35, rawPct: 30 },
      eraAllocation: { vintage: 20, classic: 20, modern: 20, ultraModern: 20, current: 20 },
      explanations: [
        'Your responses were mostly neutral, suggesting you adapt to circumstances.',
        'You maintain flexibility across product types.',
        'You spread your interest across all eras equally.',
      ],
      oneAction: 'Try taking the quiz again with stronger preferences to get a more personalized result.',
    };
  }
  
  const traits = calculateTraits(answers);
  const primaryType = determinePrimaryType(traits, answers);
  const modifiers = calculateModifiers(traits, answers);
  const productAllocation = calculateProductAllocation(primaryType, traits, answers);
  const eraAllocation = calculateEraAllocation(primaryType, traits, answers);
  const explanations = generateExplanations(primaryType, traits, answers);
  const oneAction = generateOneAction(primaryType, traits, productAllocation);
  
  return {
    primaryType,
    modifiers,
    traits,
    productAllocation,
    eraAllocation,
    explanations,
    oneAction,
  };
}
