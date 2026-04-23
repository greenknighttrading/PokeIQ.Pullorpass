
-- Create watchlist table for users to save cards/products they want to track
CREATE TABLE public.buylist_watchlist (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  card_id text NOT NULL,
  name text NOT NULL,
  set_name text,
  product_type text DEFAULT 'card',
  tcgplayer_id text,
  rarity text,
  added_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, card_id)
);

-- Enable RLS
ALTER TABLE public.buylist_watchlist ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own watchlist
CREATE POLICY "Users can view own watchlist" ON public.buylist_watchlist
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can add to own watchlist" ON public.buylist_watchlist
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove from own watchlist" ON public.buylist_watchlist
  FOR DELETE USING (auth.uid() = user_id);
