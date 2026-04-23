

# Simplify Asset Type & Era Allocation Pages

Both pages currently stack 4 separate card sections vertically, requiring heavy scrolling and making the experience feel complex. The plan consolidates these into a cleaner, more scannable layout while keeping every feature.

## Current Pain Points
- 4 separate glass cards stacked vertically = lots of scrolling
- "Rebalancing Analysis" and "Rebalance Calculator" feel like separate tools when they're really one flow
- Sliders + total validation + apply button feels like a form, not a tool
- Health warnings (era page) take up space at the top before the user has done anything

## Redesign Approach

### 1. Merge into Two Sections (down from 4)

**Section A — "Set Your Target"**
- Preset buttons (Conservative / Balanced / Aggressive) as compact pills in a single row
- Sliders directly below with inline current vs target comparison per row (e.g., `Sealed 42% → 30%` with the slider)
- Total indicator becomes a subtle inline bar at the bottom (not a separate section)
- Auto-apply: remove the "Apply Custom Allocation" button — changes apply live as sliders move (debounced). This removes the confusing "must equal 100%" friction. Instead, show a soft warning inline when total ≠ 100% and gray out the analysis until valid.

**Section B — "Your Rebalancing Plan"**  
- Combines the old "Rebalancing Analysis" + "Rebalance Calculator" into one card
- At the top: Monthly Budget / Target Date toggle (compact)
- Below: each category row shows current → target, delta, AND the monthly allocation or required monthly in one unified row (no separate cards for analysis vs calculator)
- Timeline estimate and insights fold into the bottom of this same card
- Health warnings (era page) become inline badges within relevant rows rather than a separate top card

### 2. Per-Slider Inline Comparison
Instead of a separate "Rebalancing Analysis" card, each slider row itself shows:
```text
Sealed Products          42.1% → 30%
[━━━━━━━━━━━━━━━░░░░░░░]  ▼ Overweight −$1,200
```
This eliminates an entire section.

### 3. Files to Modify
- `src/components/rebalance/RebalanceSimulator.tsx` — consolidate into 2 sections, add inline comparison per slider, auto-apply logic
- `src/components/rebalance/EraRebalanceSimulator.tsx` — same treatment, move health warnings inline
- `src/pages/Rebalance.tsx` — minor: simplify page description
- `src/pages/EraAllocation.tsx` — minor: simplify page description

### 4. Key UX Improvements
- **Auto-apply on valid total**: No more "Apply" button. When sliders sum to 100%, analysis updates instantly. When they don't, show a subtle `Total: 85% (need 100%)` bar and gray out the plan section.
- **Unified rows**: Each category shows slider + current% + target% + delta all in one row
- **Collapsible budget controls**: Monthly budget presets collapse into a compact input row instead of a grid of buttons
- **Fewer visual layers**: Remove nested borders-within-cards; use spacing and subtle dividers instead

