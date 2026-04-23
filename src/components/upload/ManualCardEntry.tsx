import React, { useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Package, Search, CalendarIcon } from 'lucide-react';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
interface ManualCard {
  id: string;
  setName: string;
  productName: string;
  productType: 'sealed' | 'graded' | 'raw';
  gradingCompany?: string;
  gradeNumber?: string;
  grade?: string;
  cardCondition?: string;
  quantity: number;
  marketPrice: number;
  averageCostPaid: number;
  datePurchased?: string;
}




const PRODUCT_TYPES = [
  { value: 'sealed', label: 'Sealed Product', subtitle: 'Booster Box, ETB, etc.' },
  { value: 'graded', label: 'Graded Card', subtitle: 'PSA, BGS, CGC, etc.' },
  { value: 'raw', label: 'Raw Card', subtitle: 'Ungraded' },
];

const GRADING_COMPANIES = [
  { value: 'PSA', label: 'PSA' },
  { value: 'BGS', label: 'BGS' },
  { value: 'CGC', label: 'CGC' },
  { value: 'TAG', label: 'TAG' },
  { value: 'Other', label: 'Other' },
];

const GRADE_NUMBERS = ['10', '9.5', '9', '8.5', '8', '7.5', '7', '6.5', '6', '5.5', '5', '4', '3', '2', '1'];

const CONDITIONS = ['NM', 'LP', 'MP', 'HP', 'DMG'];

interface ManualCardEntryProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ManualCardEntry({ isOpen, onClose }: ManualCardEntryProps) {
  const { addItems } = usePortfolio();
  const [currentCard, setCurrentCard] = useState<Partial<ManualCard>>({
    productType: 'sealed',
    quantity: 1,
  });
  const [step, setStep] = useState<'form'>('form');
  
  // Clear all search state when dialog opens
  useEffect(() => {
    if (isOpen) {
      resetForm();
      setStep('form');
    }
  }, [isOpen]);
  
  // Card search state - powered by JustTCG
  const [cardSearchResults, setCardSearchResults] = useState<any[]>([]);
  const [cardSearchLoading, setCardSearchLoading] = useState(false);
  const [selectedCardImage, setSelectedCardImage] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const cardSearchDebounce = useRef<ReturnType<typeof setTimeout>>();
  const searchAbort = useRef<AbortController>();
  
  // Single source: currentCard.productName drives the search input
  const searchInputValue = currentCard.productName || '';
  
  // Search with natural language processing - auto-triggers as you type
  const searchCards = useCallback(async (q: string) => {
    if (q.length < 2) { setCardSearchResults([]); setDropdownOpen(false); return; }
    searchAbort.current?.abort();
    const controller = new AbortController();
    searchAbort.current = controller;
    setCardSearchLoading(true);
    try {
      const { data } = await supabase.functions.invoke('justtcg', {
        body: { action: 'search', query: q, limit: 15 },
      });
      if (controller.signal.aborted) return;
      const results = data?.data ?? [];
      setCardSearchResults(results);
      setDropdownOpen(results.length > 0);
    } catch {
      if (!controller.signal.aborted) setCardSearchResults([]);
    } finally {
      if (!controller.signal.aborted) setCardSearchLoading(false);
    }
  }, []);

  // Auto-search as user types with debounce
  useEffect(() => {
    clearTimeout(cardSearchDebounce.current);
    if (searchInputValue.length >= 2) {
      cardSearchDebounce.current = setTimeout(() => searchCards(searchInputValue), 350);
    } else {
      setCardSearchResults([]);
      setDropdownOpen(false);
    }
    return () => clearTimeout(cardSearchDebounce.current);
  }, [searchInputValue, searchCards]);

  const handleSelectCard = (result: any) => {
    const variant = result.variants?.find((v: any) => v.condition === 'Near Mint') 
      || result.variants?.find((v: any) => v.condition === 'Sealed') 
      || result.variants?.[0];
    const imageUrl = result.tcgplayerId
      ? `https://product-images.tcgplayer.com/fit-in/437x437/${result.tcgplayerId}.jpg`
      : null;
    
    // Detect product type: sealed stays sealed, cards auto-select raw
    const isSealed = variant?.condition === 'Sealed';

    // Build a descriptive display name for the search bar
    const parts = [result.name];
    if (result.set_name) parts.push(`- ${result.set_name}`);
    if (result.number) parts.push(`#${result.number}`);
    const displayName = parts.join(' ');
    
    setCurrentCard(prev => ({
      ...prev,
      productName: displayName,
      setName: result.set_name || prev.setName || '',
      marketPrice: variant?.price ?? prev.marketPrice,
      productType: isSealed ? 'sealed' : 'raw',
    }));
    setSelectedCardImage(imageUrl);
    setDropdownOpen(false);
    setCardSearchResults([]);
  };

  

