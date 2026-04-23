import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import WatchlistButton from '../WatchlistButton';
import {
  MoverCard,
  getBuyScore,
  getRecommendation,
  getPriceRange,
  getImageUrl,
  getChangeForTime,
} from './signalHelpers';

interface Props {
  card: MoverCard;
  index: number;
  timeFilter: string;
  movementFilter: string;
}

export default function MoverCardRow({ card, index, timeFilter, movementFilter }: Props) {
  const navigate = useNavigate();

  const buildDetailUrl = () => {
    const params = new URLSearchParams();
    if ((card as any).printing) params.set('printing', (card as any).printing);
    if ((card as any).condition) params.set('condition', (card as any).condition);
    const qs = params.toString();
    return `/buylist/mover/${card.card_id || card.id}${qs ? `?${qs}` : ''}`;
  };

  const resolveTime = (): { change: number | null; label: string } => {
    if (timeFilter !== 'all') {
      return { change: getChangeForTime(card, timeFilter), label: timeFilter.toUpperCase() };
    }
    if (card.price_change_7d != null) return { change: card.price_change_7d, label: '7D' };
    if (card.price_change_30d != null) return { change: card.price_change_30d, label: '30D' };
    if (card.price_change_90d != null) return { change: card.price_change_90d, label: '90D' };
    return { change: null, label: '' };
  };

  const { change, label: changeLabel } = resolveTime();
  const effectiveTime = timeFilter === 'all' ? '7d' : timeFilter;
  const price = card.price;
  const imgUrl = getImageUrl(card);
  const { buyScore } = getBuyScore(card);
  const rec = getRecommendation(buyScore, card);
  const range = getPriceRange(card, effectiveTime);
  const isVolatile = movementFilter === 'volatile';

  // If a common/uncommon card is over $10, it's likely the reverse holo variant
  const isLikelyReverseHolo = price != null && price > 10 &&
    card.rarity != null && /^(common|uncommon)$/i.test(card.rarity.trim());
  const displayName = isLikelyReverseHolo ? `${card.name} (Reverse Holo)` : card.name;

  const renderRange = () => {
    const t = effectiveTime;
    const pctChange = getChangeForTime(card, t);
    if (range.min != null && range.max != null) {
      return (
        <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums font-medium">
          <span className="text-muted-foreground/70">Low</span> ${range.min.toFixed(2)} – <span className="text-muted-foreground/70">High</span> ${range.max.toFixed(2)}
        </p>
      );
    }
    if (price != null && pctChange != null) {
      const estLow = price / (1 + Math.abs(pctChange) / 100);
      const estHigh = price;
      return (
        <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums font-medium">
          <span className="text-muted-foreground/70">Low</span> ${Math.min(estLow, estHigh).toFixed(2)} – <span className="text-muted-foreground/70">High</span> ${Math.max(estLow, estHigh).toFixed(2)}
        </p>
      );
    }
    return <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">{t}: —</p>;
  };

  const signalDot = (
    <span className={cn(
      'w-2.5 h-2.5 rounded-full flex-shrink-0',
      rec.color === 'text-success' ? 'bg-success' :
      rec.color === 'text-primary' ? 'bg-primary' :
      rec.color === 'text-blue-400' ? 'bg-blue-400' :
      rec.color === 'text-yellow-400' ? 'bg-yellow-400' :
      'bg-orange-400'
    )} />
  );

  const watchlistBtnInline = (
    <WatchlistButton
      card={{
        card_id: card.card_id || card.id,
        name: card.name,
        set_name: card.set_name,
        product_type: card.product_type,
        tcgplayer_id: card.tcgplayer_id,
        rarity: card.rarity,
      }}
    />
  );

  const watchlistBtnFull = (
    <div onClick={(e) => e.stopPropagation()}>
      <WatchlistButton
        card={{
          card_id: card.card_id || card.id,
          name: card.name,
          set_name: card.set_name,
          product_type: card.product_type,
          tcgplayer_id: card.tcgplayer_id,
          rarity: card.rarity,
        }}
        size="default"
        showLabel
        className="w-full justify-center rounded-lg border border-border/40 bg-secondary/20 hover:bg-primary/10 hover:border-primary/30 py-2.5 text-sm font-medium"
      />
    </div>
  );

  const priceBlock = (
    <div className="flex flex-col items-end">
      {price != null && (
        <span className="text-sm font-bold text-foreground tabular-nums">
          ${price.toFixed(2)}
        </span>
      )}
      {change != null && (
        <div className={cn(
          'flex items-center gap-0.5 text-xs font-bold tabular-nums',
          isVolatile
            ? 'text-accent'
            : change > 0 ? 'text-success' : 'text-warning'
        )}>
          {isVolatile ? (
            <span className="text-[10px]">⚡</span>
          ) : change > 0 ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          <span className="text-[9px] font-medium text-muted-foreground">{changeLabel}</span>
          {change > 0 ? '+' : ''}{change.toFixed(1)}%
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* ── Mobile: stacked card ── */}
      <div
        className="sm:hidden glass-card p-3 hover:border-primary/30 transition-colors group cursor-pointer"
        onClick={() => navigate(buildDetailUrl())}
      >
        <div className="flex gap-3">
          {/* Rank badge overlaid on image area */}
          <div className="relative flex-shrink-0 w-20">
            <div className="absolute -top-1 -left-1 z-10 w-6 h-6 rounded-md bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px]">
              {index + 1}
            </div>
            {imgUrl ? (
              <img
                src={imgUrl}
                alt={card.name}
                className="w-20 h-28 object-contain rounded-lg"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <div className="w-20 h-28 rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-[10px]">
                No img
              </div>
            )}
          </div>

          {/* Info column */}
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <div>
              <h3 className="font-semibold text-foreground text-xs truncate group-hover:text-accent transition-colors">
                {displayName}
              </h3>
              <p className="text-[10px] text-muted-foreground truncate">
                {card.set_name}{card.rarity ? ` · ${card.rarity}` : ''}
              </p>
            </div>

            {/* Price + change row */}
            <div className="flex items-center gap-2 mt-1">
              {priceBlock}
            </div>

            {/* Range + signal row */}
            <div className="flex items-center justify-between mt-1">
              <div className="flex-1 min-w-0">{renderRange()}</div>
              <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-1">
                  {signalDot}
                  <span className={cn('text-[10px] font-bold', rec.color)}>{rec.label}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        {watchlistBtnFull}
      </div>

      {/* ── Desktop: horizontal row (unchanged) ── */}
      <div className="hidden sm:block w-full text-left glass-card p-4 hover:border-primary/30 transition-colors group">
        <div className="flex items-center gap-4">
          <div className={cn(
            'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm',
            'bg-primary/10 text-primary group-hover:ring-2 ring-primary/40 transition-all'
          )}>
            {index + 1}
          </div>

          {imgUrl && (
            <img src={imgUrl} alt={card.name}
              className="w-20 h-28 object-contain rounded-lg flex-shrink-0 cursor-pointer"
              onClick={() => navigate(buildDetailUrl())}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}

          <button
            onClick={() => navigate(buildDetailUrl())}
            className="flex-1 min-w-0 text-left"
          >
            <h3 className="font-semibold text-foreground text-sm truncate group-hover:text-accent transition-colors">{displayName}</h3>
            <p className="text-xs text-muted-foreground truncate">
              {card.set_name}{card.rarity ? ` · ${card.rarity}` : ''}
            </p>
            {renderRange()}
          </button>

          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center gap-1 flex-shrink-0">
              {signalDot}
              <p className={cn('text-[11px] font-bold whitespace-nowrap', rec.color)}>{rec.label}</p>
            </div>

            <div className="text-right">{priceBlock}</div>
          </div>
        </div>
        {watchlistBtnFull}
      </div>
    </>
  );
}
