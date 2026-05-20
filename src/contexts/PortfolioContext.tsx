import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import {
  PortfolioItem,
  PortfolioSummary,
  AllocationBreakdown,
  AllocationTarget,
  ConcentrationRisk,
  ProfitMilestone,
  Insight,
  ValidationResult,
  AllocationPreset,
  ALLOCATION_PRESETS,
  EraAllocationBreakdown,
  EraAllocationTarget,
  EraAllocationPreset,
  ERA_ALLOCATION_PRESETS,
} from '@/lib/types';
import { processPortfolioData, ColumnMapping } from '@/lib/dataParser';
import {
  calculatePortfolioSummary,
  calculateAllocationBreakdown,
  calculateConcentrationRisk,
  findProfitMilestones,
  generateInsights,
} from '@/lib/portfolioCalculations';
import { 
  calculateEraAllocationBreakdown, 
  calculateEraHealthScore, 
  calculateConcentrationHealthScore,
  calculateAssetHealthScore,
  calculatePositionConcentration,
  calculateSetConcentration,
  PositionConcentration
} from '@/lib/eraClassification';
import { supabase } from '@/integrations/supabase/client';

// Health score breakdown by dimension
export interface HealthScoreBreakdown {
  overall: number;
  assetScore: number;    // 45% weight
  eraScore: number;      // 35% weight
  concentrationScore: number; // 20% weight
}

// Portfolio comparison metrics
export interface PortfolioComparison {
  hasComparison: boolean;
  previousSummary: PortfolioSummary | null;
  previousAllocation: AllocationBreakdown | null;
  previousHealthScore: HealthScoreBreakdown | null;
  previousItemCount: number;
  // Changes
  valueChange: number;
  valueChangePercent: number;
  profitChange: number;
  healthScoreChange: number;
  itemCountChange: number;
  // New/removed items
  newItems: PortfolioItem[];
  removedItems: PortfolioItem[];
  // Allocation changes
  sealedChange: number;
  slabsChange: number;
  rawChange: number;
}

interface PortfolioContextType {
  // Data
  items: PortfolioItem[];
  validation: ValidationResult | null;
  detectedColumns: ColumnMapping | null;
  isDataLoaded: boolean;
  hasUploadedBefore: boolean;
  authInitialized: boolean;
  isPriceMatching: boolean;
  priceMatchProgress: { completed: number; total: number } | null;
  priceMatchStats: { matched: number; total: number } | null;
  priceMatchDetails: Array<{ id: string; productName: string; matchedName: string | null; matchedSetName: string | null; matchedCardNumber: string | null; matchedRarity: string | null; matchedPrice: number | null; confidence: string; originalPrice: number; setName: string | null; cardNumber: string | null; tcgplayerId: string | null }> | null;

  // Previous portfolio for comparison
  previousItems: PortfolioItem[];
  comparison: PortfolioComparison | null;

  // Metrics
  summary: PortfolioSummary | null;
  allocation: AllocationBreakdown | null;
  eraAllocation: EraAllocationBreakdown | null;
  concentration: ConcentrationRisk | null;
  healthScoreBreakdown: HealthScoreBreakdown | null;
  positionConcentration: PositionConcentration | null;
  setConcentration: {
    topSetPercent: number;
    topSetName: string;
    top3SetsPercent: number;
    top3SetsNames: string[];
    setBreakdown: { name: string; value: number; percent: number; count: number }[];
  } | null;
  milestones: ProfitMilestone[];
  insights: Insight[];

  // Targets
  allocationTarget: AllocationTarget;
  allocationPreset: AllocationPreset;
  setAllocationPreset: (preset: AllocationPreset) => void;
  setCustomTarget: (target: AllocationTarget) => void;
  
  // Era Targets
  eraAllocationTarget: EraAllocationTarget;
  eraAllocationPreset: EraAllocationPreset;
  setEraAllocationPreset: (preset: EraAllocationPreset) => void;
  setCustomEraTarget: (target: EraAllocationTarget) => void;

