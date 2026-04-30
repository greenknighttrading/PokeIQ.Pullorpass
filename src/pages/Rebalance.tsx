import React from 'react';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { RebalanceSimulator } from '@/components/rebalance/RebalanceSimulator';
import { CollectionAdvisorWizard } from '@/components/rebalance/CollectionAdvisorWizard';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Scale, Inbox } from 'lucide-react';
import { useState } from 'react';

export default function Rebalance() {
  const { isDataLoaded } = usePortfolio();
  const [tab, setTab] = useState<'advisor' | 'advanced'>('advisor');

  if (!isDataLoaded) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="text-center">
          <Inbox className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Upload your portfolio to use the rebalancing simulator</p>
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
            <Scale className="w-4 h-4 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Collection Advisor</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Answer 3 quick questions and we'll tell you exactly where to put this month's budget.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'advisor' | 'advanced')} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="advisor">Advisor</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>
        <TabsContent value="advisor">
          <CollectionAdvisorWizard mode="asset" onCustomize={() => setTab('advanced')} />
        </TabsContent>
        <TabsContent value="advanced">
          <RebalanceSimulator />
        </TabsContent>
      </Tabs>

      {/* Disclaimer */}
      <div className="mt-8 p-4 rounded-xl bg-secondary/50 border border-border">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong className="text-foreground">Disclaimer:</strong> This simulator provides guidance based on your target allocations, 
          not financial advice. Market conditions, liquidity, and personal circumstances should inform your actual decisions. 
          Consider consulting a financial advisor for personalized guidance.
        </p>
      </div>
    </div>
  );
}
