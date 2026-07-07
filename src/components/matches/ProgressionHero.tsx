import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Pencil, Check as CheckIcon, X as XClose, Trophy, Star, Crown, Sparkles,
  Mountain, Award, BookOpen, Heart as HeartIcon, Eye, Target, HelpCircle, Lock,
  Camera, Loader2, Droplets, Flame, Leaf, Zap, Brain, Swords, Moon, Shield,
  Ghost, Palette, Languages, Hourglass, Gem, Circle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import squirtleAvatar from '@/assets/squirtle-default.png';
import type { TasteProfile } from '@/lib/tasteProfile';

// ─────────────────────────────────────────────────────────────
// LEVELS
// ─────────────────────────────────────────────────────────────
export const COLLECTOR_LEVELS: { level: number; title: string; xp: number }[] = [
  { level: 1,  title: 'Novice',      xp: 0 },
  { level: 2,  title: 'Explorer',    xp: 250 },
  { level: 3,  title: 'Pathfinder',  xp: 600 },
  { level: 4,  title: 'Seeker',      xp: 1100 },
  { level: 5,  title: 'Pioneer',     xp: 1800 },
  { level: 6,  title: 'Trailblazer', xp: 2800 },
  { level: 7,  title: 'Expert',      xp: 4200 },
  { level: 8,  title: 'Veteran',     xp: 6000 },
  { level: 9,  title: 'Elite',       xp: 8500 },
  { level: 10, title: 'Legend',      xp: 12000 },
];

function computeXp(cardsSwiped: number, likes: number): number {
  return cardsSwiped * 5 + likes * 5;
}

function levelFromXp(xp: number) {
  let current = COLLECTOR_LEVELS[0];
  let next: typeof COLLECTOR_LEVELS[number] | null = COLLECTOR_LEVELS[1] ?? null;
  for (let i = 0; i < COLLECTOR_LEVELS.length; i++) {
    if (xp >= COLLECTOR_LEVELS[i].xp) {
      current = COLLECTOR_LEVELS[i];
      next = COLLECTOR_LEVELS[i + 1] ?? null;
    }
  }
  const nextXp = next?.xp ?? current.xp;
  const pct = next ? Math.min(100, ((xp - current.xp) / (nextXp - current.xp)) * 100) : 100;
  return { current, next, pct, xp, nextXp };
}

// ─────────────────────────────────────────────────────────────
// SWIPE MILESTONES
// ─────────────────────────────────────────────────────────────
const SWIPE_MILESTONES: { at: number; title: string; reward: string; icon: React.ReactNode }[] = [
  { at: 100,  title: 'Starter',   reward: '+20 Swipes', icon: <Sparkles className="w-5 h-5" /> },
  { at: 200,  title: 'Explorer',  reward: '+20 Swipes', icon: <Mountain className="w-5 h-5" /> },
  { at: 500,  title: 'Collector', reward: '+20 Swipes', icon: <Star className="w-5 h-5" /> },
  { at: 1000, title: 'Master',    reward: '+20 Swipes', icon: <Crown className="w-5 h-5" /> },
  { at: 2000, title: 'Champion',  reward: '+20 Swipes', icon: <Trophy className="w-5 h-5" /> },
  { at: 3000, title: 'Virtuoso',  reward: '+20 Swipes', icon: <Award className="w-5 h-5" /> },
  { at: 5000, title: 'Legend',    reward: '+20 Swipes', icon: <Crown className="w-5 h-5" /> },
];

function nextMilestone(swiped: number) {
  return SWIPE_MILESTONES.find((m) => swiped < m.at) ?? null;
}

