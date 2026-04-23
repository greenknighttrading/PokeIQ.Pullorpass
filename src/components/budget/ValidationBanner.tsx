import React from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ValidationBannerProps {
  total: number;
  onNormalize: () => void;
  onReset: () => void;
  label: string;
}

export function ValidationBanner({ total, onNormalize, onReset, label }: ValidationBannerProps) {
  const isValid = total === 100;
  const delta = 100 - total;

  if (isValid) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/20">
        <CheckCircle className="w-4 h-4 text-success" />
        <span className="text-sm text-success font-medium">{label} allocation is 100% — projections active</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-warning/10 border border-warning/20">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-warning" />
        <span className="text-sm text-warning font-medium">
          {label} at {total}% — {delta > 0 ? `add ${delta}%` : `remove ${Math.abs(delta)}%`}
        </span>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onNormalize} className="text-xs h-7">
          Normalize to 100%
        </Button>
        <Button variant="ghost" size="sm" onClick={onReset} className="text-xs h-7">
          Reset
        </Button>
      </div>
    </div>
  );
}
