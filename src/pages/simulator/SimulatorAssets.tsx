import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';
import { useSimulator } from './SimulatorContext';
import { TopLevelAllocation } from '@/components/budget/TopLevelAllocation';
import { DrillDownPanel } from '@/components/budget/DrillDownPanel';
import { BudgetSummary } from '@/components/budget/BudgetSummary';
import { BudgetState } from '@/components/budget/types';

export default function SimulatorAssets() {
  const { state, setState, topLevelValid, gradedValid, rawValid, sealedValid, healthScore } = useSimulator();
  const [drillDown, setDrillDown] = useState<'sealed' | 'graded' | 'raw' | null>(null);
  
  // Track last valid states
  const [lastValidTopLevel, setLastValidTopLevel] = useState<{ sealed: number; graded: number; raw: number } | null>(null);
  const [lastValidGraded, setLastValidGraded] = useState<Record<string, number> | null>(null);
  const [lastValidRaw, setLastValidRaw] = useState<Record<string, number> | null>(null);
  const [lastValidSealed, setLastValidSealed] = useState<Record<string, number> | null>(null);

  // Update last valid states when they become valid
  useEffect(() => {
    if (topLevelValid) setLastValidTopLevel({ ...state.topLevel });
  }, [topLevelValid, state.topLevel]);

  useEffect(() => {
    if (gradedValid) setLastValidGraded({ ...state.graded });
  }, [gradedValid, state.graded]);

  useEffect(() => {
    if (rawValid) setLastValidRaw({ ...state.raw });
  }, [rawValid, state.raw]);

  useEffect(() => {
    if (sealedValid) setLastValidSealed({ ...state.sealed });
  }, [sealedValid, state.sealed]);

  // Normalize functions
  const normalizeToHundred = (values: Record<string, number>): Record<string, number> => {
    const total = Object.values(values).reduce((s, v) => s + v, 0);
    if (total === 0) {
      const keys = Object.keys(values);
      const each = Math.floor(100 / keys.length);
      const remainder = 100 - each * keys.length;
      return Object.fromEntries(keys.map((k, i) => [k, i === 0 ? each + remainder : each]));
    }
    const ratio = 100 / total;
    const keys = Object.keys(values);
    let assigned = 0;
    const result: Record<string, number> = {};
    keys.forEach((k, i) => {
      if (i === keys.length - 1) {
        result[k] = 100 - assigned;
      } else {
        result[k] = Math.round(values[k] * ratio);
        assigned += result[k];
      }
    });
    return result;
  };

  // Top level handlers
  const handleTopLevelChange = (key: 'sealed' | 'graded' | 'raw', value: number) => {
    setState((prev) => ({
      ...prev,
      topLevel: { ...prev.topLevel, [key]: value },
    }));
  };

  const normalizeTopLevel = () => {
    const normalized = normalizeToHundred(state.topLevel);
    setState((prev) => ({
      ...prev,
      topLevel: { sealed: normalized.sealed, graded: normalized.graded, raw: normalized.raw },
    }));
  };

  const resetTopLevel = () => {
    if (lastValidTopLevel) {
      setState((prev) => ({ ...prev, topLevel: lastValidTopLevel }));
    }
  };

  // Drill-down handlers
  const handleSubAllocationChange = (category: 'sealed' | 'graded' | 'raw', id: string, value: number) => {
    setState((prev) => ({
      ...prev,
      [category]: { ...prev[category], [id]: value },
    }));
  };

  const normalizeSubAllocation = (category: 'sealed' | 'graded' | 'raw') => {
    const normalized = normalizeToHundred(state[category]);
    setState((prev) => ({
      ...prev,
      [category]: normalized as any,
    }));
  };

  const resetSubAllocation = (category: 'sealed' | 'graded' | 'raw') => {
    const lastValid = category === 'graded' ? lastValidGraded : category === 'raw' ? lastValidRaw : lastValidSealed;
    if (lastValid) {
      setState((prev) => ({ ...prev, [category]: lastValid as any }));
    }
  };

  const getCategoryBudget = (category: 'sealed' | 'graded' | 'raw') => {
    if (!topLevelValid) return 0;
    return Math.round(state.monthlyBudget * (state.topLevel[category] / 100));
  };

  // Create BudgetState for summary
  const budgetState: BudgetState = {
    monthlyBudget: state.monthlyBudget,
    topLevel: state.topLevel,
    graded: state.graded,
    raw: state.raw,
    sealed: state.sealed as BudgetState['sealed'],
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className="text-xs gap-1">
            <Sparkles className="w-3 h-3" />
            Simulated
          </Badge>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Asset Type Allocation</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Define your target allocation across product types
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Panel - Top Level or Drill Down */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2"
        >
          {drillDown === null ? (
            <TopLevelAllocation
              sealed={state.topLevel.sealed}
              graded={state.topLevel.graded}
              raw={state.topLevel.raw}
              monthlyBudget={state.monthlyBudget}
              onSealedChange={(v) => handleTopLevelChange('sealed', v)}
              onGradedChange={(v) => handleTopLevelChange('graded', v)}
              onRawChange={(v) => handleTopLevelChange('raw', v)}
              onNormalize={normalizeTopLevel}
              onReset={resetTopLevel}
              onDrillDown={setDrillDown}
              lastValidState={lastValidTopLevel}
            />
          ) : (
            <DrillDownPanel
              category={drillDown}
              allocations={state[drillDown]}
              categoryBudget={getCategoryBudget(drillDown)}
              topLevelValid={topLevelValid}
              onAllocationChange={(id, value) => handleSubAllocationChange(drillDown, id, value)}
              onNormalize={() => normalizeSubAllocation(drillDown)}
              onReset={() => resetSubAllocation(drillDown)}
              onBack={() => setDrillDown(null)}
              lastValidState={
                drillDown === 'graded' ? lastValidGraded : drillDown === 'raw' ? lastValidRaw : lastValidSealed
              }
            />
          )}
        </motion.div>

        {/* Right Panel - Summary */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <BudgetSummary
            state={budgetState}
            topLevelValid={topLevelValid}
            gradedValid={gradedValid}
            rawValid={rawValid}
            sealedValid={sealedValid}
            healthScore={healthScore}
          />
        </motion.div>
      </div>
    </div>
  );
}
