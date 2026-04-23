# PokeIQ Technical Design Document

**Version:** 1.0  
**Author:** Original Creator  
**Last Updated:** January 2025

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Design Goals](#design-goals)
3. [System Architecture](#system-architecture)
4. [Data Models](#data-models)
5. [Core Algorithms](#core-algorithms)
6. [Edge Cases & Error Handling](#edge-cases--error-handling)
7. [Security Considerations](#security-considerations)
8. [Future Extensions](#future-extensions)

---

## Problem Statement

### The Core Problem

Pokémon TCG collectors face a significant gap between *collecting* and *strategic collecting*. Most collectors:

1. **Lack visibility** into their portfolio composition — they know what they own but not how it's structured
2. **Have no framework** for evaluating portfolio health or risk concentration
3. **Make emotional decisions** without understanding how individual purchases affect their overall position
4. **Cannot simulate future strategies** before committing capital

The existing tools (Collectr, TCGPlayer, spreadsheets) focus on inventory management and price tracking, not strategic analysis. There's no "Bloomberg Terminal for Pokémon collectors."

### Target Users

1. **Serious collectors** with $5,000+ portfolios who want to treat collecting as a strategic activity
2. **Collector-investors** who balance emotional attachment with financial awareness
3. **New collectors** who want guidance on building a balanced portfolio from the start

### Success Criteria

- Users can upload a CSV and receive actionable insights within 30 seconds
- Health score provides a single metric that captures portfolio durability
- Simulator allows users to project future states before committing capital
- No authentication required for core analysis (frictionless entry)

---

## Design Goals

### Primary Goals

1. **Zero-friction onboarding** — Upload a CSV, get insights immediately
2. **Opinionated defaults** — We make decisions so users don't have to (but allow customization)
3. **Strategic, not tactical** — Focus on portfolio-level patterns, not individual card price predictions
4. **Educational** — Every metric comes with context explaining *why* it matters

### Non-Goals

1. **Price prediction** — We don't forecast future values
2. **Market data provider** — We consume external pricing, we don't provide it
3. **Trading platform** — No buy/sell functionality
4. **Social features** — This is a personal analysis tool, not a community platform

### Design Principles

1. **Sealed = Safety**: Our scoring system explicitly rewards sealed product exposure. This is an opinionated stance based on sealed products' historical performance and liquidity.

2. **Diversification > Concentration**: Single-position concentration is penalized. We believe sustainable collecting requires spread across positions, eras, and asset types.

3. **Older = More Durable**: Vintage and Classic era products have proven staying power. Our era health score rewards older-era exposure.

4. **Personality Informs Strategy**: There's no universally "correct" allocation. The right portfolio depends on the collector's temperament, goals, and risk tolerance.

---

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                           │
├─────────────────────────────────────────────────────────────────────┤
│  Landing    │  Portfolio Review  │  Portfolio Simulator  │  Quiz   │
│   Page      │     Module          │       Module           │  Flow   │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         STATE MANAGEMENT                             │
├─────────────────────────────────────────────────────────────────────┤
│   PortfolioContext            │        SimulatorContext              │
│   - Portfolio items           │        - Budget allocation            │
│   - Computed metrics          │        - Era/asset targets            │
│   - Allocation targets        │        - Saved plans                  │
│   - Comparison state          │        - Health projections           │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        CALCULATION ENGINE                            │
├─────────────────────────────────────────────────────────────────────┤
│  dataParser.ts     │  portfolioCalculations.ts  │  eraClassification.ts │
│  - CSV parsing     │  - Summary metrics          │  - Era detection       │
│  - Column detection│  - Concentration risk       │  - Health scores       │
│  - Asset type      │  - Profit milestones        │  - Position analysis   │
│    classification  │  - Insight generation       │                        │
├─────────────────────────────────────────────────────────────────────┤
│                       personalityEngine.ts                           │
│  - Quiz scoring    │  - Trait calculation        │  - Allocation targets │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         PERSISTENCE LAYER                            │
├─────────────────────────────────────────────────────────────────────┤
│   Lovable Cloud (Supabase)    │         localStorage                 │
│   - Portfolio storage         │         - Simulator state            │
│   - Session persistence       │         - Personality results        │
│   - User authentication       │         - UI preferences             │
└─────────────────────────────────────────────────────────────────────┘
```

### Module Breakdown

#### 1. Data Ingestion Layer (`src/lib/dataParser.ts`)

**Responsibility:** Transform raw CSV data into structured portfolio items.

**Key Design Decisions:**

- **Fuzzy column matching**: Users export from various tools (Collectr, TCGPlayer, custom spreadsheets). We match column names using partial string matching against a dictionary of known patterns.

```typescript
const COLUMN_MAPPINGS = {
  marketPrice: ['market price', 'market value', 'current price', 'est. market value', ...],
  // 20+ variations per field
}
```

- **Asset type classification**: Three-tier system (Slab, Raw Card, Sealed) determined by grade presence and card number:
  - Has grade → Slab
  - Has card number, no grade → Raw Card  
  - No card number → Sealed

- **Liquidity tier assignment**: Based on asset type, value, and product name patterns.

#### 2. Calculation Engine (`src/lib/portfolioCalculations.ts`, `src/lib/eraClassification.ts`)

**Responsibility:** Compute all portfolio metrics from processed items.

**Health Score Architecture:**

The health score is a composite metric with weighted dimensions:

```
Health Score = (Asset Score × 0.45) + (Era Score × 0.35) + (Concentration Score × 0.20)
```

Each dimension has a floor of 50 to prevent catastrophic scores from single factors.

**Rationale for weights:**
- **Asset (45%)**: Product type allocation is the most controllable factor and has the strongest correlation with portfolio stability
- **Era (35%)**: Era diversification matters for long-term durability but is harder to control retroactively
- **Concentration (20%)**: Position concentration matters but is context-dependent (a $50K portfolio concentrated in Charizard slabs is different from one concentrated in bulk)

#### 3. Personality Engine (`src/lib/personalityEngine.ts`)

**Responsibility:** Derive collector personality and recommended allocations from quiz responses.

**Design Philosophy:**

The quiz uses 18 Likert-scale questions across 6 dimensions:
1. Time & Patience
2. Activity & Risk
3. Emotional vs Strategic
4. Product Preference
5. Era Preference
6. Structure & Identity

Responses map to trait scores (0-100), which determine primary type:

| Primary Type | Core Trait Pattern |
|--------------|-------------------|
| Sentinel | High patience, low activity |
| Politician | Balanced across all traits |
| Purist | High emotion, high conviction |
| Hustler | High activity, low patience |
| Archivist | High structure, vintage preference |

Each type has recommended product and era allocations that serve as defaults in the simulator.

#### 4. State Management

**PortfolioContext** (`src/contexts/PortfolioContext.tsx`):
- Holds portfolio items and all computed metrics
- Manages allocation targets (asset type and era)
- Handles comparison mode (before/after portfolio upload)
- Auto-saves to backend when authenticated

**SimulatorContext** (`src/pages/simulator/SimulatorContext.tsx`):
- Manages budget planning state
- Computes projected health scores
- Persists plans to localStorage
- Loads personality-based defaults when available

---

## Data Models

### Core Entities

#### PortfolioItem

```typescript
interface PortfolioItem {
  id: string;
  productName: string;
  category: string;              // Set name (e.g., "Evolving Skies")
  quantity: number;
  marketPrice: number;           // Per-unit price
  averageCostPaid: number;       // Per-unit cost basis
  grade: string;                 // Empty for raw/sealed
  cardNumber: string;            // Empty for sealed
  dateAdded: Date | null;
  
  // Computed fields
  totalMarketValue: number;
  totalCostBasis: number;
  profitDollars: number;
  gainPercent: number;
  portfolioWeightPercent: number;
  
  // Classification
  assetType: 'Slab' | 'Raw Card' | 'Sealed';
  liquidityTier: 'High' | 'Medium' | 'Low';
}
```

#### PortfolioSummary

```typescript
interface PortfolioSummary {
  totalMarketValue: number;
  totalCostBasis: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  holdingsInProfitCount: number;
  holdingsInProfitPercent: number;
  totalHoldings: number;
  healthScore: number;
}
```

#### PersonalityResult

```typescript
interface PersonalityResult {
  primaryType: 'Sentinel' | 'Politician' | 'Purist' | 'Hustler' | 'Archivist';
  modifiers: SecondaryModifier[];
  traits: TraitScores;
  productAllocation: { sealedPct, gradedPct, rawPct };
  eraAllocation: { vintage, classic, modern, ultraModern, current };
  explanations: string[];
  oneAction: string;
}
```

### Era Classification

Five-tier era system with hard date boundaries:

| Era | Years | Characteristics |
|-----|-------|-----------------|
| Vintage | 1996–2006 | Foundational scarcity, WOTC era |
| Classic | 2007–2013 | EX series through BW, transitional |
| Modern | 2014–2019 | XY through SM, pre-boom |
| Ultra Modern | 2020–2023 | Post-boom normalization, SWSH/SV |
| Current | Last 12 months | Active print, price discovery |

Era detection uses a tiered approach:
1. **Set name matching**: Match category against known set lists
2. **Keyword heuristics**: Pattern matching for era-specific terms
3. **Date fallback**: Recent dateAdded implies Current era

---

## Core Algorithms

### 1. Asset Health Score

```typescript
function calculateAssetHealthScore(sealedPct, slabsPct, rawPct): number {
  // Hard rule: Sealed >= 40% guarantees minimum score of 80
  if (sealedPct >= 70) return 95;
  if (sealedPct >= 55) return 90;
  if (sealedPct >= 40) return 80;
  if (sealedPct >= 25) return 70;
  
  // Penalties for extreme non-sealed exposure
  if (rawPct > 60 && sealedPct < 40) return max(score, 60);
  if (slabsPct > 70 && sealedPct < 25) return max(score, 65);
  
  return clamp(score, 50, 100);
}
```

**Rationale:** Sealed products have historically outperformed singles on a risk-adjusted basis. This scoring explicitly rewards the "boring" strategy of holding sealed.

### 2. Era Health Score

```typescript
function calculateEraHealthScore(eraAllocation): number {
  // 100% in one era = minimum score (50)
  // All 5 eras with 10%+ = baseline of 70
  // Bonuses for vintage/classic allocation
  // Penalties for single-era concentration
}
```

**Rationale:** Era diversification protects against nostalgia cycles and print run variations. Vintage/Classic get bonus points because scarcity is locked in.

### 3. Concentration Health Score

```typescript
function calculateConcentrationHealthScore(top1Pct, top3Pct, top5Pct): number {
  // Weighted average: top1 (40%) + top3 (35%) + top5 (25%)
  // Each component has threshold-based scoring
  // Floor at 50
}
```

**Rationale:** Position concentration is the most dangerous risk for collectors. A single counterfeit scare or reprint announcement can devastate a concentrated position.

### 4. Insight Generation

```typescript
function generateInsights(items, summary, concentration, milestones, allocation, target): Insight[] {
  // Priority-ordered insight generation:
  // 1. Deep losses (>30% down)
  // 2. Profit milestones (200%, 300%, 500% gains)
  // 3. Concentration warnings
  // 4. Allocation drift from targets
  // 5. Patience signals (no activity in 60+ days)
}
```

---

## Edge Cases & Error Handling

### CSV Parsing

| Edge Case | Handling |
|-----------|----------|
| Missing required columns | Return validation error with detected headers |
| Empty rows | Skip silently |
| Malformed numeric values | Strip currency symbols, return 0 for unparseable |
| Zero cost basis | Treat as "cost not entered" — profit = 0, not infinite |
| Quoted fields with commas | Standard CSV quote parsing |

### Era Classification

| Edge Case | Handling |
|-----------|----------|
| Unknown set name | Fall back to Ultra Modern (conservative default) |
| Sealed products without set | Use product name keyword matching |
| Japanese products | Match against both English and Japanese set names |
| Promo cards | Classify by series if identifiable, else Ultra Modern |

### Health Score

| Edge Case | Handling |
|-----------|----------|
| Empty portfolio | Return 0 for all scores |
| Single item | All concentration scores hit floor (50) |
| 100% one era | Era score = 50 (floor) |
| Missing allocation data | Skip that dimension in calculation |

---

## Security Considerations

### Data Handling

1. **Portfolio data is session-bound**: Each user's portfolio is tied to their auth session. No cross-session data access.

2. **Row Level Security (RLS)**: All database tables use RLS policies requiring `auth.uid() = user_id`.

3. **No sensitive data in client**: API keys and secrets are stored in edge function environment variables, never exposed to frontend.

### Authentication

1. **Anonymous usage allowed**: Core analysis works without authentication for frictionless onboarding.

2. **Persistent portfolios require auth**: To save portfolios across sessions, users must authenticate.

3. **Auto-confirm enabled**: For development/MVP, email confirmation is bypassed to reduce friction.

---

## Future Extensions

### Planned Enhancements

1. **Price sync integration**: Fetch current TCGPlayer/TCGdex prices and compare against stored cost basis. Show "price changed since last upload" indicators.

2. **Card image enrichment**: Display card images alongside portfolio items using TCGdex API.

3. **Rebalancing recommendations**: Given current portfolio and target allocation, suggest specific buy/sell actions with dollar amounts.

4. **Portfolio sharing**: Generate shareable links with optional privacy settings.

5. **Multi-portfolio support**: Allow users to maintain separate portfolios (e.g., "Investment" vs "Personal Collection").

### Technical Debt

1. **Types file size**: `src/lib/types.ts` is 200+ lines and should be split into domain-specific files.

2. **Era classification performance**: Currently O(n × m) where n = items, m = known sets. Should use a trie or hash map for faster matching.

3. **Insight deduplication**: Insights are regenerated on every render. Should use stable IDs based on content hash.

4. **Simulator state migration**: Adding new fields to SimulatorState requires migration logic for localStorage data.

---

## Appendix: Technology Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Framework | React 18 + Vite | Fast HMR, modern tooling |
| Styling | Tailwind CSS + shadcn/ui | Rapid prototyping, consistent design system |
| State | React Context + TanStack Query | Simple local state, powerful async caching |
| Backend | Lovable Cloud (Supabase) | Integrated auth, database, edge functions |
| Charts | Recharts | React-native charting with good defaults |
| Animation | Framer Motion | Declarative animations |

---

*Document maintained by the PokeIQ team. Last updated January 2025.*
