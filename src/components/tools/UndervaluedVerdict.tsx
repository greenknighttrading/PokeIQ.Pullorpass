import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingDown, TrendingUp, Scale } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VerdictProps {
  sealed30d: number;
  sealed90d: number;
  cards30d: number;
  cards90d: number;
}

export function UndervaluedVerdict({ sealed30d, sealed90d, cards30d, cards90d }: VerdictProps) {
  // Weighted score: 40% on 30d, 60% on 90d
  const sealedScore = sealed30d * 0.4 + sealed90d * 0.6;
  const cardsScore = cards30d * 0.4 + cards90d * 0.6;
  const diff = sealedScore - cardsScore;

  let verdict: 'sealed' | 'cards' | 'neutral';
  let label: string;
  let reasoning: string;

  if (Math.abs(diff) < 3) {
    verdict = 'neutral';
    label = 'Fairly Valued';
    reasoning = 'Sealed and card prices are tracking similarly. Neither category shows a clear advantage right now.';
  } else if (diff < 0) {
    verdict = 'sealed';
    label = 'Sealed Undervalued';
    reasoning = `Sealed products have underperformed cards by ${Math.abs(diff).toFixed(1)}pp on a weighted basis. This may present a buying opportunity for sealed.`;
  } else {
    verdict = 'cards';
    label = 'Cards Undervalued';
    reasoning = `Raw cards have underperformed sealed by ${Math.abs(diff).toFixed(1)}pp on a weighted basis. This may present a buying opportunity for singles.`;
  }

  const VerdictIcon = verdict === 'neutral' ? Scale : verdict === 'sealed' ? TrendingDown : TrendingUp;

  return (
    <Card className="border-border/50">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className={cn(
            'p-2 rounded-lg',
            verdict === 'sealed' ? 'bg-primary/15' : verdict === 'cards' ? 'bg-accent/15' : 'bg-muted'
          )}>
            <VerdictIcon className={cn(
              'w-5 h-5',
              verdict === 'sealed' ? 'text-primary' : verdict === 'cards' ? 'text-accent' : 'text-muted-foreground'
            )} />
          </div>
          <div className="flex-1">
            <Badge variant={verdict === 'neutral' ? 'secondary' : 'default'} className={cn(
              'mb-2',
              verdict === 'sealed' && 'bg-primary/20 text-primary border-primary/30',
              verdict === 'cards' && 'bg-accent/20 text-accent border-accent/30',
            )}>
              {label}
            </Badge>
            <p className="text-sm text-muted-foreground leading-relaxed">{reasoning}</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Sealed 30D / 90D</p>
            <div className="flex items-baseline gap-2">
              <span className={cn('text-sm font-bold tabular-nums', sealed30d >= 0 ? 'text-success' : 'text-warning')}>
                {sealed30d >= 0 ? '+' : ''}{sealed30d.toFixed(1)}%
              </span>
              <span className="text-muted-foreground">/</span>
              <span className={cn('text-sm font-bold tabular-nums', sealed90d >= 0 ? 'text-success' : 'text-warning')}>
                {sealed90d >= 0 ? '+' : ''}{sealed90d.toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Cards 30D / 90D</p>
            <div className="flex items-baseline gap-2">
              <span className={cn('text-sm font-bold tabular-nums', cards30d >= 0 ? 'text-success' : 'text-warning')}>
                {cards30d >= 0 ? '+' : ''}{cards30d.toFixed(1)}%
              </span>
              <span className="text-muted-foreground">/</span>
              <span className={cn('text-sm font-bold tabular-nums', cards90d >= 0 ? 'text-success' : 'text-warning')}>
                {cards90d >= 0 ? '+' : ''}{cards90d.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
