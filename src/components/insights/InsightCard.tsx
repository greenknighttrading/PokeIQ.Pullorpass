import React, { useState } from 'react';
import { X, Lightbulb, AlertTriangle, TrendingUp, Scale, Clock, ChevronDown, ChevronUp, TrendingDown } from 'lucide-react';
import { Insight, PortfolioItem } from '@/lib/types';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { usePortfolio } from '@/contexts/PortfolioContext';

interface InsightCardProps {
  insight: Insight;
  onDismiss: (id: string) => void;
}

const typeIcons: Record<Insight['type'], React.ElementType> = {
  profit: TrendingUp,
  concentration: AlertTriangle,
  rebalance: Scale,
  patience: Clock,
  allocation: Lightbulb,
  loss: TrendingDown,
};

const typeColors: Record<Insight['type'], string> = {
  profit: 'text-success bg-success/10 border-success/20',
  concentration: 'text-warning bg-warning/10 border-warning/20',
  rebalance: 'text-primary bg-primary/10 border-primary/20',
  patience: 'text-muted-foreground bg-muted border-border',
  allocation: 'text-accent bg-accent/10 border-accent/20',
  loss: 'text-destructive bg-destructive/10 border-destructive/20',
};

export function InsightCard({ insight, onDismiss }: InsightCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { items } = usePortfolio();
  
  const Icon = typeIcons[insight.type];
  const colorClasses = typeColors[insight.type];
  
  // Get related items if they exist
  const relatedItems = insight.relatedItemIds 
    ? items.filter(item => insight.relatedItemIds!.includes(item.id))
    : [];
  
  const hasRelatedItems = relatedItems.length > 0;

  return (
    <div className={cn(
      "insight-card group relative",
      "animate-slide-up",
      insight.type === 'loss' && "ring-1 ring-destructive/30"
    )}>
      <button
        onClick={() => onDismiss(insight.id)}
        className="absolute top-4 right-4 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-secondary transition-all duration-200 z-10"
        aria-label="Dismiss insight"
      >
        <X className="w-4 h-4 text-muted-foreground" />
      </button>

      <div 
        className={cn("flex gap-4", hasRelatedItems && "cursor-pointer")}
        onClick={() => hasRelatedItems && setIsExpanded(!isExpanded)}
      >
        <div className={cn(
          "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border",
          colorClasses
        )}>
          <Icon className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-foreground leading-relaxed pr-8">
            {insight.message}
          </p>
          <div className="flex items-center gap-3 mt-3">
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(insight.timestamp, { addSuffix: true })}
            </p>
            {hasRelatedItems && (
              <button className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors">
                {isExpanded ? (
                  <>Hide items <ChevronUp className="w-3 h-3" /></>
                ) : (
                  <>View {relatedItems.length} item{relatedItems.length > 1 ? 's' : ''} <ChevronDown className="w-3 h-3" /></>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Items List */}
      {isExpanded && relatedItems.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border space-y-2 animate-fade-in">
          {relatedItems.map((item) => (
            <InsightItemRow key={item.id} item={item} />
          ))}
        </div>
      )}

      {insight.priority === 'high' && (
        <div className={cn(
          "absolute left-0 top-4 bottom-4 w-1 rounded-full",
          insight.type === 'loss' ? "bg-destructive" : "bg-warning"
        )} />
      )}
    </div>
  );
}

function InsightItemRow({ item }: { item: PortfolioItem }) {
  const isLoss = item.gainPercent < 0;
  
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/50 hover:bg-secondary/80 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{item.productName}</p>
        <p className="text-xs text-muted-foreground">
          {item.quantity} × ${item.marketPrice.toLocaleString()} = ${item.totalMarketValue.toLocaleString()}
        </p>
      </div>
      <div className="text-right ml-4">
        <p className={cn(
          "text-sm font-medium tabular-nums",
          isLoss ? "text-destructive" : "text-success"
        )}>
          {isLoss ? '' : '+'}{item.gainPercent.toFixed(0)}%
        </p>
        <p className={cn(
          "text-xs tabular-nums",
          isLoss ? "text-destructive/70" : "text-success/70"
        )}>
          {isLoss ? '-' : '+'}${Math.abs(item.profitDollars).toLocaleString()}
        </p>
      </div>
    </div>
  );
}
