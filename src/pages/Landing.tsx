import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { GlobalNavBar } from '@/components/layout/GlobalNavBar';
import screenshotPortfolio from '@/assets/screenshot-portfolio.png';
import pokemonVsSp500 from '@/assets/pokemon-vs-sp500.png';
import {
  TrendingUp, TrendingDown, Shield,
  ArrowRight, Loader2, Upload, Activity, Lightbulb,
  PieChart, Zap, BarChart3, Eye, Crown,
} from 'lucide-react';

/* ── Auth hook ── */
function useIsAuthenticated() {
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthed(!!session?.user && !session.user.is_anonymous);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session?.user && !session.user.is_anonymous);
    });
    return () => subscription.unsubscribe();
  }, []);
  return authed;
}

/* ── Top movers hook ── */
interface MoverCard {
  id: string;
  card_id: string;
  name: string;
  setName: string;
  rarity: string | null;
  tcgplayerId: string | null;
  current: number;
  pctChange: number;
  previousPrice: number;
  productType: string;
  imageUrl: string | null;
}

function useGreatestHits() {
  const [hits, setHits] = useState<MoverCard[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const cols = 'id,card_id,name,set_name,rarity,tcgplayer_id,price,price_change_7d,product_type,image_url';
        const greatestHitsNames = ['charizard', 'umbreon', 'lugia', 'rayquaza'];
        const nameFilter = greatestHitsNames.map(n => `name.ilike.%${n}%`).join(',');

        const { data } = await supabase.from('market_snapshots').select(cols)
          .gt('price', 50)
          .or(nameFilter)
          .gt('price_change_7d', 0)
          .lte('price_change_7d', 50)
          .or('printing.is.null,printing.not.ilike.%reverse%')
          .order('price_change_7d', { ascending: false })
          .limit(50);

        // Dedup by name (keep highest % per unique name)
        const nameMap = new Map<string, MoverCard>();
        for (const row of data ?? []) {
          const current = row.price ?? 0;
          const pct = row.price_change_7d ?? 0;
          const prev = current / (1 + pct / 100);
          const imgUrl = row.image_url || (row.tcgplayer_id ? `https://tcgplayer-cdn.tcgplayer.com/product/${row.tcgplayer_id}_in_200x200.jpg` : null);
          const card: MoverCard = {
            id: row.id, card_id: row.card_id, name: row.name,
            setName: row.set_name ?? '', rarity: row.rarity,
            tcgplayerId: row.tcgplayer_id, current, pctChange: pct,
            previousPrice: prev, productType: row.product_type,
            imageUrl: imgUrl,
          };
          const key = row.name.toLowerCase().trim();
          const existing = nameMap.get(key);
          if (!existing || Math.abs(pct) > Math.abs(existing.pctChange)) nameMap.set(key, card);
        }
        setHits(Array.from(nameMap.values()).sort((a, b) => b.pctChange - a.pctChange).slice(0, 5));
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);
  return { hits, loading };
}

