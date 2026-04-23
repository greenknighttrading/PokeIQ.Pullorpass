import React from 'react';
import { useNavigate } from 'react-router-dom';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { ERA_INFO, PokemonEra } from '@/lib/types';
import { cn } from '@/lib/utils';

const ERA_ORDER: PokemonEra[] = ['vintage', 'classic', 'modern', 'ultraModern', 'current'];

// Single teal color — brightness maps to allocation %
const BASE_COLOR = 'var(--primary)';

const ERA_YEAR_STARTS: Record<PokemonEra, number> = {
  vintage: 1996,
  classic: 2006,
  modern: 2013,
  ultraModern: 2019,
  current: 2024,
};

export function EraAllocationDonut() {
  const { eraAllocation } = usePortfolio();
  const navigate = useNavigate();

  if (!eraAllocation) return null;

  const data = ERA_ORDER.map(era => ({
    era,
    name: ERA_INFO[era].name,
    years: ERA_INFO[era].years,
    description: ERA_INFO[era].description,
    percent: eraAllocation[era].percent,
    value: eraAllocation[era].value,
    count: eraAllocation[era].count,
  }));

  const handleEraClick = (era: PokemonEra) => {
    navigate(`/items?type=era&value=${era}`);
  };

  // Build gradient for horizontal bar
  const maxPct = Math.max(...data.map(d => d.percent), 1);

  return (
    <div className="glass-card p-4 sm:p-5 animate-fade-in stagger-3" style={{ opacity: 0 }}>
      <h2 className="text-base sm:text-lg font-semibold text-foreground mb-4">Era Allocation</h2>

      {/* Year markers */}
      <div className="flex justify-between px-1 mb-1">
        {ERA_ORDER.map(era => (
          <span key={era} className="text-[11px] text-muted-foreground tabular-nums">
            {ERA_YEAR_STARTS[era]}
          </span>
        ))}
      </div>

      {/* Tick marks */}
      <div className="flex justify-between px-1 mb-0.5">
        {ERA_ORDER.map(era => (
          <div key={era} className="w-px h-2 bg-muted-foreground/30" />
        ))}
      </div>

      {/* Horizontal allocation bar */}
      <div className="flex h-8 rounded-lg overflow-hidden mb-2">
        {data.map(item => {
          // Equal width segments, brightness shows allocation %
          const opacity = item.percent === 0 ? 0.08 : 0.15 + (item.percent / maxPct) * 0.85;
          return (
            <button
              key={item.era}
              onClick={() => handleEraClick(item.era)}
              className="h-full transition-opacity hover:opacity-90"
              style={{
                width: '20%',
                backgroundColor: `hsl(${BASE_COLOR})`,
                opacity,
              }}
              title={`${item.name}: ${item.percent.toFixed(0)}%`}
            />
          );
        })}
      </div>

      {/* Caption */}
      <p className="text-[10px] text-muted-foreground text-center mb-4">
        Years mark the start of each era. Intensity shows allocation density.
      </p>

      {/* Low-High gradient bar */}
      <div className="flex items-center gap-2 justify-center mb-3">
        <span className="text-[10px] text-muted-foreground">Low</span>
        <div className="w-24 h-2 rounded-full" style={{
          background: `linear-gradient(to right, hsl(${BASE_COLOR} / 0.15), hsl(${BASE_COLOR}))`,
        }} />
        <span className="text-[10px] text-muted-foreground">High</span>
      </div>

      {/* Era breakdown rows */}
      <div className="space-y-1">
        {data.map(item => {
          const opacity = item.percent === 0 ? 0.15 : 0.15 + (item.percent / maxPct) * 0.85;
          return (
            <button
              key={item.era}
              onClick={() => handleEraClick(item.era)}
              className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: `hsl(${BASE_COLOR})`, opacity }}
                />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">{item.name}</span>
                  <span className="text-[10px] text-muted-foreground leading-tight">{item.years}</span>
                </div>
              </div>
              <span className="text-sm font-bold tabular-nums text-foreground">
                {item.percent.toFixed(1)}%
              </span>
            </button>
          );
        })}
      </div>

      {/* Era Insight */}
      {(() => {
        const olderPercent = (eraAllocation.vintage?.percent || 0) + (eraAllocation.classic?.percent || 0);
        const newerPercent = (eraAllocation.modern?.percent || 0) + (eraAllocation.ultraModern?.percent || 0) + (eraAllocation.current?.percent || 0);
        const dominantEra = data.reduce((max, d) => d.percent > max.percent ? d : max, data[0]);
        const currentPercent = eraAllocation.current?.percent || 0;

        const B = (t: string) => <span className="font-semibold text-foreground">{t}</span>;

        const heaviestNote = <> Your heaviest allocation is {B(dominantEra.name)} at {B(`${dominantEra.percent.toFixed(0)}%`)}.</>;

        let body: React.ReactNode;

        if (dominantEra.percent >= 70) {
          body = <>Your portfolio is heavily concentrated in {B(dominantEra.name)} ({B(`${dominantEra.percent.toFixed(0)}%`)}). Consider diversifying across eras for better risk distribution.</>;
        } else if (currentPercent > 10) {
          body = <>Current-era exposure is {B(`${currentPercent.toFixed(0)}%`)} — above {B('10%')} increases speculation risk. These items are still in active price discovery.{heaviestNote}</>;
        } else if (olderPercent >= 50) {
          body = <>Strong foundation — {B(`${olderPercent.toFixed(0)}%`)} in Vintage + Classic eras provides durability and scarcity-driven upside.{heaviestNote}</>;
        } else if (newerPercent > 55) {
          body = <>Newer-era exposure is {B(`${newerPercent.toFixed(0)}%`)}. While growth potential is high, consider adding Vintage or Classic for portfolio resilience.{heaviestNote}</>;
        } else {
          body = <>Well-diversified across eras. Older eras ({B(`${olderPercent.toFixed(0)}%`)}) provide stability while newer eras ({B(`${newerPercent.toFixed(0)}%`)}) offer growth.{heaviestNote}</>;
        }

        return (
          <div className="mt-4 pt-4 border-t border-border">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2">
              💡 Era Insight
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
          </div>
        );
      })()}
    </div>
  );
}
