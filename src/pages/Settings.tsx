import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Copy, ExternalLink, Loader2, Pencil, Upload, Check, Crown, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useIsPremium } from '@/hooks/useIsPremium';
import { Seo } from '@/components/seo/Seo';

type ProfileRow = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  public_profile_enabled: boolean;
};

const PUBLIC_BASE = 'pokeiq.com/u/';

function generateUsername(seed?: string | null) {
  const digits = Math.floor(Math.random() * 900000 + 100000); // 6 digits
  return `TRAINER${digits}`;
}

export default function Settings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isPremium } = useIsPremium();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);

  const [username, setUsername] = useState('');
  const [editing, setEditing] = useState(false);
  const [draftUsername, setDraftUsername] = useState('');
  const [publicEnabled, setPublicEnabled] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      if (!u || u.is_anonymous) {
        navigate('/auth');
        return;
      }
      setUserId(u.id);
      setEmail(u.email ?? null);

      const { data: row } = await supabase
        .from('user_profiles' as any)
        .select('user_id, username, display_name, avatar_url, public_profile_enabled')
        .eq('user_id', u.id)
        .maybeSingle() as any;

      if (row) {
        setProfile(row as ProfileRow);
        setPublicEnabled(!!row.public_profile_enabled);
        if (row.username) {
          setUsername(row.username);
        } else {
          const generated = generateUsername();
          setUsername(generated);
          try {
            const { data: saved } = await supabase
              .from('user_profiles' as any)
              .upsert({ user_id: u.id, username: generated }, { onConflict: 'user_id' })
              .select()
              .maybeSingle() as any;
            if (saved) setProfile(saved as ProfileRow);
          } catch {}
        }
      } else {
        const generated = generateUsername();
        setUsername(generated);
        try {
          const { data: saved } = await supabase
            .from('user_profiles' as any)
            .upsert({ user_id: u.id, username: generated }, { onConflict: 'user_id' })
            .select()
            .maybeSingle() as any;
          if (saved) setProfile(saved as ProfileRow);
        } catch {}
      }
      setLoading(false);
    })();
  }, [navigate]);

  const draftValid = /^[a-zA-Z0-9_]{3,30}$/.test(draftUsername);

  async function persist(patch: Partial<ProfileRow>) {
    if (!userId) return;
    const next = {
      user_id: userId,
      username: patch.username !== undefined ? patch.username : username || null,
      display_name: patch.display_name !== undefined ? patch.display_name : profile?.display_name ?? null,
      avatar_url: patch.avatar_url !== undefined ? patch.avatar_url : profile?.avatar_url ?? null,
      public_profile_enabled:
        patch.public_profile_enabled !== undefined ? patch.public_profile_enabled : publicEnabled,
    };
    const { data, error } = await supabase
      .from('user_profiles' as any)
      .upsert(next, { onConflict: 'user_id' })
      .select()
      .maybeSingle() as any;
    if (error) throw error;
    if (data) setProfile(data as ProfileRow);
    return data as ProfileRow | null;
  }

  function startEdit() {
    setDraftUsername(username);
    setEditing(true);
  }

  async function handleSaveUsername() {
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(draftUsername)) {
      toast({ title: 'Invalid username', description: '3–30 chars, letters/numbers/underscore.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await persist({ username: draftUsername });
      setUsername(draftUsername);
      setEditing(false);
      toast({ title: 'Username updated' });
    } catch (e: any) {
      const msg = e?.message?.includes('user_profiles_username') || e?.code === '23505'
        ? 'That username is already taken.'
        : e?.message ?? 'Could not save.';
      toast({ title: 'Save failed', description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarUpload(file: File) {
    if (!userId) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Image too large', description: 'Max 5MB.', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { cacheControl: '3600', upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
      await persist({ avatar_url: pub.publicUrl });
      toast({ title: 'Profile picture updated' });
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e?.message ?? 'Try again.', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  }

  async function handleTogglePublic(value: boolean) {
    if (value && !username) {
      toast({ title: 'Set a username first', description: 'Required to generate your public link.', variant: 'destructive' });
      return;
    }
    setPublicEnabled(value);
    try {
      await persist({ public_profile_enabled: value });
      toast({ title: value ? 'Public profile enabled' : 'Public profile disabled' });
    } catch (e: any) {
      setPublicEnabled(!value);
      toast({ title: 'Could not update', description: e?.message, variant: 'destructive' });
    }
  }

  const publicUrl = username ? `${PUBLIC_BASE}${username}` : `${PUBLIC_BASE}your-username`;
  const fullUrl = `https://${publicUrl}`;

  function copyLink() {
    navigator.clipboard.writeText(fullUrl);
    toast({ title: 'Link copied' });
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const initial = (username || email || '?').charAt(0).toUpperCase();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
      <Seo title="Settings · PokeIQ" description="Manage your PokeIQ profile and public sharing." />

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your identity, profile, and public sharing.</p>
      </div>

      {/* Profile header */}
      <section className="rounded-2xl border border-border/60 bg-card/40 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <Avatar className="w-24 h-24 sm:w-28 sm:h-28 ring-2 ring-primary/30">
                {profile?.avatar_url ? <AvatarImage src={profile.avatar_url} alt="avatar" /> : null}
                <AvatarFallback className="bg-primary/15 text-primary text-2xl font-semibold">
                  {initial}
                </AvatarFallback>
              </Avatar>
              <label
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors shadow-md"
                aria-label="Upload profile picture"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleAvatarUpload(f);
                  }}
                />
              </label>
            </div>
          </div>

          <div className="flex-1 min-w-0 w-full space-y-4">
            {!editing ? (
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold">@{username}</h2>
                <button
                  onClick={startEdit}
                  className="w-8 h-8 rounded-md hover:bg-muted/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Edit username"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                {isPremium && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
                    <Crown className="w-3 h-3" /> Premium
                  </span>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                    <Input
                      autoFocus
                      value={draftUsername}
                      onChange={(e) => setDraftUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                      placeholder="username"
                      className="pl-7"
                      maxLength={30}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && draftValid) handleSaveUsername();
                        if (e.key === 'Escape') setEditing(false);
                      }}
                    />
                  </div>
                  <Button size="sm" onClick={handleSaveUsername} disabled={saving || !draftValid}>
                    {saving ? <Loader2 className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                {!draftValid && draftUsername.length > 0 && (
                  <p className="text-xs text-destructive">3–30 chars; letters, numbers, underscores.</p>
                )}
              </div>
            )}
            <div className="text-sm text-muted-foreground truncate">{email}</div>

            <div className="text-xs text-muted-foreground">
              Public profile preview:{' '}
              <span className="text-foreground/80">{publicUrl}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Profile sharing */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Profile Sharing</h2>
        <div className="rounded-2xl border border-border/60 bg-card/40 p-5 sm:p-6 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="font-semibold">Enable Public Profile</div>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                Generate a public PokeIQ profile that you can share with friends and other collectors.
                When enabled, your profile can be viewed through a unique public link.
              </p>
            </div>
            <Switch checked={publicEnabled} onCheckedChange={handleTogglePublic} />
          </div>

          {publicEnabled && (
            <>
              <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/60 px-3 py-2.5">
                <span className="text-sm text-foreground/90 truncate flex-1">{fullUrl}</span>
                <button
                  onClick={copyLink}
                  className="shrink-0 w-8 h-8 rounded-md hover:bg-muted/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Copy link"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={copyLink}>
                  <Copy className="w-4 h-4 mr-2" /> Copy Link
                </Button>
                {username && (
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/u/${username}`}>
                      <ExternalLink className="w-4 h-4 mr-2" /> Preview Profile
                    </Link>
                  </Button>
                )}
              </div>
            </>
          )}

          <p className="text-xs text-muted-foreground leading-relaxed">
            Filters, matches, collector personality, favorite cards, and portfolio information can be shared
            from your public profile depending on your privacy settings.
          </p>
        </div>
      </section>
    </div>
  );
}