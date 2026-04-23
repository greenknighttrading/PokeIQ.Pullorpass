-- Add unique constraint for user_asset_mappings upsert on (user_id, upload_fingerprint)
ALTER TABLE public.user_asset_mappings
  ADD CONSTRAINT user_asset_mappings_user_fingerprint_unique
  UNIQUE (user_id, upload_fingerprint);
