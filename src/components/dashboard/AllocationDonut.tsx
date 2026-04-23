import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { ALLOCATION_PRESETS, AllocationPreset } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown, Check } from 'lucide-react';

const COLORS = {
  sealed: 'hsl(168, 50%, 45%)',
  slabs: 'hsl(45, 80%, 55%)',
  rawCards: 'hsl(280, 60%, 55%)',
};

const TARGET_COLORS = {
  sealed: 'hsl(168, 50%, 45%, 0.25)',
  slabs: 'hsl(45, 80%, 55%, 0.25)',
  rawCards: 'hsl(280, 60%, 55%, 0.25)',
};

export function AllocationDonut() {
  const { allocation, allocationTarget, allocationPreset, setAllocationPreset } = usePortfolio();
  const navigate = useNavigate();

  if (!allocation) return null;

  const data = [
    { 
      name: 'Sealed', 
      key: 'sealed',
      value: allocation.sealed.percent, 
      target: allocationTarget.sealed,
      amount: allocation.sealed.value,
      color: COLORS.sealed,
    },
    { 
      name: 'Slabs', 
      key: 'slabs',
      value: allocation.slabs.percent, 
      target: allocationTarget.slabs,
      amount: allocation.slabs.value,
      color: COLORS.slabs,
    },
    { 
      name: 'Raw Cards', 
      key: 'rawCards',
      value: allocation.rawCards.percent, 
      target: allocationTarget.rawCards,
      amount: allocation.rawCards.value,
      color: COLORS.rawCards,
    },
  ];

  const presets: { key: AllocationPreset; label: string }[] = [
    { key: 'conservative', label: 'Conservative' },
    { key: 'balanced', label: 'Balanced' },
    { key: 'aggressive', label: 'Aggressive' },
  ];

  const handleSliceClick = (entry: typeof data[0]) => {
    navigate(`/items?type=asset&value=${entry.key}`);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const item = payload[0].payload;
    
    return (
      <div className="glass-card px-3 py-2 text-sm">
        <p className="font-medium text-foreground">{item.name}</p>
        <p className="text-muted-foreground">
          {item.value?.toFixed(1)}%
          {item.amount && ` • $${item.amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
        </p>
        {item.target !== undefined && (
          <p className="text-xs text-muted-foreground mt-1">
            Target: {item.target}%
          </p>
        )}
        <p className="text-xs text-primary mt-1">Click to view items</p>
      </div>
    );
  };

  const getDiffStatus = (value: number, target: number) => {
    const diff = value - target;
    if (Math.abs(diff) <= 5) return { status: 'on-target', diff: 0 };
    return { status: diff > 0 ? 'over' : 'under', diff };
  };

  return (
    <div className="glass-card p-4 sm:p-6 animate-fade-in stagger-2" style={{ opacity: 0 }}>
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className="text-base sm:text-lg font-semibold text-foreground">My Allocation Breakdown</h2>
      </div>

      {/* Preset Selector */}
      <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wider">Target Allocation</p>
      <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4">
        {presets.map((preset) => (
          <button
            key={preset.key}
            onClick={() => setAllocationPreset(preset.key)}
            className={cn(
              "px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200",
              allocationPreset === preset.key
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Donut Chart with Target Ring */}
      <div className="flex justify-center mb-4">
        <div className="h-44 w-44 sm:h-52 sm:w-52 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              {/* Outer ring: Target allocation (lighter) - animates smoothly on preset change */}
              <Pie
                data={[
                  { name: 'Sealed', value: allocationTarget.sealed, color: TARGET_COLORS.sealed },
                  { name: 'Slabs', value: allocationTarget.slabs, color: TARGET_COLORS.slabs },
                  { name: 'Raw Cards', value: allocationTarget.rawCards, color: TARGET_COLORS.rawCards },
                ]}
                cx="50%"
                cy="50%"
                innerRadius="75%"
                outerRadius="95%"
                paddingAngle={2}
                dataKey="value"
                stroke="none"
                animationBegin={0}
                animationDuration={500}
                animationEasing="ease-out"
              >
                {[TARGET_COLORS.sealed, TARGET_COLORS.slabs, TARGET_COLORS.rawCards].map((color, index) => (
                  <Cell key={`target-${index}`} fill={color} />
                ))}
              </Pie>
              {/* Inner ring: Actual allocation - static, no animation on preset change */}
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius="45%"
                outerRadius="70%"
                paddingAngle={2}
                dataKey="value"
                stroke="none"
                onClick={(_, index) => handleSliceClick(data[index])}
                cursor="pointer"
                isAnimationActive={false}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color}
                    className="hover:opacity-80 transition-opacity"
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Actual</p>
            <p className="text-xs font-medium text-foreground">vs Target</p>
          </div>
        </div>
      </div>

      {/* Legend Below */}
      <div className="space-y-2">
        {data.map((item) => {
          const { status, diff } = getDiffStatus(item.value, item.target);
          
          return (
            <button
              key={item.name}
              onClick={() => handleSliceClick(item)}
              className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm font-medium text-foreground">{item.name}</span>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold tabular-nums text-foreground">
                  {item.value.toFixed(1)}%
                </span>
                
                {status === 'on-target' ? (
                  <span className="flex items-center gap-1 text-xs text-success min-w-[70px] justify-end">
                    <Check className="w-3 h-3" />
                    <span>on target</span>
                  </span>
                ) : status === 'over' ? (
                  <span className="flex items-center gap-1 text-xs text-warning min-w-[70px] justify-end">
                    <ArrowUp className="w-3 h-3" />
                    <span>+{diff.toFixed(1)}%</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground min-w-[70px] justify-end">
                    <ArrowDown className="w-3 h-3" />
                    <span>{diff.toFixed(1)}%</span>
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
      
      {/* Allocation Insight */}
      {(() => {
        const offTargetItems = data.filter(item => Math.abs(item.value - item.target) > 5);
        const mostOverweight = data.reduce((max, item) => (item.value - item.target) > (max.value - max.target) ? item : max, data[0]);
        const mostUnderweight = data.reduce((min, item) => (item.value - item.target) < (min.value - min.target) ? item : min, data[0]);
        
        if (offTargetItems.length === 0) {
          return (
          <div className="mt-4 pt-4 border-t border-border">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2">
              💡 Allocation Insight
            </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your portfolio is well-aligned with your <span className="font-semibold text-foreground">{allocationPreset}</span> target allocation. All asset classes are within <span className="font-semibold text-foreground">5%</span> of their targets. Select a different target above to see how your mix compares.
              </p>
            </div>
          );
        }
        
        const overDiff = mostOverweight.value - mostOverweight.target;
        const underDiff = mostUnderweight.target - mostUnderweight.value;
        
        return (
          <div className="mt-4 pt-4 border-t border-border">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2">
              💡 Allocation Insight
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {overDiff > 5 && (
                <>You're <span className="font-semibold text-foreground">{overDiff.toFixed(0)}%</span> overweight in {mostOverweight.name} vs your <span className="font-semibold text-foreground">{allocationPreset}</span> target. </>
              )}
              {underDiff > 5 && (
                <>Consider adding to {mostUnderweight.name} (currently <span className="font-semibold text-foreground">{underDiff.toFixed(0)}%</span> below target). </>
              )}
              Switch between Conservative, Balanced, and Aggressive targets above to compare different strategies.
            </p>
          </div>
        );
      })()}
    </div>
  );
}
