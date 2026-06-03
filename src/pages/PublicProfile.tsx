import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Loader2 } from 'lucide-react';
import { Seo } from '@/components/seo/Seo';
import pokeiqLogo from '@/assets/pokeiq-logo.png';

type PublicProfile = {
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
        .select('username, display_name, avatar_url')
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

  const initial = (profile.display_name || profile.username || '?').charAt(0).toUpperCase();

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

      <main className="max-w-2xl mx-auto px-6 py-12">
        <div className="flex flex-col items-center text-center gap-4">
          <Avatar className="w-28 h-28 ring-2 ring-primary/30">
            {profile.avatar_url ? <AvatarImage src={profile.avatar_url} alt={profile.username} /> : null}
            <AvatarFallback className="bg-primary/15 text-primary text-3xl font-semibold">
              {initial}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold">{profile.display_name || `@${profile.username}`}</h1>
            <div className="text-primary mt-1">@{profile.username}</div>
          </div>
        </div>

        <div className="mt-12 rounded-2xl border border-border/60 bg-card/40 p-8 text-center">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Collector personality, favorite cards, taste profile, and portfolio showcase
            are coming soon to public profiles.
          </p>
        </div>
      </main>
    </div>
  );
}