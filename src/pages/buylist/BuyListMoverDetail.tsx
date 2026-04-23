import React from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BuySignalPanel from '@/components/buylist/BuySignalPanel';
import WatchlistButton from '@/components/buylist/WatchlistButton';

export default function BuyListMoverDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const printing = searchParams.get('printing') || undefined;
  const condition = searchParams.get('condition') || undefined;

  if (!id) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Product not found</p>
          <Link to="/buylist/list"><Button variant="outline">Back to List</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <span className="font-semibold text-sm">Market Mover</span>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="rounded-2xl border border-border/60 bg-gradient-to-b from-card to-card/70 backdrop-blur-sm p-6 md:p-8">
            <BuySignalPanel
              tcgApiId={id}
              cardId={id}
              category="Single"
              buyPrice={null}
              buyLow={null}
              buyHigh={null}
              buyZoneType="range"
              currentPrice={null}
              preferredPrinting={printing}
              preferredCondition={condition}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
