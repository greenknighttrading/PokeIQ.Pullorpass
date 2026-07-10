## Plan

1. **Create one shared card-quality filter**
   - Add a small reusable utility that clearly separates displayable single cards from sealed/non-card products.
   - Treat a card as invalid if it is explicitly `sealed`, or if its name/set/card id contains sealed/product terms like booster, box, pack, deck, tin, ETB, bundle, blister, case, collection, code card, energy, trainer, etc.
   - Use this stricter predicate even when the backend row says `product_type = card`, because the data sample shows mislabeled rows.

2. **Apply the filter at card source points**
   - Update Pull or Pass round loading so new swipe rounds only include single cards.
   - Update feed filter refresh so selecting formats cannot accidentally reintroduce sealed products into the standard card feed.
   - Update recommendations so “Recommended for you” cannot include sealed/code/energy/trainer products.
   - Update likes/pass/profile rendering so old bad data already stored for users is hidden from Matches/Binder/Profile.

3. **Deduplicate cards before display**
   - Deduplicate swipe-history rows by `card_id` before rendering Liked, Disliked, binder, and recent-round sections.
   - For repeated swipe records, keep the latest decision for the recent Liked/Disliked carousels so a user sees one card once.
   - Keep existing `pokeiq_likes` behavior, but add UI-side dedupe as a safety net for cached/local/server merges.

4. **Fix thumbnail image fallback behavior**
   - For Matches rows, fetch both `tcgplayer_id` and stored `image_url` metadata for visible cards, not only affiliate ids.
   - Render thumbnails with an ordered fallback list: saved image → database image → TCGPlayer CDN URL from id.
   - If the first image fails, automatically try the next candidate instead of immediately showing the broken-image placeholder.
   - Pass the resolved image into the detail modal so the thumbnail and click-in view use the same best available art.

5. **Prevent future duplicate swipe records**
   - Before inserting a swipe, check whether that user has already swiped that `card_id`; if yes, update/skip instead of inserting another duplicate.
   - Add a backend uniqueness guard for future data if feasible: one swipe row per `user_id + card_id`, with latest decision/tags preserved.
   - Avoid destructive cleanup in this pass; old duplicates will be hidden by the display dedupe.

6. **Verify**
   - Check `/binder` after changes: Recommended above Liked, Liked images render or fall back properly, Disliked remains collapsed.
   - Confirm no visible sealed/code/energy/trainer products appear in Recommended, Liked, Disliked, or Binder.
   - Confirm duplicate cards appear only once for users with repeated swipe history.