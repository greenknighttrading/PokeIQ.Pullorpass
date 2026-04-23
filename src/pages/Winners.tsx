import React from 'react';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { WinnersTable } from '@/components/winners/WinnersTable';
import { Inbox } from 'lucide-react';

export default function Winners() {
  const { isDataLoaded } = usePortfolio();

  if (!isDataLoaded) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="text-center">
          <Inbox className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Upload your portfolio to see top performers</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6 max-w-5xl mx-auto space-y-3">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Position Analytics</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Analyze performance, review returns, and evaluate profit-taking strategies
        </p>
      </div>

      {/* Winners Table */}
      <WinnersTable />
    </div>
  );
}