  const resetForm = () => {
    setCurrentCard({
      productType: 'sealed',
      quantity: 1,
    });
    setCardSearchResults([]);
    setSelectedCardImage(null);
    setDropdownOpen(false);
  };

  const handleSubmitCard = () => {
    if (!currentCard.productName || !currentCard.marketPrice) {
      return;
    }

    // Combine grading company and grade number into grade string
    let gradeString: string | undefined;
    if (currentCard.productType === 'graded' && currentCard.gradingCompany && currentCard.gradeNumber) {
      gradeString = `${currentCard.gradingCompany} ${currentCard.gradeNumber}`;
    }

    const card: ManualCard = {
      id: crypto.randomUUID(),
      setName: currentCard.setName || '',
      productName: currentCard.productName!,
      productType: currentCard.productType as 'sealed' | 'graded' | 'raw',
      gradingCompany: currentCard.gradingCompany,
      gradeNumber: currentCard.gradeNumber,
      grade: gradeString,
      cardCondition: currentCard.productType === 'raw' ? currentCard.cardCondition : undefined,
      quantity: currentCard.quantity || 1,
      marketPrice: currentCard.marketPrice!,
      averageCostPaid: currentCard.averageCostPaid || 0,
      datePurchased: currentCard.datePurchased,
    };

    // Directly add to collection immediately
    const totalMarketValue = card.marketPrice * card.quantity;
    const totalCostBasis = card.averageCostPaid * card.quantity;
    const profitDollars = totalMarketValue - totalCostBasis;
    const gainPercent = totalCostBasis > 0 ? ((totalMarketValue - totalCostBasis) / totalCostBasis) * 100 : 0;
    const assetType: 'Slab' | 'Raw Card' | 'Sealed' = card.productType === 'sealed' ? 'Sealed' : card.productType === 'graded' ? 'Slab' : 'Raw Card';

    addItems([{
      id: card.id,
      productName: card.productName,
      category: card.setName || 'Uncategorized',
      setName: card.setName,
      quantity: card.quantity,
      marketPrice: card.marketPrice,
      averageCostPaid: card.averageCostPaid,
      grade: card.grade || '',
      cardNumber: '',
      dateAdded: card.datePurchased ? new Date(card.datePurchased) : null,
      condition: card.cardCondition,
      totalMarketValue,
      totalCostBasis,
      profitDollars,
      gainPercent,
      portfolioWeightPercent: 0,
      assetType,
      liquidityTier: 'Medium' as const,
      manuallyAdded: true,
    }]);

    resetForm();
  };

  const isFormValid = currentCard.productName && currentCard.marketPrice && currentCard.quantity;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Manual Portfolio Entry
          </DialogTitle>
          <DialogDescription className="text-left">
            Fill out each card to the best of your ability. This can be your current portfolio or your dream portfolio — we'll analyze it either way. We highly recommend a Collectr Pro Export or dedicated portfolio tracking software for the most accurate analysis, but this manual entry will still give you strong insights!
          </DialogDescription>
        </DialogHeader>

          <div className="space-y-6 pt-4">

