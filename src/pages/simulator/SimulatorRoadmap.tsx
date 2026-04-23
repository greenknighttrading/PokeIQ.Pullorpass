import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  Map,
  Package,
  Award,
  CreditCard,
  AlertTriangle,
} from 'lucide-react';
import { useSimulator } from './SimulatorContext';
import { GRADED_TIERS, SEALED_TYPES } from '@/components/budget/types';
import { cn } from '@/lib/utils';

// Average prices for estimation
const AVG_SLAB_PRICE = 200;
const AVG_BOX_PRICE = 200;
const AVG_RAW_CARD_PRICE = 50;

export default function SimulatorRoadmap() {
  const { 
    state, 
    topLevelValid, 
    gradedValid, 
    sealedValid, 
    rawValid,
    eraValid,
    yearlySpend,
  } = useSimulator();

  const allValid = topLevelValid && eraValid;

  // Calculate yearly spend per asset type based on allocation
  const sealedYearly = topLevelValid ? Math.round(yearlySpend * (state.topLevel.sealed / 100)) : 0;
  const gradedYearly = topLevelValid ? Math.round(yearlySpend * (state.topLevel.graded / 100)) : 0;
  const rawYearly = topLevelValid ? Math.round(yearlySpend * (state.topLevel.raw / 100)) : 0;

  // Calculate estimated units based on asset allocation
  const estimatedSlabs = Math.floor(gradedYearly / AVG_SLAB_PRICE);
  const estimatedBoxes = Math.floor(sealedYearly / AVG_BOX_PRICE);
  const estimatedRawCards = Math.floor(rawYearly / AVG_RAW_CARD_PRICE);

  // Key purchases per year with allocation-based calculations
  const gradedPurchases = GRADED_TIERS.map(tier => {
    const tierYearly = gradedValid ? Math.round(gradedYearly * (state.graded[tier.id] / 100)) : 0;
    return {
      ...tier,
      value: state.graded[tier.id],
      yearly: tierYearly,
    };
  }).filter(t => t.value > 0);

  const sealedPurchases = SEALED_TYPES.map(type => {
    const typeYearly = sealedValid ? Math.round(sealedYearly * ((state.sealed[type.id] || 0) / 100)) : 0;
    return {
      ...type,
      value: state.sealed[type.id] || 0,
      yearly: typeYearly,
    };
  }).filter(t => t.value > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className="text-xs gap-1">
            <Sparkles className="w-3 h-3" />
            Simulated
          </Badge>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Purchase Roadmap</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Actionable buying guidance based on your plan
        </p>
        <Card className="mt-4 p-4 bg-secondary/30 border-border">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Product type matters more than era for risk management.</strong>{' '}
            Sealed products are generally less volatile than individual cards, especially expensive vintage cards that can remain static for long periods. 
            Recommendations will primarily focus on sealed products.
          </p>
        </Card>
      </div>

      {!allValid && (
        <Card className="p-6 border-warning/30 bg-warning/5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-warning" />
            <div>
              <h3 className="font-medium text-foreground">Complete Your Allocations</h3>
              <p className="text-sm text-muted-foreground">
                Finish setting up asset types and era allocations to see your purchase roadmap.
              </p>
            </div>
          </div>
        </Card>
      )}

      {allValid && (
        <>
          {/* Summary Card */}
          <Card className="p-5">
            <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Map className="w-4 h-4 text-primary" />
              Based on your allocation, you can expect to buy:
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-secondary/50">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Award className="w-4 h-4" />
                  <span className="text-xs">Graded Slabs/Year</span>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  ~{estimatedSlabs}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  @ ${AVG_SLAB_PRICE}/slab avg ({state.topLevel.graded}% allocation = ${gradedYearly.toLocaleString()}/yr)
                </p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/50">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Package className="w-4 h-4" />
                  <span className="text-xs">Booster Boxes/Year</span>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  ~{estimatedBoxes}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  @ ${AVG_BOX_PRICE}/box avg ({state.topLevel.sealed}% allocation = ${sealedYearly.toLocaleString()}/yr)
                </p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/50">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <CreditCard className="w-4 h-4" />
                  <span className="text-xs">Raw Cards/Year</span>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  ~{estimatedRawCards}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  @ ${AVG_RAW_CARD_PRICE}/card avg ({state.topLevel.raw}% allocation = ${rawYearly.toLocaleString()}/yr)
                </p>
              </div>
            </div>
          </Card>

          {/* Graded Breakdown */}
          {gradedValid && gradedPurchases.length > 0 && (
            <Card className="p-5">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" />
                Graded Slab Targets
              </h3>
              <div className="space-y-3">
                {gradedPurchases.map(tier => {
                  const canAcquire = tier.yearly >= 1000;
                  return (
                    <div key={tier.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: tier.color }} 
                        />
                        <div>
                          <span className="text-sm font-medium text-foreground">{tier.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">{tier.range}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-foreground">${tier.yearly.toLocaleString()}/yr</span>
                        {(tier.id === 'highConviction' || tier.id === 'grail') && canAcquire && (
                          <p className="text-xs text-success">Budget allows acquisition</p>
                        )}
                        {(tier.id === 'highConviction' || tier.id === 'grail') && !canAcquire && tier.yearly > 0 && (
                          <p className="text-xs text-muted-foreground">$1k+/yr needed for acquisition</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {state.graded.grail > 20 && (
                <p className="text-xs text-warning mt-3 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  High grail allocation — these purchases should be infrequent and strategic
                </p>
              )}
            </Card>
          )}

          {/* Sealed Breakdown */}
          {sealedValid && sealedPurchases.length > 0 && (
            <Card className="p-5">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                Sealed Product Targets
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                {sealedPurchases.slice(0, 8).map(type => {
                  const monthlyAmount = Math.round(type.yearly / 12);
                  return (
                    <div key={type.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: type.color }} 
                        />
                        <span className="text-sm text-foreground">{type.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-foreground">${type.yearly.toLocaleString()}/yr</span>
                        <p className="text-xs text-muted-foreground">${monthlyAmount.toLocaleString()}/mo</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Disclaimer */}
          <Card className="p-4 bg-secondary/30 border-border">
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">Note:</strong> Unit estimates are based on average market prices 
              and your allocation percentages. Actual purchases will vary based on specific products and market conditions.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}
