import React, { useState, useMemo, useEffect } from 'react';
import { ArrowRight, DollarSign, Calendar, Check, AlertCircle, AlertTriangle, Info, Save, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { cn } from '@/lib/utils';
import { 
  EraAllocationTarget, 
  ERA_ALLOCATION_PRESETS, 
  ERA_ALLOCATION_PRESET_INFO, 
  EraAllocationPreset,
  ERA_INFO,
  PokemonEra
} from '@/lib/types';
import { calculateEraAllocationBreakdown, generateEraHealthWarnings, getNewerEraStatus } from '@/lib/eraClassification';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';

const CONTRIBUTION_PRESETS = [250, 500, 1000, 2500];
const TIMELINE_PRESETS = [3, 6, 12];

type RebalanceMode = 'monthly-budget' | 'target-date';

const ERA_ORDER: PokemonEra[] = ['current', 'ultraModern', 'modern', 'classic', 'vintage'];

export function EraRebalanceSimulator() {
  const { items, summary, eraAllocationTarget, eraAllocationPreset, setEraAllocationPreset, setCustomEraTarget } = usePortfolio();
  
  const [pendingAllocation, setPendingAllocation] = useState<EraAllocationTarget>(eraAllocationTarget);
  const [appliedAllocation, setAppliedAllocation] = useState<EraAllocationTarget>(eraAllocationTarget);
  const [isCustomMode, setIsCustomMode] = useState(false);
  
  const [monthlyBudget, setMonthlyBudget] = useState(500);
  const [targetMonths, setTargetMonths] = useState(6);
  const [rebalanceMode, setRebalanceMode] = useState<RebalanceMode>('monthly-budget');

  const totalValue = summary?.totalMarketValue || 0;

  useEffect(() => {
    if (!isCustomMode) {
      setPendingAllocation(eraAllocationTarget);
      setAppliedAllocation(eraAllocationTarget);
    }
  }, [eraAllocationTarget, isCustomMode]);

  const eraAllocation = useMemo(() => {
    return calculateEraAllocationBreakdown(items);
  }, [items]);

  const pendingTotal = pendingAllocation.vintage + pendingAllocation.classic + pendingAllocation.modern + 
                       pendingAllocation.ultraModern + pendingAllocation.current;
  const isValidTotal = pendingTotal === 100;
  const isCurrentTargetHigh = pendingAllocation.current > 10;

  // Auto-apply when valid
  useEffect(() => {
    if (isValidTotal && isCustomMode) {
      setAppliedAllocation(pendingAllocation);
      setCustomEraTarget(pendingAllocation);
    }
  }, [pendingAllocation, isValidTotal, isCustomMode]);

  const handleSliderChange = (category: keyof EraAllocationTarget, value: number[]) => {
    setPendingAllocation(prev => ({ ...prev, [category]: value[0] }));
    setIsCustomMode(true);
  };

  const handlePresetClick = (presetKey: EraAllocationPreset) => {
    const presetAllocation = ERA_ALLOCATION_PRESETS[presetKey];
    setIsCustomMode(false);
    setEraAllocationPreset(presetKey);
    setPendingAllocation(presetAllocation);
    setAppliedAllocation(presetAllocation);
  };

  const rebalanceAnalysis = useMemo(() => {
    if (!eraAllocation) return null;

    const categories = ERA_ORDER.map(era => ({
      key: era,
      label: ERA_INFO[era].name,
      years: ERA_INFO[era].years,
      description: ERA_INFO[era].description,
      current: eraAllocation[era],
      target: appliedAllocation[era],
    }));

    const totalUnderweight = categories.reduce((sum, cat) => {
      const targetValue = (cat.target / 100) * totalValue;
      const delta = targetValue - cat.current.value;
      return sum + (delta > 0 ? delta : 0);
    }, 0);

    return categories.map(cat => {
      const currentValue = cat.current.value;
      const targetValue = (cat.target / 100) * totalValue;
      const delta = targetValue - currentValue;
      const deltaPercent = cat.target - cat.current.percent;

      const monthlyShare = deltaPercent > 0 && totalUnderweight > 0
        ? (delta / totalUnderweight) * monthlyBudget
        : 0;

      const requiredMonthly = delta > 0 ? delta / targetMonths : 0;
      const monthsNeeded = delta > 0 && monthlyShare > 0 ? Math.ceil(delta / monthlyShare) : 0;

      return {
        ...cat,
        currentValue,
        targetValue,
        delta,
        deltaPercent,
        monthlyShare: Math.max(0, monthlyShare),
        requiredMonthly: Math.max(0, requiredMonthly),
        monthsNeeded,
        isOverweight: delta < -100,
        isUnderweight: delta > 100,
      };
    });
  }, [eraAllocation, appliedAllocation, totalValue, monthlyBudget, targetMonths]);

  const healthWarnings = useMemo(() => {
    return generateEraHealthWarnings(eraAllocation, appliedAllocation);
  }, [eraAllocation, appliedAllocation]);

  const newerEraStatus = useMemo(() => {
    return getNewerEraStatus(eraAllocation);
  }, [eraAllocation]);

  const totalMonthlyRequired = useMemo(() => {
    if (!rebalanceAnalysis) return 0;
    return rebalanceAnalysis.reduce((sum, cat) => sum + cat.requiredMonthly, 0);
  }, [rebalanceAnalysis]);

  const estimatedMonthsToBalance = useMemo(() => {
    if (!rebalanceAnalysis) return 0;
    return Math.max(...rebalanceAnalysis.map(cat => cat.monthsNeeded));
  }, [rebalanceAnalysis]);

  const presets: { key: EraAllocationPreset; label: string; description: string; title: string }[] = [
    { key: 'conservative', label: 'Conservative', ...ERA_ALLOCATION_PRESET_INFO.conservative },
    { key: 'balanced', label: 'Balanced', ...ERA_ALLOCATION_PRESET_INFO.balanced },
    { key: 'aggressive', label: 'Aggressive', ...ERA_ALLOCATION_PRESET_INFO.aggressive },
  ];

  if (!eraAllocation || !rebalanceAnalysis) return null;

  return (
    <div className="space-y-4">
      {/* Section A — Set Your Target */}
      <div className="glass-card p-4 sm:p-6 animate-fade-in">
        <h2 className="text-base sm:text-lg font-semibold text-foreground mb-0.5">① Set Your Goal Mix</h2>
        <p className="text-xs text-muted-foreground mb-4">Pick a strategy or drag the sliders. <span className="text-foreground/70 font-medium">"You have"</span> shows your current split — the slider sets your <span className="text-foreground/70 font-medium">goal</span>.</p>

        {/* Preset pills */}
        <div className="flex gap-2 mb-5">
          {presets.map((preset) => (
            <button
              key={preset.key}
              onClick={() => handlePresetClick(preset.key)}
              className={cn(
                "flex-1 px-3 py-2 rounded-lg transition-all duration-200 text-center",
                eraAllocationPreset === preset.key && !isCustomMode
                  ? "bg-primary text-primary-foreground ring-1 ring-primary/50"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              <p className="font-medium text-xs sm:text-sm">{preset.label}</p>
            </button>
          ))}
        </div>

        {/* Sliders with inline comparison */}
        <div className="space-y-4">
          {ERA_ORDER.map((era) => {
            const analysis = rebalanceAnalysis.find(c => c.key === era);
            if (!analysis) return null;
            return (
              <div key={era} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium text-foreground">{ERA_INFO[era].name}</span>
                    <Tooltip>
                      <TooltipTrigger>
                        <span className="text-[10px] text-muted-foreground">({ERA_INFO[era].years})</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-sm">{ERA_INFO[era].description}</p>
                      </TooltipContent>
                    </Tooltip>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground tabular-nums">
                      You have {analysis.current.percent.toFixed(0)}%
                    </span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs font-semibold text-primary tabular-nums">
                      Goal {pendingAllocation[era]}%
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {era === 'current' && isCurrentTargetHigh && (
                      <AlertTriangle className="w-3 h-3 text-warning" />
                    )}
                    <span className={cn(
                      "text-[10px] tabular-nums",
                      analysis.isUnderweight ? "text-primary" : analysis.isOverweight ? "text-warning" : "text-muted-foreground"
                    )}>
                      {analysis.delta >= 0 ? '+' : ''}{Math.round(analysis.deltaPercent)}%
                    </span>
                  </div>
                </div>
                <Slider
                  value={[pendingAllocation[era]]}
                  onValueChange={(value) => handleSliderChange(era, value)}
                  max={100}
                  min={0}
                  step={5}
                  className="w-full"
                />
              </div>
            );
          })}
        </div>

        {/* Inline health warnings */}
        {(healthWarnings.length > 0 || newerEraStatus.status !== 'healthy') && isValidTotal && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {newerEraStatus.status !== 'healthy' && (
              <span className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px]",
                newerEraStatus.status === 'high' ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground"
              )}>
                {newerEraStatus.status === 'high' ? <AlertTriangle className="w-3 h-3" /> : <Info className="w-3 h-3" />}
                {newerEraStatus.text}
              </span>
            )}
            {healthWarnings.map((w, i) => (
              <span key={i} className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px]",
                w.severity === 'warning' ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground"
              )}>
                {w.severity === 'warning' ? <AlertTriangle className="w-3 h-3" /> : <Info className="w-3 h-3" />}
                {w.message}
              </span>
            ))}
          </div>
        )}

        {/* Total bar */}
        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Total:</span>
            <span className={cn(
              "text-sm font-bold tabular-nums",
              isValidTotal ? "text-success" : "text-destructive"
            )}>
              {pendingTotal}%
            </span>
            {isValidTotal ? (
              <Check className="w-3.5 h-3.5 text-success" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-destructive" />
            )}
          </div>
          {!isValidTotal && (
            <span className="text-[10px] text-destructive">
              {pendingTotal > 100 ? `−${pendingTotal - 100}%` : `+${100 - pendingTotal}%`} to reach 100%
            </span>
          )}
        </div>
      </div>

      {/* Section B — Rebalancing Analysis */}
      <div className={cn(
        "glass-card p-4 sm:p-6 animate-fade-in transition-opacity",
        !isValidTotal && "opacity-50 pointer-events-none"
      )}>
        <h2 className="text-base sm:text-lg font-semibold text-foreground mb-0.5">② How You Compare</h2>
        <p className="text-xs text-muted-foreground mb-3">Here's the gap between where you are now and your goal. Green means you need more, amber means you have too much.</p>

        <div className="space-y-2">
          {rebalanceAnalysis
            .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
            .map((cat) => {
              const status = cat.isUnderweight ? 'underweight' : cat.isOverweight ? 'overweight' : 'balanced';
              const statusLabel = status === 'underweight' ? 'Need more' : status === 'overweight' ? 'Too much' : 'On track';
              return (
                <div
                  key={cat.key}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border",
                    status === 'overweight' && "border-warning/20 bg-warning/5",
                    status === 'underweight' && "border-primary/20 bg-primary/5",
                    status === 'balanced' && "border-border bg-secondary/20"
                  )}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{cat.label}</span>
                      <span className="text-[10px] text-muted-foreground">({cat.years})</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                      <span className="tabular-nums">Now {cat.current.percent.toFixed(0)}%</span>
                      <ArrowRight className="w-3 h-3" />
                      <span className="tabular-nums font-medium text-foreground">Goal {cat.target}%</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={cn(
                      "text-xs font-semibold",
                      status === 'underweight' ? "text-primary" : status === 'overweight' ? "text-warning" : "text-muted-foreground"
                    )}>
                      {statusLabel}
                    </span>
                    {Math.abs(cat.delta) > 100 && (
                      <p className={cn(
                        "text-[10px] tabular-nums",
                        cat.delta > 0 ? "text-primary" : "text-warning"
                      )}>
                        {cat.delta > 0 ? '+' : '−'}${Math.round(Math.abs(cat.delta)).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Section C — Your Rebalancing Plan */}
      <div className={cn(
        "glass-card p-4 sm:p-6 animate-fade-in transition-opacity",
        !isValidTotal && "opacity-50 pointer-events-none"
      )}>
        <h2 className="text-base sm:text-lg font-semibold text-foreground mb-0.5">③ Your Spending Plan</h2>
        <p className="text-xs text-muted-foreground mb-3">Based on the gaps above, here's how much to spend on each era each month to reach your goal.</p>

        {/* Mode Toggle + Controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex gap-1 p-0.5 bg-secondary rounded-lg flex-shrink-0">
            <button
              onClick={() => setRebalanceMode('monthly-budget')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                rebalanceMode === 'monthly-budget'
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <DollarSign className="w-3.5 h-3.5" />
              Budget
            </button>
            <button
              onClick={() => setRebalanceMode('target-date')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                rebalanceMode === 'target-date'
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Calendar className="w-3.5 h-3.5" />
              Timeline
            </button>
          </div>

          {rebalanceMode === 'monthly-budget' ? (
            <div className="flex flex-wrap gap-1.5 items-center">
              {CONTRIBUTION_PRESETS.map((amount) => (
                <button
                  key={amount}
                  onClick={() => setMonthlyBudget(amount)}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                    monthlyBudget === amount
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  )}
                >
                  ${amount.toLocaleString()}
                </button>
              ))}
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-secondary text-xs">
                <span className="text-muted-foreground">$</span>
                <input
                  type="number"
                  value={monthlyBudget}
                  onChange={(e) => setMonthlyBudget(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-14 bg-transparent text-foreground focus:outline-none tabular-nums"
                />
              </div>
            </div>
          ) : (
            <div className="flex gap-1.5 items-center">
              {TIMELINE_PRESETS.map((months) => (
                <button
                  key={months}
                  onClick={() => setTargetMonths(months)}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-medium transition-all",
                    targetMonths === months
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  )}
                >
                  {months}mo
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Unified rows */}
        <div className="space-y-2">
          {rebalanceAnalysis
            .sort((a, b) => b.delta - a.delta)
            .map((cat) => {
              const monthly = rebalanceMode === 'monthly-budget' ? cat.monthlyShare : cat.requiredMonthly;
              return (
                <div
                  key={cat.key}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border transition-colors",
                    cat.isOverweight && "border-warning/20 bg-warning/5",
                    cat.isUnderweight && "border-primary/20 bg-primary/5",
                    !cat.isOverweight && !cat.isUnderweight && "border-border bg-secondary/20"
                  )}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{cat.label}</span>
                      <span className="text-[10px] text-muted-foreground">({cat.years})</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                      <span className="tabular-nums">{cat.current.percent.toFixed(1)}%</span>
                      <ArrowRight className="w-3 h-3" />
                      <span className="tabular-nums font-medium text-foreground">{cat.target}%</span>
                      <span className={cn(
                        "tabular-nums ml-1",
                        cat.delta > 0 ? "text-primary" : cat.delta < 0 ? "text-warning" : ""
                      )}>
                        ({cat.delta >= 0 ? '+' : ''}${Math.round(Math.abs(cat.delta)).toLocaleString()})
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {monthly > 0 ? (
                      <>
                        <span className="text-sm font-semibold text-primary tabular-nums">
                          ${Math.round(monthly).toLocaleString()}
                        </span>
                        <span className="text-xs text-muted-foreground">/mo</span>
                      </>
                    ) : cat.delta < 0 ? (
                      <span className="text-xs text-warning">Reduce/hold</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">On target</span>
                    )}
                  </div>
                </div>
              );
            })}
        </div>

        {rebalanceAnalysis.every(cat => cat.monthlyShare === 0 && cat.requiredMonthly === 0) && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Your portfolio is already balanced to your era targets.
          </p>
        )}

        {/* Footer */}
        {(estimatedMonthsToBalance > 0 || totalMonthlyRequired > 0) && (
          <div className="mt-3 p-3 rounded-lg bg-secondary/40 border border-border">
            {rebalanceMode === 'monthly-budget' && estimatedMonthsToBalance > 0 && (
              <p className="text-xs text-foreground">
                <span className="text-muted-foreground">Est. time to balance:</span>{' '}
                <span className="font-semibold text-primary">
                  {estimatedMonthsToBalance} month{estimatedMonthsToBalance > 1 ? 's' : ''}
                </span>
                <span className="text-muted-foreground"> at ${monthlyBudget.toLocaleString()}/mo</span>
              </p>
            )}
            {rebalanceMode === 'target-date' && totalMonthlyRequired > 0 && (
              <p className="text-xs text-foreground">
                <span className="text-muted-foreground">Total needed:</span>{' '}
                <span className="font-semibold text-primary">
                  ${Math.round(totalMonthlyRequired).toLocaleString()}/mo
                </span>
                <span className="text-muted-foreground"> for {targetMonths} months</span>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Save */}
      <div className="glass-card p-4 animate-fade-in">
        <Button
          className="w-full gap-2"
          size="lg"
          onClick={() => {
            const existing = JSON.parse(localStorage.getItem('smartFeedRebalanceSettings') || '{}');
            const eraEntries = ERA_ORDER.map(era => ({
              era,
              delta: appliedAllocation[era] - (eraAllocation[era]?.percent ?? 0),
            })).sort((a, b) => b.delta - a.delta);
            const top2Eras = eraEntries.filter(e => e.delta > 0).slice(0, 2).map(e => e.era);

            const settings = {
              ...existing,
              eraAllocation: { ...appliedAllocation },
              top2RebalanceEras: top2Eras,
              savedAt: new Date().toISOString(),
            };
            localStorage.setItem('smartFeedRebalanceSettings', JSON.stringify(settings));
            toast.success('Era allocation saved to Smart Feed');
          }}
        >
          <Save className="w-4 h-4" />
          Save
        </Button>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Selections update your generated report and Smart Feed recommendations.
        </p>
      </div>
    </div>
  );
}
