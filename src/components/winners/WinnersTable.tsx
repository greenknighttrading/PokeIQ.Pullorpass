import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowUpDown, ChevronDown, ChevronUp, Filter, Info, Search, Loader2 } from 'lucide-react';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { cn } from '@/lib/utils';
import type { PortfolioItem } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import JustTCGSearch, { type SelectedProduct } from '@/components/buylist/JustTCGSearch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type SortField = 'gainPercent' | 'profitDollars' | 'totalMarketValue' | 'quantity' | 'cagr' | 'marketPrice' | 'totalCostBasis';
type SortDirection = 'asc' | 'desc';
type PerformanceFilter = 'all' | 'winners' | 'underperforming' | 100 | 200 | 400;

type ColumnId =
  | 'item'
  | 'mark'
  | 'totalMarket'
  | 'unitCost'
  | 'totalCost'
  | 'gainPercent'
  | 'cagr'
  | 'profitDollars'
  | 'quantity'
  | 'sellHalf';

const DEFAULT_COLUMN_ORDER: ColumnId[] = [
  'item',
  'quantity',
  'unitCost',
  'mark',
  'totalCost',
  'totalMarket',
  'profitDollars',
  'gainPercent',
  'cagr',
  'sellHalf',
];

function formatCurrency(value: number, maximumFractionDigits = 0) {
  return `$${value.toLocaleString('en-US', { maximumFractionDigits })}`;
}

// Calculate CAGR (Compound Annual Growth Rate) - uses full years only
function calculateCAGR(item: PortfolioItem): number | null {
  if (!item.dateAdded || item.totalCostBasis <= 0) return null;

  const now = new Date();
  // Handle both Date objects and string dates (from JSON)
  const dateAdded = item.dateAdded instanceof Date 
    ? item.dateAdded 
    : new Date(item.dateAdded);
  
  const msHeld = now.getTime() - dateAdded.getTime();
  const daysHeld = msHeld / (1000 * 60 * 60 * 24);

  // Round down to full years - need at least 1 year for CAGR
  const yearsHeld = Math.floor(daysHeld / 365);
  if (yearsHeld < 1) return null;

  const endingValue = item.totalMarketValue;
  const beginningValue = item.totalCostBasis;

  // CAGR = (Ending Value / Beginning Value)^(1/years) - 1
  return (Math.pow(endingValue / beginningValue, 1 / yearsHeld) - 1) * 100;
}

function moveItem<T>(arr: T[], fromIndex: number, toIndex: number) {
  const next = [...arr];
  const [removed] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, removed);
  return next;
}

