import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Pencil, Check as CheckIcon, X as XClose, Trophy, Flame, Star, Crown, Sparkles,
  Mountain, Zap, Droplets, Leaf, Sun, Moon, Hexagon, Circle, Swords,
  Palette, BookOpen, Heart as HeartIcon, Eye, Target, HelpCircle, Lock,
  Gift, ChevronRight, Award,
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
// LEVELS — Collector progression ladder (1..10).
// XP thresholds tuned so casual swiping hits mid-tiers within days.
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

// XP earned from activity — 5 XP per swipe, +5 bonus per like.
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
// SWIPE MILESTONES — separate from personality types.
// ─────────────────────────────────────────────────────────────
const SWIPE_MILESTONES: { at: number; title: string; reward: string; icon: React.ReactNode; tint: string }[] = [
  { at: 100,  title: 'Starter',   reward: '+20 Swipes', icon: <Sparkles className="w-5 h-5" />, tint: 'text-emerald-400 border-emerald-400/40 bg-emerald-400/10' },
  { at: 200,  title: 'Explorer',  reward: '+20 Swipes', icon: <Mountain className="w-5 h-5" />, tint: 'text-primary border-primary/40 bg-primary/10' },
  { at: 500,  title: 'Collector', reward: '+20 Swipes', icon: <Star className="w-5 h-5" />,     tint: 'text-purple-400 border-purple-400/40 bg-purple-400/10' },
  { at: 1000, title: 'Master',    reward: '+20 Swipes', icon: <Crown className="w-5 h-5" />,    tint: 'text-amber-400 border-amber-400/40 bg-amber-400/10' },
  { at: 2000, title: 'Champion',  reward: '+20 Swipes', icon: <Trophy className="w-5 h-5" />,   tint: 'text-cyan-300 border-cyan-300/40 bg-cyan-300/10' },
  { at: 3000, title: 'Virtuoso',  reward: '+20 Swipes', icon: <Award className="w-5 h-5" />,    tint: 'text-pink-300 border-pink-300/40 bg-pink-300/10' },
  { at: 5000, title: 'Legend',    reward: '+20 Swipes', icon: <Crown className="w-5 h-5" />,    tint: 'text-amber-300 border-amber-300/50 bg-gradient-to-br from-amber-400/20 to-amber-300/5' },
];

function nextMilestone(swiped: number) {
  return SWIPE_MILESTONES.find((m) => swiped < m.at) ?? null;
}

// ─────────────────────────────────────────────────────────────
// DNA BADGES — reads from existing taste profile, no invented labels.
// ─────────────────────────────────────────────────────────────
function typeChip(label: string) {
  const t = (label || '').toLowerCase();
  const cls = 'w-3.5 h-3.5';
  const map: Record<string, { icon: React.ReactNode; tint: string }> = {
    fire:      { icon: <Flame className={cn(cls, 'text-orange-500')} />,     tint: 'border-orange-500/40 bg-orange-500/10 text-orange-100' },
    water:     { icon: <Droplets className={cn(cls, 'text-blue-400')} />,     tint: 'border-blue-400/40 bg-blue-400/10 text-blue-100' },
    grass:     { icon: <Leaf className={cn(cls, 'text-green-400')} />,        tint: 'border-green-400/40 bg-green-400/10 text-green-100' },
    lightning: { icon: <Zap className={cn(cls, 'text-yellow-300')} />,        tint: 'border-yellow-300/40 bg-yellow-300/10 text-yellow-100' },
    psychic:   { icon: <Sparkles className={cn(cls, 'text-purple-400')} />,   tint: 'border-purple-400/40 bg-purple-400/10 text-purple-100' },
    fighting:  { icon: <Swords className={cn(cls, 'text-red-500')} />,        tint: 'border-red-500/40 bg-red-500/10 text-red-100' },
    darkness:  { icon: <Moon className={cn(cls, 'text-indigo-300')} />,       tint: 'border-indigo-300/40 bg-indigo-300/10 text-indigo-100' },
    metal:     { icon: <Hexagon className={cn(cls, 'text-slate-300')} />,     tint: 'border-slate-300/40 bg-slate-300/10 text-slate-100' },
    fairy:     { icon: <Sun className={cn(cls, 'text-pink-300')} />,          tint: 'border-pink-300/40 bg-pink-300/10 text-pink-100' },
    dragon:    { icon: <Crown className={cn(cls, 'text-amber-400')} />,       tint: 'border-amber-400/40 bg-amber-400/10 text-amber-100' },
    colorless: { icon: <Circle className={cn(cls, 'text-gray-300')} />,       tint: 'border-gray-300/40 bg-gray-300/10 text-foreground' },
  };
  return map[t] || { icon: <Zap className={cn(cls, 'text-primary')} />, tint: 'border-primary/40 bg-primary/10 text-foreground' };
}

