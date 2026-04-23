import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { 
  Sparkles, 
  RotateCcw, 
  Wand2, 
  AlertTriangle,
  CheckCircle2,
  Shield,
  TrendingUp,
  Clock,
  ChevronDown,
  ChevronUp,
  Layers,
} from 'lucide-react';
import { useSimulator, EraAllocation, ERA_SETS } from './SimulatorContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { cn } from '@/lib/utils';

const ERA_CONFIG = [
  { id: 'vintage', name: 'Vintage', years: '1999–2003', color: 'hsl(38, 92%, 50%)', risk: 'Older Era' },
  { id: 'classic', name: 'Classic', years: '2003–2011', color: 'hsl(262, 83%, 58%)', risk: 'Older Era' },
  { id: 'modern', name: 'Mid Modern', years: '2011–2017', color: 'hsl(221, 83%, 53%)', risk: 'Newer Era' },
  { id: 'ultraModern', name: 'Modern', years: '2017–2023', color: 'hsl(142, 71%, 45%)', risk: 'Newer Era' },
  { id: 'current', name: 'Current', years: '2023–Present', color: 'hsl(340, 82%, 52%)', risk: 'Newer Era' },
] as const;

export default function SimulatorEras() {
  const { 
    state, 
    setState, 
    eraValid, 
    healthScore, 
    yearlySpend,
    updateSetAllocation,
    normalizeSetAllocation,
    getSetAllocationTotal,
  } = useSimulator();
  const [lastValidEra, setLastValidEra] = useState<EraAllocation | null>(null);
  const [expandedEra, setExpandedEra] = useState<string | null>(null);

  const eraTotal = Object.values(state.era).reduce((s, v) => s + v, 0);

  // Update last valid state when it becomes valid
  useEffect(() => {
    if (eraValid) setLastValidEra({ ...state.era });
  }, [eraValid, state.era]);

  const handleEraChange = (id: keyof EraAllocation, value: number) => {
    setState(prev => ({
      ...prev,
      era: { ...prev.era, [id]: value },
      preset: 'custom',
    }));
  };

  const normalizeToHundred = () => {
    const total = Object.values(state.era).reduce((s, v) => s + v, 0);
    if (total === 0) {
      setState(prev => ({
        ...prev,
        era: { vintage: 20, classic: 20, modern: 20, ultraModern: 20, current: 20 },
      }));
      return;
    }
    const ratio = 100 / total;
    const keys: (keyof EraAllocation)[] = ['vintage', 'classic', 'modern', 'ultraModern', 'current'];
    let assigned = 0;
    const result: EraAllocation = { vintage: 0, classic: 0, modern: 0, ultraModern: 0, current: 0 };
    keys.forEach((k, i) => {
      if (i === keys.length - 1) {
        result[k] = 100 - assigned;
      } else {
        result[k] = Math.round(state.era[k] * ratio);
        assigned += result[k];
      }
    });
    setState(prev => ({
      ...prev,
      era: result,
      preset: 'custom',
    }));
  };

  const resetEra = () => {
    if (lastValidEra) {
      setState(prev => ({ ...prev, era: lastValidEra }));
    }
  };

  // Scroll to era when expanded
  useEffect(() => {
    if (expandedEra) {
      const element = document.getElementById(`era-${expandedEra}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [expandedEra]);

  // Prepare pie chart data
  const pieData = ERA_CONFIG.map(era => ({
    name: era.name,
    id: era.id,
    value: state.era[era.id as keyof EraAllocation],
    color: era.color,
  })).filter(d => d.value > 0);

  // Calculate category totals
  const olderEra = state.era.vintage + state.era.classic;
  const newerEra = state.era.modern + state.era.ultraModern + state.era.current;

  const toggleEra = (eraId: string) => {
    setExpandedEra(prev => prev === eraId ? null : eraId);
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
        <h1 className="text-2xl font-bold text-foreground">Era Allocation</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Plan when your capital lives across Pokémon eras. Click an era to drill down into specific sets.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Panel - Sliders */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-5">
            {/* Validation Banner */}
            {!eraValid && (
              <div className={cn(
                'mb-4 p-3 rounded-lg flex items-center justify-between',
                'bg-warning/10 border border-warning/30'
              )}>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  <span className="text-sm text-warning">
                    Total: {eraTotal}% — {eraTotal < 100 ? `Add ${100 - eraTotal}%` : `Remove ${eraTotal - 100}%`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={normalizeToHundred} className="gap-1 text-xs">
                    <Wand2 className="w-3 h-3" />
                    Normalize
                  </Button>
                  {lastValidEra && (
                    <Button variant="ghost" size="sm" onClick={resetEra} className="gap-1 text-xs">
                      <RotateCcw className="w-3 h-3" />
                      Reset
                    </Button>
                  )}
                </div>
              </div>
            )}

            {eraValid && (
              <div className="mb-4 p-3 rounded-lg bg-success/10 border border-success/30 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success" />
                <span className="text-sm text-success">Era allocation totals 100%</span>
              </div>
            )}

            {/* Era Sliders with drill down */}
            <div className="space-y-3">
              {ERA_CONFIG.map(era => {
                const value = state.era[era.id as keyof EraAllocation];
                const monthlyAmount = eraValid ? Math.round(state.monthlyBudget * (value / 100)) : 0;
                const yearlyAmount = monthlyAmount * 12;
                const isExpanded = expandedEra === era.id;
                const sets = ERA_SETS[era.id as keyof EraAllocation];
                const setTotal = getSetAllocationTotal(era.id as keyof EraAllocation);
                const setValid = setTotal === 100;

                return (
                  <div 
                    key={era.id} 
                    className={cn(
                      "rounded-lg border bg-card/50 transition-all overflow-hidden",
                      isExpanded ? "border-primary ring-2 ring-primary/20" : "border-border"
                    )}
                    id={`era-${era.id}`}
                  >
                    {/* Era Header */}
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: era.color }} 
                          />
                          <button
                            onClick={() => toggleEra(era.id)}
                            className="flex items-center gap-2 hover:text-primary transition-colors text-left"
                          >
                            <div>
                              <span className="text-sm font-medium text-foreground">{era.name}</span>
                              <span className="text-xs text-muted-foreground ml-2">{era.years}</span>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            )}
                          </button>
                        </div>
                        <div className="text-right flex items-center gap-2">
                          <input
                            type="number"
                            value={value}
                            onChange={(e) => {
                              const newValue = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                              handleEraChange(era.id as keyof EraAllocation, newValue);
                            }}
                            className="w-14 text-sm font-bold text-right bg-transparent border border-border rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary"
                            style={{ color: era.color }}
                            min={0}
                            max={100}
                          />
                          <span className="text-sm font-bold" style={{ color: era.color }}>%</span>
                          <Badge
                            variant="outline" 
                            className={cn(
                              'text-xs',
                              era.risk === 'Older Era' && 'border-success/50 text-success',
                              era.risk === 'Newer Era' && 'border-primary/50 text-primary',
                            )}
                          >
                            {era.risk}
                          </Badge>
                        </div>
                      </div>
                      <Slider
                        value={[value]}
                        onValueChange={([v]) => handleEraChange(era.id as keyof EraAllocation, v)}
                        min={0}
                        max={100}
                        step={5}
                        className="mb-2"
                      />
                      {eraValid && (
                        <div className="flex justify-between text-xs text-muted-foreground mt-2 ml-5">
                          <span>${monthlyAmount.toLocaleString()}/mo</span>
                          <span>${yearlyAmount.toLocaleString()}/yr</span>
                        </div>
                      )}
                      <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        <span>{sets.length} sets</span>
                        {!isExpanded && (
                          <span className="ml-1">• Click to drill down</span>
                        )}
                      </div>
                    </div>

                    {/* Expanded Set Sliders */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 pt-2 border-t border-border bg-muted/30">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                                <Layers className="w-4 h-4 text-primary" />
                                Set Allocation within {era.name}
                              </h4>
                              {!setValid && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => normalizeSetAllocation(era.id as keyof EraAllocation)}
                                  className="gap-1 text-xs"
                                >
                                  <Wand2 className="w-3 h-3" />
                                  Normalize ({setTotal}%)
                                </Button>
                              )}
                              {setValid && (
                                <Badge variant="outline" className="text-xs text-success border-success/50">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  100%
                                </Badge>
                              )}
                            </div>

                            <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                              {sets.map(setName => {
                                const setAllocation = state.eraSets[era.id as keyof EraAllocation][setName] || 0;
                                const setYearly = eraValid && setValid 
                                  ? Math.round(yearlyAmount * (setAllocation / 100))
                                  : 0;

                                return (
                                  <div key={setName} className="bg-background/50 p-3 rounded-lg">
                                    <div className="flex justify-between items-center mb-2">
                                      <span className="text-xs font-medium text-foreground truncate max-w-[180px]">
                                        {setName}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="number"
                                          value={setAllocation}
                                          onChange={(e) => {
                                            const newValue = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                                            updateSetAllocation(era.id as keyof EraAllocation, setName, newValue);
                                          }}
                                          className="w-12 text-xs font-bold text-right bg-transparent border border-border rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary"
                                          style={{ color: era.color }}
                                          min={0}
                                          max={100}
                                        />
                                        <span className="text-xs font-bold" style={{ color: era.color }}>%</span>
                                        {eraValid && setValid && setYearly > 0 && (
                                          <span className="text-xs text-muted-foreground">
                                            ${setYearly.toLocaleString()}/yr
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <Slider
                                      value={[setAllocation]}
                                      onValueChange={([v]) => updateSetAllocation(era.id as keyof EraAllocation, setName, v)}
                                      min={0}
                                      max={100}
                                      step={5}
                                      className="h-1.5"
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right Panel - Chart & Summary */}
        <div className="space-y-4">
          {/* Pie Chart - Clickable */}
          <Card className="p-5">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Era Distribution
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={eraValid ? pieData : [{ name: 'Incomplete', value: 100, color: 'hsl(var(--muted))' }]}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    dataKey="value"
                    stroke="none"
                    onClick={(data) => {
                      if (eraValid && data && data.id) {
                        toggleEra(data.id);
                      }
                    }}
                    style={{ cursor: eraValid ? 'pointer' : 'default' }}
                  >
                    {(eraValid ? pieData : [{ color: 'hsl(var(--muted))' }]).map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color}
                        className="hover:opacity-80 transition-opacity"
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`${value}%`, 'Allocation']}
                    contentStyle={{ 
                      background: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Click chart sections to drill down into sets
            </p>
            {eraValid && (
              <div className="mt-4 space-y-2">
                {ERA_CONFIG.map(era => {
                  const value = state.era[era.id as keyof EraAllocation];
                  if (value === 0) return null;
                  const isExpanded = expandedEra === era.id;
                  return (
                    <div 
                      key={era.id} 
                      className={cn(
                        "flex items-center justify-between text-sm cursor-pointer p-1.5 rounded transition-colors",
                        isExpanded ? "bg-primary/10" : "hover:bg-muted/50"
                      )}
                      onClick={() => toggleEra(era.id)}
                    >
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: era.color }} 
                        />
                        <span className={cn(
                          "text-muted-foreground",
                          isExpanded && "text-foreground font-medium"
                        )}>
                          {era.name}
                        </span>
                        {isExpanded && <ChevronUp className="w-3 h-3 text-primary" />}
                      </div>
                      <span className="font-medium text-foreground">{value}%</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Risk Summary */}
          <Card className="p-5">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Risk Profile
            </h3>
            {eraValid ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Older Era (Vintage + Classic)</span>
                  <span className={cn(
                    'text-sm font-medium',
                    olderEra >= 30 ? 'text-success' : 'text-warning'
                  )}>
                    {olderEra}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Newer Era (Mid Modern to Present)</span>
                  <span className={cn(
                    'text-sm font-medium',
                    newerEra <= 60 ? 'text-success' : 'text-warning'
                  )}>
                    {newerEra}%
                  </span>
                </div>
                <div className="pt-3 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Era Health Score</span>
                    <span className={cn(
                      'text-lg font-bold',
                      healthScore.era >= 75 && 'text-success',
                      healthScore.era >= 60 && healthScore.era < 75 && 'text-warning',
                      healthScore.era < 60 && 'text-destructive',
                    )}>
                      {healthScore.era}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Complete era allocation to see risk profile
              </p>
            )}
          </Card>

          {/* Yearly Breakdown */}
          {eraValid && (
            <Card className="p-5">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Yearly Spend by Era
              </h3>
              <div className="space-y-2">
                {ERA_CONFIG.map(era => {
                  const value = state.era[era.id as keyof EraAllocation];
                  const yearlyAmount = Math.round(yearlySpend * (value / 100));
                  if (value === 0) return null;
                  return (
                    <div key={era.id} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{era.name}</span>
                      <span className="font-medium text-foreground">
                        ${yearlyAmount.toLocaleString()}/yr
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}