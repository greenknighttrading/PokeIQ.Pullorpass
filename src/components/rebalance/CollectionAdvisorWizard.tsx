import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Heart, Sparkles, Calendar, DollarSign, ArrowRight, Save, Settings2, Check, ArrowLeft, Clock, Hourglass, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePortfolio } from '@/contexts/PortfolioContext';
import {
  ALLOCATION_PRESETS,
  ERA_ALLOCATION_PRESETS,
  AllocationPreset,
  EraAllocationPreset,
  ERA_INFO,
  PokemonEra,
} from '@/lib/types';
import { calculateEraAllocationBreakdown } from '@/lib/eraClassification';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export type AdvisorMode = 'asset' | 'era';

type Goal = 'grow' | 'both' | 'collect';
type Timeline = 'short' | 'medium' | 'long';

const BUDGET_PRESETS = [100, 250, 500, 1000];

const ASSET_GOAL_OPTIONS: { id: Goal; label: string; sub: string; icon: typeof TrendingUp }[] = [
  { id: 'grow', label: 'Grow my money', sub: 'I want the best return over time', icon: TrendingUp },
  { id: 'both', label: 'Both — collect and invest', sub: 'I love the hobby and want smart picks', icon: Sparkles },
  { id: 'collect', label: 'Complete my collection', sub: 'I buy what I love, value is a bonus', icon: Heart },
];

// Era-specific: 'collect' maps to vintage-heavy (conservative), 'grow' maps to current/ultra-modern (aggressive)
const ERA_GOAL_OPTIONS: { id: Goal; label: string; sub: string; icon: typeof TrendingUp }[] = [
  { id: 'collect', label: 'Vintage & nostalgia', sub: 'Base Set, Neo, e-Reader — proven scarcity', icon: Hourglass },
  { id: 'both', label: 'A mix of old and new', sub: 'Spread across classic, modern, and recent sets', icon: Sparkles },
  { id: 'grow', label: 'Newest releases & hype', sub: 'Chase current sets and ultra-modern chase cards', icon: Zap },
];

const ASSET_TIMELINE_OPTIONS: { id: Timeline; label: string; sub: string }[] = [
  { id: 'short', label: '1–2 years', sub: 'Short term' },
  { id: 'medium', label: '3–5 years', sub: 'Medium horizon' },
  { id: 'long', label: '5+ years', sub: 'Long-term store of value' },
];

// Era-specific second question — reframed around era exposure preference rather than hold time
const ERA_TIMELINE_OPTIONS: { id: Timeline; label: string; sub: string }[] = [
  { id: 'short', label: 'Ride the current wave', sub: 'Lean into what\'s printing and hot right now' },
  { id: 'medium', label: 'Balance reprint risk', sub: 'Spread across eras to avoid any one era\'s cycle' },
  { id: 'long', label: 'Anchor in scarcity', sub: 'Tilt toward vintage and classic — supply only shrinks' },
];

function resolveAssetPreset(goal: Goal, timeline: Timeline): AllocationPreset {
  if (goal === 'collect') return 'conservative';
  if (goal === 'both') return 'balanced';
  // grow
  if (timeline === 'short') return 'aggressive';
  if (timeline === 'medium') return 'balanced'; // leaning aggressive
  return 'balanced';
}

function resolveEraPreset(goal: Goal, timeline: Timeline): EraAllocationPreset {
  // goal carries era-preference weight, timeline carries cycle stance
  if (goal === 'collect') {
    // vintage-leaning
    return timeline === 'short' ? 'balanced' : 'conservative';
  }
  if (goal === 'grow') {
    // newest-leaning
    return timeline === 'long' ? 'balanced' : 'aggressive';
  }
  // mix
  if (timeline === 'long') return 'conservative';
  if (timeline === 'short') return 'aggressive';
  return 'balanced';
}

function presetLabel(p: AllocationPreset): string {
  return p === 'conservative' ? 'Conservative' : p === 'aggressive' ? 'Aggressive' : 'Balanced';
}

function timelineLabel(t: Timeline): string {
  return t === 'short' ? '1–2yr' : t === 'medium' ? '3–5yr' : '5+yr';
}

interface Props {
  mode: AdvisorMode;
  onCustomize?: () => void;
}