// ─────────────────────────────────────────────────────────────
// DNA — neutral outlined chips only. No color coding.
// ─────────────────────────────────────────────────────────────
function buildDnaLabels(taste: TasteProfile, isPremium: boolean): string[] {
  const out: string[] = [];
  if (isPremium) out.push('Premium');
  const tier = taste.priceDistribution.find((p) => p.key !== 'unknown');
  if (tier && (tier.key === 'grail' || tier.key === 'premium')) {
    out.push(tier.key === 'grail' ? 'Grails' : 'Premium Cards');
  }
  const era = taste.topEras[0];
  if (era) out.push(`${era.label.split(' (')[0]} Era`);
  const type = taste.topPokemonTypes[0];
  if (type) out.push(`${type.label}`);
  const rarity = taste.topRarities[0];
  if (rarity) out.push(rarity.label);
  const artist = taste.topArtists[0];
  if (artist && artist.count >= 2) out.push(artist.label);
  const pokemon = taste.topPokemon[0];
  if (pokemon && pokemon.count >= 2) out.push(pokemon.label);
  if (taste.languageMix.find((l) => l.key === 'Japanese' && l.pct >= 20)) out.push('Japanese');
  return out;
}

// Map a DNA label to a distinct icon + color. Colors are hex so Tailwind
// doesn't purge them, applied via inline style for maximum readability.
function dnaStyle(label: string): { icon: React.ReactNode; color: string } {
  const l = label.toLowerCase();
  const mk = (icon: React.ReactNode, color: string) => ({ icon, color });
  // Pokémon types
  if (l === 'water')     return mk(<Droplets className="w-3.5 h-3.5" />, '#38bdf8');
  if (l === 'fire')      return mk(<Flame className="w-3.5 h-3.5" />,    '#f97316');
  if (l === 'grass')     return mk(<Leaf className="w-3.5 h-3.5" />,     '#4ade80');
  if (l === 'lightning' || l === 'electric') return mk(<Zap className="w-3.5 h-3.5" />, '#facc15');
  if (l === 'psychic')   return mk(<Brain className="w-3.5 h-3.5" />,    '#c084fc');
  if (l === 'fighting')  return mk(<Swords className="w-3.5 h-3.5" />,   '#f87171');
  if (l === 'darkness' || l === 'dark') return mk(<Moon className="w-3.5 h-3.5" />, '#94a3b8');
  if (l === 'fairy')     return mk(<HeartIcon className="w-3.5 h-3.5" />, '#f472b6');
  if (l === 'dragon')    return mk(<Flame className="w-3.5 h-3.5" />,    '#818cf8');
  if (l === 'metal' || l === 'steel') return mk(<Shield className="w-3.5 h-3.5" />, '#9ca3af');
  if (l === 'ghost')     return mk(<Ghost className="w-3.5 h-3.5" />,    '#a78bfa');
  if (l === 'colorless' || l === 'normal') return mk(<Circle className="w-3.5 h-3.5" />, '#d6d3d1');
  // Rarity
  if (l.includes('holo'))     return mk(<Sparkles className="w-3.5 h-3.5" />, '#22d3ee');
  if (l.includes('secret'))   return mk(<Star className="w-3.5 h-3.5" />,    '#e879f9');
  if (l.includes('ultra'))    return mk(<Star className="w-3.5 h-3.5" />,    '#60a5fa');
  if (l === 'rare')           return mk(<Star className="w-3.5 h-3.5" />,    '#22d3ee');
  // Premium / grails
  if (l === 'premium' || l.includes('premium cards')) return mk(<Crown className="w-3.5 h-3.5" />, '#fbbf24');
  if (l.includes('grail'))    return mk(<Gem className="w-3.5 h-3.5" />, '#fbbf24');
  // Eras
  if (l.includes('vintage era')) return mk(<Hourglass className="w-3.5 h-3.5" />, '#d97706');
  if (l.includes('classic era')) return mk(<Hourglass className="w-3.5 h-3.5" />, '#eab308');
  if (l.includes('modern era'))  return mk(<Sparkles className="w-3.5 h-3.5" />,  '#2dd4bf');
  if (l.includes('era'))         return mk(<BookOpen className="w-3.5 h-3.5" />,  '#a3e635');
  // Language
  if (l === 'japanese')  return mk(<Languages className="w-3.5 h-3.5" />, '#f87171');
  // Fallback: artists, specific pokemon, etc. Use a palette rotation via hash.
  const palette = ['#3b9e8f', '#c084fc', '#f472b6', '#60a5fa', '#f59e0b', '#4ade80'];
  let h = 0;
  for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) >>> 0;
  return mk(<Palette className="w-3.5 h-3.5" />, palette[h % palette.length]);
}

