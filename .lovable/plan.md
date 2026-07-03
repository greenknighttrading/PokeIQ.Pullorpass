# Nav Reorganization Plan

## Final top-level nav (in PokeIQShell sidebar)

1. **Pull or Pass** → `/swipe`
2. **Profile** (was "Smart Profile") → `/profile`
3. **Identity** (was "Personality Test") → `/personality-types`
4. **Earn** (was "Training Lab") → `/pokeyelp`
5. **Market** (was "Market Report") → `/pokeiq-daily`

Removed from top-level: Matches, Leaderboard, Card Search (routes preserved, just nested).

> Note: your instructions rename "Market Report → market" but the final list still says "Market Report". I'll use **Market** per the rename directive. Say the word if you'd rather keep "Market Report".

## 1. `src/components/layout/PokeIQShell.tsx`

Rewrite `primaryNav` to the 5 items above with new labels. Remove Matches, Leaderboard, Card Search entries. Update the account dropdown item "Smart Profile" → "Profile".

## 2. Nest Matches inside Pull or Pass — `src/pages/PullOrPass.tsx`

Add a persistent **"Matches" pill button** (Heart icon + count if easy, else just label) in the top-right of the Pull or Pass header that routes to `/matches`. Keep `/matches` route working as-is. Pattern: same style as existing header actions so it stays visually consistent.

## 3. Nest Leaderboard inside Profile — `src/pages/Matches.tsx` (the `/profile` page)

Add a **Leaderboard entry card/button** near the top of the Profile page (Trophy icon, "Leaderboard — See top collectors", `NEW` badge) that navigates to `/leaderboard`. Route stays live.

## 4. Nest Card Search inside Market — `src/pages/PokeIQDaily.tsx`

Add a **"Card Search" secondary action** in the Market page header (Search icon button/link) that routes to `/buylist/scanner`. Route stays live.

## 5. Other references to update

- `src/components/layout/GlobalNavBar.tsx` — update labels ("Personality Test" → "Identity", "Training Lab" → "Earn", "Smart Profile" → "Profile" in any dropdown copy) and drop standalone Matches / Card Search / Leaderboard items where they appear as siblings of the renamed top-level tabs. Keep them reachable via the nested entry points above.
- Any hardcoded label strings like "Smart Profile", "Personality Test", "Training Lab", "Market Report" in the shell/nav components will be updated. Non-nav page titles/H1s are **not** touched (UI-copy-only rename is limited to nav surfaces) unless you want deeper copy changes.

## Out of scope

- No route path changes (`/profile`, `/personality-types`, `/pokeyelp`, `/pokeiq-daily`, `/matches`, `/leaderboard`, `/buylist/scanner` all preserved) so no redirect logic needed and no broken deep links.
- No changes to premium/collect section of the sidebar.
- No business-logic or backend changes.
