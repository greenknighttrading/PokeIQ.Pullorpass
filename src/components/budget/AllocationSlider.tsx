import React from 'react';
import { Slider } from '@/components/ui/slider';

interface AllocationSliderProps {
  name: string;
  value: number;
  color: string;
  description?: string;
  range?: string;
  onChange: (value: number) => void;
  monthlyAmount?: number;
  yearlyAmount?: number;
  disabled?: boolean;
}

export function AllocationSlider({
  name,
  value,
  color,
  description,
  range,
  onChange,
  monthlyAmount,
  yearlyAmount,
  disabled = false,
}: AllocationSliderProps) {
  return (
    <div className={`p-4 rounded-lg border border-border bg-card/50 ${disabled ? 'opacity-50' : ''}`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          <div>
            <span className="text-sm font-medium text-foreground">{name}</span>
            {range && <span className="text-xs text-muted-foreground ml-2">{range}</span>}
          </div>
        </div>
        <span className="text-sm font-bold" style={{ color }}>{value}%</span>
      </div>
      {description && (
        <p className="text-xs text-muted-foreground mb-3 ml-5">{description}</p>
      )}
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={0}
        max={100}
        step={1}
        disabled={disabled}
        className="mb-2"
      />
      {monthlyAmount !== undefined && yearlyAmount !== undefined && !disabled && (
        <div className="flex justify-between text-xs text-muted-foreground mt-2 ml-5">
          <span>${monthlyAmount.toLocaleString()}/mo</span>
          <span>${yearlyAmount.toLocaleString()}/yr</span>
        </div>
      )}
    </div>
  );
}