  // Actions
  uploadData: (csvContent: string) => void;
  uploadNewDataForComparison: (csvContent: string) => void;
  addItems: (newItems: PortfolioItem[]) => void;
  clearData: () => void;
  clearComparison: () => void;
  dismissInsight: (insightId: string) => void;
  refreshLivePrices: () => Promise<void>;
  updateItemPrice: (itemId: string, newPrice: number, matchedName: string) => void;
  updateItemField: (itemId: string, field: 'quantity' | 'averageCostPaid', value: number) => void;
  retryMatchItem: (itemId: string) => Promise<void>;
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [previousItems, setPreviousItems] = useState<PortfolioItem[]>([]);
  const [previousSummary, setPreviousSummary] = useState<PortfolioSummary | null>(null);
  const [previousAllocation, setPreviousAllocation] = useState<AllocationBreakdown | null>(null);
  const [previousHealthScore, setPreviousHealthScore] = useState<HealthScoreBreakdown | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [detectedColumns, setDetectedColumns] = useState<ColumnMapping | null>(null);
  const [allocationPreset, setAllocationPresetState] = useState<AllocationPreset>('balanced');
  const [customTarget, setCustomTargetState] = useState<AllocationTarget>(ALLOCATION_PRESETS.custom);
  const [eraAllocationPreset, setEraAllocationPresetState] = useState<EraAllocationPreset>('balanced');
  const [customEraTarget, setCustomEraTargetState] = useState<EraAllocationTarget>(ERA_ALLOCATION_PRESETS.custom);
  const [dismissedInsights, setDismissedInsights] = useState<Set<string>>(new Set());
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);

  const [hasUploadedBefore, setHasUploadedBefore] = useState(false);
  const [isPriceMatching, setIsPriceMatching] = useState(false);
  const [priceMatchProgress, setPriceMatchProgress] = useState<{ completed: number; total: number } | null>(null);
  const [priceMatchStats, setPriceMatchStatsRaw] = useState<{ matched: number; total: number } | null>(() => {
    try { const s = localStorage.getItem('pokeiq_match_stats'); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const [priceMatchDetails, setPriceMatchDetailsRaw] = useState<Array<{ id: string; productName: string; matchedName: string | null; matchedSetName: string | null; matchedCardNumber: string | null; matchedRarity: string | null; matchedPrice: number | null; confidence: string; originalPrice: number; setName: string | null; cardNumber: string | null; tcgplayerId: string | null }> | null>(() => {
    try { const s = localStorage.getItem('pokeiq_match_details'); return s ? JSON.parse(s) : null; } catch { return null; }
  });

  // Wrap setters to persist to localStorage
  const setPriceMatchStats = useCallback((val: React.SetStateAction<{ matched: number; total: number } | null>) => {
    setPriceMatchStatsRaw(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      try { if (next) localStorage.setItem('pokeiq_match_stats', JSON.stringify(next)); else localStorage.removeItem('pokeiq_match_stats'); } catch {}
      return next;
    });
  }, []);
  const setPriceMatchDetails = useCallback((val: React.SetStateAction<Array<{ id: string; productName: string; matchedName: string | null; matchedSetName: string | null; matchedCardNumber: string | null; matchedRarity: string | null; matchedPrice: number | null; confidence: string; originalPrice: number; setName: string | null; cardNumber: string | null; tcgplayerId: string | null }> | null>) => {
    setPriceMatchDetailsRaw(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      try { if (next) localStorage.setItem('pokeiq_match_details', JSON.stringify(next)); else localStorage.removeItem('pokeiq_match_details'); } catch {}
      return next;
    });
  }, []);

  // Initialize authentication and load existing portfolio
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check for existing session first
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setSessionId(session.user.id);
          // Load existing portfolio for this user
          await loadExistingPortfolio(session.user.id);
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
      } finally {
        setAuthInitialized(true);
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setSessionId(session.user.id);
        // Defer loading portfolio to avoid deadlock
        if (event === 'SIGNED_IN') {
          setTimeout(() => {
            loadExistingPortfolio(session.user.id);
          }, 0);
        }
      } else {
        setSessionId(null);
        // Clear data on logout
        setItems([]);
        setHasUploadedBefore(false);
      }
    });

    initAuth();

    return () => subscription.unsubscribe();
  }, []);

  // Load existing portfolio from database
  const loadExistingPortfolio = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('portfolios')
        .select('*')
        .eq('session_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error) {
        console.error('Failed to load portfolio:', error);
        return;
      }
      
      if (data && data.length > 0) {
        const portfolio = data[0];
        const loadedItems = portfolio.items as unknown as PortfolioItem[];
        if (loadedItems && loadedItems.length > 0) {
          // Convert dateAdded strings back to Date objects
          const itemsWithDates = loadedItems.map(item => ({
            ...item,
            dateAdded: item.dateAdded ? new Date(item.dateAdded) : null
          }));
          setItems(itemsWithDates);
          setHasUploadedBefore(true);
          // Restore persisted match data from summary if available
          const savedSummary = portfolio.summary as any;
          if (savedSummary?._matchStats) {
            setPriceMatchStats(savedSummary._matchStats);
          }
          if (savedSummary?._matchDetails) {
            setPriceMatchDetails(savedSummary._matchDetails);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load portfolio:', error);
    }
  };

  const isDataLoaded = items.length > 0;

  const allocationTarget = useMemo(() => {
    return allocationPreset === 'custom' ? customTarget : ALLOCATION_PRESETS[allocationPreset];
  }, [allocationPreset, customTarget]);

  const eraAllocationTarget = useMemo(() => {
    return eraAllocationPreset === 'custom' ? customEraTarget : ERA_ALLOCATION_PRESETS[eraAllocationPreset];
  }, [eraAllocationPreset, customEraTarget]);

  const summary = useMemo(() => {
    if (!isDataLoaded) return null;
    return calculatePortfolioSummary(items);
  }, [items, isDataLoaded]);

  const allocation = useMemo(() => {
    if (!isDataLoaded) return null;
    return calculateAllocationBreakdown(items);
  }, [items, isDataLoaded]);

  const eraAllocation = useMemo(() => {
    if (!isDataLoaded) return null;
    return calculateEraAllocationBreakdown(items);
  }, [items, isDataLoaded]);

  const concentration = useMemo(() => {
    if (!isDataLoaded) return null;
    return calculateConcentrationRisk(items);
  }, [items, isDataLoaded]);

  const setConcentrationData = useMemo(() => {
    if (!isDataLoaded) return null;
    return calculateSetConcentration(items);
  }, [items, isDataLoaded]);

  const positionConcentrationData = useMemo(() => {
    if (!isDataLoaded) return null;
    return calculatePositionConcentration(items);
  }, [items, isDataLoaded]);

  // Multi-dimensional health score: Asset 45%, Era 35%, Concentration 20%
  const healthScoreBreakdown = useMemo((): HealthScoreBreakdown | null => {
    if (!isDataLoaded || !allocation || !eraAllocation || !positionConcentrationData) return null;
    
    // Asset health score - sealed-dominant scoring
    const assetScore = calculateAssetHealthScore(
      allocation.sealed.percent,
      allocation.slabs.percent,
      allocation.rawCards.percent
    );
    
    // Era health score with hard floor at 50
    const eraScore = calculateEraHealthScore(eraAllocation);
    
    // Position concentration health score (based on individual positions, not sets)
    const concentrationScore = calculateConcentrationHealthScore(
      positionConcentrationData.top1Percent,
      positionConcentrationData.top3Percent,
      positionConcentrationData.top5Percent
    );
    
    // Weighted overall score
    const overall = Math.round(
      assetScore * 0.45 + 
      eraScore * 0.35 + 
      concentrationScore * 0.20
    );
    
    return {
      overall,
      assetScore: Math.round(assetScore),
      eraScore,
      concentrationScore,
    };
  }, [isDataLoaded, allocation, eraAllocation, positionConcentrationData]);

  const milestones = useMemo(() => {
    if (!isDataLoaded) return [];
    return findProfitMilestones(items);
  }, [items, isDataLoaded]);

  // Calculate comparison metrics
  const comparison = useMemo((): PortfolioComparison | null => {
    if (previousItems.length === 0) {
      return null;
    }

    const currentValue = summary?.totalMarketValue || 0;
    const prevValue = previousSummary?.totalMarketValue || 0;
    const valueChange = currentValue - prevValue;
    const valueChangePercent = prevValue > 0 ? ((currentValue - prevValue) / prevValue) * 100 : 0;

    const currentProfit = summary?.unrealizedPL || 0;
    const prevProfit = previousSummary?.unrealizedPL || 0;
    const profitChange = currentProfit - prevProfit;

    const currentHealthScore = healthScoreBreakdown?.overall || 0;
    const prevHealthScoreVal = previousHealthScore?.overall || 0;
    const healthScoreChange = currentHealthScore - prevHealthScoreVal;

    const itemCountChange = items.length - previousItems.length;

    // Find new and removed items by comparing product names
    const currentNames = new Set(items.map(i => i.productName.toLowerCase()));
    const previousNames = new Set(previousItems.map(i => i.productName.toLowerCase()));
    
    const newItems = items.filter(i => !previousNames.has(i.productName.toLowerCase()));
    const removedItems = previousItems.filter(i => !currentNames.has(i.productName.toLowerCase()));

    // Allocation changes
    const sealedChange = (allocation?.sealed.percent || 0) - (previousAllocation?.sealed.percent || 0);
    const slabsChange = (allocation?.slabs.percent || 0) - (previousAllocation?.slabs.percent || 0);
    const rawChange = (allocation?.rawCards.percent || 0) - (previousAllocation?.rawCards.percent || 0);

    return {
      hasComparison: true,
      previousSummary,
      previousAllocation,
      previousHealthScore,
      previousItemCount: previousItems.length,
      valueChange,
      valueChangePercent,
      profitChange,
      healthScoreChange,
      itemCountChange,
      newItems,
      removedItems,
      sealedChange,
      slabsChange,
      rawChange,
    };
  }, [previousItems, previousSummary, previousAllocation, previousHealthScore, items, summary, allocation, healthScoreBreakdown]);

  const insights = useMemo(() => {
    if (!isDataLoaded || !summary || !concentration || !allocation) return [];
    const allInsights = generateInsights(items, summary, concentration, milestones, allocation, allocationTarget);
    return allInsights.filter(insight => !dismissedInsights.has(insight.id));
  }, [items, isDataLoaded, summary, concentration, milestones, allocation, allocationTarget, dismissedInsights]);

  // Save portfolio data to backend when items change
  useEffect(() => {
    const saveToBackend = async () => {
      // Wait for auth to initialize and ensure we have a session
      if (items.length === 0 || !sessionId || !authInitialized) return;
      
      try {
        const portfolioData = {
          session_id: sessionId,
          raw_csv: '', // We'll store just the parsed data
          items: JSON.parse(JSON.stringify(items)),
          summary: JSON.parse(JSON.stringify({
            ...(summary || {}),
            _matchStats: priceMatchStats || undefined,
            _matchDetails: priceMatchDetails || undefined,
          })),
          allocation: allocation ? JSON.parse(JSON.stringify(allocation)) : null,
        };
        
        const { error } = await supabase.from('portfolios').insert(portfolioData);
        if (error) {
          console.error('Failed to save portfolio to backend:', error);
        }
      } catch (error) {
        console.error('Failed to save portfolio to backend:', error);
      }
    };
    
    saveToBackend();
  }, [items, sessionId, authInitialized, summary, allocation, priceMatchStats, priceMatchDetails]);

  // Match items to JustTCG for live pricing
  const matchPricesToJustTCG = useCallback(async (portfolioItems: PortfolioItem[]) => {
    if (portfolioItems.length === 0) return;
    setIsPriceMatching(true);
    setPriceMatchProgress({ completed: 0, total: portfolioItems.length });
    setPriceMatchStats(null);
    setPriceMatchDetails(null);
    
    try {
      const CHUNK_SIZE = 20;
      let totalMatched = 0;
      const updatedItems = [...portfolioItems];
      const allDetails: Array<{ id: string; productName: string; matchedName: string | null; matchedSetName: string | null; matchedCardNumber: string | null; matchedRarity: string | null; matchedPrice: number | null; confidence: string; originalPrice: number; setName: string | null; cardNumber: string | null; tcgplayerId: string | null }> = [];
      
      for (let i = 0; i < portfolioItems.length; i += CHUNK_SIZE) {
        const chunk = portfolioItems.slice(i, i + CHUNK_SIZE).map(item => ({
          id: item.id,
          productName: item.productName,
          category: item.category,
          assetType: item.assetType,
          cardNumber: item.cardNumber || undefined,
          printing: item.printing || undefined,
          condition: item.condition || item.grade || undefined,
          language: item.language || undefined,
          grade: item.grade || undefined,
          originalPrice: item.marketPrice,
        }));

        const { data, error } = await supabase.functions.invoke('match-prices', {
          body: { items: chunk },
        });

        if (error) {
          console.error('Price match error:', error);
          // Record unmatched for this chunk
          chunk.forEach(c => {
            const orig = portfolioItems.find(p => p.id === c.id);
            allDetails.push({ id: c.id, productName: c.productName, matchedName: null, matchedSetName: null, matchedCardNumber: null, matchedRarity: null, matchedPrice: null, confidence: 'none', originalPrice: orig?.marketPrice ?? 0, setName: orig?.setName ?? orig?.category ?? null, cardNumber: orig?.cardNumber ?? null, tcgplayerId: null });
          });
        setPriceMatchProgress(prev => {
          const newCompleted = Math.min(i + CHUNK_SIZE, portfolioItems.length);
          // Only update in increments of 5 (or when done)
          if (!prev || newCompleted === portfolioItems.length || newCompleted - prev.completed >= 5) {
            return { completed: newCompleted, total: portfolioItems.length };
          }
          return prev;
        });
          continue;
        }

        const results = data?.results || [];
        setPriceMatchProgress({ completed: Math.min(i + CHUNK_SIZE, portfolioItems.length), total: portfolioItems.length });
        for (const result of results) {
          const orig = portfolioItems.find(p => p.id === result.id);
          allDetails.push({
            id: result.id,
            productName: orig?.productName ?? '',
            matchedName: result.matchedName,
            matchedSetName: result.matchedSetName ?? null,
            matchedCardNumber: result.matchedCardNumber ?? null,
            matchedRarity: result.matchedRarity ?? null,
            matchedPrice: result.matchedPrice,
            confidence: result.confidence,
            originalPrice: orig?.marketPrice ?? 0,
            setName: orig?.setName ?? orig?.category ?? null,
            cardNumber: orig?.cardNumber ?? null,
            tcgplayerId: result.tcgplayerId ?? null,
          });

          if (result.matchedPrice !== null && result.confidence !== 'none') {
            const idx = updatedItems.findIndex(item => item.id === result.id);
            if (idx !== -1) {
              const item = updatedItems[idx];
              const newMarketPrice = result.matchedPrice;
              const newTotalMarketValue = item.quantity * newMarketPrice;
              const isCostZero = item.averageCostPaid === item.marketPrice;
              const effectiveCostBasis = isCostZero ? newTotalMarketValue : item.totalCostBasis;
              const profitDollars = isCostZero ? 0 : newTotalMarketValue - effectiveCostBasis;
              const gainPercent = isCostZero ? 0 : (effectiveCostBasis > 0 ? ((newTotalMarketValue - effectiveCostBasis) / effectiveCostBasis) * 100 : 0);
              
              updatedItems[idx] = {
                ...item,
                marketPrice: newMarketPrice,
                totalMarketValue: newTotalMarketValue,
                profitDollars,
                gainPercent,
              };
              totalMatched++;
            }
          }
        }
      }

      // Recalculate portfolio weights
      const totalValue = updatedItems.reduce((sum, item) => sum + item.totalMarketValue, 0);
      updatedItems.forEach(item => {
        item.portfolioWeightPercent = totalValue > 0 ? (item.totalMarketValue / totalValue) * 100 : 0;
      });

      setItems(updatedItems);
      setPriceMatchStats({ matched: totalMatched, total: portfolioItems.length });
      setPriceMatchDetails(allDetails);
    } catch (e) {
      console.error('Price matching failed:', e);
    } finally {
      setIsPriceMatching(false);
      setPriceMatchProgress(null);
    }
  }, []);

  const refreshLivePrices = useCallback(async () => {
    await matchPricesToJustTCG(items);
  }, [items, matchPricesToJustTCG]);

  const updateItemPrice = useCallback((itemId: string, newPrice: number, matchedName: string) => {
    setItems(prev => {
      const updated = prev.map(item => {
        if (item.id !== itemId) return item;
        const newTotalMarketValue = item.quantity * newPrice;
        const isCostZero = item.averageCostPaid === item.marketPrice;
        const effectiveCostBasis = isCostZero ? newTotalMarketValue : item.totalCostBasis;
        const profitDollars = isCostZero ? 0 : newTotalMarketValue - effectiveCostBasis;
        const gainPercent = isCostZero ? 0 : (effectiveCostBasis > 0 ? ((newTotalMarketValue - effectiveCostBasis) / effectiveCostBasis) * 100 : 0);
        return { ...item, marketPrice: newPrice, totalMarketValue: newTotalMarketValue, profitDollars, gainPercent };
      });
      const totalValue = updated.reduce((sum, i) => sum + i.totalMarketValue, 0);
      updated.forEach(i => { i.portfolioWeightPercent = totalValue > 0 ? (i.totalMarketValue / totalValue) * 100 : 0; });

      // Persist manual correction to user_asset_mappings for future imports
      const item = updated.find(i => i.id === itemId);
      if (item && sessionId) {
        const setNorm = (item.productName.split(' - ')[1] || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
        const nameNorm = item.productName.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
        const numberKey = item.cardNumber || '';
        const printingNorm = item.printing || 'Normal';
        const conditionNorm = item.condition || 'Near Mint';
        const languageNorm = item.language || 'English';
        const fingerprint = item.assetType === 'Sealed'
          ? `${setNorm}||${nameNorm}`
          : `${setNorm}|${numberKey}|${nameNorm}|${printingNorm}||${conditionNorm}|${languageNorm}`;

        supabase.from('user_asset_mappings').upsert({
          user_id: sessionId,
          upload_fingerprint: fingerprint,
          resolved_tcgplayer_id: null,
          resolved_variant_id: null,
          confidence: 1.0,
          method: 'manual',
        }, { onConflict: 'user_id,upload_fingerprint' }).then(({ error }) => {
          if (error) console.error('Failed to save manual mapping:', error);
        });
      }

      return updated;
    });
    // Update match details
    setPriceMatchDetails(prev => {
      if (!prev) return prev;
      return prev.map(d => d.id === itemId ? { ...d, matchedPrice: newPrice, matchedName, confidence: 'high' } : d);
    });
    setPriceMatchStats(prev => {
      if (!prev) return prev;
      const detail = priceMatchDetails?.find(d => d.id === itemId);
      const wasUnmatched = !detail?.matchedPrice || detail.confidence === 'none';
      return wasUnmatched ? { ...prev, matched: prev.matched + 1 } : prev;
    });
  }, [priceMatchDetails, sessionId]);

  const updateItemField = useCallback((itemId: string, field: 'quantity' | 'averageCostPaid', value: number) => {
    setItems(prev => {
      const updated = prev.map(item => {
        if (item.id !== itemId) return item;
        const newItem = { ...item, [field]: value };
        newItem.totalMarketValue = newItem.quantity * newItem.marketPrice;
        newItem.totalCostBasis = newItem.quantity * newItem.averageCostPaid;
        newItem.profitDollars = newItem.totalMarketValue - newItem.totalCostBasis;
        newItem.gainPercent = newItem.totalCostBasis > 0 ? ((newItem.totalMarketValue - newItem.totalCostBasis) / newItem.totalCostBasis) * 100 : 0;
        return newItem;
      });
      const totalValue = updated.reduce((sum, i) => sum + i.totalMarketValue, 0);
      updated.forEach(i => { i.portfolioWeightPercent = totalValue > 0 ? (i.totalMarketValue / totalValue) * 100 : 0; });
      return updated;
    });
  }, []);

  const retryMatchItem = useCallback(async (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    try {
      const { data, error } = await supabase.functions.invoke('match-prices', {
        body: { items: [{
          id: item.id,
          productName: item.productName,
          category: item.category,
          assetType: item.assetType,
          cardNumber: item.cardNumber || undefined,
          printing: item.printing || undefined,
          condition: item.condition || item.grade || undefined,
          language: item.language || undefined,
          grade: item.grade || undefined,
          originalPrice: item.marketPrice,
        }] },
      });
      if (error || !data?.results?.length) return;
      const result = data.results[0];
      if (result.matchedPrice !== null && result.confidence !== 'none') {
        updateItemPrice(itemId, result.matchedPrice, result.matchedName);
      }
    } catch (e) {
      console.error('Retry match failed:', e);
    }
  }, [items, updateItemPrice]);

  const uploadData = useCallback((csvContent: string) => {
    const result = processPortfolioData(csvContent);
    setItems(result.items);
    setValidation(result.validation);
    setDetectedColumns(result.detectedColumns);
    setDismissedInsights(new Set());
    setHasUploadedBefore(true);
    // Clear any previous comparison and match data when doing a fresh upload
    setPreviousItems([]);
    setPreviousSummary(null);
    setPreviousAllocation(null);
    setPreviousHealthScore(null);
    setPriceMatchStats(null);
    setPriceMatchDetails(null);
    // Auto-match prices after upload
    setTimeout(() => matchPricesToJustTCG(result.items), 500);
  }, [matchPricesToJustTCG]);

  // Upload new data for comparison - stores current as previous first
  const uploadNewDataForComparison = useCallback((csvContent: string) => {
    // Store current data as previous
    setPreviousItems(items);
    setPreviousSummary(summary);
    setPreviousAllocation(allocation);
    setPreviousHealthScore(healthScoreBreakdown);
    
    // Now process the new data
    const result = processPortfolioData(csvContent);
    setItems(result.items);
    setValidation(result.validation);
    setDetectedColumns(result.detectedColumns);
    setDismissedInsights(new Set());
    setHasUploadedBefore(true);
  }, [items, summary, allocation, healthScoreBreakdown]);

  // Add items to existing collection without re-matching (items already have prices from API)
  const addItems = useCallback((newItems: PortfolioItem[]) => {
    setItems(prev => {
      const merged = [...prev, ...newItems];
      // Recalculate portfolio weights
      const totalValue = merged.reduce((sum, item) => sum + item.totalMarketValue, 0);
      merged.forEach(item => {
        item.portfolioWeightPercent = totalValue > 0 ? (item.totalMarketValue / totalValue) * 100 : 0;
      });
      return merged;
    });
    setHasUploadedBefore(true);
  }, []);

  const clearData = useCallback(() => {
    setItems([]);
    setValidation(null);
    setDetectedColumns(null);
    setDismissedInsights(new Set());
    setPreviousItems([]);
    setPreviousSummary(null);
    setPreviousAllocation(null);
    setPreviousHealthScore(null);
  }, []);

  const clearComparison = useCallback(() => {
    setPreviousItems([]);
    setPreviousSummary(null);
    setPreviousAllocation(null);
    setPreviousHealthScore(null);
  }, []);

  const setAllocationPreset = useCallback((preset: AllocationPreset) => {
    setAllocationPresetState(preset);
  }, []);

  const setCustomTarget = useCallback((target: AllocationTarget) => {
    setCustomTargetState(target);
    setAllocationPresetState('custom');
  }, []);

  const dismissInsight = useCallback((insightId: string) => {
    setDismissedInsights(prev => new Set([...prev, insightId]));
  }, []);

  const setEraAllocationPreset = useCallback((preset: EraAllocationPreset) => {
    setEraAllocationPresetState(preset);
  }, []);

  const setCustomEraTarget = useCallback((target: EraAllocationTarget) => {
    setCustomEraTargetState(target);
    setEraAllocationPresetState('custom');
  }, []);

  const value: PortfolioContextType = {
    items,
    validation,
    detectedColumns,
    isDataLoaded,
    hasUploadedBefore,
    authInitialized,
    isPriceMatching,
    priceMatchProgress,
    priceMatchStats,
    priceMatchDetails,
    previousItems,
    comparison,
    summary,
    allocation,
    eraAllocation,
    concentration,
    healthScoreBreakdown,
    positionConcentration: positionConcentrationData,
    setConcentration: setConcentrationData,
    milestones,
    insights,
    allocationTarget,
    allocationPreset,
    setAllocationPreset,
    setCustomTarget,
    eraAllocationTarget,
    eraAllocationPreset,
    setEraAllocationPreset,
    setCustomEraTarget,
    uploadData,
    uploadNewDataForComparison,
    addItems,
    clearData,
    clearComparison,
    dismissInsight,
    refreshLivePrices,
    updateItemPrice,
    updateItemField,
    retryMatchItem,
  };

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  const context = useContext(PortfolioContext);
  if (context === undefined) {
    throw new Error('usePortfolio must be used within a PortfolioProvider');
  }
  return context;
}