function buildDnaBadges(taste: TasteProfile, isPremium: boolean) {
  const out: { label: string; icon: React.ReactNode; tint: string }[] = [];
  if (isPremium) {
    out.push({ label: 'Premium', icon: <Crown className="w-3.5 h-3.5 text-amber-300" />, tint: 'border-amber-300/40 bg-gradient-to-br from-amber-500/20 to-amber-400/5 text-amber-100' });
  }
  const tier = taste.priceDistribution.find((p) => p.key !== 'unknown');
  if (tier && (tier.key === 'grail' || tier.key === 'premium')) {
    out.push({ label: tier.key === 'grail' ? 'Grails' : 'Premium Cards', icon: <Crown className="w-3.5 h-3.5 text-amber-400" />, tint: 'border-amber-400/40 bg-amber-400/10 text-amber-100' });
  }
  const era = taste.topEras[0];
  if (era) out.push({ label: `${era.label.split(' (')[0]} Era`, icon: <Mountain className="w-3.5 h-3.5 text-primary" />, tint: 'border-primary/40 bg-primary/10 text-foreground' });
  const type = taste.topPokemonTypes[0];
  if (type) {
    const c = typeChip(type.label);
    out.push({ label: `${type.label} Types`, icon: c.icon, tint: c.tint });
  }
  const rarity = taste.topRarities[0];
  if (rarity) out.push({ label: rarity.label, icon: <Star className="w-3.5 h-3.5 text-purple-300" />, tint: 'border-purple-300/40 bg-purple-300/10 text-purple-100' });
  const artist = taste.topArtists[0];
  if (artist && artist.count >= 2) out.push({ label: `Art by ${artist.label}`, icon: <Palette className="w-3.5 h-3.5 text-teal-300" />, tint: 'border-teal-300/40 bg-teal-300/10 text-teal-100' });
  const pokemon = taste.topPokemon[0];
  if (pokemon && pokemon.count >= 2) out.push({ label: pokemon.label, icon: <Sparkles className="w-3.5 h-3.5 text-primary" />, tint: 'border-primary/40 bg-primary/10 text-foreground' });
  if (taste.languageMix.find((l) => l.key === 'Japanese' && l.pct >= 20)) {
    out.push({ label: 'Japanese', icon: <Star className="w-3.5 h-3.5 text-red-300" />, tint: 'border-red-300/40 bg-red-300/10 text-red-100' });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────
// UsernameEditable — self-contained editable username + big avatar.
// ─────────────────────────────────────────────────────────────
function UsernameEditable({ readOnly, staticName }: { readOnly?: boolean; staticName?: string }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState(staticName || '');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (readOnly) { setName(staticName || 'Collector'); return; }
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? '');
      const display =
        (user.user_metadata as { display_name?: string } | null)?.display_name
        || (user.email ? user.email.split('@')[0] : '')
        || 'Collector';
      setName(display);
      setDraft(display);
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

  return (
    <div className="flex items-center gap-4 sm:gap-5">
      <div className="relative shrink-0">
        {/* Gradient ring */}
        <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-primary via-primary/60 to-amber-400/60 blur-sm opacity-70" aria-hidden />
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-primary/40 to-primary/10 border-2 border-primary/60 flex items-center justify-center overflow-hidden shadow-[0_0_30px_-8px_hsl(var(--primary)/0.6)]">
          <img
            src={squirtleAvatar}
            alt="Default collector avatar"
            className="w-[85%] h-[85%] object-contain"
            loading="lazy"
          />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        {editing && !readOnly ? (
          <div className="flex items-center gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={32}
              placeholder="Choose a username"
              className="h-10 max-w-xs text-lg font-bold"
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
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-foreground truncate tracking-tight">
              {name}
            </h1>
            {!readOnly && (
              <button
                onClick={() => setEditing(true)}
                className="text-muted-foreground hover:text-primary p-1.5 rounded-md hover:bg-primary/10 transition-colors shrink-0"
                aria-label="Edit username"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN — ProgressionHero: hero → DNA → next goal → milestones → stats → achievements
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
  const dnaBadges = useMemo(() => buildDnaBadges(taste, isPremium), [taste, isPremium]);

  return (
    <section className="space-y-5 sm:space-y-6">
      {/* ── 1. HERO ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card to-card p-6 sm:p-8 shadow-[0_10px_40px_-12px_hsl(var(--primary)/0.35)]"
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute -bottom-32 -left-20 w-80 h-80 rounded-full bg-amber-400/5 blur-3xl" />
        </div>

        <div className="relative z-10">
          <UsernameEditable readOnly={isPublicView} staticName={viewedDisplayName} />

          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-primary to-primary/70 text-primary-foreground text-xs sm:text-sm font-black tracking-wide shadow-[0_0_20px_-4px_hsl(var(--primary)/0.7)]">
              <Trophy className="w-3.5 h-3.5" />
              Level {lvl.current.level}
            </span>
          </div>

          {personalityType && (
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-400/40 bg-amber-400/10 text-amber-200 text-xs sm:text-sm font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                {personalityType} Collector
              </span>
            </div>
          )}


          {/* XP bar */}
          <div className="mt-5">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-xs sm:text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
                XP Progress
              </span>
              <span className="text-xs sm:text-sm tabular-nums font-bold text-foreground">
                {xp.toLocaleString()} <span className="text-muted-foreground font-medium">/ {lvl.next ? lvl.nextXp.toLocaleString() : 'MAX'} XP</span>
              </span>
            </div>
            <div className="relative h-3 rounded-full bg-muted/60 border border-border/60 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${lvl.pct}%` }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary via-primary to-amber-300 shadow-[0_0_16px_hsl(var(--primary)/0.6)]"
              />
              <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />
            </div>
            {lvl.next && (
              <p className="mt-2 text-xs text-muted-foreground">
                {(lvl.nextXp - xp).toLocaleString()} XP to <span className="text-foreground font-semibold">Level {lvl.next.level}</span>
              </p>
            )}
          </div>

          {/* ── 2. DNA BADGES ─────────────────────────────── */}
          {dnaBadges.length > 0 && (
            <div className="mt-6">
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground mb-2.5">
                Collector DNA
              </p>
              <div className="flex flex-wrap gap-2">
                {dnaBadges.map((b) => (
                  <span
                    key={b.label}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs sm:text-sm font-semibold backdrop-blur-sm',
                      b.tint,
                    )}
                  >
                    {b.icon}
                    <span>{b.label}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── 3. NEXT GOAL ──────────────────────────────────── */}
      {nextGoal && (
        <NextGoalCard swiped={cardsSwiped} goal={nextGoal} />
      )}

      {/* ── 4. SWIPE MILESTONES TIMELINE ──────────────────── */}
      <MilestonesTimeline swiped={cardsSwiped} />

      {/* ── 5. COLLECTOR STATS ────────────────────────────── */}
      <StatsGrid
        avgPrice={avgPrice}
        totalLikes={totalLikes}
        cardsSwiped={cardsSwiped}
        matchRate={matchRate}
      />
    </section>
  );
}

// ── Next Goal ─────────────────────────────────────────────
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
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.05 }}
      className="relative overflow-hidden rounded-3xl border border-amber-400/30 bg-gradient-to-br from-amber-500/10 via-card to-card p-5 sm:p-6 shadow-[0_10px_40px_-14px_rgba(251,191,36,0.35)]"
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-amber-400/10 blur-3xl" />
      </div>

      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] sm:text-xs font-black uppercase tracking-[0.22em] text-amber-300 mb-1">
            Next Goal
          </p>
          <h3 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
            {goal.title} Badge
          </h3>
        </div>
        <div className={cn('w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-2 flex items-center justify-center shrink-0 shadow-lg', goal.tint)}>
          {goal.icon}
        </div>
      </div>

      <div className="relative z-10 mt-4">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-2xl sm:text-3xl font-black text-foreground tabular-nums">
            {swiped.toLocaleString()} <span className="text-muted-foreground text-lg font-bold">/ {goal.at.toLocaleString()}</span>
          </span>
          <span className="text-xs sm:text-sm font-semibold text-muted-foreground">Swipes</span>
        </div>
        <div className="relative h-3 rounded-full bg-muted/60 border border-border/60 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-amber-200 shadow-[0_0_16px_rgba(251,191,36,0.6)]"
          />
        </div>
        <p className="mt-2 text-xs sm:text-sm text-muted-foreground">
          <span className="font-bold text-foreground tabular-nums">{remaining.toLocaleString()}</span> swipes remaining
        </p>
      </div>

      <div className="relative z-10 mt-5 pt-4 border-t border-border/40 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-amber-400/15 border border-amber-400/30 flex items-center justify-center shrink-0">
          <Gift className="w-4 h-4 text-amber-300" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Reward</p>
          <p className="text-sm font-bold text-foreground">
            {goal.reward} <span className="text-muted-foreground font-medium">·</span> {goal.title} Badge
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ── Milestones Timeline ──────────────────────────────────
function MilestonesTimeline({ swiped }: { swiped: number }) {
  return (
    <div className="rounded-3xl border border-border/60 bg-card/60 backdrop-blur-md p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Award className="w-4 h-4 text-primary" />
        <h3 className="text-sm sm:text-base font-bold text-foreground">Swipe Milestones</h3>
      </div>

      <div className="-mx-5 sm:-mx-6 px-5 sm:px-6 overflow-x-auto scrollbar-none">
        <div className="flex items-start gap-6 sm:gap-8 min-w-max pb-1">
          {SWIPE_MILESTONES.map((m, i) => {
            const done = swiped >= m.at;
            const current = !done && swiped >= (SWIPE_MILESTONES[SWIPE_MILESTONES.indexOf(m) - 1]?.at ?? 0);
            const isLast = i === SWIPE_MILESTONES.length - 1;
            return (
              <React.Fragment key={m.at}>
                <div className="flex flex-col items-center text-center gap-2 w-20 sm:w-24 shrink-0">
                  <div
                    className={cn(
                      'relative w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                      done && 'border-primary bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-[0_0_22px_hsl(var(--primary)/0.55)]',
                      !done && current && 'border-amber-400/70 bg-amber-400/10 text-amber-200 animate-pulse',
                      !done && !current && 'border-border/60 bg-muted/40 text-muted-foreground',
                    )}
                  >
                    {done ? <CheckIcon className="w-6 h-6" /> : current ? m.icon : <Lock className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0 w-full">
                    <p className="text-xs sm:text-sm font-black text-foreground tabular-nums leading-none">
                      {m.at >= 1000 ? `${m.at / 1000}K` : m.at}
                    </p>
                    <p className={cn('text-[10px] sm:text-xs font-semibold mt-1 truncate', done ? 'text-foreground' : 'text-muted-foreground')}>
                      {m.title}
                    </p>
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground/80 truncate">
                      {m.reward}
                    </p>
                  </div>
                </div>
                {!isLast && (
                  <div className="w-8 sm:w-12 border-t-2 border-dashed border-border/60 mt-7 sm:mt-8 shrink-0" aria-hidden />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Stats grid — 4 cards with comparison line ───────────
function StatsGrid({
  avgPrice, totalLikes, cardsSwiped, matchRate,
}: {
  avgPrice: number; totalLikes: number; cardsSwiped: number; matchRate: number;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <ChevronRight className="w-4 h-4 text-primary" />
        <h3 className="text-sm sm:text-base font-bold text-foreground">Collector Stats</h3>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <StatCard
          icon={<BookOpen className="w-5 h-5 text-primary" />}
          tint="bg-primary/15 border-primary/30"
          value={avgPrice > 0 ? `$${avgPrice.toFixed(0)}` : '—'}
          label="Average Value"
        />
        <StatCard
          icon={<HeartIcon className="w-5 h-5 text-red-400" />}
          tint="bg-red-400/15 border-red-400/30"
          value={totalLikes.toLocaleString()}
          label="Collection Likes"
        />
        <StatCard
          icon={<Eye className="w-5 h-5 text-blue-400" />}
          tint="bg-blue-400/15 border-blue-400/30"
          value={cardsSwiped.toLocaleString()}
          label="Cards Swiped"
        />
        <StatCard
          icon={<Target className="w-5 h-5 text-purple-400" />}
          tint="bg-purple-400/15 border-purple-400/30"
          value={cardsSwiped > 0 ? `${matchRate}%` : '—'}
          label="Pull Rate"
          info={`Out of every 100 cards you swipe, you Pull about ${matchRate}. It's Pulls ÷ total swipes.`}
        />
      </div>
    </div>
  );
}

function StatCard({
  icon, tint, value, label, info,
}: {
  icon: React.ReactNode;
  tint: string;
  value: string;
  label: string;
  info?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md p-4 sm:p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className={cn('w-10 h-10 rounded-xl border flex items-center justify-center', tint)}>
          {icon}
        </div>
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
        <p className="text-2xl sm:text-3xl font-black text-foreground tabular-nums leading-none tracking-tight">
          {value}
        </p>
        <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-muted-foreground mt-1.5">
          {label}
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ACHIEVEMENTS — Collector Level ladder (1..10)
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
    <div className="rounded-3xl border border-border/60 bg-card/60 backdrop-blur-md p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-4 h-4 text-amber-300" />
        <h3 className="text-sm sm:text-base font-bold text-foreground">Achievements · Collector Levels</h3>
      </div>

      <ul className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
        {COLLECTOR_LEVELS.map((lv) => {
          const done = xp >= lv.xp;
          const current = lv.level === lvl.current.level;
          return (
            <li
              key={lv.level}
              className={cn(
                'relative rounded-2xl border p-3 flex flex-col items-center text-center gap-1.5 transition-all',
                done && !current && 'border-primary/40 bg-primary/5',
                current && 'border-primary bg-gradient-to-br from-primary/20 to-primary/5 shadow-[0_0_22px_-6px_hsl(var(--primary)/0.6)]',
                !done && 'border-border/50 bg-muted/20 opacity-70',
              )}
            >
              <div
                className={cn(
                  'w-10 h-10 rounded-full border flex items-center justify-center text-sm font-black tabular-nums',
                  done && 'bg-gradient-to-br from-primary to-primary/60 text-primary-foreground border-primary',
                  !done && 'bg-muted/40 text-muted-foreground border-border/60',
                )}
              >
                {lv.level}
              </div>
              <div className="min-w-0">
                <p className={cn('text-xs sm:text-sm font-bold truncate', done ? 'text-foreground' : 'text-muted-foreground')}>
                  {lv.title}
                </p>
                <p className="text-[10px] text-muted-foreground tabular-nums">
                  {lv.xp.toLocaleString()} XP
                </p>
              </div>
              {current && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground text-[9px] font-black uppercase tracking-wider px-2 py-0.5 shadow">
                  You
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <p className="text-[11px] text-muted-foreground mt-4">
        Earn XP by swiping, tagging cards, hitting streaks, and unlocking milestones.
      </p>
    </div>
  );
}