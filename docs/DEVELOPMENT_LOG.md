# PokeIQ Development Log

*A chronological account of building PokeIQ, written in first person by the original creator.*

---

## The Genesis (Week 1)

### Day 1: The Problem Crystallizes

I've been collecting Pokémon cards for about three years now. My collection has grown from a shoebox of nostalgic Base Set cards to... something significantly more complicated. Multiple binders, graded slabs, sealed ETBs, Japanese exclusives. Last week I tried to answer a simple question: "What percentage of my collection is in Evolving Skies?"

I couldn't answer it.

I have a Collectr export. I have spreadsheets. But nothing tells me whether my portfolio is *healthy*. Am I too concentrated in one set? Am I over-exposed to modern sets that might tank? Is my sealed-to-singles ratio sensible?

The tools that exist are inventory trackers, not strategic analyzers. There's no "portfolio health score" for Pokémon collectors.

**Decision:** I'm going to build one.

---

### Day 3: First Prototype

Started with the simplest possible thing: upload a CSV, parse it, show allocation percentages.

The CSV parsing turned out to be trickier than expected. Collectr exports use "Est. Market Value" while TCGPlayer uses "Market Price". Some people use "Qty" and others use "Quantity". Built a fuzzy column matcher that checks against a dictionary of known patterns.

**Key insight:** If I require exact column names, I lose 80% of potential users. Flexibility here is worth the complexity.

```typescript
const COLUMN_MAPPINGS = {
  marketPrice: ['market price', 'market value', 'current price', 'est. market value', ...],
}
```

---

### Day 5: The Asset Type Question

How do I distinguish between a graded card (slab), a raw card, and a sealed product from CSV data alone?

After studying several Collectr exports, I found the pattern:
- **Slabs** have a grade (PSA 10, BGS 9.5, CGC 10, etc.)
- **Raw cards** have a card number but no grade
- **Sealed products** have neither

This works for 95% of cases. Edge cases (promo cards without numbers) can be handled later.

**Trade-off considered:** Should sealed products be identified by product name keywords ("ETB", "Booster Box")? I decided against this — too fragile. The grade/card number heuristic is more robust.

---

## The Health Score (Week 2)

### Day 8: What Does "Healthy" Mean?

This is the philosophical core of the project. What makes a Pokémon portfolio "healthy"?

I spent a full day reading r/PokemonTCG, watching market analysis videos, and studying how vintage collectors talk about their portfolios. Patterns emerged:

1. **Sealed is king**: Long-term, sealed products outperform on a risk-adjusted basis. Booster boxes from 2019 have 3-5x'd while many singles are flat.

2. **Concentration kills**: The collectors who got burned in market corrections were the ones with 40% of their portfolio in a single card.

3. **Era matters**: Vintage/WOTC has "locked in" scarcity. Modern/Ultra Modern is still finding its floor.

**Decision:** The health score will have three dimensions:
- Asset allocation (sealed vs graded vs raw)
- Era diversification 
- Position concentration

---

### Day 10: Opinionated Scoring

I had a choice: build a neutral scoring system or build an opinionated one.

Neutral would mean: "Your allocation is X, your target is Y, here's the delta."

Opinionated means: "Sealed-heavy portfolios are healthier. We will score you higher for holding sealed."

I chose opinionated. Here's why:

1. **Beginners need guidance**, not options. A new collector shouldn't have to decide what's "healthy" — they're asking me to tell them.

2. **The data supports it**: Historical performance favors sealed. This isn't speculation.

3. **It's more useful**: A neutral tool that says "your allocation is whatever it is" provides no signal. An opinionated tool that says "this is good, this is risky" provides actionable direction.

**Implementation:** Asset health score now has hard thresholds:
- Sealed ≥ 40% → minimum score of 80
- Sealed ≥ 70% → score of 95

---

### Day 12: The Floor Problem

First user feedback (testing with friends): "I uploaded my all-slab portfolio and got a 52 health score. That seems wrong — my slabs are all 1st Edition Base Set."

They're right. A vintage slab-heavy portfolio isn't "unhealthy" — it's just unconventional.

**Solution:** Implement a hard floor of 50 for each dimension. No matter how concentrated or how weird the allocation, the minimum health score is 50. This prevents catastrophic scores that feel unfair.

**Secondary solution:** Era scoring now gives explicit bonuses for vintage/classic exposure. A slab-heavy vintage portfolio will get dinged slightly on asset mix but boosted on era mix.

---

## The Personality Engine (Week 3)