export function WinnersTable() {
  const { items } = usePortfolio();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [sortField, setSortField] = useState<SortField>('gainPercent');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [performanceFilter, setPerformanceFilter] = useState<PerformanceFilter>('all');
  const [lookingUpId, setLookingUpId] = useState<string | null>(null);
  const [searchingItemId, setSearchingItemId] = useState<string | null>(null);
  const highlightId = searchParams.get('highlight');
  const highlightRef = useRef<HTMLTableRowElement>(null);

  const [columnOrder, setColumnOrder] = useState<ColumnId[]>(DEFAULT_COLUMN_ORDER);
  const [draggingCol, setDraggingCol] = useState<ColumnId | null>(null);

  // Scroll to highlighted row
  useEffect(() => {
    if (highlightId && highlightRef.current) {
      setTimeout(() => {
        highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [highlightId]);

  // Clear highlight after a few seconds
  useEffect(() => {
    if (highlightId) {
      const timer = setTimeout(() => {
        setSearchParams((prev) => { prev.delete('highlight'); return prev; }, { replace: true });
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [highlightId, setSearchParams]);

  // Look up a portfolio item's card_id in cards_justtcg
  const handleRowClick = useCallback(async (item: PortfolioItem) => {
    setLookingUpId(item.id);
    try {
      // Search by name in cards_justtcg
      const searchName = item.productName.replace(/\s*\(.*?\)\s*/g, '').trim();
      const { data } = await supabase
        .from('cards_justtcg')
        .select('id, name, set_name')
        .ilike('name', `%${searchName.substring(0, 40)}%`)
        .limit(5);

      if (data && data.length > 0) {
        // Try to find exact or best match
        const exact = data.find(c => c.name.toLowerCase() === item.productName.toLowerCase()) 
          || data.find(c => item.setName && c.set_name?.toLowerCase().includes(item.setName.toLowerCase()))
          || data[0];
        navigate(`/buylist/mover/${exact.id}`);
      } else {
        // No match found - show inline search
        setSearchingItemId(item.id);
      }
    } catch (err) {
      console.error('Card lookup failed:', err);
      setSearchingItemId(item.id);
    } finally {
      setLookingUpId(null);
    }
  }, [navigate]);

  const handleSearchSelect = useCallback((product: SelectedProduct) => {
    setSearchingItemId(null);
    if (product.tcgApiId) {
      navigate(`/buylist/mover/${product.tcgApiId}`);
    }
  }, [navigate]);

  const filteredAndSortedItems = useMemo(() => {
    let filtered = [...items];

    // Apply performance filter
    switch (performanceFilter) {
      case 'winners':
        filtered = filtered.filter((item) => item.gainPercent > 0);
        break;
      case 'underperforming':
        filtered = filtered.filter((item) => item.gainPercent < 0);
        break;
      case 100:
      case 200:
      case 400:
        filtered = filtered.filter((item) => item.gainPercent >= performanceFilter);
        break;
      default:
        break;
    }

    return filtered.sort((a, b) => {
      let aVal: number;
      let bVal: number;

      if (sortField === 'cagr') {
        aVal = calculateCAGR(a) ?? -Infinity;
        bVal = calculateCAGR(b) ?? -Infinity;
      } else if (sortField === 'marketPrice') {
        aVal = a.marketPrice;
        bVal = b.marketPrice;
      } else if (sortField === 'totalCostBasis') {
        aVal = a.totalCostBasis;
        bVal = b.totalCostBasis;
      } else {
        aVal = a[sortField];
        bVal = b[sortField];
      }

      const multiplier = sortDirection === 'desc' ? -1 : 1;
      return (aVal - bVal) * multiplier;
    });
  }, [items, sortField, sortDirection, performanceFilter]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortHeaderButton = ({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={() => handleSort(field)}
      className="inline-flex items-center gap-1 text-left hover:text-foreground transition-colors group"
    >
      {children}
      {sortField === field ? (
        sortDirection === 'desc' ? (
          <ChevronDown className="w-4 h-4 text-primary" />
        ) : (
          <ChevronUp className="w-4 h-4 text-primary" />
        )
      ) : (
        <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
      )}
    </button>
  );

  const getMilestoneLabel = (gainPercent: number) => {
    if (gainPercent >= 500) return { label: '500%+', class: 'bg-success/20 text-success' };
    if (gainPercent >= 300) return { label: '300%+', class: 'bg-success/15 text-success' };
    if (gainPercent >= 200) return { label: '200%+', class: 'bg-primary/15 text-primary' };
    if (gainPercent <= -30) return { label: 'Deep Loss', class: 'bg-destructive/15 text-destructive' };
    if (gainPercent <= -15) return { label: 'Loss', class: 'bg-warning/15 text-warning' };
    return null;
  };

  const calculateSellHalf = (item: PortfolioItem) => {
    const halfQuantity = item.quantity / 2;
    const profit = halfQuantity * item.marketPrice - halfQuantity * item.averageCostPaid;
    const remaining = Math.floor(halfQuantity);
    return { profit, remaining };
  };

  const filterOptions: { value: PerformanceFilter; label: string }[] = [
    { value: 'all', label: 'All Holdings' },
    { value: 'winners', label: 'Profitable' },
    { value: 'underperforming', label: 'Underperforming' },
    { value: 100, label: '≥100%' },
    { value: 200, label: '≥200%' },
    { value: 400, label: '≥400%' },
  ];

  const columns = useMemo(() => {
    const map: Record<ColumnId, {
      header: React.ReactNode;
      align: 'left' | 'right';
      cell: (item: PortfolioItem, index: number) => React.ReactNode;
      className?: string;
    }> = {
      item: {
        header: 'Item',
        align: 'left',
        cell: (item) => {
          const milestone = getMilestoneLabel(item.gainPercent);
          return (
            <div className="flex items-center gap-1.5">
              <div>
                <p className="text-xs font-medium text-foreground break-words whitespace-normal leading-tight" title={item.productName}>
                  {item.productName}
                </p>
                <p className="text-[10px] text-muted-foreground">{item.category}</p>
              </div>
              {milestone && (
                <span className={cn(
                  'px-1.5 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0',
                  milestone.class
                )}>
                  {milestone.label}
                </span>
              )}
            </div>
          );
        },
      },
      mark: {
        header: <SortHeaderButton field="marketPrice">MARK</SortHeaderButton>,
        align: 'right',
        cell: (item) => (
          <span className="tabular-nums text-xs text-foreground">{formatCurrency(item.marketPrice, 2)}</span>
        ),
      },
      totalMarket: {
        header: <SortHeaderButton field="totalMarketValue">Total Market</SortHeaderButton>,
        align: 'right',
        cell: (item) => (
          <span className="tabular-nums text-xs text-foreground">{formatCurrency(item.totalMarketValue, 0)}</span>
        ),
      },
      unitCost: {
        header: 'Unit Cost Basis',
        align: 'right',
        cell: (item) => (
          <span className="tabular-nums text-xs text-muted-foreground">{formatCurrency(item.averageCostPaid, 2)}</span>
        ),
      },
      totalCost: {
        header: <SortHeaderButton field="totalCostBasis">Total Cost</SortHeaderButton>,
        align: 'right',
        className: 'w-[80px] min-w-[80px]',
        cell: (item) => (
          <span className="tabular-nums text-xs text-muted-foreground">{formatCurrency(item.totalCostBasis, 0)}</span>
        ),
      },
      gainPercent: {
        header: <SortHeaderButton field="gainPercent">Gain %</SortHeaderButton>,
        align: 'right',
        cell: (item) => (
          <span
            className={cn(
              'tabular-nums text-xs font-medium',
              item.gainPercent >= 0 ? 'text-success' : 'text-destructive'
            )}
          >
            {item.gainPercent >= 0 ? '+' : ''}
            {item.gainPercent.toFixed(1)}%
          </span>
        ),
      },
      cagr: {
        header: <SortHeaderButton field="cagr">CAGR</SortHeaderButton>,
        align: 'right',
        cell: (item) => {
          const cagr = calculateCAGR(item);
          if (cagr === null) return <span className="text-[10px] text-muted-foreground">—</span>;
          return (
            <span className={cn('tabular-nums text-xs', cagr >= 0 ? 'text-success' : 'text-destructive')}>
              {cagr >= 0 ? '+' : ''}
              {cagr.toFixed(1)}%
            </span>
          );
        },
      },
      profitDollars: {
        header: <SortHeaderButton field="profitDollars">Profit $</SortHeaderButton>,
        align: 'right',
        cell: (item) => (
          <span
            className={cn(
              'tabular-nums text-xs font-medium',
              item.profitDollars >= 0 ? 'text-success' : 'text-destructive'
            )}
          >
            {item.profitDollars >= 0 ? '+' : ''}
            {formatCurrency(item.profitDollars, 0)}
          </span>
        ),
      },
      quantity: {
        header: <SortHeaderButton field="quantity">Units</SortHeaderButton>,
        align: 'right',
        className: 'w-[50px] min-w-[50px]',
        cell: (item) => <span className="tabular-nums text-xs text-foreground">{item.quantity}</span>,
      },
      sellHalf: {
        header: (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-1 cursor-help">
                  Sell-Half Sim
                  <Info className="w-3.5 h-3.5 text-muted-foreground" />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs p-3">
                <p className="text-sm">
                  <strong>100%+ Gain Strategy:</strong> When a position has doubled (100%+ gain), selling half locks in your original investment while keeping the remaining units as "free" exposure.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ),
        align: 'left',
        cell: (item) => {
          const sellHalf = calculateSellHalf(item);
          if (item.quantity < 2) return <span className="text-[10px] text-muted-foreground">Single unit</span>;
          if (item.gainPercent <= 0) return <span className="text-[10px] text-muted-foreground">—</span>;
          return (
            <div className="text-xs">
              <p className="text-muted-foreground">
                Lock in{' '}
                <span className="text-success font-medium">
                  {formatCurrency(sellHalf.profit, 0)}
                </span>
              </p>
              <p className="text-[10px] text-muted-foreground">
                Keep {sellHalf.remaining} unit{sellHalf.remaining !== 1 ? 's' : ''}
              </p>
            </div>
          );
        },
      },
    };

    return map;
  }, [sortField, sortDirection]);

  const handleHeaderDragStart = (colId: ColumnId) => (e: React.DragEvent) => {
    setDraggingCol(colId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', colId);
  };

  const handleHeaderDragOver = (_colId: ColumnId) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleHeaderDrop = (targetColId: ColumnId) => (e: React.DragEvent) => {
    e.preventDefault();
    const from = draggingCol ?? (e.dataTransfer.getData('text/plain') as ColumnId);
    if (!from || from === targetColId) return;

    setColumnOrder((prev) => {
      const fromIndex = prev.indexOf(from);
      const toIndex = prev.indexOf(targetColId);
      if (fromIndex === -1 || toIndex === -1) return prev;
      return moveItem(prev, fromIndex, toIndex);
    });

    setDraggingCol(null);
  };

  const handleHeaderDragEnd = () => {
    setDraggingCol(null);
  };

  return (
    <div className="space-y-3">
      {/* Filter Buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Show:</span>
        {filterOptions.map((filter) => (
          <button
            key={String(filter.value)}
            onClick={() => setPerformanceFilter(filter.value)}
            className={cn(
              'px-2 py-1 rounded-lg text-xs font-medium transition-all duration-200',
              performanceFilter === filter.value
                ? filter.value === 'underperforming'
                  ? 'bg-destructive text-destructive-foreground'
                  : 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="border border-border/40 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: '800px' }}>
            <thead>
              <tr className="border-b border-border/30">
                {columnOrder.map((colId, colIndex) => {
                  const col = columns[colId];
                  const isRight = col.align === 'right';
                  const isFirstCol = colIndex === 0;

                  return (
                    <th
                      key={colId}
                      draggable
                      onDragStart={handleHeaderDragStart(colId)}
                      onDragOver={handleHeaderDragOver(colId)}
                      onDrop={handleHeaderDrop(colId)}
                      onDragEnd={handleHeaderDragEnd}
                      className={cn(
                        'px-2 py-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider select-none whitespace-nowrap',
                        isRight ? 'text-right' : 'text-left',
                        'cursor-move',
                        draggingCol === colId && 'opacity-60',
                        isFirstCol && 'sticky left-0 z-20 bg-background border-r border-border/50 min-w-[280px] max-w-[360px]',
                        !isFirstCol && !col.className && 'min-w-[80px]',
                        col.className
                      )}
                      title="Drag to reorder columns"
                    >
                      {col.header}
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-border/20">
              {filteredAndSortedItems.map((item, index) => {
                const isHighlighted = highlightId === item.id;
                const isLookingUp = lookingUpId === item.id;
                const isSearching = searchingItemId === item.id;
                return (
                  <React.Fragment key={item.id}>
                    <tr
                      ref={isHighlighted ? highlightRef : undefined}
                      onClick={() => !isSearching && handleRowClick(item)}
                      className={cn(
                        "hover:bg-secondary/30 transition-colors animate-fade-in cursor-pointer",
                        isHighlighted && "bg-primary/10 ring-1 ring-primary/30"
                      )}
                      style={{ animationDelay: `${index * 30}ms` }}
                    >
                      {columnOrder.map((colId, colIndex) => {
                        const col = columns[colId];
                        const isRight = col.align === 'right';
                        const isFirstCol = colIndex === 0;
                        return (
                          <td
                            key={`${item.id}-${colId}`}
                          className={cn(
                            'px-2 py-1',
                              isRight ? 'text-right' : 'text-left',
                              isFirstCol && 'sticky left-0 z-10 bg-background border-r border-border/50 min-w-[280px] max-w-[360px]',
                              !isFirstCol && !col.className && 'min-w-[80px]',
                              !isFirstCol && 'whitespace-nowrap',
                              col.className
                            )}
                          >
                            {colId === 'item' && isLookingUp ? (
                              <div className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                <span className="text-xs text-muted-foreground">Finding card...</span>
                              </div>
                            ) : (
                              col.cell(item, index)
                            )}
                          </td>
                        );
                      })}
                    </tr>
                    {isSearching && (
                      <tr>
                        <td colSpan={columnOrder.length} className="p-0">
                          <div className="p-3 bg-muted/20 border-t border-border/50">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs text-muted-foreground">
                                <Search className="w-3 h-3 inline mr-1" />
                                No exact match found for "{item.productName}". Search manually:
                              </p>
                              <button onClick={(e) => { e.stopPropagation(); setSearchingItemId(null); }} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
                            </div>
                            <div onClick={(e) => e.stopPropagation()}>
                              <JustTCGSearch onSelect={handleSearchSelect} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredAndSortedItems.length === 0 && (
          <div className="px-4 py-12 text-center text-muted-foreground">
            <p>No holdings match the current filter.</p>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Tip: You can drag table headers to reorder columns. CAGR uses full years only. Sell-half simulations are for
        reference only.
      </p>
    </div>
  );
}