/* ── Main Landing Page ── */
export default function Landing() {
  const navigate = useNavigate();
  const isAuthed = useIsAuthenticated();
  const { hits, loading: moversLoading } = useGreatestHits();

  const handlePrimaryCta = () => navigate(isAuthed ? '/home' : '/auth');

  const features = [
    { icon: BarChart3, title: 'Portfolio Health Score', desc: 'Instantly see how balanced, diversified, and resilient your collection is.' },
    { icon: TrendingUp, title: 'Buy / Hold / Weak Signals', desc: 'Every card gets a market-driven signal so you know what to keep and what to trim.' },
    { icon: PieChart, title: 'Allocation Breakdown', desc: 'Visualize your mix of sealed, slabs, and raw cards with era-level detail.' },
    { icon: Zap, title: 'Live Market Scanner', desc: 'Track price movements across thousands of cards updated daily.' },
    { icon: Eye, title: 'Watchlist & Alerts', desc: 'Follow the cards you care about and get notified when they move.' },
    { icon: Shield, title: 'Risk Analysis', desc: 'Concentration warnings, liquidity checks, and rebalancing suggestions.' },
  ];

  const steps = [
    { title: 'Upload your collection', desc: 'Export from Collectr or use a CSV.', icon: Upload },
    { title: 'Get your health score', desc: 'Instant analysis of risk, allocation & performance.', icon: Activity },
    { title: 'Act on insights', desc: 'Buy / Hold / Weak signals for every item.', icon: Lightbulb },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <GlobalNavBar />

      {/* ───── HERO ───── */}
      <section className="relative py-20 md:py-28 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="relative max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-[1fr_420px] gap-12 items-center">
            <div className="space-y-6">
              <Badge variant="secondary" className="text-xs">Free portfolio analysis</Badge>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">
                Your Pokémon Collection,{' '}
                <span className="gradient-text">Analyzed Like a Pro</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
                Upload your collection and get a full health score, Buy/Hold/Weak signals on every card, and a personalized portfolio report — powered by real market data.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <Button size="lg" onClick={handlePrimaryCta} className="text-lg px-8 py-6 gap-2">
                  {isAuthed ? 'Go to My Portfolio' : 'Get Started Free'}
                  <ArrowRight className="w-5 h-5" />
                </Button>
                <Button variant="outline" size="lg" asChild className="text-lg px-8 py-6 gap-2">
                  <Link to="/pokeiq-daily">
                    <Zap className="w-5 h-5" />
                    View Market News
                  </Link>
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                1 free report per account · No credit card required
              </p>
            </div>

            {/* Screenshot */}
            <div className="hidden lg:block">
              <div className="glass-card rounded-2xl overflow-hidden p-1 shadow-2xl">
                <img
                  src={screenshotPortfolio}
                  alt="PokeIQ Portfolio Analysis Dashboard"
                  className="w-full rounded-xl"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───── MARKET OUTPERFORMANCE ───── */}
      <section className="py-10 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-[1fr_1fr] gap-8 items-center">
            <div className="rounded-xl border border-border overflow-hidden">
              <img
                src={pokemonVsSp500}
                alt="Chart showing Pokémon cards outperforming the S&P 500 since 2004"
                className="w-full h-auto"
                loading="lazy"
              />
            </div>
            <div className="space-y-4">
              <Badge variant="secondary" className="text-xs">Market Data</Badge>
              <h2 className="text-3xl font-bold">Pokémon Has Outperformed the Stock Market</h2>
              <p className="text-muted-foreground leading-relaxed">
                Since 2004, iconic Pokémon cards have returned over <span className="text-foreground font-semibold">3,500%</span> — outpacing the S&P 500, baseball cards, and even Meta Platforms.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Whether you collect for fun or profit, understanding your portfolio's performance against other asset classes is key to making smarter decisions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ───── HOW IT WORKS ───── */}
      <section className="py-16 px-6 bg-secondary/20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold">How It Works</h2>
            <p className="text-muted-foreground mt-2">Three steps to a smarter collection.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <div key={step.title} className="text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                  <step.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-bold text-lg">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── FEATURES GRID ───── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">Everything You Need</h2>
            <p className="text-muted-foreground mt-2">Tools built for serious Pokémon collectors and investors.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <Card key={f.title} className="p-6 hover:border-primary/30 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-bold text-foreground mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ───── GREATEST HITS ───── */}
      <section className="py-16 px-6 bg-secondary/10">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-6 justify-center">
            <Crown className="w-5 h-5 text-primary" />
            <h2 className="text-2xl font-bold">Greatest Hits</h2>
            <Badge variant="secondary" className="text-xs">7D</Badge>
          </div>

          {moversLoading ? (
            <div className="flex items-center justify-center gap-2 py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Loading market data…</span>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto grid grid-cols-1 gap-2">
              {hits.map((card, i) => {
                const isUp = card.pctChange >= 0;
                return (
                  <div
                    key={card.id}
                    onClick={() => navigate(`/buylist/mover/${card.tcgplayerId || card.card_id}`)}
                    className="glass-card px-4 py-3 rounded-xl hover:border-primary/30 transition-all text-left group relative cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-md bg-primary/15 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                        #{i + 1}
                      </span>
                      {card.imageUrl && (
                        <img
                          src={card.imageUrl}
                          alt={card.name}
                          className="w-12 h-16 object-contain rounded-lg shrink-0"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-bold truncate group-hover:text-accent transition-colors">{card.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{card.setName}{card.rarity ? ` · ${card.rarity}` : ''}</p>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <p className={cn('text-base font-bold tabular-nums', isUp ? 'text-success' : 'text-foreground')}>${card.current.toFixed(2)}</p>
                          <p className="text-xs tabular-nums text-muted-foreground">${card.previousPrice.toFixed(2)}</p>
                        </div>
                        <div className={cn(
                          'px-3 py-2 rounded-lg text-lg font-extrabold tabular-nums min-w-[90px] text-center',
                          isUp ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'
                        )}>
                          {isUp ? '+' : ''}{card.pctChange.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {hits.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No data available</p>}
            </div>
          )}
        </div>
      </section>

      {/* ───── FINAL CTA ───── */}
      <section className="py-24 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/5 via-transparent to-transparent" />
        <div className="relative max-w-2xl mx-auto space-y-6">
          <h2 className="text-4xl font-bold">Ready to analyze your collection?</h2>
          <p className="text-lg text-muted-foreground">Join collectors making data-driven decisions.</p>
          <Button size="lg" onClick={handlePrimaryCta} className="text-lg px-10 py-6 gap-2 mt-2">
            {isAuthed ? 'Go to My Portfolio' : 'Create Free Account'}
            <ArrowRight className="w-5 h-5" />
          </Button>
          <p className="text-sm text-muted-foreground pt-4">
            1 free report per account · $7/mo for monthly reports & full scanner access
          </p>
        </div>
      </section>
    </div>
  );
}
