import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  PersonalityResult,
  PersonalityType,
  PERSONALITY_INFO,
  TraitScores,
} from '@/lib/personalityEngine';
import { TYPE_IMAGES, TYPE_TRAINERS } from '@/lib/personalityAssets';
import {
  PiggyBank, ScrollText, Heart, Zap, Calculator, Target,
  Compass, LayoutGrid, Mountain,
  Lock, TrendingUp, PieChart, BarChart3, ChevronRight,
  CheckCircle2, AlertCircle, AlertTriangle, Sparkles, ExternalLink,
  Dice5, Crown, Leaf, Share2, Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface QuizResultsProps {
  result: PersonalityResult;
}

const TYPE_ICONS: Record<PersonalityType, React.ComponentType<{ className?: string }>> = {
  Investor: PiggyBank,
  Archivist: ScrollText,
  Dreamer: Heart,
  Flipper: Zap,
  Analyst: Calculator,
  Hunter: Target,
  Explorer: Compass,
  Curator: LayoutGrid,
  Monk: Mountain,
  Gambler: Dice5,
  Showman: Crown,
  Minimalist: Leaf,
};

const ERA_LABELS: Record<keyof PersonalityResult['eraAllocation'], string> = {
  vintage: 'Vintage',
  classic: 'Classic',
  modern: 'Modern',
  ultraModern: 'Ultra Modern',
  current: 'Current',
};

const TRAIT_LABELS: Record<keyof TraitScores, string> = {
  patience: 'Patience',
  activity: 'Activity',
  emotion: 'Emotion',
  analysis: 'Analysis',
  conviction: 'Conviction',
  structure: 'Structure',
  curiosity: 'Curiosity',
  balance: 'Balance',
  preservation: 'Preservation',
  aesthetics: 'Aesthetics',
  recognition: 'Recognition',
  excitement: 'Excitement',
  restraint: 'Restraint',
};

export function QuizResults({ result }: QuizResultsProps) {
  const safeType: PersonalityType =
    (result.type && PERSONALITY_INFO[result.type] ? result.type : 'Investor');
  const info = PERSONALITY_INFO[safeType];
  const TypeIcon = TYPE_ICONS[safeType];

  const [profileExpanded, setProfileExpanded] = useState(false);
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/collector/${safeType.toLowerCase()}`
    : '';

  const handleShare = async () => {
    const shareData = {
      title: `I'm The ${safeType} — PokeIQ Collector Type`,
      text: `I took the PokeIQ Collector Personality Test and I'm The ${safeType}! ${info.philosophy}`,
      url: shareUrl,
    };
    try {
      if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
        await navigator.share(shareData);
        return;
      }
    } catch { /* fall through to clipboard */ }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      toast({ title: 'Link copied!', description: 'Share your collector type with friends.' });
      setTimeout(() => setShareCopied(false), 2200);
    } catch {
      toast({ title: 'Could not copy link', variant: 'destructive' });
    }
  };

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setIsAuthed(!!session?.user && !session.user.is_anonymous);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setIsAuthed(!!session?.user && !session.user.is_anonymous);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { writePersonalityForUser, getCurrentUserId } = await import('@/lib/personalityStorage');
      const uid = await getCurrentUserId();
      if (cancelled) return;
      writePersonalityForUser(uid, result);
      // Always mirror to legacy unscoped key so results survive sign-in/out.
      try { localStorage.setItem('personalityResult', JSON.stringify(result)); } catch {}
    })();
    return () => { cancelled = true; };
  }, [result]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15 }}
        className="text-center space-y-5 p-8 rounded-2xl bg-gradient-to-br from-primary/20 via-card to-card border border-primary/30"
      >
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/20 border border-primary/30">
          <TypeIcon className="w-10 h-10 text-primary" />
        </div>
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-wider text-primary font-medium">
            UNLIMITED{"\n"}Matches
          </p>
          <h1 className="text-4xl font-bold text-foreground">
            {info.emoji} The {safeType}
          </h1>
          <p className="text-lg text-primary italic">"{info.philosophy}"</p>
        </div>
        {/* Archetype portrait + trainer */}
        <div className="mx-auto w-full max-w-[260px] pt-2">
          <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 via-muted/40 to-background border-2 border-primary/40 shadow-[0_15px_45px_-10px_hsl(var(--primary)/0.45)] p-2">
            <div className="relative w-full h-full rounded-xl overflow-hidden bg-muted/40 border border-primary/20">
              <img
                src={TYPE_IMAGES[safeType]}
                alt={`${safeType} collector personality illustration`}
                className="w-full h-full object-cover object-top"
              />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xs uppercase tracking-wider text-primary/80 font-medium">
              Associated Trainer
            </p>
            <p className="text-xl font-bold text-foreground">{TYPE_TRAINERS[safeType]}</p>
          </div>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed text-base">
          {info.tagline}
        </p>
        {/* Snapshot chips */}
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          {info.coreTraits.map((t, i) => (
            <span
              key={i}
              className="px-2.5 py-1 rounded-full bg-background/60 border border-primary/30 text-xs text-foreground/90"
            >
              {t}
            </span>
          ))}
        </div>
        <div className="pt-3">
          <Button onClick={handleShare} variant="outline" size="sm" className="gap-2">
            {shareCopied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            {shareCopied ? 'Link copied' : 'Share my collector type'}
          </Button>
        </div>
      </motion.div>

      {/* Core Traits — chips */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
      >
        <Card className="p-6">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Core Traits
          </h3>
          <div className="flex flex-wrap gap-2">
            {info.coreTraits.map((trait, i) => (
              <span
                key={i}
                className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-medium border border-primary/20"
              >
                {trait}
              </span>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Full Personality Readout */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
      >
        <Card className="p-6">
          <h3 className="font-semibold text-foreground mb-5 flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-primary" />
            Your Full {safeType} Profile
          </h3>
          <div className="space-y-5">
            {[
              { title: 'Core Identity', body: info.fullProfile.coreIdentity },
              { title: 'Collecting Mindset', body: info.fullProfile.collectingMindset },
            ].map((s) => (
              <div key={s.title}>
                <p className="text-xs uppercase tracking-wider text-primary font-medium mb-1.5">
                  {s.title}
                </p>
                <p className="text-sm text-foreground/90 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
          {!profileExpanded && (
            <button
              onClick={() => setProfileExpanded(true)}
              className="mt-2 text-sm text-primary hover:underline"
            >
              Read more
            </button>
          )}
          {profileExpanded && (
            <div className="pt-3 space-y-5">
              {[
                { title: 'Inner World', body: info.fullProfile.innerWorld },
                { title: 'Blind Spots', body: info.fullProfile.blindSpots },
                { title: 'Growth Path', body: info.fullProfile.growthPath },
              ].map((s) => (
                <div key={s.title}>
                  <p className="text-xs uppercase tracking-wider text-primary font-medium mb-1.5">
                    {s.title}
                  </p>
                  <p className="text-sm text-foreground/90 leading-relaxed">{s.body}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </motion.div>

      {/* Trait bars */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
      >
        <Card className="p-6">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Your Trait Profile
          </h3>
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
            {(Object.keys(TRAIT_LABELS) as (keyof TraitScores)[])
              .map((key) => {
                const raw = result.traits[key];
                const value = Number.isFinite(raw) ? Math.round(raw) : 0;
                return { key, value };
              })
              .sort((a, b) => b.value - a.value)
              .map(({ key, value }) => {
                // Always show at least a sliver so 0 doesn't look broken.
                const barWidth = Math.max(value, 3);
                return (
                <div key={key} className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{TRAIT_LABELS[key]}</span>
                    <span className="font-medium text-foreground">{value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${barWidth}%` }}
                      transition={{ duration: 0.6 }}
                      className="h-full rounded-full bg-primary"
                    />
                  </div>
                </div>
                );
              })}
          </div>
        </Card>
      </motion.div>

      {/* Strength + Weakness */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        className="grid md:grid-cols-2 gap-4"
      >
        <Card className="p-6 bg-success/10 border-success/20">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-5 h-5 text-success" />
            <span className="font-semibold text-success">Strength</span>
          </div>
          <p className="text-foreground">{result.strength}</p>
          <Accordion type="single" collapsible className="mt-2">
            <AccordionItem value="s" className="border-b-0">
              <AccordionTrigger className="py-1 text-sm text-success hover:no-underline">
                Read more
              </AccordionTrigger>
              <AccordionContent className="text-sm text-foreground/90 leading-relaxed pt-2">
                {info.strengthLong}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>
        <Card className="p-6 bg-warning/10 border-warning/20">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-warning" />
            <span className="font-semibold text-warning">Weakness</span>
          </div>
          <p className="text-foreground">{result.weakness}</p>
          <Accordion type="single" collapsible className="mt-2">
            <AccordionItem value="w" className="border-b-0">
              <AccordionTrigger className="py-1 text-sm text-warning hover:no-underline">
                Read more
              </AccordionTrigger>
              <AccordionContent className="text-sm text-foreground/90 leading-relaxed pt-2">
                {info.weaknessLong}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>
      </motion.div>

      {/* Collection Style + Signature Move */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
      >
        <Card className="p-6">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-primary" />
            Collection Style
          </h3>
          <ul className="space-y-2 mb-4">
            {info.collectionStyle.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
          <div className="pt-3 border-t border-border/50">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
              Signature Move
            </p>
            <p className="text-foreground italic">"{info.famousBehavior}"</p>
          </div>
        </Card>
      </motion.div>

      {/* Allocations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
        className="grid md:grid-cols-2 gap-6"
      >
        <Card className="p-6">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-primary" />
            Product Allocation
          </h3>
          <div className="space-y-4">
            {[
              { label: 'Sealed', value: result.productAllocation.sealedPct, color: 'bg-primary' },
              { label: 'Graded', value: result.productAllocation.gradedPct, color: 'bg-accent' },
              { label: 'Raw',    value: result.productAllocation.rawPct,    color: 'bg-success' },
            ].map((item) => (
              <div key={item.label} className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium text-foreground">{item.value}%</span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.value}%` }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    className={`h-full rounded-full ${item.color}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Era Focus
          </h3>
          <div className="space-y-4">
            {(Object.entries(result.eraAllocation) as [keyof typeof ERA_LABELS, number][]).map(([era, value], i) => (
              <div key={era} className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{ERA_LABELS[era]}</span>
                  <span className="font-medium text-foreground">{value}%</span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${value}%` }}
                    transition={{ delay: 0.6 + i * 0.08, duration: 0.5 }}
                    className="h-full rounded-full bg-primary"
                    style={{ opacity: 0.45 + i * 0.13 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Danger Zone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
      >
        <Card className="p-6 bg-destructive/10 border-destructive/30">
          <h3 className="font-semibold text-destructive mb-2 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Danger Zone
          </h3>
          <p className="text-foreground">{result.dangerZone}</p>
        </Card>
      </motion.div>

      {/* Try This */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
      >
        <Card className="p-6 bg-accent/10 border-accent/30">
          <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-accent" />
            Try This
          </h3>
          <p className="text-foreground">{result.recommendedAction}</p>
        </Card>
      </motion.div>

      {/* Locked Premium */}
      {isAuthed === false && (
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
      >
        <Card className="p-6 border-2 border-primary/40 bg-gradient-to-b from-card to-primary/5">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/20 border border-primary/30">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-xl text-foreground">Unlock Full Portfolio Intelligence</h3>
              <p className="text-muted-foreground text-sm max-w-md mx-auto mt-2">
                Get powerful tools to analyze, budget, and optimize your collection.
              </p>
            </div>
            <div className="text-left max-w-md mx-auto space-y-2 py-4">
              {[
                'Upload your actual portfolio for personalized insights',
                'Collection budgeting tool with pie chart visualization',
                'Smart Rebalancer to reach target allocations',
                'Top winners & underperformers analysis',
                'Action items tailored to your goals',
                'Era & product allocation tracking',
                'Portfolio health score with detailed breakdown',
                'Cost basis tracking & ROI calculations',
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                  {feature}
                </div>
              ))}
            </div>
            <Link to="/auth">
              <Button size="lg" className="gap-2">
                Sign Up
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </Card>
      </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
        className="text-center pt-4"
      >
        <Link to="/swipe">
          <Button size="lg" className="gap-2 h-auto py-5 px-6 text-base whitespace-normal text-center max-w-xl">
            <Sparkles className="w-5 h-5 flex-shrink-0" />
            <span>
              Play Pull or Swipe: we know <span className="underline">HOW</span> you collect — now let's learn more about <span className="underline">WHAT</span> you like to collect
            </span>
            <ChevronRight className="w-5 h-5 flex-shrink-0" />
          </Button>
        </Link>
      </motion.div>
    </motion.div>
  );
}
