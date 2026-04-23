import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  Save,
  Trash2,
  Download,
  Plus,
  FileText,
  Shield,
  Calendar,
  DollarSign,
  RefreshCw,
} from 'lucide-react';
import { useSimulator, SavedPlan } from './SimulatorContext';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { SEALED_TYPES } from '@/components/budget/types';

const ERA_NAMES = {
  vintage: 'Vintage',
  classic: 'Classic',
  modern: 'Modern',
  ultraModern: 'Growth',
  current: 'Current',
};

export default function SimulatorPlans() {
  const { 
    state, 
    setState,
    healthScore,
    topLevelValid, 
    eraValid,
    gradedValid,
    sealedValid,
    rawValid,
    totalInvested,
    yearlySpend,
    savePlan,
    loadPlan,
    deletePlan,
  } = useSimulator();

  const [newPlanName, setNewPlanName] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedPlans, setSelectedPlans] = useState<string[]>([]);

  const allValid = topLevelValid && eraValid;

  const handleSave = () => {
    if (!newPlanName.trim()) {
      toast({ title: 'Please enter a plan name', variant: 'destructive' });
      return;
    }
    savePlan(newPlanName.trim());
    setNewPlanName('');
    setShowSaveForm(false);
    toast({ title: 'Plan saved successfully!' });
  };

  const handleLoad = (id: string) => {
    loadPlan(id);
    toast({ title: 'Plan loaded!' });
  };

  const handleDelete = (id: string) => {
    deletePlan(id);
    setSelectedPlans(prev => prev.filter(p => p !== id));
    toast({ title: 'Plan deleted' });
  };

  const handleCreateNew = () => {
    // Reset to default state
    setState(prev => ({
      ...prev,
      monthlyBudget: 500,
      timeHorizon: 12,
      preset: 'balanced',
      topLevel: { sealed: 45, graded: 35, raw: 20 },
      graded: { entry: 25, core: 35, highConviction: 25, grail: 15 },
      raw: { grading: 40, holding: 30, flipping: 20, personal: 10 },
      era: { vintage: 20, classic: 20, modern: 20, ultraModern: 30, current: 10 },
    }));
    toast({ title: 'New plan created! Start customizing your allocations.' });
  };

  const togglePlanSelection = (id: string) => {
    setSelectedPlans(prev => 
      prev.includes(id) 
        ? prev.filter(p => p !== id)
        : prev.length < 2 ? [...prev, id] : [prev[1], id]
    );
  };

  const handleExport = () => {
    const summary = `
PokeIQ Portfolio Plan
=====================
Generated: ${new Date().toLocaleDateString()}

Budget: $${state.monthlyBudget}/month
Time Horizon: ${state.timeHorizon} months
Total Planned Investment: $${totalInvested.toLocaleString()}

Asset Allocation:
- Sealed: ${state.topLevel.sealed}%
- Graded: ${state.topLevel.graded}%
- Raw: ${state.topLevel.raw}%

Era Allocation:
- Vintage (1996-2002): ${state.era.vintage}%
- Classic (2003-2010): ${state.era.classic}%
- Modern (2011-2016): ${state.era.modern}%
- Growth (2017-2022): ${state.era.ultraModern}%
- Current (2023+): ${state.era.current}%

Simulated Health Score: ${healthScore.overall}/100
    `.trim();

    const blob = new Blob([summary], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pokeiq-portfolio-plan.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({ title: 'Plan exported!' });
  };

  const comparisonPlans = state.savedPlans.filter(p => selectedPlans.includes(p.id));
  const canCompare = state.savedPlans.length >= 2;

  // Calculate yearly spend by asset type
  const sealedYearly = Math.round(yearlySpend * (state.topLevel.sealed / 100));
  const gradedYearly = Math.round(yearlySpend * (state.topLevel.graded / 100));
  const rawYearly = Math.round(yearlySpend * (state.topLevel.raw / 100));

  // Calculate yearly spend by era
  const getEraYearly = (eraPercent: number) => Math.round(yearlySpend * (eraPercent / 100));

  return (
    <div className="space-y-6">
      {/* Header with Compare Button Always Visible */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs gap-1">
              <Sparkles className="w-3 h-3" />
              Simulated
            </Badge>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Save & Compare Plans</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Save multiple allocation plans and compare them side-by-side to find your ideal strategy
          </p>
        </div>
        <div className="flex gap-2">
          {/* Compare button always visible, disabled until 2 plans */}
          <Button 
            variant={compareMode ? 'default' : 'outline'} 
            size="sm"
            onClick={() => {
              if (canCompare) {
                setCompareMode(!compareMode);
                setSelectedPlans([]);
              }
            }}
            disabled={!canCompare}
            className="gap-1"
          >
            {compareMode ? 'Exit Compare' : 'Compare 2 Plans'}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExport}
            disabled={!allValid}
            className="gap-1"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Current Plan with Detailed Breakdown */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Save className="w-4 h-4 text-primary" />
            Current Plan
          </h2>
          <Button variant="outline" size="sm" onClick={handleCreateNew} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Create New Plan
          </Button>
        </div>
        
        {!allValid && (
          <p className="text-sm text-muted-foreground mb-4">
            Complete your allocations to save this plan.
          </p>
        )}

        {allValid && (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid md:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-secondary/50">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <DollarSign className="w-3 h-3" />
                  <span className="text-xs">Monthly</span>
                </div>
                <p className="font-bold text-foreground">${state.monthlyBudget.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Calendar className="w-3 h-3" />
                  <span className="text-xs">Time Horizon</span>
                </div>
                <p className="font-bold text-foreground">{state.timeHorizon} months</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Shield className="w-3 h-3" />
                  <span className="text-xs">Health Score</span>
                </div>
                <p className={cn(
                  'font-bold',
                  healthScore.overall >= 75 && 'text-success',
                  healthScore.overall >= 65 && healthScore.overall < 75 && 'text-warning',
                  healthScore.overall < 65 && 'text-destructive',
                )}>
                  {healthScore.overall}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <FileText className="w-3 h-3" />
                  <span className="text-xs">Yearly Total</span>
                </div>
                <p className="font-bold text-foreground">${yearlySpend.toLocaleString()}</p>
              </div>
            </div>

            {/* Asset Type Breakdown */}
            <div>
              <h3 className="text-sm font-medium text-foreground mb-3">Asset Allocation (Yearly Spend)</h3>
              <div className="grid md:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg border border-border">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Sealed</span>
                    <span className="text-sm font-medium text-foreground">{state.topLevel.sealed}%</span>
                  </div>
                  <p className="text-lg font-bold text-foreground">${sealedYearly.toLocaleString()}/yr</p>
                </div>
                <div className="p-3 rounded-lg border border-border">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Graded</span>
                    <span className="text-sm font-medium text-foreground">{state.topLevel.graded}%</span>
                  </div>
                  <p className="text-lg font-bold text-foreground">${gradedYearly.toLocaleString()}/yr</p>
                </div>
                <div className="p-3 rounded-lg border border-border">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Raw</span>
                    <span className="text-sm font-medium text-foreground">{state.topLevel.raw}%</span>
                  </div>
                  <p className="text-lg font-bold text-foreground">${rawYearly.toLocaleString()}/yr</p>
                </div>
              </div>
            </div>

            {/* Era Breakdown */}
            <div>
              <h3 className="text-sm font-medium text-foreground mb-3">Era Allocation (Yearly Spend)</h3>
              <div className="grid md:grid-cols-5 gap-2">
                {Object.entries(state.era).map(([key, percent]) => (
                  <div key={key} className="p-3 rounded-lg border border-border">
                    <span className="text-xs text-muted-foreground">{ERA_NAMES[key as keyof typeof ERA_NAMES]}</span>
                    <p className="text-sm font-bold text-foreground">{percent}%</p>
                    <p className="text-xs text-muted-foreground">${getEraYearly(percent).toLocaleString()}/yr</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Save Form */}
            {showSaveForm ? (
              <div className="flex gap-2 pt-4 border-t border-border">
                <Input
                  placeholder="Plan name (e.g., 'Vintage Focus')"
                  value={newPlanName}
                  onChange={(e) => setNewPlanName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                />
                <Button onClick={handleSave}>Save</Button>
                <Button variant="ghost" onClick={() => setShowSaveForm(false)}>Cancel</Button>
              </div>
            ) : (
              <Button onClick={() => setShowSaveForm(true)} className="gap-2">
                <Save className="w-4 h-4" />
                Save This Plan
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* Saved Plans */}
      {state.savedPlans.length > 0 && (
        <Card className="p-5">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Saved Plans ({state.savedPlans.length})
          </h2>
          
          {compareMode && (
            <p className="text-sm text-muted-foreground mb-4">
              Select 2 plans to compare side-by-side
            </p>
          )}

          <div className="space-y-3">
            {state.savedPlans.map((plan, index) => {
              // Calculate health score for saved plan
              const olderEra = plan.state.era.vintage + plan.state.era.classic;
              const planYearly = plan.state.monthlyBudget * 12;
              
              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    'p-4 rounded-lg border border-border flex items-center justify-between',
                    compareMode && 'cursor-pointer hover:border-primary/50',
                    selectedPlans.includes(plan.id) && 'border-primary bg-primary/5'
                  )}
                  onClick={() => compareMode && togglePlanSelection(plan.id)}
                >
                  <div className="flex items-center gap-4">
                    {compareMode && (
                      <div className={cn(
                        'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                        selectedPlans.includes(plan.id) 
                          ? 'border-primary bg-primary' 
                          : 'border-muted-foreground'
                      )}>
                        {selectedPlans.includes(plan.id) && (
                          <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                        )}
                      </div>
                    )}
                    <div>
                      <h3 className="font-medium text-foreground">{plan.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        ${plan.state.monthlyBudget}/mo • {plan.state.timeHorizon} months • 
                        ${planYearly.toLocaleString()}/yr
                      </p>
                    </div>
                  </div>
                  {!compareMode && (
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleLoad(plan.id)} className="gap-1">
                        <FileText className="w-4 h-4" />
                        Edit Plan
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(plan.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Comparison View */}
      {compareMode && comparisonPlans.length === 2 && (
        <Card className="p-5 border-primary/30">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            Side-by-Side Plan Comparison
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {comparisonPlans.map(plan => {
              const planYearly = plan.state.monthlyBudget * 12;
              const olderEra = plan.state.era.vintage + plan.state.era.classic;
              
              return (
                <div key={plan.id} className="space-y-4">
                  <h3 className="font-semibold text-foreground border-b border-border pb-2">
                    {plan.name}
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Monthly Budget</span>
                      <span className="text-foreground">${plan.state.monthlyBudget.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Time Horizon</span>
                      <span className="text-foreground">{plan.state.timeHorizon} months</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Yearly Spend</span>
                      <span className="text-foreground">${planYearly.toLocaleString()}</span>
                    </div>
                    <div className="pt-2 border-t border-border">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Asset Allocation</p>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Sealed</span>
                        <span className="text-foreground">{plan.state.topLevel.sealed}% (${Math.round(planYearly * plan.state.topLevel.sealed / 100).toLocaleString()}/yr)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Graded</span>
                        <span className="text-foreground">{plan.state.topLevel.graded}% (${Math.round(planYearly * plan.state.topLevel.graded / 100).toLocaleString()}/yr)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Raw</span>
                        <span className="text-foreground">{plan.state.topLevel.raw}% (${Math.round(planYearly * plan.state.topLevel.raw / 100).toLocaleString()}/yr)</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-border">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Era Allocation</p>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Older Era (Vintage + Classic)</span>
                        <span className="text-foreground">{olderEra}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Newer Era (Modern+)</span>
                        <span className="text-foreground">
                          {plan.state.era.modern + plan.state.era.ultraModern + plan.state.era.current}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Empty State */}
      {state.savedPlans.length === 0 && (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">No Saved Plans</h2>
          <p className="text-muted-foreground max-w-md mx-auto mb-4">
            Create different allocation strategies and save them to compare later.
          </p>
          <p className="text-xs text-muted-foreground">
            Save at least 2 plans to enable the comparison feature.
          </p>
        </Card>
      )}
    </div>
  );
}
