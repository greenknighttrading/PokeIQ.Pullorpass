import React, { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Crown, ArrowLeft, Plus, Trash2, RefreshCcw, Save, KeyRound, Settings, ListOrdered, Loader2, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBuyList, type BuyListPick } from '@/contexts/BuyListContext';
import { useToast } from '@/hooks/use-toast';
import { processPortfolioData, classifyAssetType } from '@/lib/dataParser';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import JustTCGSearch, { type SelectedProduct } from '@/components/buylist/JustTCGSearch';

function PicksTab() {
  const { picks, addPick, updatePick, deletePick, addPriceSnapshot } = useBuyList();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    name: '', set_name: '', category: 'Sealed' as 'Sealed' | 'Single' | 'Slab',
    rank: 1, buy_zone_type: 'threshold' as 'threshold' | 'range',
    buy_price: '', buy_low: '', buy_high: '',
    allocation_pct: 10, confidence: 50,
    rationale: '', commentary: '', entry_style: 'DCA' as 'DCA' | 'Pullback' | 'Breakout' | 'Lump Sum',
    tcg_api_id: null as string | null, image_url: null as string | null,
  });
  const [priceForm, setPriceForm] = useState<{ pickId: string; price: string } | null>(null);

  const handleAddPick = async () => {
    if (!form.name.trim()) return;
    await addPick({
      item_id: null,
      name: form.name,
      set_name: form.set_name,
      category: form.category,
      language: 'English',
      image_url: form.image_url,
      url_reference: null,
      tcg_api_id: form.tcg_api_id,
      rank: form.rank,
      buy_zone_type: form.buy_zone_type,
      buy_price: form.buy_price ? parseFloat(form.buy_price) : null,
      buy_low: form.buy_low ? parseFloat(form.buy_low) : null,
      buy_high: form.buy_high ? parseFloat(form.buy_high) : null,
      allocation_pct: form.allocation_pct,
      confidence: form.confidence,
      rationale: form.rationale.split('\n').filter(Boolean),
      commentary: form.commentary || null,
      entry_style: form.entry_style,
      active: true,
    });
    setShowAdd(false);
  };

  const handleProductSelect = (product: SelectedProduct) => {
    const suggestedBuyPrice = product.price ? (product.price * 0.85).toFixed(2) : '';
    setForm(f => ({
      ...f,
      name: product.name,
      set_name: product.set_name,
      category: product.category,
      tcg_api_id: product.tcgApiId,
      image_url: product.imageUrl,
      buy_price: suggestedBuyPrice,
      rationale: product.price ? `Market price: $${product.price.toFixed(2)}` : '',
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Active Picks ({picks.length})</h2>
        <Button size="sm" variant="outline" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Pick
        </Button>
      </div>

      {showAdd && (
        <div className="glass-card p-4 space-y-3">
          <JustTCGSearch onSelect={handleProductSelect} categoryHint={form.category} />
          <Input placeholder="Product name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Set name" value={form.set_name} onChange={e => setForm(f => ({ ...f, set_name: e.target.value }))} />
            <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v as 'Sealed' | 'Single' | 'Slab' }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Sealed">Sealed</SelectItem>
                <SelectItem value="Single">Single</SelectItem>
                <SelectItem value="Slab">Slab</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input type="number" placeholder="Rank (1-10)" value={form.rank} onChange={e => setForm(f => ({ ...f, rank: parseInt(e.target.value) || 1 }))} min={1} max={10} />
            <Select value={form.buy_zone_type} onValueChange={v => setForm(f => ({ ...f, buy_zone_type: v as 'threshold' | 'range' }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="threshold">Threshold</SelectItem>
                <SelectItem value="range">Range</SelectItem>
              </SelectContent>
            </Select>
            <Select value={form.entry_style} onValueChange={v => setForm(f => ({ ...f, entry_style: v as 'DCA' | 'Pullback' | 'Breakout' | 'Lump Sum' }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="DCA">DCA</SelectItem>
                <SelectItem value="Pullback">Pullback</SelectItem>
                <SelectItem value="Breakout">Breakout</SelectItem>
                <SelectItem value="Lump Sum">Lump Sum</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.buy_zone_type === 'threshold' ? (
            <Input placeholder="Buy price (threshold)" value={form.buy_price} onChange={e => setForm(f => ({ ...f, buy_price: e.target.value }))} />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Buy low" value={form.buy_low} onChange={e => setForm(f => ({ ...f, buy_low: e.target.value }))} />
              <Input placeholder="Buy high" value={form.buy_high} onChange={e => setForm(f => ({ ...f, buy_high: e.target.value }))} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Input type="number" placeholder="Allocation %" value={form.allocation_pct} onChange={e => setForm(f => ({ ...f, allocation_pct: parseInt(e.target.value) || 0 }))} min={0} max={100} />
            <Input type="number" placeholder="Confidence (0-100)" value={form.confidence} onChange={e => setForm(f => ({ ...f, confidence: parseInt(e.target.value) || 0 }))} min={0} max={100} />
          </div>
          <textarea
            placeholder="Rationale (one bullet per line)"
            value={form.rationale}
            onChange={e => setForm(f => ({ ...f, rationale: e.target.value }))}
            className="w-full px-3 py-2 text-sm rounded-md bg-input border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            rows={3}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAddPick}>Save Pick</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {picks.map(pick => (
          <div key={pick.id} className="glass-card p-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent font-bold text-sm">
                {pick.rank}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{pick.name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{pick.category}</span>
                  <span>Price: {pick.currentPrice !== null ? `$${pick.currentPrice.toFixed(2)}` : '—'}</span>
                  <span>Alloc: {pick.allocation_pct}%</span>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs"
                onClick={() => setPriceForm({ pickId: pick.item_id ?? pick.id, price: '' })}
              >
                Update Price
              </Button>
              <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deletePick(pick.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
            {priceForm?.pickId === (pick.item_id ?? pick.id) && (
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="New price"
                  value={priceForm.price}
                  onChange={e => setPriceForm(f => f ? { ...f, price: e.target.value } : null)}
                  className="flex-1"
                />
                <Button size="sm" onClick={async () => {
                  if (priceForm.price) {
                    await addPriceSnapshot(priceForm.pickId, parseFloat(priceForm.price));
                    setPriceForm(null);
                  }
                }}>
                  <Save className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsTab() {
  const { nearZonePct, updateSettings, inviteCodes, createInviteCode, refreshPrices } = useBuyList();
  const [nzp, setNzp] = useState(String(nearZonePct));
  const [newCode, setNewCode] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  return (
    <div className="space-y-6">
      <div className="glass-card p-4">
        <h3 className="text-sm font-medium mb-3">Near Zone Threshold</h3>
        <div className="flex gap-2">
          <Input type="number" value={nzp} onChange={e => setNzp(e.target.value)} className="w-24" min={1} max={50} />
          <span className="text-sm text-muted-foreground self-center">%</span>
          <Button size="sm" onClick={() => updateSettings('near_zone_pct', nzp)}>Save</Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Items within this % of their buy zone target will show as "NEAR ZONE"</p>
      </div>

      <div className="glass-card p-4">
        <h3 className="text-sm font-medium mb-3">Refresh Prices</h3>
        <Button
          size="sm" variant="outline" disabled={refreshing}
          onClick={async () => { setRefreshing(true); await refreshPrices(); setRefreshing(false); }}
        >
          {refreshing ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <RefreshCcw className="w-3.5 h-3.5 mr-1" />}
          Refresh from JustTCG
        </Button>
        <p className="text-xs text-muted-foreground mt-2">Pulls latest prices for picks with a JustTCG API ID</p>
      </div>

      <div className="glass-card p-4">
        <h3 className="text-sm font-medium mb-3">Invite Codes</h3>
        <div className="flex gap-2 mb-3">
          <Input placeholder="NEW CODE" value={newCode} onChange={e => setNewCode(e.target.value.toUpperCase())} className="uppercase font-mono tracking-widest" />
          <Button size="sm" onClick={async () => { if (newCode.trim()) { await createInviteCode(newCode); setNewCode(''); } }}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add
          </Button>
        </div>
        <div className="space-y-2">
          {inviteCodes.map(inv => (
            <div key={inv.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <KeyRound className="w-3.5 h-3.5 text-muted-foreground" />
                <code className="font-mono text-xs">{inv.code}</code>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{inv.use_count}/{inv.max_uses} used</span>
                <Badge variant={inv.is_active ? 'default' : 'secondary'} className="text-[10px]">
                  {inv.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ImportTab() {
  const { addPick, addPriceSnapshot, refreshPicks, clearAllPicks, refreshPrices } = useBuyList();
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState('');
  const [results, setResults] = useState<{ success: number; failed: number; items: string[] } | null>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({ title: 'Invalid file', description: 'Please upload a CSV file.', variant: 'destructive' });
      return;
    }

    setImporting(true);
    setResults(null);
    setProgress('Parsing CSV...');

    try {
      const content = await file.text();
      const { items, validation } = processPortfolioData(content);

      if (!validation.isValid || items.length === 0) {
        toast({ title: 'Parse error', description: validation.errors.join(', '), variant: 'destructive' });
        setImporting(false);
        return;
      }

      // Sort by total market value descending, take top 10
      const sorted = [...items].sort((a, b) => b.totalMarketValue - a.totalMarketValue);
      const top10 = sorted.slice(0, 10);

      setProgress(`Found ${items.length} items. Clearing old picks...`);
      await clearAllPicks();

      setProgress(`Importing top 10 by value...`);

      let success = 0;
      let failed = 0;
      const importedNames: string[] = [];

      for (let i = 0; i < top10.length; i++) {
        const item = top10[i];
        setProgress(`(${i + 1}/10) Searching JustTCG for "${item.productName}"...`);

        const assetType = item.assetType;
        const category: 'Sealed' | 'Single' | 'Slab' = assetType === 'Raw Card' ? 'Single' : assetType === 'Slab' ? 'Slab' : 'Sealed';

        let tcgApiId: string | null = null;
        let apiMarketPrice: number | null = null;
        let imageUrl: string | null = null;

        // Search JustTCG API by product name
        try {
          const { data } = await supabase.functions.invoke('justtcg', {
            body: { action: 'search', query: item.productName, limit: 10 },
          });
          const results = data?.data ?? [];
          const searchLower = item.productName.toLowerCase();
          const searchHasCase = searchLower.includes('case');
          
          // Score matches: prefer exact name matches, penalize case/display-case when not searching for one
          const scored = results.map((r: { name: string }) => {
            const rLower = r.name.toLowerCase();
            let score = 0;
            // Exact match is best
            if (rLower === searchLower) score = 100;
            // Contains the full search term
            else if (rLower.includes(searchLower)) score = 80;
            // Search term contains the result name
            else if (searchLower.includes(rLower)) score = 60;
            // Partial match on first few words
            else {
              const words = searchLower.split(' ').slice(0, 4).join(' ');
              if (rLower.includes(words)) score = 40;
            }
            // Penalize case/display-case results when we're NOT looking for a case
            if (!searchHasCase && (rLower.includes(' case') || rLower.includes('display case'))) {
              score -= 50;
            }
            return { result: r, score };
          });
          
          scored.sort((a: { score: number }, b: { score: number }) => b.score - a.score);
          const match = scored.length > 0 && scored[0].score > 0 ? scored[0].result : results[0];

          if (match) {
            tcgApiId = match.id || null;
            // Construct image from TCGPlayer ID
            if (match.tcgplayerId) {
              imageUrl = `https://product-images.tcgplayer.com/fit-in/437x437/${match.tcgplayerId}.jpg`;
            }
            const preferredCondition = category === 'Sealed' ? 'Sealed' : 'Near Mint';
            const variant = match.variants?.find((v: { condition: string }) => v.condition === preferredCondition) || match.variants?.[0];
            if (variant?.price) {
              apiMarketPrice = variant.price;
            }
          }
        } catch (e) {
          console.error('JustTCG search failed for', item.productName, e);
        }

        // Use unit price from JustTCG API only
        const unitPrice = apiMarketPrice || (item.quantity > 0 ? item.totalMarketValue / item.quantity : 0);
        const totalAlloc = Math.round(100 / top10.length);

        try {
          await addPick({
            item_id: null,
            name: item.productName,
            set_name: item.category || '',
            category,
            language: 'English',
            image_url: imageUrl,
            url_reference: null,
            tcg_api_id: tcgApiId,
            rank: i + 1,
            buy_zone_type: 'threshold',
            buy_price: Math.round(unitPrice * 0.85 * 100) / 100,
            buy_low: null,
            buy_high: null,
            allocation_pct: totalAlloc,
            confidence: 50,
            rationale: [
              unitPrice > 0 ? `Market price: $${unitPrice.toFixed(2)}` : 'Price pending — refresh data',
            ],
            commentary: null,
            entry_style: 'DCA',
            active: true,
          });

          success++;
          importedNames.push(item.productName);
        } catch {
          failed++;
        }
      }

      setResults({ success, failed, items: importedNames });
      setProgress('Fetching live price history...');
      await refreshPicks();
      // Auto-refresh prices so charts have historical data
      await refreshPrices();
      setProgress('');
      toast({ title: 'Import complete!', description: `${success} picks imported with price history.` });
    } catch (e) {
      console.error('Import error:', e);
      toast({ title: 'Import failed', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  }, [addPick, addPriceSnapshot, refreshPicks, clearAllPicks, toast]);

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h2 className="font-semibold mb-1">Import Collection</h2>
        <p className="text-xs text-muted-foreground">Upload your Collectr CSV — the top 10 items by market value will be auto-imported as picks with live JustTCG pricing.</p>
      </div>

      <div
        onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={e => { e.preventDefault(); setIsDragging(false); }}
        className={cn(
          "relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer",
          isDragging ? "border-accent bg-accent/5" : "border-border hover:border-accent/50",
          importing && "pointer-events-none opacity-60"
        )}
      >
        <input
          type="file"
          accept=".csv"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={importing}
        />
        <div className="flex flex-col items-center gap-3">
          {importing ? (
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          ) : (
            <Upload className="w-8 h-8 text-muted-foreground" />
          )}
          <div>
            <p className="text-sm font-medium">
              {importing ? progress : 'Drop your CSV here or click to browse'}
            </p>
            {!importing && (
              <p className="text-xs text-muted-foreground mt-1">Same format as Portfolio Review (Collectr export)</p>
            )}
          </div>
        </div>
      </div>

      {results && (
        <div className="glass-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-success" />
            <span className="text-sm font-medium">{results.success} picks imported</span>
            {results.failed > 0 && (
              <Badge variant="destructive" className="text-xs">{results.failed} failed</Badge>
            )}
          </div>
          <ul className="space-y-1">
            {results.items.map((name, i) => (
              <li key={i} className="text-xs text-muted-foreground flex items-center gap-2">
                <span className="text-accent font-bold">#{i + 1}</span> {name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function BuyListAdmin() {
  const { isAdmin, hasAccess, checkingAccess } = useBuyList();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!checkingAccess && (!hasAccess || !isAdmin)) navigate('/buylist');
  }, [isAdmin, hasAccess, checkingAccess, navigate]);

  if (checkingAccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/buylist/list" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> BUY List
          </Link>
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-accent" />
            <span className="font-semibold text-sm">Admin Dashboard</span>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-6">
        <Tabs defaultValue="import" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="import" className="flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5" /> Import
            </TabsTrigger>
            <TabsTrigger value="picks" className="flex items-center gap-1.5">
              <ListOrdered className="w-3.5 h-3.5" /> Picks
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5" /> Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="import"><ImportTab /></TabsContent>
          <TabsContent value="picks"><PicksTab /></TabsContent>
          <TabsContent value="settings"><SettingsTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