// ─────────────────────────────────────────────────────────────
// ProfileHeader — avatar (uploadable) + name + level + personality
// ─────────────────────────────────────────────────────────────
function ProfileHeader({
  readOnly,
  staticName,
  level,
  xp,
  personalityType,
}: {
  readOnly?: boolean;
  staticName?: string;
  level: number;
  xp: number;
  personalityType?: string | null;
}) {
  const [userId, setUserId] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [name, setName] = useState(staticName || '');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (readOnly) { setName(staticName || 'Collector'); return; }
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const display =
        (user.user_metadata as { display_name?: string } | null)?.display_name
        || (user.email ? user.email.split('@')[0] : '')
        || 'Collector';
      setName(display);
      setDraft(display);
      const { data: row } = await supabase
        .from('user_profiles' as any)
        .select('avatar_url, display_name')
        .eq('user_id', user.id)
        .maybeSingle() as any;
      if (row?.avatar_url) setAvatarUrl(row.avatar_url);
      if (row?.display_name) setName(row.display_name);
    })();
  }, [readOnly, staticName]);

  const save = async () => {
    const trimmed = draft.trim();
    if (!trimmed) { toast({ title: 'Username required', variant: 'destructive' }); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ data: { display_name: trimmed } });
    setSaving(false);
    if (error) { toast({ title: 'Could not save', description: error.message, variant: 'destructive' }); return; }
    setName(trimmed);
    setEditing(false);
    toast({ title: 'Username updated' });
  };

  const handleAvatarUpload = async (file: File) => {
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
      await supabase
        .from('user_profiles' as any)
        .upsert({ user_id: userId, avatar_url: pub.publicUrl }, { onConflict: 'user_id' });
      setAvatarUrl(pub.publicUrl);
      toast({ title: 'Profile picture updated' });
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e?.message ?? 'Try again.', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const avatarSrc = avatarUrl || squirtleAvatar;

  return (
    <div className="flex items-start gap-4 sm:gap-5">
      <div className="relative shrink-0">
        {/* Subtle emerald radial gradient behind avatar */}
        <div
          className="absolute -inset-5 rounded-full pointer-events-none z-0"
          style={{ background: 'radial-gradient(circle at center, rgba(59, 158, 143, 0.08) 0%, transparent 65%)' }}
          aria-hidden
        />
        <button
          type="button"
          onClick={() => !readOnly && fileRef.current?.click()}
          disabled={readOnly || uploading}
          className={cn(
            'group relative z-10 w-24 h-24 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-muted/40 flex items-center justify-center ring-[3px] ring-primary/25 shadow-[0_6px_24px_rgba(59,158,143,0.12)]',
            !readOnly && 'cursor-pointer hover:ring-primary/40 transition-all',
          )}
          aria-label={readOnly ? 'Profile picture' : 'Change profile picture'}
        >
          <img
            src={avatarSrc}
            alt="Collector avatar"
            className={cn('w-full h-full', avatarUrl ? 'object-cover' : 'object-contain p-2')}
            loading="lazy"
          />
          {!readOnly && (
            <span className="absolute inset-0 flex items-center justify-center bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity">
              {uploading ? (
                <Loader2 className="w-5 h-5 text-foreground animate-spin" />
              ) : (
                <Camera className="w-5 h-5 text-foreground" />
              )}
            </span>
          )}
        </button>
        {!readOnly && (
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleAvatarUpload(f);
              e.target.value = '';
            }}
          />
        )}
      </div>

      <div className="flex-1 min-w-0 pt-1">
        {editing && !readOnly ? (
          <div className="flex items-center gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={32}
              placeholder="Choose a username"
              className="h-10 max-w-xs text-lg font-semibold"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setEditing(false); setDraft(name); } }}
            />
            <Button size="icon" variant="ghost" onClick={save} disabled={saving} className="h-9 w-9">
              <CheckIcon className="w-4 h-4 text-success" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => { setEditing(false); setDraft(name); }} className="h-9 w-9">
              <XClose className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground truncate tracking-tight">
              {name}
            </h1>
            {!readOnly && (
              <button
                onClick={() => setEditing(true)}
                className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-muted transition-colors shrink-0"
                aria-label="Edit username"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        <p className="mt-1.5 text-sm text-muted-foreground tabular-nums">
          Level {level} <span className="text-muted-foreground/60 mx-1">·</span> {xp.toLocaleString()} XP
        </p>

        {personalityType && (
          <p className="mt-2 text-sm sm:text-base font-medium text-foreground/90">
            <span className="text-primary">{personalityType}</span> Collector
          </p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────
export function ProgressionHero({
  taste,
  cardsSwiped,
  isPremium,
  isPublicView = false,
  viewedDisplayName,
  personalityType,
}: {
  taste: TasteProfile;
  cardsSwiped: number;
  isPremium: boolean;
  isPublicView?: boolean;
  viewedDisplayName?: string;
  personalityType?: string | null;
}) {
  const totalLikes = taste.totalLikes;
  const avgPrice = taste.avgPrice;
  const matchRate = cardsSwiped > 0 ? Math.round((totalLikes / cardsSwiped) * 100) : 0;

  const xp = useMemo(() => computeXp(cardsSwiped, totalLikes), [cardsSwiped, totalLikes]);
  const lvl = useMemo(() => levelFromXp(xp), [xp]);
  const nextGoal = nextMilestone(cardsSwiped);
  const dnaLabels = useMemo(() => buildDnaLabels(taste, isPremium), [taste, isPremium]);

  return (
    <section className="space-y-6 sm:space-y-8">
      {/* Identity card — header + progress + DNA all together */}
      <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6 space-y-6">
        <ProfileHeader
          readOnly={isPublicView}
          staticName={viewedDisplayName}
          level={lvl.current.level}
          xp={xp}
          personalityType={personalityType}
        />

        <ProgressInline xp={xp} lvl={lvl} />

        {dnaLabels.length > 0 && (
          <div className="pt-2 border-t border-border/50">
            <h3 className="text-sm font-semibold text-foreground mb-3">Your Collector DNA</h3>
            <div className="flex flex-wrap gap-2">
              {dnaLabels.map((label) => {
                const { icon, color } = dnaStyle(label);
                return (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1.5 rounded-full border bg-transparent px-3 py-1.5 text-xs sm:text-sm font-medium"
                    style={{
                      color,
                      borderColor: `${color}80`,
                      backgroundColor: `${color}12`,
                    }}
                  >
                    <span aria-hidden style={{ color }}>{icon}</span>
                    {label}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Next Goal */}
      {nextGoal && <NextGoalCard swiped={cardsSwiped} goal={nextGoal} />}

      {/* Swipe Milestones */}
      <MilestonesTimeline swiped={cardsSwiped} />

      {/* Stats */}
      <StatsGrid
        avgPrice={avgPrice}
        totalLikes={totalLikes}
        cardsSwiped={cardsSwiped}
        matchRate={matchRate}
      />
    </section>
  );
}

// ── Progress (inline, no wrapper card) ─────────────────
function ProgressInline({ xp, lvl }: { xp: number; lvl: ReturnType<typeof levelFromXp> }) {
  const pct = Math.round(lvl.pct);
  const remaining = lvl.next ? Math.max(0, lvl.nextXp - xp) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Progress</span>
        <span className="text-sm font-semibold text-foreground tabular-nums">{pct}%</span>
      </div>
      <div className="relative h-2 rounded-full bg-muted/60 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${lvl.pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="absolute inset-y-0 left-0 rounded-full bg-primary"
        />
      </div>
      <p className="mt-2 text-xs sm:text-sm text-muted-foreground text-right">
        {lvl.next ? (
          <><span className="tabular-nums font-medium text-foreground">{remaining.toLocaleString()}</span> XP until Level {lvl.next.level}</>
        ) : (
          <>You've reached the highest level.</>
        )}
      </p>
    </div>
  );
}

// ── Next Goal — minimal ─────────────────────────────────
function NextGoalCard({
  swiped,
  goal,
}: {
  swiped: number;
  goal: (typeof SWIPE_MILESTONES)[number];
}) {
  const prev = [...SWIPE_MILESTONES].reverse().find((m) => m.at <= swiped)?.at ?? 0;
  const denom = Math.max(1, goal.at - prev);
  const done = Math.max(0, swiped - prev);
  const pct = Math.min(100, (done / denom) * 100);
  const remaining = Math.max(0, goal.at - swiped);

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Next Goal</p>
          <h3 className="text-lg sm:text-xl font-semibold text-foreground">{goal.title} Badge</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Reward · {goal.reward}</p>
        </div>
        <div className="w-12 h-12 rounded-xl border border-border/70 bg-muted/40 text-foreground/80 flex items-center justify-center shrink-0">
          {goal.icon}
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-sm text-muted-foreground tabular-nums">
            <span className="font-semibold text-foreground">{swiped.toLocaleString()}</span> / {goal.at.toLocaleString()} swipes
          </span>
          <span className="text-sm text-muted-foreground tabular-nums">{remaining.toLocaleString()} to go</span>
        </div>
        <div className="relative h-2 rounded-full bg-muted/60 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="absolute inset-y-0 left-0 rounded-full bg-primary"
          />
        </div>
      </div>
    </div>
  );
}

// ── Milestones Timeline ──────────────────────────────────
function MilestonesTimeline({ swiped }: { swiped: number }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
      <h3 className="text-base font-semibold text-foreground mb-4">Swipe Milestones</h3>

      <div className="-mx-5 sm:-mx-6 px-5 sm:px-6 overflow-x-auto scrollbar-none">
        <div className="flex items-start gap-0 sm:gap-6 min-w-max pb-1">
          {SWIPE_MILESTONES.map((m, i) => {
            const done = swiped >= m.at;
            const current = !done && swiped >= (SWIPE_MILESTONES[SWIPE_MILESTONES.indexOf(m) - 1]?.at ?? 0);
            const isLast = i === SWIPE_MILESTONES.length - 1;
            const nextDone = !isLast && swiped >= SWIPE_MILESTONES[i + 1].at;
            return (
              <React.Fragment key={m.at}>
                <div className="flex flex-col items-center text-center gap-2 w-[27%] sm:w-24 shrink-0">
                  <div
                    className={cn(
                      'relative w-14 h-14 sm:w-16 sm:h-16 rounded-full border flex items-center justify-center shrink-0 transition-colors',
                      done && 'border-primary/60 bg-primary/15 text-primary',
                      !done && current && 'border-foreground/40 bg-muted/40 text-foreground',
                      !done && !current && 'border-border/50 bg-muted/20 text-muted-foreground/60',
                    )}
                  >
                    {done ? <CheckIcon className="w-6 h-6" /> : current ? m.icon : <Lock className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0 w-full">
                    <p className="text-xs sm:text-sm font-semibold text-foreground tabular-nums leading-none">
                      {m.at >= 1000 ? `${m.at / 1000}K` : m.at}
                    </p>
                    <p className={cn('text-[10px] sm:text-xs mt-1 truncate', done ? 'text-foreground/80' : 'text-muted-foreground')}>
                      {m.title}
                    </p>
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground/70 truncate">
                      {m.reward}
                    </p>
                  </div>
                </div>
                {!isLast && (
                  <div
                    className="w-[5%] sm:w-16 mt-7 sm:mt-8 shrink-0 h-[2px] bg-repeat-x"
                    style={{
                      backgroundImage: `radial-gradient(circle, ${
                        done && nextDone ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.55)'
                      } 1.2px, transparent 1.4px)`,
                      backgroundSize: '8px 2px',
                    }}
                    aria-hidden
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Stats grid ──────────────────────────────────────────
function StatsGrid({
  avgPrice, totalLikes, cardsSwiped, matchRate,
}: {
  avgPrice: number; totalLikes: number; cardsSwiped: number; matchRate: number;
}) {
  return (
    <div>
      <h3 className="text-base font-semibold text-foreground mb-3">Stats</h3>
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <StatCard
          icon={<BookOpen className="w-4 h-4 text-success" />}
          value={avgPrice > 0 ? `$${avgPrice.toFixed(0)}` : '—'}
          label="Average Value"
        />
        <StatCard
          icon={<HeartIcon className="w-4 h-4 text-destructive" />}
          value={totalLikes.toLocaleString()}
          label="Collection Likes"
        />
        <StatCard
          icon={<Eye className="w-4 h-4 text-primary" />}
          value={cardsSwiped.toLocaleString()}
          label="Cards Swiped"
        />
        <StatCard
          icon={<Target className="w-4 h-4 text-warning" />}
          value={cardsSwiped > 0 ? `${matchRate}%` : '—'}
          label="Pull Rate"
          info={`Out of every 100 cards you swipe, you Pull about ${matchRate}. It's Pulls ÷ total swipes.`}
        />
      </div>
    </div>
  );
}

function StatCard({
  icon, value, label, info,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  info?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        {icon}
        {info && (
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" aria-label={`What is ${label}?`} className="text-muted-foreground/70 hover:text-foreground transition-colors">
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[240px] text-xs leading-snug">
                {info}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <div>
        <p className="text-2xl sm:text-3xl font-semibold text-foreground tabular-nums leading-none tracking-tight">
          {value}
        </p>
        <p className="text-xs text-muted-foreground mt-1.5">
          {label}
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ACHIEVEMENTS — kept for other callers
// ─────────────────────────────────────────────────────────────
export function AchievementsLadder({
  cardsSwiped,
  totalLikes,
}: {
  cardsSwiped: number;
  totalLikes: number;
}) {
  const xp = computeXp(cardsSwiped, totalLikes);
  const lvl = levelFromXp(xp);

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
      <h3 className="text-base font-semibold text-foreground mb-4">Collector Levels</h3>
      <ul className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
        {COLLECTOR_LEVELS.map((lv) => {
          const done = xp >= lv.xp;
          const current = lv.level === lvl.current.level;
          return (
            <li
              key={lv.level}
              className={cn(
                'relative rounded-xl border p-3 flex flex-col items-center text-center gap-1.5 transition-colors',
                current && 'border-primary/60 bg-primary/5',
                done && !current && 'border-border/60 bg-muted/20',
                !done && 'border-border/40 bg-transparent opacity-70',
              )}
            >
              <div
                className={cn(
                  'w-9 h-9 rounded-full border flex items-center justify-center text-sm font-semibold tabular-nums',
                  done && 'bg-primary/15 text-primary border-primary/40',
                  !done && 'bg-muted/40 text-muted-foreground border-border/60',
                )}
              >
                {lv.level}
              </div>
              <div className="min-w-0">
                <p className={cn('text-xs sm:text-sm font-medium truncate', done ? 'text-foreground' : 'text-muted-foreground')}>
                  {lv.title}
                </p>
                <p className="text-[10px] text-muted-foreground tabular-nums">
                  {lv.xp.toLocaleString()} XP
                </p>
              </div>
              {current && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 inline-flex items-center rounded-full bg-primary text-primary-foreground text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5">
                  You
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}