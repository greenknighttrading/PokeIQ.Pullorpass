import React from 'react';
import { Card } from '@/components/ui/card';
import { DollarSign, TrendingUp, Package, Award, Layers, Shield } from 'lucide-react';
import { BudgetState, GRADED_TIERS, RAW_INTENTS, SEALED_TYPES, TOP_LEVEL_COLORS } from './types';
import { cn } from '@/lib/utils';

interface BudgetSummaryProps {
  state: BudgetState;
  topLevelValid: boolean;
  gradedValid: boolean;
  rawValid: boolean;
  sealedValid: boolean;
  healthScore?: { overall: number; asset: number };
}

export function BudgetSummary({ state, topLevelValid, gradedValid, rawValid, sealedValid, healthScore }: BudgetSummaryProps) {
  const allValid = topLevelValid && gradedValid && rawValid && sealedValid;
  const { monthlyBudget, topLevel, graded, raw, sealed } = state;

  const sealedBudget = Math.round(monthlyBudget * (topLevel.sealed / 100));
  const gradedBudget = Math.round(monthlyBudget * (topLevel.graded / 100));
  const rawBudget = Math.round(monthlyBudget * (topLevel.raw / 100));

  // Determine risk profile based on allocation
  const getRiskProfile = () => {
    if (!topLevelValid) return null;
    if (topLevel.sealed >= 50) return { label: 'Conservative', color: 'text-success' };
    if (topLevel.graded >= 40) return { label: 'Balanced', color: 'text-primary' };
    if (topLevel.raw >= 35) return { label: 'Aggressive', color: 'text-warning' };
    return { label: 'Balanced', color: 'text-primary' };
  };

  const riskProfile = getRiskProfile();

  if (!allValid) {
    return (
      <Card className="p-6 bg-muted/30">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-bold text-foreground">Budget Summary</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Set all allocations to 100% to see your complete budget breakdown.
        </p>
        <div className="mt-4 space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${topLevelValid ? 'bg-success' : 'bg-warning'}`} />
            <span className={topLevelValid ? 'text-success' : 'text-muted-foreground'}>Top-level allocation</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${sealedValid ? 'bg-success' : 'bg-warning'}`} />
            <span className={sealedValid ? 'text-success' : 'text-muted-foreground'}>Sealed breakdown</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${gradedValid ? 'bg-success' : 'bg-warning'}`} />
            <span className={gradedValid ? 'text-success' : 'text-muted-foreground'}>Graded breakdown</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${rawValid ? 'bg-success' : 'bg-warning'}`} />
            <span className={rawValid ? 'text-success' : 'text-muted-foreground'}>Raw breakdown</span>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-primary" />
        <h3 className="font-bold text-foreground">Budget Summary</h3>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
          <p className="text-xs text-muted-foreground mb-1">Monthly Budget</p>
          <p className="text-2xl font-bold text-primary">${monthlyBudget.toLocaleString()}</p>
        </div>
        <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
          <p className="text-xs text-muted-foreground mb-1">Yearly Budget</p>
          <p className="text-2xl font-bold text-accent">${(monthlyBudget * 12).toLocaleString()}</p>
        </div>
      </div>

      {/* Health Score & Risk Profile */}
      {healthScore && topLevelValid && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className={cn(
            'p-4 rounded-lg border',
            healthScore.asset >= 75 && 'border-success/30 bg-success/5',
            healthScore.asset >= 65 && healthScore.asset < 75 && 'border-warning/30 bg-warning/5',
            healthScore.asset < 65 && 'border-destructive/30 bg-destructive/5',
          )}>
            <div className="flex items-center gap-1 mb-1">
              <Shield className="w-3 h-3 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Asset Score</p>
            </div>
            <p className={cn(
              'text-xl font-bold',
              healthScore.asset >= 75 && 'text-success',
              healthScore.asset >= 65 && healthScore.asset < 75 && 'text-warning',
              healthScore.asset < 65 && 'text-destructive',
            )}>
              {healthScore.asset}
            </p>
          </div>
          {riskProfile && (
            <div className="p-4 rounded-lg border border-border bg-secondary/30">
              <p className="text-xs text-muted-foreground mb-1">Risk Profile</p>
              <p className={cn('text-xl font-bold', riskProfile.color)}>
                {riskProfile.label}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Top Level Summary */}
      <div className="space-y-4">
        {/* Sealed */}
        <div className="p-4 rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-4 h-4" style={{ color: TOP_LEVEL_COLORS.sealed }} />
            <span className="font-medium text-sm">Sealed</span>
            <span className="ml-auto text-sm font-bold" style={{ color: TOP_LEVEL_COLORS.sealed }}>
              ${sealedBudget.toLocaleString()}/mo
            </span>
          </div>
          <div className="space-y-1 text-xs">
            {SEALED_TYPES.slice(0, 5).map((type) => (
              <div key={type.id} className="flex justify-between text-muted-foreground">
                <span>{type.name}</span>
                <span>${Math.round(sealedBudget * ((sealed as any)[type.id] || 0) / 100).toLocaleString()}</span>
              </div>
            ))}
            {SEALED_TYPES.length > 5 && (
              <p className="text-muted-foreground/60 italic">+ {SEALED_TYPES.length - 5} more...</p>
            )}
          </div>
        </div>

        {/* Graded */}
        <div className="p-4 rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-4 h-4" style={{ color: TOP_LEVEL_COLORS.graded }} />
            <span className="font-medium text-sm">Graded</span>
            <span className="ml-auto text-sm font-bold" style={{ color: TOP_LEVEL_COLORS.graded }}>
              ${gradedBudget.toLocaleString()}/mo
            </span>
          </div>
          <div className="space-y-1 text-xs">
            {GRADED_TIERS.map((tier) => (
              <div key={tier.id} className="flex justify-between text-muted-foreground">
                <span>{tier.name} <span className="text-muted-foreground/60">{tier.range}</span></span>
                <span>${Math.round(gradedBudget * ((graded as any)[tier.id] || 0) / 100).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Raw */}
        <div className="p-4 rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4" style={{ color: TOP_LEVEL_COLORS.raw }} />
            <span className="font-medium text-sm">Raw</span>
            <span className="ml-auto text-sm font-bold" style={{ color: TOP_LEVEL_COLORS.raw }}>
              ${rawBudget.toLocaleString()}/mo
            </span>
          </div>
          <div className="space-y-1 text-xs">
            {RAW_INTENTS.map((intent) => (
              <div key={intent.id} className="flex justify-between text-muted-foreground">
                <span>{intent.name}</span>
                <span>${Math.round(rawBudget * ((raw as any)[intent.id] || 0) / 100).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
