## Rename "Social" to "Arena" and build the Arena hub

Turn the current single-link Social tab into an **Arena** hub — a landing page at `/arena` that houses Daily Battle (free, for everyone), This or That (premium), and the Leaderboard. Daily Battle gets top billing because it's the everyday shared experience; This or That is clearly marked as the premium extension of the same idea.

### Changes

**Navigation (`src/components/layout/PokeIQShell.tsx`)**
- Rename the `Social` item in both `primaryNav` and `mobileNav` to **Arena**, keep the `Trophy` icon, and point `href` to `/arena`.

**New route (`src/App.tsx` + `src/pages/Arena.tsx`)**
- Add `/arena` route wrapped in `PokeIQShell`, lazy-loaded like siblings.
- The `Arena` page has three sections stacked for mobile, 2-column-ish grid on desktop:
  1. **Daily Battle (hero card, free for everyone)** — reuses `DailyBattleEntryCard` at full width with a "Free · Daily · Everyone plays" caption. Copy makes clear all 5 battles are free.
  2. **This or That (premium)** — large card that links to `/this-or-that`. Shows a small `Crown` badge + "Premium" pill; for non-premium users the primary CTA reads "Unlock with Pro" and routes to `/premium`, with a secondary "Preview" link to `/this-or-that`. Copy: "200 personalized battles — pick your favorite and train your taste."
  3. **Leaderboard** — card linking to `/leaderboard` with a short "See how you rank against every collector" line and a preview of top ranks (optional stretch: read top 3 from existing leaderboard query; skip if it adds complexity).

**Leaderboard page**
- Keep `/leaderboard` intact. Add a small "← Back to Arena" breadcrumb link at the top so users who deep-link out of Arena can return.

**SEO**
- Set `<title>Arena — Daily Battle, This or That, Leaderboard</title>` and matching meta description via the existing `Seo` component on the Arena page.

### Out of scope
- No changes to Daily Battle mechanics, This or That gating, or Leaderboard data.
- No database changes.
- Existing entry cards on Matches / Results pages stay put.

### Visual direction
Follows current dark/teal system: cards use `bg-card/40`, `border-border/60`, primary teal accents for Daily Battle, violet accents (matching Premium tab) on the This or That card, gold `Trophy` accent on Leaderboard. No new palette.
