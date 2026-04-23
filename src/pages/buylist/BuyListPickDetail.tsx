import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Crown, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBuyList } from '@/contexts/BuyListContext';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import BuySignalPanel from '@/components/buylist/BuySignalPanel';

function computeMA(data: { date: string; price: number }[], window: number) {
  return data.map((d, i) => {
    if (i < window - 1) return { ...d, [`ma${window}`]: null };
    const slice = data.slice(i - window + 1, i + 1);
    const avg = slice.reduce((s, v) => s + v.price, 0) / window;
    return { ...d, [`ma${window}`]: parseFloat(avg.toFixed(2)) };
  });
}

export default function BuyListPickDetail() {
  const { id } = useParams<{ id: string }>();
  const { picks, hasAccess, checkingAccess } = useBuyList();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!checkingAccess && !hasAccess) navigate('/buylist/access');
  }, [hasAccess, checkingAccess, navigate]);

  const pick = picks.find(p => p.id === id);

  if (!pick) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Pick not found</p>
          <Link to="/buylist/list"><Button variant="outline">Back to List</Button></Link>
        </div>
      </div>
    );
  }

  // Build chart data — last 30 days only
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const allData = pick.priceHistory
    .filter(ps => new Date(ps.recorded_at) >= thirtyDaysAgo)
    .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
    .map(ps => ({
      date: new Date(ps.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      price: Number(ps.price),
    }));

  const dedupMap = new Map<string, { date: string; price: number }>();
  allData.forEach(d => dedupMap.set(d.date, d));
  const dedupData = Array.from(dedupMap.values());

  let chartData = computeMA(dedupData, 7);
  const ma30Data = computeMA(dedupData, 30);
  chartData = chartData.map((d, i) => ({ ...d, ma30: (ma30Data[i] as Record<string, unknown>)?.ma30 ?? null }));

  

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/buylist/list" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Pick #{pick.rank}</span>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

          {/* ═══ UNIFIED CARD — everything inside one card ═══ */}
          <div className="rounded-2xl border border-border/60 bg-gradient-to-b from-card to-card/70 backdrop-blur-sm p-6 md:p-8 mb-6" style={{ boxShadow: 'var(--shadow-card)' }}>

            {/* TOP: Title + subtitle prominently on top */}
            <div className="mb-5">
              <h1 className="text-xl md:text-2xl font-extrabold leading-tight text-foreground">{pick.name}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {pick.set_name}{pick.language && pick.language !== 'English' ? ` · ${pick.language}` : ''}
                {' · '}{pick.category}
              </p>
            </div>

            {/* Buy Signal panel — full width, image passed in */}
            {pick.tcg_api_id && (
              <BuySignalPanel
                tcgApiId={pick.tcg_api_id}
                category={pick.category}
                buyPrice={pick.buy_price}
                buyLow={pick.buy_low}
                buyHigh={pick.buy_high}
                buyZoneType={pick.buy_zone_type}
                currentPrice={pick.currentPrice}
                imageElement={pick.image_url ? (
                  <img
                    src={pick.image_url}
                    alt={pick.name}
                    className="w-32 h-44 lg:w-40 lg:h-56 object-contain rounded-xl flex-shrink-0"
                    style={{ filter: 'drop-shadow(0 6px 20px rgba(0,0,0,0.35))' }}
                  />
                ) : undefined}
                commentary={pick.commentary}
              />
            )}
          </div>

          {/* ═══ 30-Day Price Chart ═══ */}
          {chartData.length > 1 && (
            <div className="rounded-2xl border border-border/60 bg-card/60 p-5 mb-6" style={{ boxShadow: 'var(--shadow-card)' }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">30-Day Price History</p>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-primary inline-block rounded" /> Price</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-muted-foreground inline-block rounded opacity-60" /> 7D MA</span>
                </div>
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} domain={['auto', 'auto']} />
                    <Tooltip
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    {pick.buy_price && (
                      <ReferenceLine y={pick.buy_price} stroke="hsl(var(--primary))" strokeDasharray="4 4" label={{ value: 'Buy Zone', fontSize: 10, fill: 'hsl(var(--primary))' }} />
                    )}
                    <Line type="monotone" dataKey="price" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="ma7" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} dot={false} strokeDasharray="4 2" opacity={0.5} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* External link */}
          {pick.url_reference && (
            <a href={pick.url_reference} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="w-full">
                View on TCGPlayer / Cardmarket <ExternalLink className="w-3.5 h-3.5 ml-2" />
              </Button>
            </a>
          )}
        </motion.div>
      </div>
    </div>
  );
}
