import React, { useState } from 'react';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Search, Package, Plus, CheckCircle2, XCircle, AlertTriangle, LayoutGrid, List, Pencil, X, Check, ChevronRight } from 'lucide-react';
import { PriceMatchDialog } from '@/components/dashboard/PriceMatchDialog';
import { ManualCardEntry } from '@/components/upload/ManualCardEntry';
import JustTCGSearch, { type SelectedProduct } from '@/components/buylist/JustTCGSearch';

function detectLanguage(name: string): 'english' | 'japanese' {
  return /\(jp\)|\(japanese\)|japanese|jp ver/i.test(name) ? 'japanese' : 'english';
}

function ManualSearchPanel({ itemId, productName, onSelect }: { itemId: string; productName: string; onSelect: (product: SelectedProduct) => void }) {
  const lang = detectLanguage(productName);
  return (
    <div className="px-3 py-2">
      <JustTCGSearch onSelect={onSelect} defaultLanguage={lang} />
    </div>
  );
}

interface EditingState {
  field: string;
  value: string;
}

export default function MyCollection() {
  const { isDataLoaded, items, priceMatchDetails, priceMatchStats, updateItemPrice, updateItemField, refreshLivePrices, isPriceMatching, priceMatchProgress } = usePortfolio();
  const [searchQuery, setSearchQuery] = useState('');
  const [manualSearchId, setManualSearchId] = useState<string | null>(null);
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
    return (sessionStorage.getItem('collection-view-mode') as 'grid' | 'table') || 'table';
  });

  const handleSetViewMode = (mode: 'grid' | 'table') => {
    setViewMode(mode);
    sessionStorage.setItem('collection-view-mode', mode);
  };
  const [editingItem, setEditingItem] = useState<{ id: string; field: 'quantity' | 'averageCostPaid'; value: string } | null>(null);
  const [showMatchDetails, setShowMatchDetails] = useState(false);

  const handleManualSelect = (itemId: string, product: SelectedProduct) => {
    if (product.price != null) {
      updateItemPrice(itemId, product.price, product.name);
    }
    setManualSearchId(null);
  };

  const detailMap = new Map((priceMatchDetails || []).map(d => [d.id, d]));

  const startEditing = (id: string, field: 'quantity' | 'averageCostPaid', currentValue: number) => {
    setEditingItem({ id, field, value: String(currentValue || '') });
  };

  const commitEdit = () => {
    if (!editingItem) return;
    const num = parseFloat(editingItem.value);
    if (!isNaN(num) && num >= 0) {
      updateItemField(editingItem.id, editingItem.field, editingItem.field === 'quantity' ? Math.round(num) : num);
    }
    setEditingItem(null);
  };
  
  const filteredItems = (items || []).filter(item => {
    if (!searchQuery) return true;
    return item.productName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Sort: synced items (with image) first, unsynced at bottom
  const displayItems = [...filteredItems].sort((a, b) => {
    const aDetail = detailMap.get(a.id);
    const bDetail = detailMap.get(b.id);
    const aSynced = aDetail?.matchedPrice != null && aDetail.confidence !== 'none' ? 1 : 0;
    const bSynced = bDetail?.matchedPrice != null && bDetail.confidence !== 'none' ? 1 : 0;
    return bSynced - aSynced;
  });

  const getMatchStatus = (item: any) => {
    const detail = detailMap.get(item.id);
    const isMatched = detail ? (detail.matchedPrice !== null && detail.confidence !== 'none') : false;
    return { detail, isMatched };
  };

  const getGainPercent = (item: any) => {
    if (!item.averageCostPaid || item.averageCostPaid === 0) return null;
    return ((item.marketPrice - item.averageCostPaid) / item.averageCostPaid) * 100;
  };

  if (!isDataLoaded || !items || items.length === 0) {
    return (
      <div className="p-3 sm:p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Manage Collection</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Add cards and products to build your portfolio</p>
        </div>
        <div className="text-center py-12 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto">
            <Package className="w-7 h-7 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-bold">Start Your Collection</h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Add your first card or product to begin tracking your portfolio.
          </p>
          <Button onClick={() => setManualEntryOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Card / Product
          </Button>
        </div>
        <ManualCardEntry isOpen={manualEntryOpen} onClose={() => setManualEntryOpen(false)} />
      </div>
    );
  }

  const stats = priceMatchStats || { matched: 0, total: items?.length || 0 };
  const matchPct = stats.total > 0 ? ((stats.matched / stats.total) * 100).toFixed(0) : '0';

  return (
    <div className="p-3 sm:p-4 lg:p-6 max-w-5xl mx-auto space-y-3">
      {priceMatchStats && priceMatchDetails && (
        <PriceMatchDialog
          open={showMatchDetails}
          onOpenChange={setShowMatchDetails}
          details={priceMatchDetails}
          stats={priceMatchStats}
        />
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Manage Collection</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {items.length} items · {matchPct}% matched
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {priceMatchStats && !isPriceMatching && (
            <button
              onClick={() => setShowMatchDetails(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success/10 border border-success/20 hover:bg-success/15 transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-success flex-shrink-0" />
              <span className="text-xs text-success font-medium whitespace-nowrap">
                {priceMatchStats.matched}/{priceMatchStats.total} matched
              </span>
              <ChevronRight className="w-3 h-3 text-success" />
            </button>
          )}
          {isPriceMatching && priceMatchProgress ? (
            <Button variant="outline" disabled className="gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Calibrating… {priceMatchProgress.completed}/{priceMatchProgress.total}
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => refreshLivePrices()}
              disabled={isPriceMatching}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Calibrate to Live Data
            </Button>
          )}
        </div>
      </div>

      {/* Tips banner */}
      <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-1.5 text-[11px] text-muted-foreground">
        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
        <span>Click any <strong>Qty</strong> or <strong>Cost</strong> value to edit inline · <strong>Calibrate to Live Data</strong> to sync prices &amp; unlock card images</span>
      </div>

      {/* Search + View Toggle */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search your collection..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <div className="flex border border-border rounded-md">
          <Button
            variant={viewMode === 'table' ? 'secondary' : 'ghost'}
            size="sm"
            className="rounded-r-none h-10 px-3"
            onClick={() => handleSetViewMode('table')}
          >
            <List className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            className="rounded-l-none h-10 px-3"
            onClick={() => handleSetViewMode('grid')}
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="border border-border/40 rounded-lg [&_>div]:overflow-visible">
          <Table className="table-fixed w-full">
            <TableHeader>
              <TableRow className="[&>th]:py-2 [&>th]:px-2 [&>th]:h-auto text-xs border-border/30">
                <TableHead className="w-[3%]">#</TableHead>
                <TableHead className="w-[42%]">Item</TableHead>
                <TableHead className="w-[15%]">Set</TableHead>
                <TableHead className="w-[8%] text-right">Qty</TableHead>
                <TableHead className="w-[10%] text-right">Market</TableHead>
                <TableHead className="w-[10%] text-right">Cost</TableHead>
                <TableHead className="w-[9%] text-right">Gain</TableHead>
                <TableHead className="w-[3%]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayItems.map((item, index) => {
                const { detail, isMatched } = getMatchStatus(item);
                const gain = getGainPercent(item);
                const price = isMatched && detail?.matchedPrice ? detail.matchedPrice : item.marketPrice;
                const isManualSearch = manualSearchId === item.id;
                const tcgpId = detail?.tcgplayerId;
                const imageUrl = tcgpId ? `https://product-images.tcgplayer.com/fit-in/437x437/${tcgpId}.jpg` : undefined;

                return (
                  <React.Fragment key={item.id}>
                    <TableRow className="group [&>td]:py-1 [&>td]:px-2 border-border/20">
                      <TableCell className="text-[10px] text-muted-foreground/40 font-mono">{index + 1}</TableCell>
                      <TableCell className="text-xs font-medium">
                        <div className="flex items-center gap-1.5">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={item.productName}
                              className="w-6 h-8 object-contain rounded flex-shrink-0"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          ) : (
                            <div className="w-6 flex-shrink-0" />
                          )}
                          <span className="break-words whitespace-normal leading-tight">{item.productName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-[11px] text-muted-foreground truncate">
                        {item.setName && item.setName !== 'Uncategorized' ? item.setName : '—'}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {editingItem?.id === item.id && editingItem.field === 'quantity' ? (
                          <Input
                            type="number"
                            min={1}
                            value={editingItem.value}
                            onChange={(e) => setEditingItem({ ...editingItem, value: e.target.value })}
                            onBlur={commitEdit}
                            onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingItem(null); }}
                            className="w-14 h-6 text-right text-xs ml-auto p-1"
                            autoFocus
                          />
                        ) : (
                          <span
                            className="cursor-pointer hover:text-primary transition-colors"
                            onClick={() => startEditing(item.id, 'quantity', item.quantity)}
                          >
                            {item.quantity}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium tabular-nums">${price.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums">
                        {editingItem?.id === item.id && editingItem.field === 'averageCostPaid' ? (
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            value={editingItem.value}
                            onChange={(e) => setEditingItem({ ...editingItem, value: e.target.value })}
                            onBlur={commitEdit}
                            onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingItem(null); }}
                            className="w-16 h-6 text-right text-xs ml-auto p-1"
                            autoFocus
                          />
                        ) : (
                          <span
                            className="cursor-pointer hover:text-primary transition-colors text-muted-foreground"
                            onClick={() => startEditing(item.id, 'averageCostPaid', item.averageCostPaid)}
                          >
                            {item.averageCostPaid ? `$${item.averageCostPaid.toFixed(2)}` : '—'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-[11px] font-medium tabular-nums">
                        {gain !== null ? (
                          <span className={gain >= 0 ? 'text-success' : 'text-warning'}>
                            {gain >= 0 ? '+' : ''}{gain.toFixed(1)}%
                          </span>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="p-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => setManualSearchId(isManualSearch ? null : item.id)}
                        >
                          <Search className="w-3 h-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    {isManualSearch && (
                      <TableRow>
                        <TableCell colSpan={8} className="p-0">
                          <ManualSearchPanel
                            itemId={item.id}
                            productName={item.productName}
                            onSelect={(product) => handleManualSelect(item.id, product)}
                          />
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
          {displayItems.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">No items match your search.</p>
          )}
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {displayItems.map((item) => {
            const { detail, isMatched } = getMatchStatus(item);
            const gain = getGainPercent(item);
            const price = isMatched && detail?.matchedPrice ? detail.matchedPrice : item.marketPrice;
            const isManualSearch = manualSearchId === item.id;
            const tcgpId = detail?.tcgplayerId;
            const imageUrl = tcgpId ? `https://product-images.tcgplayer.com/fit-in/437x437/${tcgpId}.jpg` : undefined;

            return (
              <div key={item.id} className="rounded-lg border border-border bg-card overflow-hidden group relative">
                {/* Card image */}
                {imageUrl ? (
                  <div className="aspect-[3/4] bg-muted/30 overflow-hidden">
                    <img
                      src={imageUrl}
                      alt={item.productName}
                      className="w-full h-full object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
                    />
                  </div>
                ) : (
                  <div className="aspect-[3/4] bg-muted/20 flex items-center justify-center">
                    <Package className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                )}
                {/* Card info */}
                <div className="p-2 space-y-1">
                  <p className="text-[11px] font-medium text-foreground line-clamp-2 leading-tight">{item.productName}</p>
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-semibold tabular-nums">${price.toFixed(2)}</span>
                    {gain !== null && (
                      <span className={cn('text-[10px] font-medium tabular-nums', gain >= 0 ? 'text-success' : 'text-warning')}>
                        {gain >= 0 ? '+' : ''}{gain.toFixed(1)}%
                      </span>
                    )}
                  </div>
                  {item.quantity > 1 && (
                    <p className="text-[10px] text-muted-foreground">×{item.quantity}</p>
                  )}
                </div>
                {/* Hover action */}
                <button
                  onClick={() => setManualSearchId(isManualSearch ? null : item.id)}
                  className="absolute inset-x-0 bottom-0 bg-primary/90 text-primary-foreground text-[10px] font-medium py-1.5 text-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Search className="w-3 h-3 inline mr-1" />
                  Find Match
                </button>
                {isManualSearch && (
                  <ManualSearchPanel
                    itemId={item.id}
                    productName={item.productName}
                    onSelect={(product) => handleManualSelect(item.id, product)}
                  />
                )}
              </div>
            );
          })}
          {displayItems.length === 0 && (
            <p className="col-span-full text-center text-sm text-muted-foreground py-8">No items match your search.</p>
          )}
        </div>
      )}

      <ManualCardEntry isOpen={manualEntryOpen} onClose={() => setManualEntryOpen(false)} />
    </div>
  );
}
