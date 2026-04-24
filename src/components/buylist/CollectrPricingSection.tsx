import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

interface Props {
  cardName: string | null;
  setName?: string | null;
  cardNumber?: string | null;
}

type AnyObj = Record<string, unknown>;

function pickPrice(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : null;
}

function fmt(v: unknown) {
  const n = pickPrice(v);
  return n == null ? '—' : `$${n.toFixed(2)}`;
}

/** Recursively flatten an object into "path -> primitive" rows for the raw dump. */
function flatten(obj: unknown, prefix = '', out: Array<[string, string]> = []): Array<[string, string]> {
  if (obj == null) return out;
  if (typeof obj !== 'object') {
    out.push([prefix || '(root)', String(obj)]);
    return out;
  }
  if (Array.isArray(obj)) {
    if (obj.length === 0) {
      out.push([prefix, '[]']);
      return out;
    }
    obj.forEach((v, i) => flatten(v, `${prefix}[${i}]`, out));
    return out;
  }
  const entries = Object.entries(obj as AnyObj);
  if (entries.length === 0) {
    out.push([prefix, '{}']);
    return out;
  }
  for (const [k, v] of entries) {
    flatten(v, prefix ? `${prefix}.${k}` : k, out);
  }
  return out;
}

export default function CollectrPricingSection({ cardName, setName, cardNumber }: Props) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [product, setProduct] = React.useState<AnyObj | null>(null);
  const [searchHits, setSearchHits] = React.useState<AnyObj[]>([]);
  const [expanded, setExpanded] = React.useState(false);
  const [showRaw, setShowRaw] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    if (!cardName) return;
    setLoading(true);
    setError(null);
    try {
      // Collectr search is finicky — verbose queries return []. Try progressively simpler queries.
      const candidates = [
        cardNumber ? `${cardName} ${cardNumber}` : null,
        cardName,
      ].filter(Boolean) as string[];

      let results: AnyObj[] = [];
      for (const q of candidates) {
        const { data: searchData, error: searchErr } = await supabase.functions.invoke('collectr', {
          body: { action: 'search', params: { searchString: q, categories: 'pokemon' } },
        });
        if (searchErr) throw new Error(searchErr.message);

        const arr: AnyObj[] = Array.isArray(searchData)
          ? (searchData as AnyObj[])
          : ((searchData?.results as AnyObj[]) ||
             (searchData?.data as AnyObj[]) ||
             (searchData?.products as AnyObj[]) ||
             []);
        if (arr.length > 0) { results = arr; break; }
      }

      // If we have a set name, prefer matches whose setName matches (case-insensitive contains)
      if (setName && results.length > 1) {
        const wanted = setName.toLowerCase();
        const filtered = results.filter(r => {
          const s = String((r.setName as string) || (r.set_name as string) || '').toLowerCase();
          return s && (s.includes(wanted) || wanted.includes(s));
        });
        if (filtered.length > 0) results = filtered;
      }

      setSearchHits(results.slice(0, 5));

      const top = results[0];
      const productId =
        (top?.id as string) ||
        (top?.productId as string) ||
        (top?.product_id as string) ||
        (top?.uuid as string);

      if (productId) {
        const { data: prodData, error: prodErr } = await supabase.functions.invoke('collectr', {
          body: { action: 'getProduct', params: { productId, gradingData: true } },
        });
        if (prodErr) throw new Error(prodErr.message);
        setProduct((prodData?.data as AnyObj) || (prodData as AnyObj));
      } else {
        setProduct(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load Collectr data');
    } finally {
      setLoading(false);
    }
  }, [cardName, cardNumber, setName]);

  // Track whether we've fetched for the current expansion to avoid request loops.
  const fetchedRef = React.useRef(false);
  React.useEffect(() => { fetchedRef.current = false; }, [cardName, cardNumber, setName]);
  React.useEffect(() => {
    if (expanded && !fetchedRef.current) {
      fetchedRef.current = true;
      fetchData();
    }
  }, [expanded, fetchData]);

  if (!cardName) return null;

  // ── Try to surface common Collectr fields when present ──
  const p = product || {};
  const raw = (p.rawPricing || p.raw || p.pricing || p) as AnyObj;
  const graded = (p.gradingData || p.graded || p.grades || (p as AnyObj).gradedPricing) as AnyObj | unknown[] | undefined;

  const summaryRows: Array<[string, unknown]> = [
    ['Market Price', (raw as AnyObj)?.marketPrice ?? (raw as AnyObj)?.market ?? (p as AnyObj).marketPrice],
    ['Low Price', (raw as AnyObj)?.lowPrice ?? (raw as AnyObj)?.low ?? (p as AnyObj).lowPrice],
    ['Mid Price', (raw as AnyObj)?.midPrice ?? (raw as AnyObj)?.mid],
    ['High Price', (raw as AnyObj)?.highPrice ?? (raw as AnyObj)?.high ?? (p as AnyObj).highPrice],
    ['Last Sale', (raw as AnyObj)?.lastSale ?? (p as AnyObj).lastSalePrice ?? (p as AnyObj).lastSale],
    ['Sales (30d)', (raw as AnyObj)?.salesCount30d ?? (p as AnyObj).salesCount30d],
  ];

  // Normalize graded rows into [grader, grade, price, population]
  type GradedRow = { grader?: string; grade?: string | number; price?: unknown; population?: unknown };
  const gradedRows: GradedRow[] = Array.isArray(graded)
    ? (graded as GradedRow[])
    : graded && typeof graded === 'object'
      ? Object.entries(graded as AnyObj).flatMap(([grader, val]) => {
          if (val && typeof val === 'object' && !Array.isArray(val)) {
            return Object.entries(val as AnyObj).map(([grade, info]) => {
              const inf = (info && typeof info === 'object' ? info : { price: info }) as AnyObj;
              return {
                grader,
                grade,
                price: inf.price ?? inf.marketPrice ?? inf.value,
                population: inf.population ?? inf.pop ?? inf.count,
              };
            });
          }
          return [{ grader, grade: '', price: val }];
        })
      : [];

  const productUrl =
    (p.url as string) || (p.productUrl as string) || (p.collectrUrl as string) || null;

  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-3 text-left"
      >
        <div>
          <p className="text-[11px] uppercase tracking-widest text-primary font-semibold">Collectr Pricing Data</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cross-source verification · raw + graded prices · population counts
          </p>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="mt-4 space-y-4">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Looking up on Collectr…
            </div>
          )}

          {error && (
            <div className="text-xs text-warning bg-warning/10 border border-warning/30 rounded-lg p-3">
              {error}
            </div>
          )}

          {!loading && !error && !product && searchHits.length === 0 && (
            <p className="text-sm text-muted-foreground">No Collectr match found for this card.</p>
          )}

          {!loading && product && (
            <>
              {/* ── Pricing summary ── */}
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">
                  Raw / Ungraded Pricing
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {summaryRows.map(([label, val]) => (
                    <div key={label} className="rounded-lg border border-border/40 bg-secondary/20 px-3 py-2">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
                      <p className="text-sm font-bold text-foreground tabular-nums mt-0.5">
                        {label.startsWith('Sales') ? (val == null ? '—' : String(val)) : fmt(val)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Graded ── */}
              {gradedRows.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">
                    Graded Pricing & Population
                  </p>
                  <div className="overflow-x-auto rounded-lg border border-border/40">
                    <table className="w-full text-xs">
                      <thead className="bg-secondary/30 text-muted-foreground">
                        <tr>
                          <th className="text-left px-3 py-2 font-semibold">Grader</th>
                          <th className="text-left px-3 py-2 font-semibold">Grade</th>
                          <th className="text-right px-3 py-2 font-semibold">Price</th>
                          <th className="text-right px-3 py-2 font-semibold">Population</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gradedRows.map((g, i) => (
                          <tr key={i} className="border-t border-border/30">
                            <td className="px-3 py-2 text-foreground">{g.grader || '—'}</td>
                            <td className="px-3 py-2 text-foreground">{g.grade ?? '—'}</td>
                            <td className="px-3 py-2 text-right text-foreground tabular-nums">{fmt(g.price)}</td>
                            <td className="px-3 py-2 text-right text-muted-foreground tabular-nums">
                              {g.population == null ? '—' : String(g.population)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── Product meta ── */}
              {productUrl && (
                <a
                  href={productUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                >
                  View on Collectr <ExternalLink className="w-3 h-3" />
                </a>
              )}

              {/* ── Full raw dump ── */}
              <div>
                <button
                  onClick={() => setShowRaw((v) => !v)}
                  className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  {showRaw ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {showRaw ? 'Hide' : 'Show'} all Collectr fields ({flatten(product).length})
                </button>
                {showRaw && (
                  <div className="mt-2 max-h-80 overflow-auto rounded-lg border border-border/40 bg-background/50 p-3">
                    <table className="w-full text-[11px] font-mono">
                      <tbody>
                        {flatten(product).map(([k, v], i) => (
                          <tr key={i} className="border-b border-border/20 last:border-0">
                            <td className="py-1 pr-3 text-muted-foreground align-top whitespace-nowrap">{k}</td>
                            <td className="py-1 text-foreground break-all">{v}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}