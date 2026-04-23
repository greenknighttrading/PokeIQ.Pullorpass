import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Shield,
  Clock,
  Package,
  Award,
  ArrowRight,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSimulator } from './SimulatorContext';

interface SimulatedInsight {
  id: string;
  type: 'warning' | 'suggestion' | 'positive';
  title: string;
  description: string;
  icon: typeof Lightbulb;
}

export default function SimulatorInsights() {
  const { 
    state, 
    healthScore,
    topLevelValid, 
    eraValid,
    yearlySpend,
  } = useSimulator();

  const allValid = topLevelValid && eraValid;

  // Generate insights based on allocations
  const insights: SimulatedInsight[] = React.useMemo(() => {
    if (!allValid) return [];

    const result: SimulatedInsight[] = [];

    // Era-based insights
    if (state.era.vintage < 10) {
      result.push({
        id: 'low-vintage',
        type: 'warning',
        title: 'Low Vintage Exposure',
        description: `Your plan has ${state.era.vintage}% vintage exposure. Consider allocating at least 10-15% to vintage for long-term durability.`,
        icon: Clock,
      });
    }

    if (state.era.current >= 20) {
      result.push({
        id: 'high-current',
        type: 'warning',
        title: 'High Current Era Risk',
        description: `${state.era.current}% in current era products is speculative. These have the highest volatility and lowest proven track record.`,
        icon: AlertTriangle,
      });
    }

    const newerEra = state.era.modern + state.era.ultraModern + state.era.current;
    if (newerEra >= 70) {
      result.push({
        id: 'newer-heavy',
        type: 'warning',
        title: 'Newer Era Heavy Portfolio',
        description: `${newerEra}% in newer eras (Modern+) increases volatility. Consider balancing with vintage/classic for stability.`,
        icon: TrendingUp,
      });
    }

    // Asset allocation insights
    if (state.topLevel.sealed >= 60) {
      result.push({
        id: 'sealed-positive',
        type: 'positive',
        title: 'Strong Sealed Foundation',
        description: `${state.topLevel.sealed}% sealed allocation provides excellent liquidity and historically strong returns.`,
        icon: Package,
      });
    } else if (state.topLevel.sealed < 25) {
      result.push({
        id: 'low-sealed',
        type: 'warning',
        title: 'Low Sealed Allocation',
        description: `Only ${state.topLevel.sealed}% in sealed products. Consider increasing for better liquidity and risk management.`,
        icon: Package,
      });
    }

    if (state.topLevel.raw >= 40) {
      result.push({
        id: 'high-raw',
        type: 'warning',
        title: 'High Raw Exposure',
        description: `${state.topLevel.raw}% raw allocation increases complexity. Raw cards require more expertise to value and sell.`,
        icon: Award,
      });
    }

    // Graded tier insights
    if (state.graded.grail > 30) {
      result.push({
        id: 'high-grail',
        type: 'suggestion',
        title: 'Concentrated Grail Allocation',
        description: `${state.graded.grail}% in grail-tier slabs ($1,000+). These should be infrequent, strategic purchases.`,
        icon: Award,
      });
    }

    if (state.graded.entry + state.graded.core >= 60) {
      result.push({
        id: 'balanced-graded',
        type: 'positive',
        title: 'Well-Balanced Graded Tiers',
        description: `${state.graded.entry + state.graded.core}% in entry/core tiers provides good liquidity and growth potential.`,
        icon: CheckCircle2,
      });
    }

    // Budget insights
    if (yearlySpend < 1000) {
      result.push({
        id: 'modest-budget',
        type: 'suggestion',
        title: 'Focused Approach Recommended',
        description: `At $${yearlySpend.toLocaleString()}/year, focus on fewer, higher-conviction purchases rather than spreading thin.`,
        icon: TrendingUp,
      });
    }

    if (yearlySpend > 12000 && state.topLevel.graded > 40) {
      result.push({
        id: 'diversification',
        type: 'suggestion',
        title: 'Consider Diversification Strategy',
        description: `With $${yearlySpend.toLocaleString()}/year in graded, ensure you're spreading across eras and grades for risk management.`,
        icon: Shield,
      });
    }

    // Rebalancing suggestions
    if (state.topLevel.graded >= 50 && state.era.vintage < 15) {
      result.push({
        id: 'graded-vintage',
        type: 'suggestion',
        title: 'Redirect to Vintage Graded',
        description: `Redirecting some graded budget toward vintage slabs could improve long-term durability while maintaining the graded focus.`,
        icon: ArrowRight,
      });
    }

    // Health score insight
    if (healthScore.overall >= 80) {
      result.push({
        id: 'healthy-plan',
        type: 'positive',
        title: 'Well-Structured Plan',
        description: `Your planned allocation scores ${healthScore.overall}/100. This reflects a balanced approach to risk and growth.`,
        icon: Shield,
      });
    }

    return result;
  }, [state, allValid, yearlySpend, healthScore]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className="text-xs gap-1">
            <Sparkles className="w-3 h-3" />
            Generated from your planned allocation
          </Badge>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Insight Feed</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Personalized guidance based on your simulated portfolio
        </p>
      </div>

      {/* Health Score Widget */}
      <Card className={cn(
        'p-5',
        allValid && healthScore.overall >= 75 && 'border-success/30 bg-success/5',
        allValid && healthScore.overall >= 65 && healthScore.overall < 75 && 'border-warning/30 bg-warning/5',
        allValid && healthScore.overall < 65 && 'border-destructive/30 bg-destructive/5',
      )}>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">Simulated Health Score</h2>
        </div>
        
        {allValid ? (
          <div className="space-y-4">
            {/* Main Score */}
            <div className="flex items-center gap-4">
              <div className={cn(
                'text-5xl font-bold',
                healthScore.overall >= 75 && 'text-success',
                healthScore.overall >= 65 && healthScore.overall < 75 && 'text-warning',
                healthScore.overall < 65 && 'text-destructive',
              )}>
                {healthScore.overall}
              </div>
              <div>
                <p className={cn(
                  'text-lg font-semibold',
                  healthScore.overall >= 75 && 'text-success',
                  healthScore.overall >= 65 && healthScore.overall < 75 && 'text-warning',
                  healthScore.overall < 65 && 'text-destructive',
                )}>
                  {healthScore.overall >= 75 ? 'Well Balanced' : healthScore.overall >= 65 ? 'Moderate Risk' : 'High Concentration'}
                </p>
                <p className="text-xs text-muted-foreground">Based on your planned allocation</p>
              </div>
            </div>

            {/* Breakdown */}
            <div className="grid md:grid-cols-3 gap-4 pt-4 border-t border-border">
              <div className="p-3 rounded-lg bg-secondary/30">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Asset Allocation</span>
                  <span className="text-xs font-medium text-foreground">45%</span>
                </div>
                <p className={cn(
                  'text-lg font-bold',
                  healthScore.asset >= 75 && 'text-success',
                  healthScore.asset >= 65 && healthScore.asset < 75 && 'text-warning',
                  healthScore.asset < 65 && 'text-destructive',
                )}>
                  {healthScore.asset}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/30">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Era Balance</span>
                  <span className="text-xs font-medium text-foreground">35%</span>
                </div>
                <p className={cn(
                  'text-lg font-bold',
                  healthScore.era >= 75 && 'text-success',
                  healthScore.era >= 65 && healthScore.era < 75 && 'text-warning',
                  healthScore.era < 65 && 'text-destructive',
                )}>
                  {healthScore.era}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/30">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Position Concentration</span>
                  <span className="text-xs font-medium text-foreground">20%</span>
                </div>
                <p className={cn(
                  'text-lg font-bold',
                  healthScore.concentration >= 75 && 'text-success',
                  healthScore.concentration >= 65 && healthScore.concentration < 75 && 'text-warning',
                  healthScore.concentration < 65 && 'text-destructive',
                )}>
                  {healthScore.concentration}
                </p>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span><strong className="text-success">75+</strong> Well Balanced</span>
              <span><strong className="text-warning">65-74</strong> Moderate Risk</span>
              <span><strong className="text-destructive">50-64</strong> High Concentration</span>
            </div>

            {/* Disclaimer */}
            <div className="pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                <strong>Note:</strong> This score is for guidance only — it's not a guaranteed way to make money or reduce risk. 
                It's an indicator of risk and diversity, which generally helps with long-term portfolio management.
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Complete your asset and era allocations to see your simulated health score.
          </p>
        )}
      </Card>

      {!allValid && (
        <Card className="p-6 border-warning/30 bg-warning/5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-warning" />
            <div>
              <h3 className="font-medium text-foreground">Complete Your Allocations</h3>
              <p className="text-sm text-muted-foreground">
                Finish setting up asset types and era allocations to see personalized insights.
              </p>
            </div>
          </div>
        </Card>
      )}

      {allValid && insights.length > 0 && (
        <div className="space-y-4">
          {insights.map((insight, index) => (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={cn(
                'p-5',
                insight.type === 'warning' && 'border-warning/30 bg-warning/5',
                insight.type === 'positive' && 'border-success/30 bg-success/5',
                insight.type === 'suggestion' && 'border-primary/30 bg-primary/5',
              )}>
                <div className="flex gap-4">
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                    insight.type === 'warning' && 'bg-warning/20',
                    insight.type === 'positive' && 'bg-success/20',
                    insight.type === 'suggestion' && 'bg-primary/20',
                  )}>
                    <insight.icon className={cn(
                      'w-5 h-5',
                      insight.type === 'warning' && 'text-warning',
                      insight.type === 'positive' && 'text-success',
                      insight.type === 'suggestion' && 'text-primary',
                    )} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{insight.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {allValid && insights.length === 0 && (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-4">
            <Lightbulb className="w-8 h-8 text-success" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Well Balanced</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Your planned allocation looks well-balanced. No specific adjustments recommended at this time.
          </p>
        </Card>
      )}

      {/* Footer Note */}
      <Card className="p-4 bg-secondary/30 border-border flex items-start gap-3">
        <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          These insights are generated from your planned allocation and are suggestions, not financial advice. 
          They're based on general Pokémon investing principles. Always do your own research.
        </p>
      </Card>
    </div>
  );
}
