import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { ImageOff } from 'lucide-react';
import tcgplayerLogo from '@/assets/tcgplayer-logo.png';
import ebayLogo from '@/assets/ebay-logo.svg';
import { MoverCard, getImageUrl } from './shared/signalHelpers';

interface PulseCardProps {
  card: MoverCard;
  type: 'sealed' | 'card';
  navigate: (path: string) => void;
  getTrendDot: (card: MoverCard) => string;
}

export default function PulseCard({ card, type, navigate, getTrendDot }: PulseCardProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const imgUrl = getImageUrl(card);
  const change7d = card.price_change_7d ?? 0;
  const dotColor = getTrendDot(card);
  const showPlaceholder = !imgUrl || imgFailed;

  const tcgplayerUrl = card.tcgplayer_id
    ? `https://www.tcgplayer.com/product/${card.tcgplayer_id}`
    : `https://www.tcgplayer.com/search/pokemon/product?q=${encodeURIComponent(card.name)}`;
  const ebayUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(card.name + (card.set_name ? ' ' + card.set_name : ''))}`;

  return (
    <button
      key={card.id}
      onClick={() => navigate(`/buylist/mover/${card.card_id || card.id}`)}
      className="glass-card rounded-xl overflow-hidden flex flex-col hover:border-primary/30 transition-all group border-2 border-border w-full"
    >
      {/* Image area with text overlay */}
      <div className="relative w-full">
        {showPlaceholder ? (
          <div className="w-full h-44 sm:h-48 bg-muted/30 flex flex-col items-center justify-center gap-1">
            <ImageOff className="w-8 h-8 text-muted-foreground/40" />
            <span className="text-[10px] text-muted-foreground/50">Image not available</span>
          </div>
        ) : (
          <img
            src={imgUrl!}
            alt=""
            className="w-full h-44 sm:h-48 object-contain bg-muted/30 pt-2 mx-auto"
            onError={() => setImgFailed(true)}
          />
        )}
        {/* Gradient overlay at bottom of image */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/95 via-background/70 to-transparent pt-8 pb-2 px-2.5">
          <p className="text-xs font-bold truncate group-hover:text-primary transition-colors leading-tight">{card.name}</p>
          <p className="text-[10px] text-muted-foreground truncate mt-0.5">{card.set_name}</p>
        </div>
        {/* Trend dot top-left */}
        <span className={cn('absolute top-2 left-2 w-2.5 h-2.5 rounded-full ring-2 ring-background', dotColor)} />
      </div>
      {/* Price + change row */}
      <div className="px-2.5 py-2 flex items-center justify-between">
        <span className="text-sm font-black tabular-nums">${(card.price ?? 0).toFixed(2)}</span>
        <span className={cn('text-xs font-bold tabular-nums', change7d >= 0 ? 'text-success' : 'text-destructive')}>
          {change7d >= 0 ? '+' : ''}{change7d.toFixed(1)}%
        </span>
      </div>
      {/* TCGPlayer & eBay logos */}
      <div className="flex items-center justify-center gap-3 px-2.5 pb-2.5" onClick={(e) => e.stopPropagation()}>
        <a href={tcgplayerUrl} target="_blank" rel="noopener noreferrer"
          className="hover:opacity-70 transition-opacity">
          <img src={tcgplayerLogo} alt="TCGPlayer" className="h-[22px] w-auto" />
        </a>
        <a href={ebayUrl} target="_blank" rel="noopener noreferrer"
          className="hover:opacity-70 transition-opacity">
          <img src={ebayLogo} alt="eBay" className="h-5 w-auto" />
        </a>
      </div>
    </button>
  );
}
