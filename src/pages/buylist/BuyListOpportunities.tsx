import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Crown, ArrowLeft, TrendingDown, Minus, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useBuyList, type OpportunityStatus, type EnrichedPick } from '@/contexts/BuyListContext';
import { cn } from '@/lib/utils';

const statusConfig: Record<string, { label: string; class: string; icon: typeof TrendingDown }> = {
  IN_ZONE: { label: 'IN ZONE', class: 'bg-success/20 text-success border-success/30', icon: TrendingDown },
  NEAR_ZONE: { label: 'NEAR ZONE', class: 'bg-warning/20 text-warning border-warning/30', icon: Minus },
};

export default function BuyListOpportunities() {
  const { picks, hasAccess, checkingAccess } = useBuyList();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!checkingAccess && !hasAccess) navigate('/buylist/access');
  }, [hasAccess, checkingAccess, navigate]);

  const opportunities = picks
    .filter(p => p.opportunityStatus === 'IN_ZONE' || p.opportunityStatus === 'NEAR_ZONE')
    .sort((a, b) => {
      if (a.opportunityStatus !== b.opportunityStatus) {
        return a.opportunityStatus === 'IN_ZONE' ? -1 : 1;
      }
      return (b.discountPct ?? 0) - (a.discountPct ?? 0);
    });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/buylist/list" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> BUY List
          </Link>
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-accent" />
            <span className="font-semibold text-sm">Opportunities</span>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-success" />
            </div>
            <h1 className="text-2xl font-bold">Buy Opportunities</h1>
          </div>
          <p className="text-sm text-muted-foreground">Items currently IN ZONE or NEAR ZONE — sorted by biggest discount</p>
        </div>

        {opportunities.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <p className="text-muted-foreground mb-2">No opportunities right now</p>
            <p className="text-xs text-muted-foreground">All picks are currently above their buy zones. Check back later!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {opportunities.map((pick, i) => {
              const status = statusConfig[pick.opportunityStatus];
              const StatusIcon = status.icon;
              return (
                <motion.div key={pick.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Link to={`/buylist/pick/${pick.id}`}>
                    <div className="glass-card p-4 hover:border-accent/30 transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent font-bold">
                          {pick.rank}
                        </div>
                        {pick.image_url && (
                          <img src={pick.image_url} alt="" className="w-12 h-16 object-contain rounded-lg hidden sm:block" />
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm truncate group-hover:text-accent transition-colors">
                            {pick.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm font-bold tabular-nums">
                              ${pick.currentPrice?.toFixed(2)}
                            </span>
                            {pick.discountPct !== null && pick.discountPct > 0 && (
                              <span className="text-xs text-success font-medium">
                                {pick.discountPct.toFixed(1)}% below target
                              </span>
                            )}
                          </div>
                        </div>
                        <div className={cn('flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border', status.class)}>
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
