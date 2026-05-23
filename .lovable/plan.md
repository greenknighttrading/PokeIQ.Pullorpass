Plan:

1. Restore the desktop layout so the card image sits to the right of the tag section, not above it.
   - Use a two-column desktop grid with the tags/review panel first and the card image second.
   - Keep mobile stacked naturally, but desktop must show tags on the left and image on the right.

2. Make the card image smaller and stable.
   - Reduce the desktop image column from the current 286px down to a more compact fixed width close to the earlier size.
   - Constrain the image with a fixed aspect ratio so it cannot grow to more than half the screen.
   - Keep it aligned in the same desktop position rather than letting it stretch or dominate the layout.

3. Keep the existing Back, Skip, Submit, filters, and tag behavior unchanged.
   - Only adjust layout/order/size around the image and tags.
   - No backend or tag logic changes.