### Day 15: The Quiz Idea

Talking to collectors, I noticed something: people describe themselves differently.

"I'm a long-term holder. I never sell."
"I flip to fund my grails."
"I just buy what I love, I don't care about value."

These aren't wrong approaches — they're different *strategies*. And each strategy implies different "optimal" allocations.

**Hypothesis:** If I can identify a collector's personality, I can provide personalized allocation targets instead of one-size-fits-all.

---

### Day 17: Designing the Quiz

I needed questions that reveal collecting style without being leading. After much iteration, I settled on 18 Likert-scale questions across 6 dimensions:

1. **Time & Patience**: Do you hold or flip?
2. **Activity & Risk**: Do you trade often or rarely?
3. **Emotional vs Strategic**: Do you buy for love or logic?
4. **Product Preference**: Sealed, graded, or raw?
5. **Era Preference**: Vintage nostalgia or modern speculation?
6. **Structure & Identity**: Random accumulation or intentional curation?

Each question maps to traits. Traits determine primary type. Types suggest allocations.

---

### Day 19: The Five Personalities

After clustering hypothetical trait combinations, five archetypes emerged:

| Type | Description | Allocation Style |
|------|-------------|------------------|
| **Sentinel** | Patient, sealed-heavy, risk-averse | 60% sealed, vintage-heavy |
| **Politician** | Balanced, adaptable, diversified | Even spread |
| **Purist** | Emotional, conviction-driven | Follows the heart |
| **Hustler** | Active trader, liquidity-focused | Graded-heavy, raw for flipping |
| **Archivist** | Curator, vintage-focused | Vintage/classic emphasis |

**Naming decision:** I wanted personality names that felt like *identities*, not ratings. "Conservative" sounds boring. "Sentinel" sounds like something you'd be proud of.

---

### Day 21: Connecting Quiz to Simulator

The "aha" moment: the quiz results should pre-populate the portfolio simulator.

If you're a Sentinel, when you open the simulator, it already shows 60% sealed / 30% graded / 10% raw targets. You can customize, but you start from *your* baseline, not a generic one.

This connects the quiz (self-discovery) to the simulator (planning) to the portfolio review (analysis). Full loop.

---

## The Simulator (Week 4)

### Day 23: What Problem Does the Simulator Solve?

The portfolio review analyzes *what you have*. But collectors also need to plan *what to buy next*.

"I have $500/month to spend. How should I allocate it?"

The simulator lets you:
1. Set a monthly budget
2. Define target allocations (asset type, era, product type)
3. See projected health score for your plan
4. Save multiple plans for comparison

---

### Day 25: The Drill-Down Problem

Initial design: three sliders for Sealed/Graded/Raw.

User feedback: "Okay, but *what kind* of sealed? There's a big difference between booster boxes and sleeved packs."

**Solution:** Hierarchical allocation. Top level is Sealed/Graded/Raw. Each category has sub-allocations:

- **Sealed** → Booster Boxes, ETBs, UPCs, etc. (11 categories)
- **Graded** → Entry (<$150), Core ($150-500), High-Conviction ($500-1K), Grail ($1K+)
- **Raw** → For Grading, For Holding, For Flipping, Personal/Binder

Each level must sum to 100%. Validation banners appear when totals drift.

---

### Day 27: Era × Set Allocation

A user pointed out: "Era allocation is too coarse. 30% 'Ultra Modern' could mean 30% Celebrations or 30% Fusion Strike — very different bets."

**Solution:** Added a second level of drill-down. Within each era, users can allocate across specific sets.

This created a complexity explosion: 5 eras × 10-15 sets per era = 60+ sliders. I added "normalize" buttons to rebalance and kept set allocation optional (defaults to equal spread).

---

### Day 29: Saved Plans

Users wanted to save and compare strategies. "Show me 'aggressive growth' vs 'preservation mode'."

Added a saved plans feature:
- Name your plan
- Save current state
- Load/delete plans
- Plans persist in localStorage

**Considered but rejected:** Cloud sync for plans. The complexity wasn't worth it for MVP. Plans are personal and low-stakes — localStorage is fine.

---

## The Portfolio Review (Week 5)

### Day 31: The Insight System

Raw metrics are useful, but insights are actionable. Built an insight engine that generates prioritized notifications:

- **Profit milestones**: "3 holdings have 300%+ gains — consider taking profits"
- **Deep losses**: "5 holdings are down 30%+ — review thesis or harvest losses"
- **Concentration warnings**: "Top position is 25% of portfolio"
- **Allocation drift**: "Sealed allocation is 15% below target"
- **Patience signals**: "No purchases in 60 days — your patience is an edge"

