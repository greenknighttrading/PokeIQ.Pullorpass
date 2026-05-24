REVOKE EXECUTE ON FUNCTION public.bump_card_tag_aggregate() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ingest_tags_from_swipe() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ingest_tags_from_review() FROM PUBLIC, anon, authenticated;