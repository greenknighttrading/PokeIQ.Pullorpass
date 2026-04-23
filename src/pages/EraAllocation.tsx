import React from 'react';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { EraRebalanceSimulator } from '@/components/rebalance/EraRebalanceSimulator';
import { Clock, Inbox } from 'lucide-react';

export default function EraAllocation() {
  const { isDataLoaded } = usePortfolio();

  if (!isDataLoaded) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="text-center">
          <Inbox className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Upload your portfolio to use the era allocation simulator</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="mb-5">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Clock className="w-4 h-4 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Era Rebalancer</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          See how your portfolio is spread across Pokémon eras — then set a goal mix and get a monthly spending plan to reach it.
        </p>
      </div>

      {/* Simulator */}
      <EraRebalanceSimulator />

      {/* Disclaimer */}
      <div className="mt-8 p-4 rounded-xl bg-secondary/50 border border-border">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong className="text-foreground">Disclaimer:</strong> This simulator provides guidance based on your target era allocations 
          and Pokémon investing principles. Time horizon beats product selection — the biggest edge is staying invested long enough 
          for fundamentals to matter. Consider consulting a financial advisor for personalized guidance.
        </p>
      </div>
    </div>
  );
}
