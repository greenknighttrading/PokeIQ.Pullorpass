import React from 'react';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { InsightCard } from '@/components/insights/InsightCard';
import { ComparisonBanner } from '@/components/dashboard/ComparisonBanner';
import { Lightbulb, Inbox, GitCompare, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Insights() {
  const { insights, dismissInsight, isDataLoaded, comparison } = usePortfolio();

  if (!isDataLoaded) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="text-center">
          <Inbox className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Upload your portfolio to see insights</p>
        </div>
      </div>
    );
  }

  // Generate comparison-specific insights
  const comparisonInsights = [];
  if (comparison?.hasComparison) {
    // Health score change insight
    if (comparison.healthScoreChange > 5) {
      comparisonInsights.push({
        id: 'comparison-health-improved',
        type: 'positive' as const,
        icon: TrendingUp,
        title: 'Health Score Improved!',
        message: `Your portfolio health score increased by ${comparison.healthScoreChange} points. Great progress on diversification and balance!`
      });
    } else if (comparison.healthScoreChange < -5) {
      comparisonInsights.push({
        id: 'comparison-health-declined',
        type: 'warning' as const,
        icon: TrendingDown,
        title: 'Health Score Declined',
        message: `Your portfolio health score dropped by ${Math.abs(comparison.healthScoreChange)} points. Consider reviewing your allocation balance.`
      });
    }

    // Value change insight
    if (comparison.valueChangePercent > 10) {
      comparisonInsights.push({
        id: 'comparison-value-up',
        type: 'positive' as const,
        icon: ArrowUpRight,
        title: 'Portfolio Value Increased',
        message: `Your portfolio value is up ${comparison.valueChangePercent.toFixed(1)}% ($${comparison.valueChange.toLocaleString()}) since your last upload.`
      });
    } else if (comparison.valueChangePercent < -10) {
      comparisonInsights.push({
        id: 'comparison-value-down',
        type: 'warning' as const,
        icon: ArrowDownRight,
        title: 'Portfolio Value Decreased',
        message: `Your portfolio value is down ${Math.abs(comparison.valueChangePercent).toFixed(1)}% ($${Math.abs(comparison.valueChange).toLocaleString()}) since your last upload. Review market conditions.`
      });
    }

    // Allocation shift insights
    if (Math.abs(comparison.sealedChange) > 10) {
      const direction = comparison.sealedChange > 0 ? 'increased' : 'decreased';
      const sentiment = comparison.sealedChange > 0 ? 'positive' : 'neutral';
      comparisonInsights.push({
        id: 'comparison-sealed-shift',
        type: sentiment as 'positive' | 'neutral',
        icon: comparison.sealedChange > 0 ? TrendingUp : AlertTriangle,
        title: `Sealed Allocation ${comparison.sealedChange > 0 ? 'Increased' : 'Decreased'}`,
        message: `Your sealed allocation ${direction} by ${Math.abs(comparison.sealedChange).toFixed(1)}%. ${comparison.sealedChange > 0 ? 'This strengthens long-term positioning.' : 'Consider if this aligns with your investment thesis.'}`
      });
    }

    // New items insight
    if (comparison.newItems.length > 0) {
      comparisonInsights.push({
        id: 'comparison-new-items',
        type: 'info' as const,
        icon: CheckCircle2,
        title: `${comparison.newItems.length} New Item${comparison.newItems.length > 1 ? 's' : ''} Added`,
        message: `You've added ${comparison.newItems.slice(0, 3).map(i => i.productName).join(', ')}${comparison.newItems.length > 3 ? ` and ${comparison.newItems.length - 3} more` : ''} to your collection.`
      });
    }

    // Removed items insight
    if (comparison.removedItems.length > 0) {
      comparisonInsights.push({
        id: 'comparison-removed-items',
        type: 'neutral' as const,
        icon: AlertTriangle,
        title: `${comparison.removedItems.length} Item${comparison.removedItems.length > 1 ? 's' : ''} Removed`,
        message: `You've sold or removed ${comparison.removedItems.slice(0, 3).map(i => i.productName).join(', ')}${comparison.removedItems.length > 3 ? ` and ${comparison.removedItems.length - 3} more` : ''}.`
      });
    }
  }

  const typeColors = {
    positive: 'text-success bg-success/10 border-success/20',
    warning: 'text-warning bg-warning/10 border-warning/20',
    info: 'text-primary bg-primary/10 border-primary/20',
    neutral: 'text-muted-foreground bg-muted border-border',
  };

  return (
    <div className="p-3 sm:p-4 lg:p-6 max-w-3xl mx-auto">
      {/* Comparison Banner */}
      <ComparisonBanner />

      {/* Page Header */}
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Lightbulb className="w-4 h-4 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Insight Feed</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Personalized guidance based on your portfolio analysis
        </p>
      </div>

      {/* Comparison Insights Section */}
      {comparison?.hasComparison && comparisonInsights.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <GitCompare className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Changes Since Last Upload</h2>
          </div>
          <div className="space-y-3">
            {comparisonInsights.map((insight, index) => (
              <div
                key={insight.id}
                style={{ animationDelay: `${index * 50}ms`, opacity: 0 }}
                className="animate-slide-up"
              >
                <div className="glass-card p-4 border-l-4 border-l-primary/50">
                  <div className="flex gap-3">
                    <div className={cn(
                      "flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center border",
                      typeColors[insight.type]
                    )}>
                      <insight.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{insight.title}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{insight.message}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Regular Insights List */}
      {insights.length > 0 ? (
        <div className="space-y-4">
          {comparison?.hasComparison && (
            <h2 className="text-sm font-semibold text-foreground mb-2">Portfolio Insights</h2>
          )}
          {insights.map((insight, index) => (
            <div
              key={insight.id}
              style={{ animationDelay: `${(comparisonInsights.length + index) * 100}ms`, opacity: 0 }}
              className="animate-slide-up"
            >
              <InsightCard insight={insight} onDismiss={dismissInsight} />
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-4">
            <Lightbulb className="w-8 h-8 text-success" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">All Clear</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            No actionable insights at the moment. Your portfolio is well-balanced
            according to your targets. Check back after making changes.
          </p>
        </div>
      )}

      {/* Footer Note */}
      <p className="text-xs text-muted-foreground text-center mt-8">
        Insights are generated from your portfolio data. They're suggestions, not financial advice.
        Always do your own research.
      </p>
    </div>
  );
}
