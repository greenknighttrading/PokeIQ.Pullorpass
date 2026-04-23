/**
 * Fuzzy keyword classifier for Pokémon TCG product types.
 * Priority: graded > sealed > single (default).
 */

const GRADED_KEYWORDS = [
  'psa', 'bgs', 'beckett', 'cgc', 'sgc', 'ace grading', 'hga',
  'gem mint', 'gem mt', 'gem-mint', 'pristine', 'black label',
  'slab', 'graded', 'encased',
  'psa 10', 'psa10', 'cgc 10', 'bgs 9.5', 'beckett 9.5',
];

const GRADED_GRADE_PATTERNS = /\b(psa|bgs|cgc|sgc|beckett|hga)\s*\d/i;

const SEALED_KEYWORDS = [
  'booster box', 'booster bundle', 'booster pack', 'sleeved booster',
  'elite trainer box', 'etb',
  'ultra premium collection', 'premium collection', 'collection box',
  'box set', 'sealed case', 'case',
  'tin', 'mini tin', 'pokeball tin', 'lunchbox', 'chest', 'premium chest',
  'trainer toolkit', 'build and battle', 'build & battle',
  'stadium', 'battle stadium', 'bundle', 'multipack',
  '3 pack blister', '2 pack blister', 'blister',
  'theme deck', 'deck box', 'starter deck', 'preconstructed deck',
  'prerelease kit', 'sealed product',
  'sealed', 'factory sealed', 'unopened', 'new box',
];

export type ProductType = 'graded' | 'sealed' | 'single';

export function classifyProductType(name: string): ProductType {
  const lower = name.toLowerCase().replace(/[^\w\s&]/g, ' ');

  // Check graded first (highest priority)
  if (GRADED_GRADE_PATTERNS.test(name)) return 'graded';
  for (const kw of GRADED_KEYWORDS) {
    if (lower.includes(kw)) return 'graded';
  }

  // Check sealed
  for (const kw of SEALED_KEYWORDS) {
    if (lower.includes(kw)) return 'sealed';
  }

  return 'single';
}
