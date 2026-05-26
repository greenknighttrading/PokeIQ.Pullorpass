import { supabase } from "@/integrations/supabase/client";

export async function listArchetypes() {
  const { data } = await supabase
    .from("archetypes")
    .select("id, slug, name, description, seed_traits, member_count")
    .order("member_count", { ascending: false });
  return data ?? [];
}