Insights are dismissable and regenerate on portfolio changes.

---

### Day 33: Comparison Mode

Feature request: "I want to compare my portfolio now vs 3 months ago."

Built a comparison flow:
1. Upload current portfolio
2. Click "Compare with previous"
3. Upload older portfolio
4. See delta: value change, item adds/removes, allocation shifts

This required tracking "previous" state in context and computing diffs. More complex than expected, but highly valuable for seeing progress.

---

### Day 35: Era Classification Accuracy

Testing revealed era classification was only ~85% accurate. Problems:

1. **Set name variations**: "Pokemon GO" vs "Pokémon GO" vs "PTCGO"
2. **Japanese products**: Different naming conventions
3. **Promo cards**: Often lack clear era signals

**Solutions:**
- Expanded keyword matching with case-insensitive comparison
- Added common Japanese set name patterns
- Default to Ultra Modern for unclassifiable items (conservative assumption)

Accuracy improved to ~95%.

---

## The Visual Polish (Week 6)

### Day 38: Health Score Visualization

The health score needed visual weight. Added:
- Large circular progress indicator
- Color coding (green = good, yellow = caution, red = warning)
- Breakdown showing component scores (asset, era, concentration)
- Tooltip explaining each component

---

### Day 40: Donut Charts for Allocation

Bar charts felt clinical. Switched to donut charts for:
- Asset allocation (Sealed/Graded/Raw)
- Era allocation (5 segments)

The donut provides immediate visual recognition: "Oh, I'm mostly ultra modern" at a glance.

---

### Day 42: The Landing Page

The landing page needed to convince users to try the tool. Key elements:

1. **Hero**: "Make smarter decisions about your Pokémon collection"
2. **Screenshot previews**: Show the actual product
3. **Two CTAs**: "Analyze Your Portfolio" and "Take the Personality Quiz"
4. **Feature highlights**: Health score, insights, simulator

No pricing, no sign-up wall — pure value proposition.

---

## Unresolved Questions

### Should era boundaries be configurable?

Currently, era boundaries are hardcoded (Ultra Modern = 2020-2023). But different collectors have different mental models. Some consider Sword & Shield as "modern" not "ultra modern."

**Current stance:** Keep it opinionated. Configurability adds complexity and most users don't care about exact boundaries.

### Should we integrate live pricing?

Currently, we use the prices from the user's CSV. We could fetch current prices from TCGPlayer/TCGdex.

**Trade-offs:**
- Pro: More accurate, auto-refreshing values
- Con: API rate limits, potential costs, sync complexity

**Current stance:** Deferred. The MVP uses uploaded values. Live pricing is a future enhancement.

### How should we handle sealed product valuation?

Sealed products have less standardized pricing than singles. TCGPlayer often shows wide bid/ask spreads or outdated data.

**Current stance:** Trust the user's input. They likely know what their sealed products are worth.

### Multi-language support?

Japanese products are significant in the Pokémon market. Currently, era classification works for English set names only.

**Partial solution:** Added keyword matching for major Japanese sets. Full i18n is future work.

---

## Metrics & Learnings

### What Worked

1. **Fuzzy CSV parsing**: Handles 90%+ of exports without user configuration
2. **Opinionated scoring**: Users appreciate having direction, not just data
3. **Personality quiz**: High engagement, good completion rates
4. **Zero-auth onboarding**: Low friction drives usage

### What I'd Do Differently

1. **Start with types**: I spent too much time refactoring early code that wasn't properly typed
2. **Build comparison earlier**: Users requested this immediately — should have been in v1
3. **Simplify sealed sub-categories**: 11 sealed types is too many; most users only care about 4-5

### Technical Debt

1. `types.ts` is too large — needs splitting
2. Era classification is O(n×m) — could be O(n) with better data structure
3. Insight IDs aren't stable across renders — causes unnecessary re-renders

---

## What's Next

Immediate priorities:
1. Card image integration via TCGdex API
2. Price sync to compare uploaded values vs current market
3. Shareable portfolio links

Medium-term:
1. Mobile-responsive improvements
2. Multi-portfolio support
3. Community benchmarks ("your portfolio vs average collector")

Long-term:
1. Price trend charts
2. Rebalancing suggestions with specific trade recommendations
3. Integration with Collectr for direct sync

---

*Log maintained since project inception. Last updated January 2025.*
