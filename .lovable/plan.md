## V4 Collector Personality System

Rebuild the personality engine and quiz around 9 identity-first archetypes (no modifiers), driven by 24 Likert questions across 6 sections.

### 1. Rewrite `src/lib/personalityEngine.ts`

- Replace `QUIZ_QUESTIONS` with the 24 V4 questions, grouped into 6 sections of 4: Patience & Decision Making, Emotional Connection, Risk & Activity, Identity & Presentation, Discovery & Exploration, Structure & Balance.
- New `PersonalityType` union: `Investor | Archivist | Dreamer | Flipper | Analyst | Hunter | Explorer | Curator | Diplomat`.
- Remove `SecondaryModifier`, `MODIFIER_INFO`, and any modifier logic.
- New `TraitScores`: `patience, activity, emotion, analysis, conviction, structure, curiosity, balance` (0–100). Each trait derived from a fixed mapping of 2–4 questions (e.g. Patience = Q1–Q4 mean; Emotion = Q5–Q8; Activity = Q9 + Q12; Conviction = Q11 + Q12 + Q15; Curiosity = Q17 + Q19 + Q20; Analysis = Q18 + Q20 + Q22; Structure = Q13 + Q14 + Q16 + Q22; Balance = Q10 + Q21 + Q23 + Q24).
- Personality assignment: weighted score per type from traits, e.g.
  - Investor: patience + (100 − activity) + balance
  - Archivist: structure + conviction + emotion (lower curiosity)
  - Dreamer: emotion (heavy) + (100 − analysis)
  - Flipper: activity + (100 − patience)
  - Analyst: analysis + structure + curiosity
  - Hunter: conviction + activity + (100 − balance)
  - Explorer: curiosity + activity + (lower patience)
  - Curator: structure + emotion + balance
  - Diplomat: balance + patience + (low conviction)
  Highest-scoring type wins; deterministic tie-breaker by trait priority.
- New `PERSONALITY_INFO` map with the spec content per type: emoji, tagline (one-line philosophy), summary, core traits list, strength, weakness, collection style, famous behavior, danger zone, recommended action.
- New `PersonalityResult` shape:
  ```
  { type, traits, productAllocation, eraAllocation,
    summary, strength, weakness, dangerZone, recommendedAction }
  ```
  (no `modifiers`, no `explanations`, no `oneAction`.)
- `calculatePersonalityResult(answers)` returns the result with product/era allocations tuned per type (Investor → sealed-heavy; Archivist → graded-heavy vintage/classic; Dreamer → raw-heavy emotionally tied eras; Flipper → liquid modern; Analyst → balanced; Hunter → concentrated graded; Explorer → ultra-modern/current; Curator → balanced presentation-friendly; Diplomat → even spread across all eras and products), then nudged slightly by trait extremes.

### 2. Update `src/components/quiz/QuizPage.tsx`

- Page size = 4 (one section per page); 6 pages total. Drive from `QUIZ_QUESTIONS` length / section grouping (no hardcoded 6).

### 3. Update `src/pages/PersonalityTest.tsx`

- `QUESTIONS_PER_PAGE = 4`, `TOTAL_PAGES = 6`.

### 4. Rewrite `src/components/quiz/QuizResults.tsx`

Match the spec's result page structure:
1. Hero: emoji + "The {Type}" + one-line philosophy
2. Personality summary paragraph
3. Core Traits — radar-style bars for the 8 traits (or chips for the 4 named core traits of that type)
4. Strength card / Weakness card (two-col)
5. Collection Style — Sealed/Graded/Raw bars (keep existing component pattern)
6. Era Focus — Vintage/Classic/Modern/Ultra Modern/Current bars
7. Danger Zone card (destructive accent)
8. Recommended Action card (accent)
9. Keep the locked premium upsell + final CTA

Remove all references to `MODIFIER_INFO`, `result.modifiers`, `result.explanations`, `result.oneAction`, `personalityProfile`, `strengths[]`, `blindSpots[]`, `growth`, `collectsBest`, `drains`.

Icon map updated for the 9 new types (lucide: Investor → PiggyBank, Archivist → ScrollText, Dreamer → Heart, Flipper → Zap, Analyst → Calculator, Hunter → Target, Explorer → Compass, Curator → LayoutGrid, Diplomat → Scale).

### 5. Compatibility fixups

- `src/pages/simulator/SimulatorContext.tsx` reads `personalityResult.productAllocation` and `personalityResult.eraAllocation` — both shapes preserved, no changes needed.
- Update the `collector-personality-test.md` export document to reflect V4 (optional follow-up; flag for user).

### Technical notes

- Trait normalization: each trait = mean of its source answers mapped from Likert 1–5 to 0–100 via `(v − 1) × 25`.
- Personality score: simple weighted sum of selected traits (and `100 − trait` for inverses), then pick max. Tie-break order: Investor, Archivist, Curator, Diplomat, Analyst, Dreamer, Hunter, Explorer, Flipper (skews ties toward more "stable" identities, matching the system's identity-first feel).
- Allocations clamped to integers summing to 100 via a final rounding pass.
- No DB / backend changes. localStorage key `personalityResult` is overwritten with the new shape on completion; old saved values will be ignored by SimulatorContext if fields are missing (already null-safe).
