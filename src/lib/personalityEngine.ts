// PokeIQ Collector Personality Engine — V5
// Identity-first: 12 archetypes, 30 questions, no modifiers.

export interface QuizQuestion {
  id: number;
  text: string;
  section: string;
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  { id: 1, text: "I'm comfortable holding cards for years without needing immediate results.", section: "Patience & Decision Making" },
  { id: 2, text: "I rarely panic when Pokémon prices suddenly rise or fall.", section: "Patience & Decision Making" },
  { id: 3, text: "I would rather miss an opportunity than make a rushed purchase.", section: "Patience & Decision Making" },
  { id: 4, text: "Some cards feel meaningful to me beyond their market value.", section: "Emotional Connection" },
  { id: 5, text: "My favorite cards usually have a personal story or emotional connection.", section: "Emotional Connection" },
  { id: 6, text: "I care more about owning cards I truly love than owning the \u201Cbest investments.\u201D", section: "Emotional Connection" },
  { id: 7, text: "I enjoy buying, selling, or trading cards regularly.", section: "Risk & Activity" },
  { id: 8, text: "I like keeping part of my collection flexible in case new opportunities appear.", section: "Risk & Activity" },
  { id: 9, text: "I'm comfortable taking risks on cards or products others overlook.", section: "Risk & Activity" },
  { id: 10, text: "I enjoy the excitement of making a bold collecting move.", section: "Risk & Activity" },
  { id: 11, text: "I enjoy organizing my collection in a visually satisfying way.", section: "Identity & Presentation" },
  { id: 12, text: "I want my collection to feel intentional, not random.", section: "Identity & Presentation" },
  { id: 13, text: "Owning iconic or centerpiece cards matters to me.", section: "Identity & Presentation" },
  { id: 14, text: "I care about how my collection looks when displayed as a whole.", section: "Identity & Presentation" },
  { id: 15, text: "I enjoy exploring newer or less proven Pokémon products.", section: "Discovery & Exploration" },
  { id: 16, text: "I often research cards deeply before making decisions.", section: "Discovery & Exploration" },
  { id: 17, text: "I enjoy discovering trends before they become mainstream.", section: "Discovery & Exploration" },
  { id: 18, text: "I like learning parts of the hobby most collectors overlook.", section: "Discovery & Exploration" },
  { id: 19, text: "I prefer balancing my collection across different eras or product types.", section: "Structure & Balance" },
  { id: 20, text: "I usually think about how new purchases fit into my collection as a whole.", section: "Structure & Balance" },
  { id: 21, text: "I see my Pokémon collection as something I'm building long-term.", section: "Structure & Balance" },
  { id: 22, text: "I enjoy refining and improving my collection over time.", section: "Structure & Balance" },
  { id: 23, text: "Ripping packs is one of my favorite parts of the hobby.", section: "Thrill & Risk Appetite" },
  { id: 24, text: "I love the unpredictability of chasing a big hit.", section: "Thrill & Risk Appetite" },
  { id: 25, text: "I'll take a long-shot bet on a card if the payoff feels exciting enough.", section: "Thrill & Risk Appetite" },
  { id: 26, text: "A boring collection is worse than a risky one.", section: "Thrill & Risk Appetite" },
  { id: 27, text: "I enjoy sharing my pickups and showing my collection to others.", section: "Identity, Presence & Restraint" },
  { id: 28, text: "I love owning cards that other collectors immediately recognize.", section: "Identity, Presence & Restraint" },
  { id: 29, text: "I'd rather own fewer truly meaningful cards than a large collection.", section: "Identity, Presence & Restraint" },
  { id: 30, text: "I regularly trim or refine my collection to keep it intentional.", section: "Identity, Presence & Restraint" },
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
  | 'Monk'
  | 'Gambler'
  | 'Showman'
  | 'Minimalist';

export interface TraitScores {
  patience: number;
  activity: number;
  emotion: number;
  analysis: number;
  conviction: number;
  structure: number;
  curiosity: number;
  balance: number;
  preservation: number;
  aesthetics: number;
  recognition: number;
  excitement: number;
  restraint: number;
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
  tagline: string;          // MBTI-style one-sentence identity description
  summary: string;          // emotionally resonant short paragraph
  coreTraits: string[];     // 4 chips
  strength: string;
  weakness: string;
  collectionStyle: string[];
  famousBehavior: string;
  dangerZone: string;
  recommendedAction: string;
  strengthLong: string;
  weaknessLong: string;
  fullProfile: {
    coreIdentity: string;
    collectingMindset: string;
    innerWorld: string;
    blindSpots: string;
    growthPath: string;
  };
}

export const PERSONALITY_INFO: Record<PersonalityType, PersonalityInfo> = {
  Investor: {
    emoji: '\uD83E\uDDF1',
    philosophy: 'Slow and steady wins.',
    tagline: 'Investors are patient, level-headed long-term thinkers who trust time and discipline more than hype or momentum.',
    summary: "The Investor is patient, disciplined, and long-term focused. You trust time more than hype, stay emotionally steady, and avoid impulsive decisions. You collect for stability, value preservation, and slow compounding — and you sleep just fine while it happens.",
    coreTraits: ['Patient', 'Stable', 'Risk-aware', 'Long-term focused'],
    strength: 'Strong emotional discipline during volatility.',
    weakness: 'May miss fast-moving opportunities.',
    collectionStyle: ['Sealed-heavy', 'Long-term holds', 'Stable allocations'],
    famousBehavior: 'Still holding sealed from years ago.',
    dangerZone: 'Holding so long you forget to ever take a win — patience can quietly turn into stagnation.',
    recommendedAction: 'Pick one proven sealed product to add this quarter, then let it sit untouched.',
    strengthLong: 'Emotional discipline during volatility. While others panic-sell on dips or chase greens, Investors stay steady and let time do the heavy lifting.',
    weaknessLong: 'May wait too long before acting. The same patience that protects you can also cause you to hesitate through moves that required boldness.',
    fullProfile: {
      coreIdentity: 'People with the Investor personality type approach collecting with patience, discipline, and emotional steadiness. While others chase hype, panic during dips, or constantly rotate products, Investors prefer stability, consistency, and long-term positioning. They rarely feel pressure to move quickly and are often more comfortable missing an opportunity than making an impulsive decision they may regret later.',
      collectingMindset: 'Investors understand something many collectors struggle to accept: great collections are rarely built overnight. Their mindset naturally leans toward preservation, slow accumulation, and allowing time to do the heavy lifting. Because of this, they are often drawn toward sealed products, established cards, and safer long-term positions that can quietly compound over years.',
      innerWorld: 'Although Investors may appear cautious from the outside, their patience is not driven by fear. More often, it comes from confidence. They trust themselves enough to avoid emotional reactions during market swings and understand that consistency often outperforms excitement in the long run.',
      blindSpots: 'At times, this steady mindset can work against them. Investors may hesitate too long before acting, miss opportunities requiring boldness, or hold positions long after the hobby has shifted around them. Their desire for stability can occasionally become resistance to change.',
      growthPath: 'The strongest Investors eventually learn that growth is not just about protecting value, but knowing when to evolve alongside the hobby itself.',
    },
  },
  Archivist: {
    emoji: '\uD83D\uDCDA',
    philosophy: 'Some cards deserve preservation.',
    tagline: 'Archivists are legacy-minded collectors who build deliberate, museum-worthy collections around iconic and historically significant cards.',
    summary: "The Archivist values significance, rarity, legacy, and iconic ownership. You believe certain cards matter culturally and deserve preservation. Your collection feels important and intentional — built around grails, trophy cards, and centerpieces that everyone notices first.",
    coreTraits: ['Legacy-focused', 'Selective', 'Preservation-minded', 'Significance-driven'],
    strength: 'Builds memorable collections with meaningful pieces.',
    weakness: 'Can overvalue prestige or iconic status.',
    collectionStyle: ['High-end slabs', 'Grails', 'Iconic cards', 'Showcase pieces'],
    famousBehavior: 'Owns one card everyone asks about immediately.',
    dangerZone: 'Chasing prestige at any price — paying premiums for status rather than value.',
    recommendedAction: 'Define your next grail and the max you\u2019ll pay before you start hunting it.',
    strengthLong: 'Builds memorable collections with meaningful, museum-worthy pieces. Archivists instinctively know which cards will matter to the hobby long after the hype cycle ends.',
    weaknessLong: 'Can overvalue prestige or iconic status, paying premiums for the story or the legacy rather than the underlying value.',
    fullProfile: {
      coreIdentity: 'Archivists see collecting differently from most people. While others focus on trends, profits, or activity, Archivists are drawn toward significance. To them, certain cards feel larger than the hobby itself — pieces of history worthy of preservation, admiration, and long-term care.',
      collectingMindset: 'People with this personality type are often captivated by iconic cards, grails, trophy pieces, and historically meaningful eras. Their collections tend to feel intentional and curated, built less around quantity and more around importance. They are naturally selective collectors, preferring a few meaningful centerpieces over endless accumulation.',
      innerWorld: 'Archivists often feel deeply connected to the legacy of Pokémon itself. They appreciate the stories behind cards, the context surrounding specific eras, and the emotional weight certain pieces carry within the hobby. Even modern cards may interest them if they believe those cards will someday become culturally important.',
      blindSpots: 'At times, Archivists can become overly attached to prestige and significance. They may romanticize certain cards, overpay for iconic pieces, or dismiss newer products too quickly simply because they have not yet earned historical importance.',
      growthPath: 'The healthiest Archivists learn that preserving the history of the hobby also means remaining open to its future.',
    },
  },
  Dreamer: {
    emoji: '\uD83C\uDF1F',
    philosophy: 'I collect what I love.',
    tagline: 'Dreamers are passionate, nostalgia-driven collectors whose collections are powered by personal stories, favorite Pokémon, and pure emotion.',
    summary: "The Dreamer is emotionally driven and passion-first. You collect because of favorite Pokémon, nostalgia, artwork, and memories. Your collection reflects identity and emotion more than market logic — and that\u2019s exactly the point.",
    coreTraits: ['Emotional', 'Passionate', 'Nostalgic', 'Authentic'],
    strength: 'Deep emotional satisfaction and personal connection.',
    weakness: 'Can become overly attached to cards.',
    collectionStyle: ['Character-focused', 'Art-focused', 'Personal collections'],
    famousBehavior: 'Bought the card because it made them feel something.',
    dangerZone: 'Overpaying because a card hits the heart — emotion outrunning common sense.',
    recommendedAction: 'Keep collecting what you love, but set a soft monthly budget for emotional buys.',
    strengthLong: 'Deep emotional satisfaction and personal connection. Dreamers genuinely enjoy their collections every single day, regardless of what the market is doing.',
    weaknessLong: 'Can become overly attached to cards, struggling to sell pieces they no longer need or overvaluing sentimental holdings beyond what the market supports.',
    fullProfile: {
      coreIdentity: 'For Dreamers, collecting is deeply emotional. Cards are not simply products, assets, or investments — they are memories, feelings, stories, and personal connections. Dreamers are often drawn toward favorite Pokémon, nostalgic artwork, meaningful experiences, and cards that simply “feel right” to them.',
      collectingMindset: 'People with this personality type rarely separate emotion from collecting. Their collections often reflect who they are as people, with each card carrying some kind of personal significance. They may remember exactly where they pulled a card, who gave it to them, or why it mattered emotionally at a certain point in their life.',
      innerWorld: 'Dreamers are often among the happiest collectors in the hobby because their enjoyment comes from genuine connection rather than external validation. They collect because it excites them, comforts them, or reminds them of something meaningful.',
      blindSpots: 'Their emotional attachment can sometimes cloud their judgment. Dreamers may struggle to sell cards they no longer need, overvalue sentimental pieces, or ignore practical realities because their heart has already decided what matters.',
      growthPath: 'The strongest Dreamers learn that protecting the joy of collecting sometimes means balancing emotion with perspective.',
    },
  },
  Flipper: {
    emoji: '\u26A1',
    philosophy: 'Movement creates opportunity.',
    tagline: 'Flippers are fast-moving, opportunistic traders who thrive on momentum, rotation, and constantly reading where the market is heading next.',
    summary: "The Flipper thrives on activity, momentum, and market movement. You enjoy buying, selling, trading, and rotating inventory. You move fast, stay plugged into trends, and trust momentum over patience.",
    coreTraits: ['Active', 'Opportunistic', 'Fast-moving', 'Momentum-driven'],
    strength: 'Executes quickly on opportunities.',
    weakness: 'Can overtrade or miss long-term compounding.',
    collectionStyle: ['High liquidity', 'Frequent rotation', 'Modern-heavy'],
    famousBehavior: 'Sold the card before reading the attack.',
    dangerZone: 'Trading for the sake of trading — fees and small losses quietly eat the edge.',
    recommendedAction: 'Pick one high-conviction card to actually hold for 12 months while you keep flipping the rest.',
    strengthLong: 'Executes quickly on opportunities. Flippers have sharp instincts for timing and can pivot strategies faster than almost any other type when the market moves.',
    weaknessLong: 'Can overtrade or miss long-term compounding. The constant motion that energizes Flippers can also burn them out and erode profits through fees and early exits.',
    fullProfile: {
      coreIdentity: 'Flippers thrive on activity, momentum, and staying in motion. While some collectors prefer patience and preservation, Flippers feel most energized when they are actively buying, selling, trading, and adapting to the market around them.',
      collectingMindset: 'People with this personality type often possess strong instincts for timing and opportunity. They enjoy the excitement of fast decisions, quick flips, and spotting momentum before others fully react. For Flippers, the hobby feels alive when things are moving.',
      innerWorld: 'Flippers are highly adaptable collectors. They can pivot strategies quickly, react to changing trends, and remain deeply connected to current market behavior. Their collections tend to evolve constantly, with products rotating in and out far more frequently than most other personality types.',
      blindSpots: 'Constant movement comes with its own challenges. Flippers may struggle with patience, sell too early, or burn themselves out chasing nonstop opportunities. Their excitement for activity can sometimes make them feel restless during slower periods of the hobby.',
      growthPath: 'The best Flippers eventually realize that not every opportunity needs to be chased — and that sometimes the biggest gains come from slowing down.',
    },
  },
  Analyst: {
    emoji: '\uD83E\uDDE0',
    philosophy: 'The numbers tell the story.',
    tagline: 'Analysts are research-obsessed strategists who find their edge in spreadsheets, pop reports, and patterns most collectors never bother to look for.',
    summary: "The Analyst is research-driven and highly analytical. You enjoy spreadsheets, population reports, market inefficiencies, probability, and trend analysis. You trust information over emotion, and your edge comes from doing the homework no one else does.",
    coreTraits: ['Analytical', 'Strategic', 'Logical', 'Research-driven'],
    strength: 'Excellent at identifying hidden value.',
    weakness: 'Can overanalyze and hesitate too long.',
    collectionStyle: ['Research-heavy', 'Data-driven purchases', 'Balanced product mix'],
    famousBehavior: 'Has a spreadsheet for their spreadsheet.',
    dangerZone: 'Analysis paralysis — researching a buy until the window quietly closes.',
    recommendedAction: 'Give yourself a 48-hour decision rule on any card under your conviction threshold.',
    strengthLong: 'Excellent at identifying hidden value. Analysts spot inefficiencies, pop report gaps, and undervalued plays long before they become consensus.',
    weaknessLong: 'Can overanalyze and hesitate too long, missing windows of opportunity while still searching for the perfect data point.',
    fullProfile: {
      coreIdentity: 'Analysts approach collecting with curiosity, logic, and deep research. Their minds naturally search for patterns, inefficiencies, and hidden signals within the hobby. While other collectors may rely on emotion or instinct, Analysts trust information.',
      collectingMindset: 'People with this personality type often enjoy spreadsheets, population reports, market data, print trends, and historical analysis as much as the cards themselves. They are naturally skeptical thinkers who prefer understanding why something matters before committing to it.',
      innerWorld: 'Analysts tend to be highly independent decision makers. They rarely follow hype blindly and often enjoy discovering insights that most collectors overlook. In many ways, the process of understanding the hobby intellectually is just as rewarding to them as collecting itself.',
      blindSpots: 'Analysts can become trapped inside their own thinking. They may overanalyze purchases, hesitate too long, or struggle to act because they are still searching for the “perfect” answer.',
      growthPath: 'The strongest Analysts learn that collecting is not only about understanding the hobby — it is also about experiencing it.',
    },
  },
  Hunter: {
    emoji: '\uD83C\uDFAF',
    philosophy: "I\u2019d rather be right than diversified.",
    tagline: 'Hunters are high-conviction, sniper-style collectors who would rather hold a few bold positions than spread thin across the market.',
    summary: "The Hunter is conviction-driven and highly selective. You don\u2019t buy often, but when you do, you go big. You prefer concentrated positions, sniper-like purchases, and high-conviction plays over spreading thin.",
    coreTraits: ['Focused', 'Conviction-driven', 'Selective', 'Aggressive'],
    strength: 'Strong instinct for high-conviction opportunities.',
    weakness: 'Higher concentration risk.',
    collectionStyle: ['Big purchases', 'Focused holdings', 'Anchor positions'],
    famousBehavior: 'Owns three cards worth more than everything else combined.',
    dangerZone: 'One bad conviction call wiping out a disproportionate share of the collection.',
    recommendedAction: 'Cap any single position at a clear % of your total collection value.',
    strengthLong: 'Strong instinct for high-conviction opportunities. Hunters identify special pieces early and commit at a scale that pays off when they’re right.',
    weaknessLong: 'Higher concentration risk. The same conviction that drives the wins can become emotional stubbornness when a thesis turns against them.',
    fullProfile: {
      coreIdentity: 'Hunters are conviction-driven collectors who prefer focus over balance. They are highly selective about what they buy, but when they believe in something, they commit fully and confidently.',
      collectingMindset: 'People with this personality type are rarely interested in owning a little bit of everything. Instead, Hunters prefer concentrated positions, centerpiece purchases, and high-conviction plays that reflect strong personal belief.',
      innerWorld: 'Hunters enjoy the feeling of identifying something special before the rest of the market fully recognizes it. Whether it is a card, product, era, or niche category, they often build their collections around a small number of deeply believed-in ideas.',
      blindSpots: 'This confidence can become both a strength and a weakness. Hunters may become overly concentrated, emotionally tied to being “right,” or resistant to changing their views once they commit.',
      growthPath: 'The strongest Hunters learn that conviction becomes even more powerful when paired with adaptability.',
    },
  },
  Explorer: {
    emoji: '\uD83C\uDF0A',
    philosophy: 'The next big thing starts small.',
    tagline: 'Explorers are curious, early-moving trend hunters who get energized by new sets, niche products, and ideas most collectors haven\u2019t noticed yet.',
    summary: "The Explorer loves discovery, experimentation, and emerging trends. You enjoy new sets, niche products, and unconventional opportunities. You\u2019re energized by uncertainty and curiosity, and you tend to be early on the things others later call obvious.",
    coreTraits: ['Curious', 'Experimental', 'Trend-aware', 'Early-moving'],
    strength: 'Finds opportunities before most collectors.',
    weakness: 'Can chase too many ideas at once.',
    collectionStyle: ['Ultra-modern heavy', 'Experimental products', 'Emerging trends'],
    famousBehavior: 'Already collecting the set nobody understands yet.',
    dangerZone: 'Spreading across too many bets so no winner ever moves the needle.',
    recommendedAction: 'Cull your experimental bets to your top 3 conviction ideas each quarter.',
    strengthLong: 'Finds opportunities before most collectors. Explorers naturally gravitate to niches and emerging sets long before the rest of the hobby catches on.',
    weaknessLong: 'Can chase too many ideas at once, spreading thin enough that even good calls fail to meaningfully move the collection.',
    fullProfile: {
      coreIdentity: 'Explorers are energized by discovery, experimentation, and possibility. They are naturally curious collectors who enjoy exploring areas of the hobby most people overlook.',
      collectingMindset: 'People with this personality type are often drawn toward new sets, emerging trends, niche products, unconventional ideas, and underexplored categories. Explorers enjoy the feeling of finding something before everyone else notices it.',
      innerWorld: 'Because they enjoy experimentation, Explorers frequently evolve their interests and collecting habits. Their collections can feel unpredictable, diverse, and constantly changing as new curiosities capture their attention.',
      blindSpots: 'This curiosity can sometimes become distraction. Explorers may jump between too many ideas, chase trends too aggressively, or struggle to stay committed long enough for their convictions to fully develop.',
      growthPath: 'The strongest Explorers learn that discovery becomes more meaningful when paired with patience and direction.',
    },
  },
  Curator: {
    emoji: '\uD83C\uDFDB\uFE0F',
    philosophy: 'A collection should tell a story.',
    tagline: 'Curators are aesthetic, story-driven collectors who treat their collection as a carefully composed piece of visual identity.',
    summary: "The Curator values presentation, cohesion, and aesthetics. You care about visual organization, binder layouts, thematic collections, and intentional presentation. Your collection feels carefully constructed and visually meaningful.",
    coreTraits: ['Organized', 'Aesthetic-focused', 'Intentional', 'Structured'],
    strength: 'Builds visually memorable and cohesive collections.',
    weakness: 'Can overfocus on perfection and presentation.',
    collectionStyle: ['Themed binders', 'Organized displays', 'Cohesive layouts'],
    famousBehavior: 'Owns twelve binders and color-coded all of them.',
    dangerZone: 'Optimizing the binder more than the collection — perfection over progress.',
    recommendedAction: 'Pick one theme to complete fully this quarter instead of starting a new one.',
    strengthLong: 'Builds visually memorable and cohesive collections. Curators craft experiences, not just piles of cards — every binder feels intentional.',
    weaknessLong: 'Can overfocus on perfection and presentation, spending more energy on layout than on actually growing or enjoying the collection.',
    fullProfile: {
      coreIdentity: 'Curators care deeply about how collections feel as a whole. While some collectors focus primarily on value or rarity, Curators are drawn toward presentation, cohesion, aesthetics, and intentional design.',
      collectingMindset: 'People with this personality type often think carefully about how cards fit together visually and emotionally. They enjoy creating collections that feel organized, complete, and personally expressive.',
      innerWorld: 'Curators are often highly intentional with presentation. Binder layouts, display cases, themes, color coordination, and visual storytelling may matter just as much as the cards themselves. They frequently derive satisfaction from refining and perfecting their collection over time.',
      blindSpots: 'Curators can become overly perfectionistic. They may obsess over organization, hesitate to disrupt carefully crafted collections, or spend more time refining presentation than simply enjoying the hobby.',
      growthPath: 'The strongest Curators learn that the purpose of a collection is not just to look beautiful, but to be lived with and enjoyed.',
    },
  },
  Monk: {
    emoji: '\u2696\uFE0F',
    philosophy: 'Balance survives.',
    tagline: 'Monks are balanced, adaptable collectors who build resilient portfolios designed to weather every market mood the hobby throws at them.',
    summary: "The Diplomat values flexibility, resilience, and diversification. You prefer balanced allocations, multiple eras, and multiple product types — and you rarely go all-in on a single strategy. You\u2019re built to weather every market mood.",
    coreTraits: ['Balanced', 'Adaptable', 'Diversified', 'Stable'],
    strength: 'Strong resilience across changing markets.',
    weakness: 'Can struggle to fully commit to one direction.',
    collectionStyle: ['Diversified holdings', 'Balanced allocations', 'Multi-era exposure'],
    famousBehavior: 'Owns a little bit of everything.',
    dangerZone: 'Spreading so thin no single position ever meaningfully wins.',
    recommendedAction: 'Pick one era or product type to overweight slightly for the next 6 months.',
    strengthLong: 'Strong resilience across changing markets. Monks are built to weather every market mood because they’re never fully exposed to a single trend.',
    weaknessLong: 'Can struggle to fully commit to one direction, leaving the collection balanced but without any breakout positions.',
    fullProfile: {
      coreIdentity: 'Monks are adaptable, balanced, and highly flexible collectors. Rather than committing fully to one philosophy, they naturally prefer diversification, moderation, and maintaining stability across multiple approaches.',
      collectingMindset: 'People with this personality type are often comfortable navigating different parts of the hobby simultaneously. They may appreciate vintage while still enjoying modern, collect sealed while also enjoying raw cards, or balance emotional purchases alongside strategic ones.',
      innerWorld: 'Monks rarely feel comfortable living at extremes. Instead, they value resilience and flexibility, preferring collections capable of adapting as the hobby changes over time.',
      blindSpots: 'Because they can see value in many different approaches, Monks may hesitate to fully commit to one direction or feel stretched across too many interests at once.',
      growthPath: 'The strongest Monks learn that balance is most powerful when it is paired with conviction.',
    },
  },
  Gambler: {
    emoji: '\uD83C\uDFB0',
    philosophy: 'You miss every pack you don\u2019t rip.',
    tagline: 'Gamblers are adrenaline-driven collectors who live for the thrill of the pull, the chase, and the long-shot upside.',
    summary: "The Gambler is driven by excitement, risk, and the rush of possibility. You love ripping packs, chasing big hits, and taking long-shot bets. The hobby feels alive when the stakes are high \u2014 and a boring collection is worse than a risky one.",
    coreTraits: ['Thrill-seeking', 'Impulsive', 'Optimistic', 'Risk-tolerant'],
    strength: 'High energy and willingness to take real swings.',
    weakness: 'Variance and impulse can quietly erode the collection.',
    collectionStyle: ['Pack-heavy', 'Hit-chasing', 'High variance'],
    famousBehavior: 'Bought one more booster box \u201Cjust to chase the chase card.\u201D',
    dangerZone: 'Letting variance and dopamine make every buying decision \u2014 wins feel huge, losses get hidden.',
    recommendedAction: 'Set a monthly \u201Cthrill budget\u201D and protect the rest of the collection from it.',
    strengthLong: 'High energy and willingness to take real swings. Gamblers will pull the trigger on bets most collectors quietly walk away from \u2014 and sometimes that\u2019s exactly the right call.',
    weaknessLong: 'Variance and impulse can quietly erode the collection. The same thrill that drives the wins can mask years of small losses if no guardrails exist.',
    fullProfile: {
      coreIdentity: 'Gamblers are wired for excitement. The hobby, for them, is at its best when there\u2019s something on the line \u2014 a pack to rip, a long-shot card to chase, a bold buy that could pay off in a big way. They are highly optimistic collectors who naturally focus on upside potential.',
      collectingMindset: 'People with this personality type are drawn to anything with a hit-or-miss outcome: booster boxes, sealed cases, hyped releases, mystery products, and risk-on plays. They tend to make decisions quickly and intuitively, and they\u2019d rather act and miss than overthink and never try.',
      innerWorld: 'For Gamblers, the dopamine of the chase is part of the joy. Even losing pulls are part of the experience. They\u2019re emotionally resilient in the short term and remarkably willing to swing again right after a miss.',
      blindSpots: 'That same wiring can become a trap. Gamblers often underweight downside, underestimate how much they\u2019ve actually spent chasing the hit, and chase variance long after the math has stopped favoring them.',
      growthPath: 'The strongest Gamblers learn to keep the thrill alive in a contained corner of their collection \u2014 protecting the long-term foundation while still letting themselves swing for the fences.',
    },
  },
  Showman: {
    emoji: '\uD83D\uDC51',
    philosophy: 'A collection unseen is a collection wasted.',
    tagline: 'Showmen are expressive, audience-aware collectors who build their collections to be admired, shared, and remembered.',
    summary: "The Showman is energized by recognition and presence. You enjoy showing your pickups, sharing your collection, and owning pieces that other collectors immediately recognize. Your collection is part personal joy, part performance.",
    coreTraits: ['Expressive', 'Social', 'Status-aware', 'Recognizable'],
    strength: 'Builds collections that get noticed and remembered.',
    weakness: 'Can prioritize impression over genuine fit.',
    collectionStyle: ['Trophy slabs', 'Recognizable grails', 'Display-ready pieces'],
    famousBehavior: 'Pickups are posted before they\u2019re even in a top loader.',
    dangerZone: 'Buying for the reaction instead of the relationship \u2014 chasing applause more than the cards.',
    recommendedAction: 'For every \u201Cposting card\u201D you buy, add one quiet card that\u2019s just for you.',
    strengthLong: 'Builds collections that get noticed and remembered. Showmen have an instinct for which pieces resonate socially and how to present them.',
    weaknessLong: 'Can prioritize impression over genuine fit. The pursuit of recognition can pull the collection away from what actually matters to them.',
    fullProfile: {
      coreIdentity: 'Showmen treat collecting as a form of expression. Their collections aren\u2019t just personal \u2014 they\u2019re a public statement of taste, status, and identity. They naturally gravitate toward pieces that other collectors immediately recognize and react to.',
      collectingMindset: 'People with this personality type often think about presentation, social moments, and storytelling. They enjoy sharing pickups, building collections that look impressive on camera, and owning at least a few pieces that consistently spark a reaction.',
      innerWorld: 'There\u2019s real joy here in being seen. Recognition isn\u2019t shallow for the Showman \u2014 it\u2019s how they connect to the wider hobby and feel part of the community.',
      blindSpots: 'The drive for recognition can drift into status-chasing. Showmen may overpay for prestige pieces, neglect quieter cards they actually love, or let the audience shape their collection more than their own taste does.',
      growthPath: 'The strongest Showmen learn that the most magnetic collections are also the most personal \u2014 recognition is a side effect of authenticity, not a substitute for it.',
    },
  },
  Minimalist: {
    emoji: '\uD83E\uDDD8',
    philosophy: 'Less, but better.',
    tagline: 'Minimalists are quietly intentional collectors who would rather own a few perfect cards than chase the noise of accumulation.',
    summary: "The Minimalist is intentional, restrained, and quietly discerning. You keep your collection small on purpose, refine often, and would rather own a few perfect pieces than a wall of cards. Quality, focus, and clarity matter more than volume.",
    coreTraits: ['Intentional', 'Restrained', 'Focused', 'Refined'],
    strength: 'Clarity of taste and very high signal-to-noise.',
    weakness: 'Can over-prune and lose pieces with future meaning.',
    collectionStyle: ['Tight, curated set', 'Frequent refinement', 'Quality over quantity'],
    famousBehavior: 'Owns 12 cards. All of them perfect.',
    dangerZone: 'Restraint hardening into rigidity \u2014 saying no so often you stop discovering anything new.',
    recommendedAction: 'Allow yourself one \u201Cunjustified\u201D card a quarter, purely because you love it.',
    strengthLong: 'Clarity of taste and very high signal-to-noise. Minimalists collect with intention, and every card in their collection tends to earn its place.',
    weaknessLong: 'Can over-prune and lose pieces with future meaning. The same discipline that creates clarity can also strip out the romance of the hobby.',
    fullProfile: {
      coreIdentity: 'Minimalists collect with restraint and intention. They are quietly selective, more interested in what to leave out than what to add. For them, a collection is defined as much by what it refuses as by what it contains.',
      collectingMindset: 'People with this personality type prefer small, refined collections over volume. They regularly trim, consolidate, and upgrade \u2014 always pushing toward a tighter, clearer expression of what they actually love.',
      innerWorld: 'There\u2019s a calm to this style of collecting. Minimalists rarely feel FOMO in the way other types do. They\u2019re comfortable watching hype cycles pass without engaging, and they often feel relief, not regret, after letting cards go.',
      blindSpots: 'Restraint can quietly become rigidity. Minimalists may dismiss too many cards too quickly, miss opportunities that don\u2019t fit their current frame, or strip their collection of pieces that would have grown into meaning over time.',
      growthPath: 'The strongest Minimalists learn that intentional collecting still leaves room for play \u2014 the goal is clarity, not austerity.',
    },
  },
};

// ---------- Scoring ----------

const norm = (v: LikertValue | undefined) => (v ? (v - 1) * 25 : 50);
const avg = (vals: number[]) => vals.reduce((s, v) => s + v, 0) / vals.length;
const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

function computeTraits(answers: Answers): TraitScores {
  const a = (id: number) => norm(answers[id]);
  return {
    patience: clamp(avg([a(1), a(2), a(3)])),
    emotion: clamp(avg([a(4), a(5), a(6)])),
    activity: clamp(avg([a(7), a(10)])),
    conviction: clamp(avg([a(9), a(10), a(13)])),
    structure: clamp(avg([a(11), a(12), a(14), a(20)])),
    curiosity: clamp(avg([a(15), a(17), a(18)])),
    analysis: clamp(avg([a(16), a(18), a(20)])),
    balance: clamp(avg([a(8), a(19), a(21), a(22)])),
    preservation: clamp(avg([a(3), a(13), a(21)])),
    aesthetics: clamp(avg([a(11), a(14)])),
    recognition: clamp(avg([a(27), a(28), a(13)])),
    excitement: clamp(avg([a(23), a(24), a(25), a(26)])),
    restraint: clamp(avg([a(29), a(30), a(3)])),
  };
}

const TIE_BREAK_ORDER: PersonalityType[] = [
  'Investor', 'Archivist', 'Curator', 'Monk', 'Minimalist',
  'Analyst', 'Dreamer', 'Hunter', 'Explorer', 'Showman',
  'Flipper', 'Gambler',
];

function scoreType(t: TraitScores, type: PersonalityType): number {
  const inv = (v: number) => 100 - v;
  switch (type) {
    case 'Investor':  return t.patience * 1.2 + inv(t.activity) + t.balance * 0.8;
    case 'Archivist': return t.preservation * 1.2 + t.structure * 0.7 + t.conviction * 0.6 + inv(t.activity) * 0.4;
    case 'Dreamer':   return t.emotion * 1.5 + inv(t.analysis) * 0.6 + inv(t.activity) * 0.3;
    case 'Flipper':   return t.activity * 1.3 + inv(t.patience) * 0.9 + t.curiosity * 0.3 + inv(t.restraint) * 0.2;
    case 'Analyst':   return t.analysis * 1.2 + t.structure * 0.7 + t.curiosity * 0.6;
    case 'Hunter':    return t.conviction * 1.3 + t.activity * 0.6 + inv(t.balance) * 0.7;
    case 'Explorer':  return t.curiosity * 1.3 + t.activity * 0.5 + inv(t.patience) * 0.4;
    case 'Curator':   return t.aesthetics * 1.2 + t.structure * 1.0 + t.emotion * 0.4;
    case 'Monk':      return t.balance * 1.3 + t.patience * 0.5 + inv(t.conviction) * 0.5;
    case 'Gambler':   return t.excitement * 1.5 + inv(t.patience) * 0.6 + inv(t.restraint) * 0.6 + t.activity * 0.3;
    case 'Showman':   return t.recognition * 1.4 + t.aesthetics * 0.5 + t.activity * 0.3;
    case 'Minimalist':return t.restraint * 1.4 + t.structure * 0.5 + inv(t.activity) * 0.5 + inv(t.excitement) * 0.4;
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
  Monk:      { sealedPct: 35, gradedPct: 35, rawPct: 30 },
  Gambler:   { sealedPct: 60, gradedPct: 15, rawPct: 25 },
  Showman:   { sealedPct: 15, gradedPct: 70, rawPct: 15 },
  Minimalist:{ sealedPct: 20, gradedPct: 55, rawPct: 25 },
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
  Monk:      { vintage: 20, classic: 20, modern: 20, ultraModern: 20, current: 20 },
  Gambler:   { vintage: 5,  classic: 10, modern: 20, ultraModern: 35, current: 30 },
  Showman:   { vintage: 35, classic: 25, modern: 20, ultraModern: 15, current: 5 },
  Minimalist:{ vintage: 30, classic: 30, modern: 20, ultraModern: 15, current: 5 },
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