            <div className="space-y-4">
               <div className="space-y-2">
                <Label htmlFor="productName">Product / Card Name *</Label>
                <div className="relative">
                  <div className="flex gap-3">
                    {selectedCardImage && (
                      <img src={selectedCardImage} alt="Selected product" className="w-24 h-32 object-contain rounded-lg border border-border flex-shrink-0" />
                    )}
                    <div className="flex-1 relative flex items-center">
                      <Search 
                        className="absolute left-3 h-4 w-4 text-muted-foreground z-10" 
                      />
                      <Input
                        id="productName"
                        placeholder="Start typing to search…"
                        className="pl-9 pr-9"
                        value={searchInputValue}
                        onChange={(e) => {
                          setCurrentCard(prev => ({ ...prev, productName: e.target.value }));
                          setSelectedCardImage(null);
                        }}
                      />
                      {cardSearchLoading && (
                        <div className="absolute right-3 h-4 w-4">
                          <div className="h-4 w-4 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                  </div>
                  

                  {dropdownOpen && cardSearchResults.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg">
                      <ScrollArea className="h-72">
                        <div className="p-1">
                          {cardSearchResults.map((r: any) => {
                            const variant = r.variants?.find((v: any) => v.condition === 'Near Mint') || r.variants?.find((v: any) => v.condition === 'Sealed') || r.variants?.[0];
                            const imgUrl = r.tcgplayerId
                              ? `https://product-images.tcgplayer.com/fit-in/100x100/${r.tcgplayerId}.jpg`
                              : null;
                            return (
                              <button
                                key={r.id}
                                type="button"
                                onClick={() => handleSelectCard(r)}
                                className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
                              >
                                {imgUrl && (
                                  <img src={imgUrl} alt="" className="w-10 h-14 object-contain rounded flex-shrink-0" />
                                )}
                                <div className="flex-1 text-left">
                                  <div className="font-medium truncate">{r.name}</div>
                                  <div className="text-xs text-muted-foreground truncate">
                                    {r.set_name}{r.number ? ` · #${r.number}` : ''}{r.rarity ? ` · ${r.rarity}` : ''}
                                  </div>
                                </div>
                                {variant?.price != null && (
                                  <span className="text-sm font-medium text-accent tabular-nums flex-shrink-0">
                                    ${variant.price.toFixed(2)}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                  
                  {dropdownOpen && searchInputValue.length >= 2 && cardSearchResults.length === 0 && !cardSearchLoading && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg p-3 text-sm text-muted-foreground text-center">
                      No products found. Type manually or try a different search.
                    </div>
                  )}
                </div>
                {dropdownOpen && (
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setDropdownOpen(false)}
                  />
                )}
                <p className="text-xs text-muted-foreground">
                    Search to auto-fill product details and market price
                </p>
               </div>
            </div>

            {/* Hidden set name field - auto-filled by search */}
            <input type="hidden" value={currentCard.setName || ''} />

            <div className="space-y-2">
              <Label>Product Type *</Label>
              <div className="grid grid-cols-3 gap-2">
                {PRODUCT_TYPES.map(type => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setCurrentCard(prev => ({ 
                      ...prev, 
                      productType: type.value as any, 
                      grade: undefined, 
                      gradingCompany: undefined,
                      gradeNumber: undefined,
                      cardCondition: undefined 
                    }))}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      currentCard.productType === type.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <span className="text-sm font-medium block">{type.label}</span>
                    <span className="text-xs text-muted-foreground">{type.subtitle}</span>
                  </button>
                ))}
              </div>
            </div>

            {currentCard.productType === 'graded' && (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Grading Company</Label>
                  <Select
                    value={currentCard.gradingCompany}
                    onValueChange={(value) => setCurrentCard(prev => ({ ...prev, gradingCompany: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select company..." />
                    </SelectTrigger>
                    <SelectContent>
                      {GRADING_COMPANIES.map(company => (
                        <SelectItem key={company.value} value={company.value}>{company.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {currentCard.gradingCompany && (
                  <div className="space-y-2">
                    <Label>Grade</Label>
                    <Select
                      value={currentCard.gradeNumber}
                      onValueChange={(value) => setCurrentCard(prev => ({ ...prev, gradeNumber: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select grade..." />
                      </SelectTrigger>
                      <SelectContent>
                        {GRADE_NUMBERS.map(grade => (
                          <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {currentCard.productType === 'raw' && (
              <div className="space-y-2">
                <Label>Card Condition</Label>
                <Select
                  value={currentCard.cardCondition}
                  onValueChange={(value) => setCurrentCard(prev => ({ ...prev, cardCondition: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select condition..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITIONS.map(condition => (
                      <SelectItem key={condition} value={condition}>{condition}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={currentCard.quantity || ''}
                  onChange={(e) => setCurrentCard(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="marketPrice">Market Price (per unit) *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="marketPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="pl-7"
                    value={currentCard.marketPrice || ''}
                    onChange={(e) => setCurrentCard(prev => ({ ...prev, marketPrice: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="averageCostPaid">Cost Paid (optional)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="averageCostPaid"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="pl-7"
                    value={currentCard.averageCostPaid || ''}
                    onChange={(e) => setCurrentCard(prev => ({ ...prev, averageCostPaid: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Date Purchased (optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !currentCard.datePurchased && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {currentCard.datePurchased
                      ? format(new Date(currentCard.datePurchased + 'T00:00:00'), 'PPP')
                      : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    captionLayout="dropdown-buttons"
                    fromYear={1999}
                    toYear={new Date().getFullYear()}
                    selected={currentCard.datePurchased ? new Date(currentCard.datePurchased + 'T00:00:00') : undefined}
                    onSelect={(date) => setCurrentCard(prev => ({
                      ...prev,
                      datePurchased: date ? format(date, 'yyyy-MM-dd') : undefined,
                    }))}
                    disabled={(date) => date > new Date()}
                    initialFocus
                    fixedWeeks
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSubmitCard}
                disabled={!isFormValid}
                className="flex-1"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Card/Product
              </Button>
            </div>
          </div>
      </DialogContent>
    </Dialog>
  );
}
