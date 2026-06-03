import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { Seo } from '@/components/seo/Seo';
import pokeiqLogo from '@/assets/pokeiq-logo.png';
import Matches from '@/pages/Matches';

type PublicProfile = {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

export default function PublicProfile() {
  const { username } = useParams<{ username: string }>();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<PublicProfile | null>(null);

  useEffect(() => {
    if (!username) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('user_profiles' as any)
        .select('user_id, username, display_name, avatar_url')
        .eq('username', username)
        .eq('public_profile_enabled', true)
        .maybeSingle() as any;
      setProfile((data as PublicProfile) ?? null);
      setLoading(false);
    })();
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-center px-6">
        <Seo title="Profile not found · PokeIQ" description="This PokeIQ profile is private or does not exist." />
        <h1 className="text-2xl font-bold mb-2">Profile not found</h1>
        <p className="text-muted-foreground mb-6">This profile is private or doesn't exist.</p>
        <Link to="/" className="text-primary hover:underline">Back to PokeIQ</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Seo
        title={`${profile.display_name || '@' + profile.username} · PokeIQ`}
        description={`${profile.display_name || profile.username}'s public PokeIQ profile.`}
      />
      <header className="border-b border-border/40 px-5 py-3 flex items-center gap-2">
        <Link to="/" className="flex items-center gap-2">
          <img src={pokeiqLogo} alt="PokeIQ" className="h-7 w-auto" />
          <span className="font-bold tracking-tight">PokeIQ</span>
        </Link>
      </header>

      <Matches
        viewedUserId={profile.user_id}
        viewedDisplayName={profile.display_name || profile.username}
        isPublicView
      />
    </div>
  );
}