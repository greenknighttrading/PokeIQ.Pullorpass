# Retention and simplification plan for PokeIQ

## Why people stop
Swiping is fun for a while, but the app doesn't yet give people a reason to come back tomorrow. Returning users need three things: **something new each day**, **progress they don't want to lose**, and **a payoff for swiping** (knowing more about their taste, and seeing how it compares to friends).

## The core loop (keep only this)

```text
Swipe cards -> Taste profile gets sharper -> Better matches / insights -> Daily Battle + streak -> come back tomorrow
```

Four core features:
1. **Swipe** (Pull or Pass): the main thing people do.
2. **Profile / Taste DNA**: the payoff, meaning what your swipes say about you.
3. **Daily Battle**: the daily reason to open the app.
4. **Pro**: more swipes, the Unlimited Arena, deeper insights.

Everything else becomes secondary or hidden.

## What brings people back (in priority order)

1. **Daily streak across the app**: counts any swipe session or Daily Battle. Show it in the header, and add a "streak freeze" as a Pro perk.
2. **Daily swipe drop**: "Today's 30 cards" refresh at midnight EST, with one guaranteed "grail pick" chosen for the user's taste. This makes the free limit feel like a gift instead of a wall.
3. **Visible taste reveals**: every 25 swipes, unlock a short reveal ("You lean Art Curator, 72%"; "New tag unlocked: Dreamlike"). This uses the taste-archetype engine that already exists but isn't shown yet.
4. **Daily Battle results with a reason to return**: "See how everyone voted tomorrow" plus "You agreed with 68% of collectors."
5. **Friend comparison**: "You and Alex are an 81% taste match." Share links already give referral bonuses, so this builds on that.
6. **Reminder emails / push (iOS)**: one message a day, only for streaks or a new drop.

## Simplification

- **Bottom navigation stays at 4 tabs:** Swipe, Arena, Earn, Profile. Earn gets folded into Swipe as occasional "tag this card" prompts that give bonus swipes. The tab stays for now until usage is checked.
- **Arena gets one main button:** Daily Battle. Leaderboard and Unlimited Arena become smaller rows below it.
- **Hide the old market and portfolio tools** (Pulse, Buylist, Simulator, Smart Feed, and similar) from the main navigation. They stay reachable by direct link.
- **Profile:** identity card, streak, Taste DNA, milestones. Nothing else on the first screen.
- **Remove duplicate "match" concepts:** the Matches, Results and Collection pages merge into Profile tabs (Liked / Recommended).

## Build phases

**Phase 1 (smallest win):** global streak plus the daily swipe drop with a grail pick, and a streak indicator in the header.
**Phase 2:** taste reveals every 25 swipes (showing the swipe-based archetype on Profile).
**Phase 3:** simplify the navigation and Arena, hide the old tools, merge the Matches pages into Profile.
**Phase 4:** friend taste-match plus daily reminders.

## Technical details
- Streak: a new `user_streaks` table (user_id, current, longest, last_active_date EST), updated on swipe and battle completion. Includes RLS and grants.
- Daily drop: server-seeded daily pool per user, reusing the existing filters in `cardDisplayFilters.ts` and `recommendCards`.
- Reveals: surface `computeTasteArchetype` in `ProgressionHero.tsx`, triggered by swipe count.
- Navigation changes are in `PokeIQShell.tsx` and `App.tsx`. Routes stay in place; only the links are removed.
- Measure with the existing events table: day-1 and day-7 return rate, and swipes per session.
