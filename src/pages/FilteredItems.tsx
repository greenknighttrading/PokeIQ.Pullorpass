import React, { useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { ArrowLeft, Package, Layers, CreditCard, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ERA_INFO, PokemonEra } from '@/lib/types';
import { classifyItemEra } from '@/lib/eraClassification';
import type { PortfolioItem } from '@/lib/types';

function formatCurrency(value: number, maximumFractionDigits = 0) {
  return `$${value.toLocaleString('en-US', { maximumFractionDigits })}`;
}

export default function FilteredItems() {
  const { items } = usePortfolio();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const filterType = searchParams.get('type'); // 'asset' or 'era'
  const filterValue = searchParams.get('value'); // 'sealed', 'slabs', 'rawCards' OR 'vintage', 'classic', etc.

  const { filteredItems, title, subtitle, icon: Icon } = useMemo(() => {
    let filtered: PortfolioItem[] = [];
    let title = 'Holdings';
    let subtitle = '';
    let icon = Package;

    if (filterType === 'asset') {
      switch (filterValue) {
        case 'sealed':
          filtered = items.filter(item => item.assetType === 'Sealed');
          title = 'Sealed Products';
          subtitle = 'All sealed boxes, ETBs, and packs in your portfolio';
          icon = Package;
          break;
        case 'slabs':
          filtered = items.filter(item => item.assetType === 'Slab');
          title = 'Graded Cards';
          subtitle = 'All PSA, BGS, CGC, and other graded slabs';
          icon = Layers;
          break;
        case 'rawCards':
          filtered = items.filter(item => item.assetType === 'Raw Card');
          title = 'Raw Cards';
          subtitle = 'Ungraded singles and card lots';
          icon = CreditCard;
          break;
        default:
          filtered = items;
      }
    } else if (filterType === 'era') {
      const eraKey = filterValue as PokemonEra;
      filtered = items.filter(item => classifyItemEra(item) === eraKey);
      const eraInfo = ERA_INFO[eraKey];
      title = `${eraInfo?.name || 'Era'} Holdings`;
      subtitle = `${eraInfo?.years || ''} • ${eraInfo?.description || ''}`;
      icon = Clock;
    } else {
      filtered = items;
    }

    return { filteredItems: filtered, title, subtitle, icon };
  }, [items, filterType, filterValue]);

  // Calculate summary stats
  const totalValue = filteredItems.reduce((sum, item) => sum + item.totalMarketValue, 0);
  const totalCost = filteredItems.reduce((sum, item) => sum + item.totalCostBasis, 0);
  const totalProfit = totalValue - totalCost;
  const profitPercent = totalCost > 0 ? ((totalProfit / totalCost) * 100) : 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate(-1)}
          className="mb-4 -ml-2 gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="glass-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Holdings</p>
          <p className="text-xl font-bold tabular-nums">{filteredItems.length}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Value</p>
          <p className="text-xl font-bold tabular-nums">{formatCurrency(totalValue)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Cost Basis</p>
          <p className="text-xl font-bold tabular-nums">{formatCurrency(totalCost)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Profit/Loss</p>
          <p className={cn(
            "text-xl font-bold tabular-nums",
            totalProfit >= 0 ? "text-success" : "text-destructive"
          )}>
            {totalProfit >= 0 ? '+' : ''}{formatCurrency(totalProfit)}
            <span className="text-sm font-normal ml-1">
              ({profitPercent >= 0 ? '+' : ''}{profitPercent.toFixed(1)}%)
            </span>
          </p>
        </div>
      </div>

      {/* Items Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Item
                </th>
                <th className="px-3 sm:px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
                  Qty
                </th>
                <th className="px-3 sm:px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Market
                </th>
                <th className="px-3 sm:px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
                  Cost
                </th>
                <th className="px-3 sm:px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Gain
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredItems
                .sort((a, b) => b.totalMarketValue - a.totalMarketValue)
                .map((item, index) => (
                <tr 
                  key={item.id} 
                  className="hover:bg-secondary/30 transition-colors"
                  style={{ animationDelay: `${Math.min(index * 20, 300)}ms` }}
                >
                  <td className="px-3 sm:px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground text-sm line-clamp-2" title={item.productName}>
                        {item.productName}
                      </p>
                      <p className="text-xs text-muted-foreground">{item.category}</p>
                      <p className="text-xs text-muted-foreground sm:hidden">
                        Qty: {item.quantity}
                      </p>
                    </div>
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-right hidden sm:table-cell">
                    <span className="tabular-nums text-foreground">{item.quantity}</span>
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-right">
                    <span className="tabular-nums text-foreground">{formatCurrency(item.totalMarketValue)}</span>
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-right hidden sm:table-cell">
                    <span className="tabular-nums text-muted-foreground">{formatCurrency(item.totalCostBasis)}</span>
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-right">
                    <span className={cn(
                      "tabular-nums font-medium",
                      item.gainPercent >= 0 ? "text-success" : "text-destructive"
                    )}>
                      {item.gainPercent >= 0 ? '+' : ''}{item.gainPercent.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredItems.length === 0 && (
          <div className="px-4 py-12 text-center text-muted-foreground">
            <p>No holdings in this category.</p>
          </div>
        )}
      </div>
    </div>
  );
}
