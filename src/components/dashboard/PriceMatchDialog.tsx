import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, AlertTriangle, Search, RefreshCw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { usePortfolio } from '@/contexts/PortfolioContext';
import JustTCGSearch, { type SelectedProduct } from '@/components/buylist/JustTCGSearch';

interface PriceMatchDetail {
  id: string;
  productName: string;
  matchedName: string | null;
  matchedSetName: string | null;
  matchedCardNumber: string | null;
  matchedRarity: string | null;
  matchedPrice: number | null;
  confidence: string;
  originalPrice: number;
  setName: string | null;
  cardNumber: string | null;
}

interface PriceMatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  details: PriceMatchDetail[];
  stats: { matched: number; total: number };
}

function detectLanguage(name: string): 'english' | 'japanese' {
  return /\(jp\)|\(japanese\)|japanese|jp ver/i.test(name) ? 'japanese' : 'english';
}

function ManualSearchPanel({ itemId, productName, onSelect }: { itemId: string; productName: string; onSelect: (product: SelectedProduct) => void }) {
  const [lang, setLang] = useState<'english' | 'japanese'>(detectLanguage(productName));
  return (
    <div className="mt-1 pl-7">
      <div className="flex items-center gap-2 mb-2">
        <p className="text-xs text-muted-foreground">Search for the correct product:</p>
        <div className="flex gap-1 ml-auto">
          <button
            onClick={() => setLang('english')}
            className={cn('px-2 py-0.5 rounded text-[10px] font-medium border transition-colors',
              lang === 'english' ? 'bg-primary/20 text-primary border-primary/30' : 'bg-muted text-muted-foreground border-border'
            )}
          >
            English
          </button>
          <button
            onClick={() => setLang('japanese')}
            className={cn('px-2 py-0.5 rounded text-[10px] font-medium border transition-colors',
              lang === 'japanese' ? 'bg-primary/20 text-primary border-primary/30' : 'bg-muted text-muted-foreground border-border'
            )}
          >
            Japanese
          </button>
        </div>
      </div>
      <JustTCGSearch
        onSelect={onSelect}
        defaultLanguage={lang}
      />
    </div>
  );
}

function CardInfoLine({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <span className="text-xs text-muted-foreground">
      <span className="text-muted-foreground/60">{label}:</span> {value}
    </span>
  );
}

export function PriceMatchDialog({ open, onOpenChange, details, stats }: PriceMatchDialogProps) {
  const [filter, setFilter] = useState<'all' | 'matched' | 'unmatched'>('all');
  const [search, setSearch] = useState('');
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [manualSearchId, setManualSearchId] = useState<string | null>(null);
  const { updateItemPrice, retryMatchItem } = usePortfolio();

  const filtered = details.filter(d => {
    if (filter === 'matched' && (d.matchedPrice === null || d.confidence === 'none')) return false;
    if (filter === 'unmatched' && d.matchedPrice !== null && d.confidence !== 'none') return false;
    if (search && !d.productName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleRetry = async (itemId: string) => {
    setRetryingId(itemId);
    await retryMatchItem(itemId);
    setRetryingId(null);
  };

  const handleManualSelect = (itemId: string, product: SelectedProduct) => {
    if (product.price != null) {
      updateItemPrice(itemId, product.price, product.name);
    }
    setManualSearchId(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Card Match Results</DialogTitle>
        </DialogHeader>

        {/* Summary */}
        <div className="flex gap-3 mb-4">
          <button
            onClick={() => setFilter('all')}
            className={cn('px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
              filter === 'all' ? 'bg-primary/20 text-primary border-primary/30' : 'bg-muted text-muted-foreground border-border'
            )}
          >
            All ({stats.total})
          </button>
          <button
            onClick={() => setFilter('matched')}
            className={cn('px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
              filter === 'matched' ? 'bg-success/20 text-success border-success/30' : 'bg-muted text-muted-foreground border-border'
            )}
          >
            Matched ({stats.matched})
          </button>
          <button
            onClick={() => setFilter('unmatched')}
            className={cn('px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
              filter === 'unmatched' ? 'bg-destructive/20 text-destructive border-destructive/30' : 'bg-muted text-muted-foreground border-border'
            )}
          >
            Unmatched ({stats.total - stats.matched})
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Results list */}
        <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
          {filtered.map((item) => {
            const isMatched = item.matchedPrice !== null && item.confidence !== 'none';
            const isRetrying = retryingId === item.id;
            const isManualSearch = manualSearchId === item.id;

            return (
              <div key={item.id} className="flex flex-col rounded-lg border border-border bg-card overflow-hidden">
                {/* Row header with status icon and actions */}
                <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
                  <div className="flex items-center gap-2">
                    {isMatched ? (
                      item.confidence === 'high' ? (
                        <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
                      )
                    ) : (
                      <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                    )}
                    {isMatched && (
                      <Badge variant="outline" className={cn('text-[10px]',
                        item.confidence === 'high' ? 'text-success border-success/30' : 
                        item.confidence === 'medium' ? 'text-warning border-warning/30' : 'text-muted-foreground'
                      )}>
                        {item.confidence}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" disabled={isRetrying} onClick={() => handleRetry(item.id)}>
                      {isRetrying ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                      <span className="ml-1">Retry</span>
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setManualSearchId(isManualSearch ? null : item.id)}>
                      <Search className="w-3 h-3" />
                      <span className="ml-1">Find</span>
                    </Button>
                  </div>
                </div>

                {/* Two-column: CSV vs Matched */}
                <div className={cn("grid gap-0", isMatched ? "grid-cols-[1fr,auto,1fr]" : "grid-cols-1")}>
                  {/* CSV / Your Data */}
                  <div className="px-3 pb-3 pt-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1">Your CSV</p>
                    <p className="text-sm font-medium text-foreground leading-tight">{item.productName}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {item.setName && item.setName !== 'Uncategorized' && !/^(pokemon|magic|yugioh|cards?|sealed|tcg)$/i.test(item.setName.trim()) ? (
                        <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{item.setName}</span>
                      ) : item.matchedSetName ? (
                        <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{item.matchedSetName}</span>
                      ) : null}
                      {item.cardNumber && (
                        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">#{item.cardNumber}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">${item.originalPrice.toFixed(2)}</p>
                  </div>

                  {isMatched && (
                    <>
                      {/* Arrow divider */}
                      <div className="flex items-center justify-center px-1 text-muted-foreground/40">
                        <span className="text-lg">→</span>
                      </div>

                      {/* Matched card */}
                      <div className="px-3 pb-3 pt-1 bg-primary/[0.03] rounded-br-lg">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/60 mb-1">Matched To</p>
                        <p className="text-sm font-medium text-foreground leading-tight">{item.matchedName}</p>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {item.matchedSetName && (
                            <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">{item.matchedSetName}</span>
                          )}
                          {item.matchedCardNumber && (
                            <span className="text-[10px] text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded">#{item.matchedCardNumber}</span>
                          )}
                          {item.matchedRarity && (
                            <span className="text-[10px] text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded">{item.matchedRarity}</span>
                          )}
                        </div>
                        <p className="text-xs mt-1">
                          <span className="text-success font-medium">${item.matchedPrice!.toFixed(2)}</span>
                        </p>
                      </div>
                    </>
                  )}

                  {!isMatched && (
                    <div className="px-3 pb-3">
                      <p className="text-xs text-destructive">No match found • Using CSV price</p>
                    </div>
                  )}
                </div>

                {/* Manual search dropdown */}
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
          {filtered.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">No items match your filter.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
