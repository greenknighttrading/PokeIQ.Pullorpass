import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Award, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface GradedCard {
  id: number;
  name: string;
  number: string;
  set: { name: string; code?: string };
  images?: { small?: string; large?: string };
  prices?: {
    cardmarket?: {
      graded?: Record<string, Record<string, number>>;
    };
    tcgplayer?: {
      holofoil?: { market?: number };
      normal?: { market?: number };
    };
  };
}

interface GradeEntry {
  company: string;
  grade: string;
  price: number;
}

function getAllGrades(card: GradedCard): GradeEntry[] {
  const graded = card.prices?.cardmarket?.graded;
  if (!graded || typeof graded !== 'object') return [];

  const entries: GradeEntry[] = [];
  for (const [company, grades] of Object.entries(graded)) {
    if (!grades || typeof grades !== 'object') continue;
    for (const [grade, price] of Object.entries(grades)) {
      if (typeof price === 'number' && price > 0) {
        entries.push({ company, grade, price });
      }
    }
  }
  // Sort by price descending
  return entries.sort((a, b) => b.price - a.price);
}

function getTopGradedPrice(card: GradedCard): GradeEntry | null {
  const all = getAllGrades(card);
  return all.length > 0 ? all[0] : null;
}

function getRawPrice(card: GradedCard): number | null {
  const tcp = card.prices?.tcgplayer;
  return tcp?.holofoil?.market ?? tcp?.normal?.market ?? null;
}

async function fetchGradedMovers(): Promise<GradedCard[]> {
  const { data, error } = await supabase.functions.invoke('justtcg', {
    body: { action: 'gradedMovers', limit: 10 },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return Array.isArray(data?.data) ? data.data : [];
}

function GradeBreakdownTable({ card }: { card: GradedCard }) {
  const allGrades = getAllGrades(card);
  const raw = getRawPrice(card);

  // Group by company
  const byCompany: Record<string, { grade: string; price: number }[]> = {};
  for (const g of allGrades) {
    const key = g.company.toUpperCase();
    if (!byCompany[key]) byCompany[key] = [];
    byCompany[key].push({ grade: g.grade, price: g.price });
  }

  if (Object.keys(byCompany).length === 0) {
    return <p className="text-xs text-muted-foreground py-2">No detailed grade data available</p>;
  }

  return (
    <div className="mt-3 space-y-3">
      {Object.entries(byCompany).map(([company, grades]) => (
        <div key={company}>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">{company}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {grades
              .sort((a, b) => {
                const numA = parseFloat(a.grade) || 0;
                const numB = parseFloat(b.grade) || 0;
                return numB - numA;
              })
              .map((g) => {
                const premium = raw && raw > 0 ? ((g.price / raw - 1) * 100) : null;
                return (
                  <div
                    key={`${company}-${g.grade}`}
                    className="rounded-lg border border-border/40 bg-muted/30 px-2.5 py-1.5"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <Badge variant="outline" className="text-[9px] px-1 py-0 border-amber-500/30 text-amber-400">
                        {g.grade}
                      </Badge>
                      <span className="text-xs font-bold tabular-nums text-foreground">
                        ${g.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    {premium != null && (
                      <p className={cn(
                        'text-[9px] tabular-nums mt-0.5 text-right',
                        premium > 0 ? 'text-success' : 'text-warning'
                      )}>
                        {premium > 0 ? '+' : ''}{premium.toFixed(0)}% vs raw
                      </p>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      ))}

      {/* Raw price reference */}
      {raw != null && raw > 0 && (
        <div className="flex items-center gap-2 pt-1 border-t border-border/30">
          <span className="text-[10px] text-muted-foreground">Raw (NM):</span>
          <span className="text-xs font-bold tabular-nums text-foreground">${raw.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}

export default function GradedMovers() {
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: cards = [], isLoading, error } = useQuery({
    queryKey: ['graded-movers'],
    queryFn: fetchGradedMovers,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes cache
    refetchOnWindowFocus: false,
  });

  return (
    <div className="space-y-4 mt-8">
      <div className="flex items-center gap-2">
        <Award className="w-5 h-5 text-primary" />
        <h2 className="text-base font-bold text-foreground">Graded Movers</h2>
        <Badge variant="secondary" className="text-[10px]">PSA / BGS / CGC</Badge>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        Top graded cards by highest certified slab value — tap to expand all grades
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center gap-3 py-12">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading graded data…</span>
        </div>
      ) : error ? (
        <div className="glass-card p-8 text-center">
          <p className="text-sm text-muted-foreground">{error instanceof Error ? error.message : 'Failed to load'}</p>
        </div>
      ) : cards.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <p className="text-sm text-muted-foreground">No graded card data available</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {cards.map((card, i) => {
            const top = getTopGradedPrice(card);
            const raw = getRawPrice(card);
            const imgUrl = card.images?.small || card.images?.large;
            const premium = top && raw && raw > 0 ? ((top.price / raw - 1) * 100) : null;
            const isExpanded = expandedId === card.id;
            const allGrades = getAllGrades(card);

            return (
              <div
                key={card.id}
                className="glass-card rounded-xl hover:border-primary/30 transition-all text-left group relative"
              >
                {/* Main card row — clickable to navigate */}
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => navigate(`/buylist/mover/${card.id}?graded=true`)}
                >
                  <span className="absolute top-2 left-2 w-6 h-6 rounded-md bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center">
                    #{i + 1}
                  </span>

                  <div className="flex gap-3 pt-2">
                    {imgUrl && (
                      <img
                        src={imgUrl}
                        alt={card.name}
                        className="w-24 h-32 object-contain rounded-lg shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate group-hover:text-accent transition-colors">
                        {card.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {card.set?.name}{card.number ? ` · #${card.number}` : ''}
                      </p>

                      {top && (
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center gap-1.5">
                            <Badge className="text-[9px] px-1.5 py-0 bg-amber-500/15 text-amber-400 border-amber-500/30">
                              {top.company.toUpperCase()} {top.grade}
                            </Badge>
                            <span className="text-sm font-bold text-foreground tabular-nums">
                              ${top.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>

                          {raw != null && raw > 0 && (
                            <p className="text-[10px] text-muted-foreground tabular-nums">
                              Raw: ${raw.toFixed(2)}
                              {premium != null && (
                                <span className={cn(
                                  'ml-1.5 font-bold',
                                  premium > 0 ? 'text-success' : 'text-warning'
                                )}>
                                  {premium > 0 ? '+' : ''}{premium.toFixed(0)}% premium
                                </span>
                              )}
                            </p>
                          )}

                          {allGrades.length > 1 && (
                            <p className="text-[10px] text-muted-foreground">
                              {allGrades.length} grades available across {
                                [...new Set(allGrades.map(g => g.company.toUpperCase()))].length
                              } companies
                            </p>
                          )}
                        </div>
                      )}

                      {!top && raw != null && (
                        <p className="text-sm font-bold text-foreground mt-2 tabular-nums">${raw.toFixed(2)}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expand/collapse button */}
                {allGrades.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedId(isExpanded ? null : card.id);
                    }}
                    className="w-full flex items-center justify-center gap-1 py-2 border-t border-border/30 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {isExpanded ? (
                      <>Hide grades <ChevronUp className="w-3 h-3" /></>
                    ) : (
                      <>View all grades <ChevronDown className="w-3 h-3" /></>
                    )}
                  </button>
                )}

                {/* Expanded grade breakdown */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-border/20">
                    <GradeBreakdownTable card={card} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