export function CollectionAdvisorWizard({ mode, onCustomize }: Props) {
  const {
    allocation,
    items,
    summary,
    setAllocationPreset,
    setEraAllocationPreset,
    allocationPreset: ctxAssetPreset,
    allocationTarget: ctxAssetTarget,
    eraAllocationPreset: ctxEraPreset,
    eraAllocationTarget: ctxEraTarget,
  } = usePortfolio();

  const storageKey = `advisorWizard:${mode}`;
  const saved = (() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) as {
        step: 1 | 2 | 3 | 4;
        goal: Goal | null;
        timeline: Timeline | null;
        budget: number;
        customBudget: string;
        usingCustomBudget: boolean;
      } : null;
    } catch { return null; }
  })();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(saved?.step ?? 1);
  const [goal, setGoal] = useState<Goal | null>(saved?.goal ?? null);
  const [timeline, setTimeline] = useState<Timeline | null>(saved?.timeline ?? null);
  const [budget, setBudget] = useState<number>(saved?.budget ?? 250);
  const [customBudget, setCustomBudget] = useState<string>(saved?.customBudget ?? '');
  const [usingCustomBudget, setUsingCustomBudget] = useState(saved?.usingCustomBudget ?? false);

  // Persist answers per mode
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        step, goal, timeline, budget, customBudget, usingCustomBudget,
      }));
    } catch {}
  }, [storageKey, step, goal, timeline, budget, customBudget, usingCustomBudget]);

  const totalValue = summary?.totalMarketValue || 0;

  const eraAllocation = useMemo(() => calculateEraAllocationBreakdown(items), [items]);

  const resolvedPreset = useMemo(() => {
    if (!goal || !timeline) return null;
    return mode === 'era' ? resolveEraPreset(goal, timeline) : resolveAssetPreset(goal, timeline);
  }, [goal, timeline, mode]);

  const goalOptions = mode === 'era' ? ERA_GOAL_OPTIONS : ASSET_GOAL_OPTIONS;
  const timelineOptions = mode === 'era' ? ERA_TIMELINE_OPTIONS : ASSET_TIMELINE_OPTIONS;
  const step1Title = mode === 'era' ? 'Which era excites you most?' : "What's your goal?";
  const step1Sub = mode === 'era' ? 'Pick the era vibe you want more of.' : 'Pick what matters most to you.';
  const step2Title = mode === 'era' ? 'How do you see the market?' : "What's your timeline?";
  const step2Sub = mode === 'era' ? 'Your stance on reprints and release cycles.' : 'How long are you planning to hold?';

  // Build plan rows (current vs target, gap, monthly allocation)
  const plan = useMemo(() => {
    if (!resolvedPreset) return null;

    if (mode === 'asset') {
      if (!allocation) return null;
      // If user customized in the Advanced tab, prefer their custom target.
      const target = ctxAssetPreset === 'custom' ? ctxAssetTarget : ALLOCATION_PRESETS[resolvedPreset];
      const cats = [
        { key: 'sealed' as const, label: 'Sealed Products', current: allocation.sealed, target: target.sealed },
        { key: 'slabs' as const, label: 'Graded Cards', current: allocation.slabs, target: target.slabs },
        { key: 'rawCards' as const, label: 'Raw Cards', current: allocation.rawCards, target: target.rawCards },
      ];
      const totalUnderweight = cats.reduce((sum, c) => {
        const tv = (c.target / 100) * totalValue;
        const d = tv - c.current.value;
        return sum + (d > 0 ? d : 0);
      }, 0);
      return cats.map(c => {
        const targetValue = (c.target / 100) * totalValue;
        const delta = targetValue - c.current.value;
        const monthlyShare = delta > 0 && totalUnderweight > 0 ? (delta / totalUnderweight) * budget : 0;
        return {
          key: c.key,
          label: c.label,
          currentPct: c.current.percent,
          targetPct: c.target,
          delta,
          monthly: Math.max(0, monthlyShare),
          isUnderweight: delta > 100,
          isOverweight: delta < -100,
        };
      });
    }

    // era mode
    const target = ctxEraPreset === 'custom' ? ctxEraTarget : ERA_ALLOCATION_PRESETS[resolvedPreset];
    const order: PokemonEra[] = ['current', 'ultraModern', 'modern', 'classic', 'vintage'];
    const cats = order.map(e => ({
      key: e,
      label: ERA_INFO[e].name,
      current: eraAllocation[e],
      target: target[e],
    }));
    const totalUnderweight = cats.reduce((sum, c) => {
      const tv = (c.target / 100) * totalValue;
      const d = tv - c.current.value;
      return sum + (d > 0 ? d : 0);
    }, 0);
    return cats.map(c => {
      const targetValue = (c.target / 100) * totalValue;
      const delta = targetValue - c.current.value;
      const monthlyShare = delta > 0 && totalUnderweight > 0 ? (delta / totalUnderweight) * budget : 0;
      return {
        key: c.key,
        label: c.label,
        currentPct: c.current.percent,
        targetPct: c.target,
        delta,
        monthly: Math.max(0, monthlyShare),
        isUnderweight: delta > 100,
        isOverweight: delta < -100,
      };
    });
  }, [allocation, eraAllocation, mode, resolvedPreset, totalValue, budget, ctxAssetPreset, ctxAssetTarget, ctxEraPreset, ctxEraTarget]);

  // Primary recommendation = the largest underweight category
  const primary = useMemo(() => {
    if (!plan) return null;
    const sorted = [...plan].sort((a, b) => b.delta - a.delta);
    return sorted[0]?.delta > 100 ? sorted[0] : null;
  }, [plan]);

  const overweightAlt = useMemo(() => {
    if (!plan) return null;
    const sorted = [...plan].sort((a, b) => a.delta - b.delta);
    return sorted[0]?.delta < -100 ? sorted[0] : null;
  }, [plan]);

  const handleSelectGoal = (g: Goal) => {
    setGoal(g);
    setStep(2);
  };
  const handleSelectTimeline = (t: Timeline) => {
    setTimeline(t);
    setStep(3);
  };
  const handleSelectBudget = (amount: number) => {
    setUsingCustomBudget(false);
    setBudget(amount);
    setStep(4);
  };
  const handleCustomBudget = () => {
    const n = parseInt(customBudget, 10);
    if (!isNaN(n) && n > 0) {
      setUsingCustomBudget(true);
      setBudget(n);
      setStep(4);
    }
  };

  const handleSavePlan = () => {
    if (!resolvedPreset) return;
    if (mode === 'asset') {
      setAllocationPreset(resolvedPreset);
    } else {
      setEraAllocationPreset(resolvedPreset);
    }
    toast.success('Plan saved to your portfolio settings');
  };

  const handleReset = () => {
    setStep(1);
    setGoal(null);
    setTimeline(null);
    try { localStorage.removeItem(storageKey); } catch {}
  };

  const stepNum = step;
  const totalSteps = 3;

  return (
    <div className="space-y-4">
      {/* Step indicator */}
      {step < 4 && (
        <div className="flex items-center gap-2">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className={cn(
                'h-1 flex-1 rounded-full transition-colors',
                i <= stepNum ? 'bg-primary' : 'bg-secondary'
              )}
            />
          ))}
          <span className="text-[11px] text-muted-foreground tabular-nums ml-2">
            Step {stepNum} of {totalSteps}
          </span>
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* Step 1: Goal */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="glass-card p-5 sm:p-6"
          >
            <h2 className="text-lg font-semibold text-foreground mb-1">{step1Title}</h2>
            <p className="text-xs text-muted-foreground mb-5">{step1Sub}</p>
            <div className="space-y-2">
              {goalOptions.map(opt => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleSelectGoal(opt.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/60 hover:border-primary/40 transition-all text-left group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.sub}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Step 2: Timeline */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="glass-card p-5 sm:p-6"
          >
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3"
            >
              <ArrowLeft className="w-3 h-3" /> Back
            </button>
            <h2 className="text-lg font-semibold text-foreground mb-1">{step2Title}</h2>
            <p className="text-xs text-muted-foreground mb-5">{step2Sub}</p>
            <div className="space-y-2">
              {timelineOptions.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => handleSelectTimeline(opt.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/60 hover:border-primary/40 transition-all text-left group"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.sub}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Step 3: Budget */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="glass-card p-5 sm:p-6"
          >
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3"
            >
              <ArrowLeft className="w-3 h-3" /> Back
            </button>
            <h2 className="text-lg font-semibold text-foreground mb-1">Monthly budget?</h2>
            <p className="text-xs text-muted-foreground mb-5">How much can you put toward your collection each month?</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              {BUDGET_PRESETS.map(amount => (
                <button
                  key={amount}
                  onClick={() => handleSelectBudget(amount)}
                  className="px-3 py-3 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/60 hover:border-primary/40 transition-all text-sm font-medium text-foreground tabular-nums"
                >
                  ${amount.toLocaleString()}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg border border-border bg-secondary/30">
              <span className="text-sm text-muted-foreground pl-1">Custom $</span>
              <input
                type="number"
                value={customBudget}
                onChange={(e) => setCustomBudget(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCustomBudget(); }}
                placeholder="Enter amount"
                className="flex-1 bg-transparent text-sm text-foreground focus:outline-none tabular-nums"
              />
              <Button size="sm" onClick={handleCustomBudget} disabled={!customBudget}>
                Set
              </Button>
            </div>
          </motion.div>
        )}

        {/* Output: Plan */}
        {step === 4 && plan && resolvedPreset && (
          <motion.div
            key="output"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            {/* Summary badge + edit */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{presetLabel(resolvedPreset)} · {timeline ? timelineLabel(timeline) : ''} · ${budget.toLocaleString()}</span>
              </div>
              <button
                onClick={handleReset}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Change answers
              </button>
            </div>

            {/* Primary action card */}
            <div className="glass-card p-5 sm:p-6 border-2 border-primary/40 bg-primary/5">
              <p className="text-xs uppercase tracking-wider text-primary font-semibold mb-2">Your plan this month</p>
              {primary ? (
                <>
                  <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1">
                    Put more of this month's budget into {primary.label}
                  </h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    You're underweight vs your target.
                  </p>
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-4xl sm:text-5xl font-bold text-primary tabular-nums">
                      ${Math.round(primary.monthly).toLocaleString()}
                    </span>
                    <span className="text-sm text-muted-foreground">this month</span>
                  </div>
                  <p className="text-xs text-foreground/80 leading-relaxed">
                    You're currently <span className="font-semibold tabular-nums">{primary.currentPct.toFixed(0)}%</span> {primary.label.toLowerCase()},
                    {' '}
                    {primary.currentPct < primary.targetPct
                      ? <>below your {presetLabel(resolvedPreset).toLowerCase()} target of <span className="font-semibold tabular-nums">{primary.targetPct}%</span>. Focus new spend here until you reach target.</>
                      : <>at target.</>
                    }
                    {overweightAlt && (
                      <> No new {overweightAlt.label.toLowerCase()} until you reach <span className="font-semibold tabular-nums">{overweightAlt.targetPct}%</span> (currently <span className="font-semibold tabular-nums">{overweightAlt.currentPct.toFixed(0)}%</span>).</>
                    )}
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1">
                    You're already on target
                  </h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Spread your ${budget.toLocaleString()} across categories to maintain your mix.
                  </p>
                </>
              )}
            </div>

            {/* Secondary allocations */}
            <div className="glass-card p-5 sm:p-6">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">Other categories</p>
              <div className="space-y-3">
                {plan
                  .filter(c => c.key !== primary?.key)
                  .map(c => (
                    <div
                      key={c.key}
                      className={cn(
                        "flex items-center justify-between p-4 sm:p-5 rounded-xl border bg-secondary/30",
                        c.isOverweight && "border-warning/30 bg-warning/5",
                        c.isUnderweight && "border-primary/30 bg-primary/5",
                        !c.isOverweight && !c.isUnderweight && "border-border"
                      )}
                    >
                      <div className="min-w-0">
                        <p className="text-base sm:text-lg font-semibold text-foreground mb-0.5">{c.label}</p>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {c.currentPct.toFixed(0)}% <ArrowRight className="inline w-3 h-3" /> {c.targetPct}%
                          {c.isOverweight && <span className="text-warning ml-2 font-medium">overweight</span>}
                          {c.isUnderweight && <span className="text-primary ml-2 font-medium">underweight</span>}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-2xl sm:text-3xl font-bold text-foreground tabular-nums">
                          ${Math.round(c.monthly).toLocaleString()}
                        </span>
                        <span className="text-sm text-muted-foreground ml-1">/mo</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Save button */}
            <Button
              onClick={handleSavePlan}
              size="lg"
              className="w-full gap-2"
            >
              <Save className="w-4 h-4" />
              Save this plan
            </Button>

            {/* Advanced toggle */}
            {onCustomize && (
              <div className="text-center pt-1">
                <button
                  onClick={onCustomize}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  <Settings2 className="w-3 h-3" />
                  Customize allocations manually →
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
