import React, { useState, useMemo, useEffect } from 'react';
import { ArrowRight, DollarSign, Calendar, Check, AlertCircle, Save, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { cn } from '@/lib/utils';
import { AllocationTarget, ALLOCATION_PRESETS, ALLOCATION_PRESET_INFO, AllocationPreset } from '@/lib/types';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const CONTRIBUTION_PRESETS = [250, 500, 1000, 2500];
const TIMELINE_PRESETS = [3, 6, 12];

type RebalanceMode = 'monthly-budget' | 'target-date';

export function RebalanceSimulator() {
  const { allocation, summary, allocationTarget, allocationPreset, setAllocationPreset, setCustomTarget } = usePortfolio();
  
  const [pendingAllocation, setPendingAllocation] = useState<AllocationTarget>(allocationTarget);
  const [appliedAllocation, setAppliedAllocation] = useState<AllocationTarget>(allocationTarget);
  const [isCustomMode, setIsCustomMode] = useState(false);
  
  const [monthlyBudget, setMonthlyBudget] = useState(500);
  const [targetMonths, setTargetMonths] = useState(6);
  const [rebalanceMode, setRebalanceMode] = useState<RebalanceMode>('monthly-budget');

  const totalValue = summary?.totalMarketValue || 0;

  useEffect(() => {
    if (!isCustomMode) {
      setPendingAllocation(allocationTarget);
      setAppliedAllocation(allocationTarget);
    }
  }, [allocationTarget, isCustomMode]);

  const pendingTotal = pendingAllocation.sealed + pendingAllocation.slabs + pendingAllocation.rawCards;
  const isValidTotal = pendingTotal === 100;

  // Auto-apply when valid
  useEffect(() => {
    if (isValidTotal && isCustomMode) {
      setAppliedAllocation(pendingAllocation);
      setCustomTarget(pendingAllocation);
      setAllocationPreset('custom');
    }
  }, [pendingAllocation, isValidTotal, isCustomMode]);

  const handleSliderChange = (category: keyof AllocationTarget, value: number[]) => {
    setPendingAllocation(prev => ({ ...prev, [category]: value[0] }));
    setIsCustomMode(true);
  };

  const handlePresetClick = (presetKey: AllocationPreset) => {
    const presetAllocation = ALLOCATION_PRESETS[presetKey];
    setIsCustomMode(false);
    setAllocationPreset(presetKey);
    setPendingAllocation(presetAllocation);
    setAppliedAllocation(presetAllocation);
  };

  const rebalanceAnalysis = useMemo(() => {
    if (!allocation) return null;

    const categories = [
      { key: 'sealed' as const, label: 'Sealed Products', current: allocation.sealed, target: appliedAllocation.sealed },
      { key: 'slabs' as const, label: 'Graded Cards', current: allocation.slabs, target: appliedAllocation.slabs },
      { key: 'rawCards' as const, label: 'Raw Cards', current: allocation.rawCards, target: appliedAllocation.rawCards },
    ];

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

      let monthlyShare = 0;
      if (delta > 0 && totalUnderweight > 0) {
        monthlyShare = (delta / totalUnderweight) * monthlyBudget;
      }

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
  }, [allocation, appliedAllocation, totalValue, monthlyBudget, targetMonths]);

  const totalMonthlyRequired = useMemo(() => {
    if (!rebalanceAnalysis) return 0;
    return rebalanceAnalysis.reduce((sum, cat) => sum + cat.requiredMonthly, 0);
  }, [rebalanceAnalysis]);

  const estimatedMonthsToBalance = useMemo(() => {
    if (!rebalanceAnalysis) return 0;
    return Math.max(...rebalanceAnalysis.map(cat => cat.monthsNeeded));
  }, [rebalanceAnalysis]);

  const presets: { key: AllocationPreset; label: string; description: string; title: string }[] = [
    { key: 'conservative', label: 'Conservative', ...ALLOCATION_PRESET_INFO.conservative },
    { key: 'balanced', label: 'Balanced', ...ALLOCATION_PRESET_INFO.balanced },
    { key: 'aggressive', label: 'Aggressive', ...ALLOCATION_PRESET_INFO.aggressive },
  ];

  if (!allocation || !rebalanceAnalysis) return null;

  const getDeltaIcon = (delta: number) => {
    if (delta > 100) return <TrendingUp className="w-3.5 h-3.5" />;
    if (delta < -100) return <TrendingDown className="w-3.5 h-3.5" />;
    return <Minus className="w-3.5 h-3.5" />;
  };

  const getDeltaLabel = (delta: number) => {
    if (delta > 100) return 'Underweight';
    if (delta < -100) return 'Overweight';
    return 'On target';
  };

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
                allocationPreset === preset.key && !isCustomMode
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
          {rebalanceAnalysis.map((cat) => (
            <div key={cat.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{cat.label}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground tabular-nums">
                    You have {cat.current.percent.toFixed(0)}%
                  </span>
                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs font-semibold text-primary tabular-nums">
                    Goal {pendingAllocation[cat.key]}%
                  </span>
                </div>
                <span className={cn(
                  "text-[10px] sm:text-xs flex items-center gap-1 tabular-nums",
                  cat.isUnderweight ? "text-primary" : cat.isOverweight ? "text-warning" : "text-muted-foreground"
                )}>
                  {getDeltaIcon(cat.delta)}
                  <span className="hidden sm:inline">{getDeltaLabel(cat.delta)}</span>
                  <span className="sm:hidden">
                    {cat.delta >= 0 ? '+' : ''}{Math.round(cat.deltaPercent)}%
                  </span>
                </span>
              </div>
              <Slider
                value={[pendingAllocation[cat.key]]}
                onValueChange={(value) => handleSliderChange(cat.key, value)}
                max={100}
                min={0}
                step={5}
                className="w-full"
              />
            </div>
          ))}
        </div>

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
                    <span className="text-sm font-medium text-foreground">{cat.label}</span>
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
        <p className="text-xs text-muted-foreground mb-3">Based on the gaps above, here's how much to spend on each type each month to reach your goal.</p>

        {/* Mode Toggle + Budget Controls — compact row */}
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

          {/* Inline budget/timeline controls */}
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

        {/* Unified rows — each category shows current→target, delta, and monthly */}
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
            Your portfolio is already balanced to your targets.
          </p>
        )}

        {/* Timeline / total footer */}
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
            const settings = {
              ...existing,
              assetAllocation: {
                sealed: appliedAllocation.sealed,
                graded: appliedAllocation.slabs,
                raw: appliedAllocation.rawCards,
              },
              monthlyBudget,
              savedAt: new Date().toISOString(),
            };
            localStorage.setItem('smartFeedRebalanceSettings', JSON.stringify(settings));
            toast.success('Asset allocation & budget saved to Smart Feed');
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
