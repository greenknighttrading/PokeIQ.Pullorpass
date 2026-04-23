import React from 'react';
import { cn } from '@/lib/utils';
import { Heart, TrendingUp, TrendingDown, Minus, Info, Package, Clock, Target } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { HealthScoreBreakdown } from '@/contexts/PortfolioContext';

interface HealthScoreCardProps {
  score: number;
  breakdown?: HealthScoreBreakdown | null;
}

function getScoreGrade(score: number): { label: string; color: string; bgColor: string; description: string } {
  if (score >= 75) return { 
    label: 'Well Balanced', 
    color: 'text-success', 
    bgColor: 'bg-success/10',
    description: 'Well balanced with risk appropriately sized.'
  };
  if (score >= 65) return { 
    label: 'Moderate Risk', 
    color: 'text-warning', 
    bgColor: 'bg-warning/10',
    description: 'Moderate risk; more diversification recommended.'
  };
  return { 
    label: 'High Concentration', 
    color: 'text-destructive', 
    bgColor: 'bg-destructive/10',
    description: 'Highly concentrated with limited diversification.'
  };
}

function getScoreIcon(score: number) {
  if (score >= 65) return TrendingUp;
  if (score >= 40) return Minus;
  return TrendingDown;
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-success';
  if (score >= 65) return 'text-primary';
  if (score >= 50) return 'text-warning';
  return 'text-destructive';
}

export function HealthScoreCard({ score, breakdown }: HealthScoreCardProps) {
  const displayScore = breakdown?.overall ?? score;
  const grade = getScoreGrade(displayScore);
  const ScoreIcon = getScoreIcon(displayScore);
  
  // Calculate stroke dasharray for circular progress
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (displayScore / 100) * circumference;
  
  // Get circle color based on score thresholds
  const getCircleColor = (s: number) => {
    if (s >= 75) return 'hsl(var(--success))';
    if (s >= 65) return 'hsl(var(--warning))';
    return 'hsl(var(--destructive))';
  };

  return (
    <div className="glass-card p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", grade.bgColor)}>
            <Heart className={cn("w-5 h-5", grade.color)} />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Health Score</h3>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="p-2 rounded-lg hover:bg-secondary/50 transition-colors">
                <Info className="w-4 h-4 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs p-4">
              <p className="font-semibold mb-2">Multi-Dimensional Health Score:</p>
              <ul className="text-xs space-y-1.5">
                <li className="flex items-start gap-2">
                  <Package className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                  <span><strong>Asset Allocation (45%):</strong> How well your sealed/slabs/raw mix matches target</span>
                </li>
                <li className="flex items-start gap-2">
                  <Clock className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                  <span><strong>Era Balance (35%):</strong> Distribution across vintage to current eras</span>
                </li>
                <li className="flex items-start gap-2">
                  <Target className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                  <span><strong>Concentration (20%):</strong> Diversification across different sets</span>
                </li>
              </ul>
              <p className="text-xs text-muted-foreground mt-3">
                A balanced portfolio across all dimensions scores highest.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="flex flex-col items-center gap-4">
        {/* Circular Progress */}
        <div className="relative w-32 h-32">
          <svg className="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--secondary))" strokeWidth="6" />
            <circle cx="50" cy="50" r="45" fill="none" stroke={getCircleColor(displayScore)} strokeWidth="6" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className="transition-all duration-1000 ease-out" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn("text-3xl font-bold tabular-nums", grade.color)}>{displayScore}</span>
            <span className="text-xs text-muted-foreground">/100</span>
          </div>
        </div>

        {/* Grade Label - below the circle */}
        <div className="text-center">
          <div className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium mb-2",
            grade.bgColor, grade.color
          )}>
            <ScoreIcon className="w-3.5 h-3.5" />
            {grade.label}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {grade.description}
          </p>
        </div>
      </div>

      {/* Score ranges legend */}
      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-success" />
            <span className="text-muted-foreground">75+ Well Balanced</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-warning" />
            <span className="text-muted-foreground">65-74 Moderate Risk</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-destructive" />
            <span className="text-muted-foreground">50-64 High Concentration</span>
          </div>
        </div>
      </div>

      {/* Breakdown bars */}
      {breakdown && (
        <div className="mt-4 pt-4 border-t border-border space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Package className="w-3 h-3" />
                Asset Allocation (45%)
              </span>
              <span className={cn("font-medium tabular-nums", getScoreColor(breakdown.assetScore))}>
                {breakdown.assetScore}/100
              </span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  breakdown.assetScore >= 75 ? "bg-success" : breakdown.assetScore >= 65 ? "bg-warning" : "bg-destructive"
                )}
                style={{ width: `${breakdown.assetScore}%` }}
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                Era Balance (35%)
              </span>
              <span className={cn("font-medium tabular-nums", getScoreColor(breakdown.eraScore))}>
                {breakdown.eraScore}/100
              </span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  breakdown.eraScore >= 75 ? "bg-success" : breakdown.eraScore >= 65 ? "bg-warning" : "bg-destructive"
                )}
                style={{ width: `${breakdown.eraScore}%` }}
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Target className="w-3 h-3" />
                Position Concentration (20%)
              </span>
              <span className={cn("font-medium tabular-nums", getScoreColor(breakdown.concentrationScore))}>
                {breakdown.concentrationScore}/100
              </span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  breakdown.concentrationScore >= 75 ? "bg-success" : breakdown.concentrationScore >= 65 ? "bg-warning" : "bg-destructive"
                )}
                style={{ width: `${breakdown.concentrationScore}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
