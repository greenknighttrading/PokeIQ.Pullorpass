import React, { useCallback } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Sector } from 'recharts';
import { Card } from '@/components/ui/card';
import { Package, Award, Layers, ChevronRight } from 'lucide-react';
import { AllocationSlider } from './AllocationSlider';
import { ValidationBanner } from './ValidationBanner';
import { TOP_LEVEL_COLORS } from './types';

interface TopLevelAllocationProps {
  sealed: number;
  graded: number;
  raw: number;
  monthlyBudget: number;
  onSealedChange: (v: number) => void;
  onGradedChange: (v: number) => void;
  onRawChange: (v: number) => void;
  onNormalize: () => void;
  onReset: () => void;
  onDrillDown: (category: 'sealed' | 'graded' | 'raw') => void;
  lastValidState: { sealed: number; graded: number; raw: number } | null;
}

export function TopLevelAllocation({
  sealed,
  graded,
  raw,
  monthlyBudget,
  onSealedChange,
  onGradedChange,
  onRawChange,
  onNormalize,
  onReset,
  onDrillDown,
  lastValidState,
}: TopLevelAllocationProps) {
  const total = sealed + graded + raw;
  const isValid = total === 100;

  const chartData = isValid
    ? [
        { name: 'Sealed', value: sealed },
        { name: 'Graded', value: graded },
        { name: 'Raw', value: raw },
      ]
    : lastValidState
    ? [
        { name: 'Sealed', value: lastValidState.sealed },
        { name: 'Graded', value: lastValidState.graded },
        { name: 'Raw', value: lastValidState.raw },
      ]
    : [
        { name: 'Sealed', value: 34 },
        { name: 'Graded', value: 33 },
        { name: 'Raw', value: 33 },
      ];

  const colors = [TOP_LEVEL_COLORS.sealed, TOP_LEVEL_COLORS.graded, TOP_LEVEL_COLORS.raw];

  const calcMonthly = (pct: number) => isValid ? Math.round(monthlyBudget * (pct / 100)) : 0;
  const calcYearly = (pct: number) => isValid ? Math.round(monthlyBudget * 12 * (pct / 100)) : 0;

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Package className="w-5 h-5 text-primary" />
        <h2 className="font-bold text-lg text-foreground">Top-Level Allocation</h2>
      </div>

      <ValidationBanner
        total={total}
        onNormalize={onNormalize}
        onReset={onReset}
        label="Top-level"
      />

      {/* Pie Chart - Clickable */}
      <div className="h-56 my-4">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={2}
              dataKey="value"
              onClick={(data, index) => {
                const categories: ('sealed' | 'graded' | 'raw')[] = ['sealed', 'graded', 'raw'];
                onDrillDown(categories[index]);
              }}
              style={{ cursor: 'pointer' }}
            >
              {chartData.map((_, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={colors[index]} 
                  className="hover:opacity-80 transition-opacity"
                />
              ))}
            </Pie>
            <Tooltip formatter={(value) => `${value}%`} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-muted-foreground text-center mb-4">
        Click on chart sections to drill down
      </p>

      {/* Category Cards */}
      <div className="space-y-3">
        <div 
          className="cursor-pointer hover:bg-muted/50 rounded-lg transition-colors"
          onClick={() => onDrillDown('sealed')}
        >
          <div className="flex items-center justify-between p-2">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4" style={{ color: TOP_LEVEL_COLORS.sealed }} />
              <span className="text-sm font-medium">Sealed</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
          <AllocationSlider
            name=""
            value={sealed}
            color={TOP_LEVEL_COLORS.sealed}
            onChange={onSealedChange}
            monthlyAmount={calcMonthly(sealed)}
            yearlyAmount={calcYearly(sealed)}
            disabled={false}
          />
        </div>

        <div 
          className="cursor-pointer hover:bg-muted/50 rounded-lg transition-colors"
          onClick={() => onDrillDown('graded')}
        >
          <div className="flex items-center justify-between p-2">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4" style={{ color: TOP_LEVEL_COLORS.graded }} />
              <span className="text-sm font-medium">Graded</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
          <AllocationSlider
            name=""
            value={graded}
            color={TOP_LEVEL_COLORS.graded}
            onChange={onGradedChange}
            monthlyAmount={calcMonthly(graded)}
            yearlyAmount={calcYearly(graded)}
            disabled={false}
          />
        </div>

        <div 
          className="cursor-pointer hover:bg-muted/50 rounded-lg transition-colors"
          onClick={() => onDrillDown('raw')}
        >
          <div className="flex items-center justify-between p-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4" style={{ color: TOP_LEVEL_COLORS.raw }} />
              <span className="text-sm font-medium">Raw</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
          <AllocationSlider
            name=""
            value={raw}
            color={TOP_LEVEL_COLORS.raw}
            onChange={onRawChange}
            monthlyAmount={calcMonthly(raw)}
            yearlyAmount={calcYearly(raw)}
            disabled={false}
          />
        </div>
      </div>
    </Card>
  );
}
