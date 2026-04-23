import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, Search, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

/* ── Filter Types ── */

export interface ScannerFilters {
  game: 'all' | 'Pokemon' | 'One Piece';
  type: 'all' | 'cards' | 'sealed' | 'grails';
  time: 'all' | '24h' | '7d' | '30d' | '90d';
  movement: 'all' | 'gainers' | 'losers' | 'volatile';
  price: 'any' | 'under10' | '10to50' | '50to100' | '100to400' | '400plus';
  pctChange: 'any' | '0to5' | '5to15' | '15to30' | '30to50' | '50plus';
}

export const DEFAULT_FILTERS: ScannerFilters = {
  game: 'Pokemon',
  type: 'cards',
  time: '7d',
  movement: 'all',
  price: 'any',
  pctChange: 'any',
};

/* ── Option Configs ── */

const GAME_OPTIONS = [
  { value: 'all', label: 'All Games' },
  { value: 'Pokemon', label: 'Pokémon' },
  { value: 'One Piece', label: 'One Piece' },
] as const;

const TYPE_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'cards', label: 'Cards' },
  { value: 'sealed', label: 'Sealed' },
] as const;

const TIME_OPTIONS = [
  { value: 'all', label: 'All Time' },
  { value: '24h', label: '24 Hours' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
] as const;

const MOVEMENT_OPTIONS = [
  { value: 'all', label: 'All Movement' },
  { value: 'gainers', label: 'Gainers 🔥' },
  { value: 'losers', label: 'Pullbacks 📉' },
  { value: 'volatile', label: 'Most Volatile ⚡' },
] as const;

const PRICE_OPTIONS = [
  { value: 'any', label: 'Any Price' },
  { value: 'under10', label: 'Under $10' },
  { value: '10to50', label: '$10 – $50' },
  { value: '50to100', label: '$50 – $100' },
  { value: '100to400', label: '$100 – $400' },
  { value: '400plus', label: '$400+' },
] as const;

const PCT_OPTIONS = [
  { value: 'any', label: 'Any %' },
  { value: '0to5', label: '0 – 5%' },
  { value: '5to15', label: '5 – 15%' },
  { value: '15to30', label: '15 – 30%' },
  { value: '30to50', label: '30 – 50%' },
  { value: '50plus', label: '50%+' },
] as const;

/* ── Pill Labels ── */

const GAME_PILLS: Record<string, string> = {
  'Pokemon': '🟡 Pokémon',
  'One Piece': '🏴‍☠️ One Piece',
};

const MOVEMENT_PILLS: Record<string, string> = {
  gainers: '🔥 Gainers',
  losers: '📉 Pullbacks',
  volatile: '⚡ Volatile',
};

const TIME_PILLS: Record<string, string> = {
  '24h': '24H',
  '7d': '7D',
  '30d': '30D',
  '90d': '90D',
};

const TYPE_PILLS: Record<string, string> = {
  cards: 'Cards',
  sealed: 'Sealed',
};

/* ── FilterDropdown ── */

interface FilterDropdownProps {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
}

function FilterDropdown({ label, value, options, onChange }: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className={cn(
          'flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all',
          'border border-border/60 bg-card/60 hover:bg-card',
          open && 'border-accent/50 bg-accent/5 ring-1 ring-accent/20'
        )}>
          <span className="text-muted-foreground text-[11px] hidden sm:inline">{label}:</span>
          <span className="text-foreground whitespace-nowrap">{selected?.label}</span>
          <ChevronDown className={cn('w-3 h-3 text-muted-foreground transition-transform', open && 'rotate-180')} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto min-w-[150px] p-1 bg-card border-border shadow-lg" align="start" sideOffset={6}>
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => { onChange(opt.value); setOpen(false); }}
            className={cn(
              'w-full text-left px-3 py-2 rounded-md text-sm transition-colors',
              value === opt.value
                ? 'bg-accent/15 text-accent font-medium'
                : 'text-foreground hover:bg-muted/50'
            )}
          >
            {opt.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

/* ── MarketScannerBar ── */

interface Props {
  filters: ScannerFilters;
  onChange: (filters: ScannerFilters) => void;
  onScan: () => void;
  onClear: () => void;
  isScanned: boolean;
  scanLabel?: string;
  keyword?: string;
  onKeywordChange?: (keyword: string) => void;
}

export default function MarketScannerBar({ filters, onChange, onScan, onClear, isScanned, scanLabel = 'Scan', keyword, onKeywordChange }: Props) {
  const isDefault =
    filters.game === 'Pokemon' &&
    filters.type === 'all' &&
    filters.time === '7d' &&
    filters.movement === 'gainers' &&
    filters.price === 'any' &&
    filters.pctChange === 'any';

  const pills: string[] = [];
  if (filters.game !== 'all' && filters.game !== 'Pokemon') pills.push(GAME_PILLS[filters.game] || '');
  pills.push(MOVEMENT_PILLS[filters.movement] || '');
  if (filters.time !== '7d') pills.push(TIME_PILLS[filters.time] || '');
  if (filters.type !== 'all') pills.push(TYPE_PILLS[filters.type] || '');
  if (filters.price !== 'any') {
    const p = PRICE_OPTIONS.find(o => o.value === filters.price);
    if (p) pills.push(p.label);
  }
  if (filters.pctChange !== 'any') {
    const pc = PCT_OPTIONS.find(o => o.value === filters.pctChange);
    if (pc) pills.push('Δ ' + pc.label);
  }

  return (
    <div className="space-y-2 sm:space-y-3">
      {/* Filter strip */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-xl border border-border/40 bg-muted/20 backdrop-blur-sm">
        <FilterDropdown
          label="Game"
          value={filters.game}
          options={GAME_OPTIONS}
          onChange={(v) => onChange({ ...filters, game: v as ScannerFilters['game'] })}
        />
        <FilterDropdown
          label="Types"
          value={filters.type}
          options={TYPE_OPTIONS}
          onChange={(v) => onChange({ ...filters, type: v as ScannerFilters['type'] })}
        />
        <FilterDropdown
          label="Time"
          value={filters.time}
          options={TIME_OPTIONS}
          onChange={(v) => onChange({ ...filters, time: v as ScannerFilters['time'] })}
        />
        <FilterDropdown
          label="Movement"
          value={filters.movement}
          options={MOVEMENT_OPTIONS}
          onChange={(v) => onChange({ ...filters, movement: v as ScannerFilters['movement'] })}
        />
        <FilterDropdown
          label="Price"
          value={filters.price}
          options={PRICE_OPTIONS}
          onChange={(v) => onChange({ ...filters, price: v as ScannerFilters['price'] })}
        />
        <FilterDropdown
          label="% Change"
          value={filters.pctChange}
          options={PCT_OPTIONS}
          onChange={(v) => onChange({ ...filters, pctChange: v as ScannerFilters['pctChange'] })}
        />
        {onKeywordChange !== undefined && (
          <div className="flex items-center gap-1.5 flex-1 min-w-[120px] sm:min-w-[140px] max-w-[200px] relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Keyword"
              value={keyword ?? ''}
              onChange={e => onKeywordChange(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') onScan(); }}
              className="w-full pl-7 sm:pl-8 pr-2 sm:pr-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm border border-border/60 bg-card/60 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent/30"
            />
          </div>
        )}
        <button
          onClick={onScan}
          className={cn(
            'flex items-center gap-1 sm:gap-1.5 px-4 sm:px-6 py-1.5 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all',
            'bg-primary text-primary-foreground hover:bg-primary/90',
            'shadow-sm hover:shadow-md'
          )}
        >
          {scanLabel} <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
      </div>

      {/* Active filter pills */}
      {isScanned && !isDefault && (
        <div className="flex items-center gap-2 flex-wrap">
          {pills.filter(Boolean).map(pill => (
            <span
              key={pill}
              className="px-2.5 py-1 rounded-full text-xs font-medium bg-success/10 text-success border border-success/20"
            >
              {pill}
            </span>
          ))}
          <span className="text-muted-foreground/40 text-xs">•</span>
          <button
            onClick={onClear}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
          >
            <X className="w-3 h-3" /> Clear
          </button>
        </div>
      )}
    </div>
  );
}
