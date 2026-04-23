import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Package, Award, Layers } from 'lucide-react';
import { AllocationSlider } from './AllocationSlider';
import { ValidationBanner } from './ValidationBanner';
import { GRADED_TIERS, RAW_INTENTS, SEALED_TYPES, TOP_LEVEL_COLORS } from './types';

interface DrillDownPanelProps {
  category: 'sealed' | 'graded' | 'raw';
  allocations: Record<string, number>;
  categoryBudget: number;
  topLevelValid: boolean;
  onAllocationChange: (id: string, value: number) => void;
  onNormalize: () => void;
  onReset: () => void;
  onBack: () => void;
  lastValidState: Record<string, number> | null;
}

export function DrillDownPanel({
  category,
  allocations,
  categoryBudget,
  topLevelValid,
  onAllocationChange,
  onNormalize,
  onReset,
  onBack,
  lastValidState,
}: DrillDownPanelProps) {
  const items = category === 'graded' ? GRADED_TIERS : category === 'raw' ? RAW_INTENTS : SEALED_TYPES;
  const total = Object.values(allocations).reduce((sum, v) => sum + v, 0);
  const isValid = total === 100;
  const canCalculate = isValid && topLevelValid;

  const chartData = isValid
    ? items.map((item) => ({ name: item.name, value: allocations[item.id] || 0 }))
    : lastValidState
    ? items.map((item) => ({ name: item.name, value: lastValidState[item.id] || 0 }))
    : items.map((item, i) => ({ name: item.name, value: Math.round(100 / items.length) }));

  const colors = items.map((item) => item.color);

  const calcMonthly = (pct: number) => canCalculate ? Math.round(categoryBudget * (pct / 100)) : 0;
  const calcYearly = (pct: number) => canCalculate ? Math.round(categoryBudget * 12 * (pct / 100)) : 0;

  const getCategoryIcon = () => {
    switch (category) {
      case 'sealed': return <Package className="w-5 h-5" style={{ color: TOP_LEVEL_COLORS.sealed }} />;
      case 'graded': return <Award className="w-5 h-5" style={{ color: TOP_LEVEL_COLORS.graded }} />;
      case 'raw': return <Layers className="w-5 h-5" style={{ color: TOP_LEVEL_COLORS.raw }} />;
    }
  };

  const getCategoryTitle = () => {
    switch (category) {
      case 'sealed': return 'Sealed Product Types';
      case 'graded': return 'Graded Price Tiers';
      case 'raw': return 'Raw Card Intents';
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        {getCategoryIcon()}
        <div>
          <h2 className="font-bold text-lg text-foreground">{getCategoryTitle()}</h2>
          <p className="text-xs text-muted-foreground">
            Monthly Budget: ${categoryBudget.toLocaleString()}
          </p>
        </div>
      </div>

      <ValidationBanner
        total={total}
        onNormalize={onNormalize}
        onReset={onReset}
        label={category.charAt(0).toUpperCase() + category.slice(1)}
      />

      {!topLevelValid && (
        <div className="mt-2 p-2 rounded bg-muted/50 text-xs text-muted-foreground">
          Set top-level allocation to 100% to enable budget calculations.
        </div>
      )}

      {/* Pie Chart */}
      <div className="h-64 my-4">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={1}
              dataKey="value"
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => `${value}%`} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Sliders */}
      <div className={`space-y-2 max-h-[400px] overflow-y-auto pr-2 ${category === 'sealed' ? 'space-y-2' : 'space-y-3'}`}>
        {items.map((item) => (
          <AllocationSlider
            key={item.id}
            name={item.name}
            value={allocations[item.id] || 0}
            color={item.color}
            description={item.description}
            range={'range' in item ? (item as any).range : undefined}
            onChange={(v) => onAllocationChange(item.id, v)}
            monthlyAmount={canCalculate ? calcMonthly(allocations[item.id] || 0) : undefined}
            yearlyAmount={canCalculate ? calcYearly(allocations[item.id] || 0) : undefined}
            disabled={false}
          />
        ))}
      </div>
    </Card>
  );
}
