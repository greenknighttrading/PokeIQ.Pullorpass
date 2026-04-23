import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { FileUpload } from '@/components/upload/FileUpload';
import { PortfolioSummaryCard } from '@/components/dashboard/PortfolioSummaryCard';
import { AllocationDonut } from '@/components/dashboard/AllocationDonut';
import { EraAllocationDonut } from '@/components/dashboard/EraAllocationDonut';

import { ConcentrationCard } from '@/components/dashboard/ConcentrationCard';
import { HealthScoreCard } from '@/components/dashboard/HealthScoreCard';
import { StrengthsWeaknesses } from '@/components/dashboard/StrengthsWeaknesses';
import { PortfolioValueChart } from '@/components/dashboard/PortfolioValueChart';
import { ComparisonBanner } from '@/components/dashboard/ComparisonBanner';
import { ManualCardEntry } from '@/components/upload/ManualCardEntry';
import { PriceMatchDialog } from '@/components/dashboard/PriceMatchDialog';
import { InsightCard } from '@/components/insights/InsightCard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TrendingUp, Shield, Lightbulb, Scale, LogOut, Home, PieChart, CheckCircle2, ChevronRight, Pencil, RefreshCw, LogIn, ArrowRight, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import dashboardBg from '@/assets/screenshot-dashboard-bg.png';

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

export default function Index() {
  const { isDataLoaded, summary, healthScoreBreakdown, clearData, hasUploadedBefore, uploadData, comparison, isPriceMatching, priceMatchProgress, priceMatchStats, priceMatchDetails, refreshLivePrices, insights, dismissInsight } = usePortfolio();
  const navigate = useNavigate();
  const isAuthed = useIsAuthenticated();
  const [showUploadNew, setShowUploadNew] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showMatchDetails, setShowMatchDetails] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    clearData();
    navigate('/');
  };

  const handleGoHome = () => {
    clearData();
  };

  // Data uploaded but not currently loaded (user clicked Home)
  if (!isDataLoaded && hasUploadedBefore && !showUploadNew) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="max-w-2xl w-full space-y-8">
          {/* Header */}
          <div className="text-center space-y-4 animate-fade-in">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-success/10 mb-4">
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              Portfolio Data Uploaded
            </h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Your collection data is saved. Choose what you'd like to do next.
            </p>
          </div>

          {/* Options */}
          <div className="grid md:grid-cols-2 gap-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <Card 
              className="p-6 hover:border-primary/50 transition-colors cursor-pointer group"
              onClick={() => navigate('/home')}
            >
              <div className="flex flex-col h-full">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-lg font-bold text-foreground mb-2">View Portfolio</h2>
                <p className="text-muted-foreground text-sm flex-1">
                  See your portfolio insights, health score, and allocation breakdown.
                </p>
                <div className="mt-4 flex items-center text-primary text-sm font-medium">
                  Open Dashboard
                  <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Card>

            <Link to="/simulator" className="block h-full">
              <Card className="p-6 h-full hover:border-accent/50 transition-colors cursor-pointer group">
                <div className="flex flex-col h-full">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                    <PieChart className="w-6 h-6 text-accent" />
                  </div>
                  <h2 className="text-lg font-bold text-foreground mb-2">Portfolio Simulator</h2>
                  <p className="text-muted-foreground text-sm flex-1">
                    Plan your ideal collection allocation without uploading data.
                  </p>
                  <div className="mt-4 flex items-center text-accent text-sm font-medium">
                    Start Planning
                    <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Card>
            </Link>
          </div>

          {/* Upload New Data */}
          <div className="text-center pt-4">
            <button
              onClick={() => setShowUploadNew(true)}
              className="text-sm text-muted-foreground hover:text-primary underline underline-offset-4 transition-colors"
            >
              Upload New Data
            </button>
          </div>

          {/* Logout */}
          <div className="text-center">
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2 text-muted-foreground">
              <LogOut className="w-4 h-4" />
              Log Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // No data loaded - show upload screen
  if (!isDataLoaded) {
    return (
      <div className="relative flex flex-col items-center justify-center p-4 sm:p-6 pt-6 min-h-[80vh]">
        {/* Greyed-out blurred background */}
        <img 
          src={dashboardBg} 
          alt="" 
          className="absolute inset-0 w-full h-full object-cover object-top opacity-[0.15] blur-[2px] pointer-events-none select-none"
        />
        <div className="relative z-10 max-w-md w-full rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-6 text-center space-y-5 animate-fade-in">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10">
            <TrendingUp className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            PokeIQ
          </h1>

          {isAuthed ? (
            <div className="space-y-4 pt-2">
              <p className="text-base text-muted-foreground leading-relaxed">
                Like having a Pokémon financial advisor on demand.
              </p>
              <FileUpload />
              <div className="text-center">
                <Button 
                  onClick={() => navigate('/collection')}
                  className="gap-2"
                >
                  <Pencil className="w-4 h-4" />
                  Add Item
                </Button>
              </div>
              <ManualCardEntry 
                isOpen={showManualEntry} 
                onClose={() => setShowManualEntry(false)} 
              />
            </div>
          ) : (
            <div className="space-y-5 pt-1">
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                Portfolio analytics for serious Pokémon collectors. Track risk. Measure performance. Rebalance with conviction.
              </p>

              {/* Feature pills */}
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-destructive/5 border border-destructive/10">
                  <Shield className="w-5 h-5 text-destructive" />
                  <span className="text-[11px] font-medium text-muted-foreground">Track Risk</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-success/5 border border-success/10">
                  <TrendingUp className="w-5 h-5 text-success" />
                  <span className="text-[11px] font-medium text-muted-foreground">Performance</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-accent/5 border border-accent/10">
                  <Scale className="w-5 h-5 text-accent" />
                  <span className="text-[11px] font-medium text-muted-foreground">Rebalance</span>
                </div>
              </div>

              <Button size="default" onClick={() => navigate('/auth')} className="gap-2 w-full">
                Sign Up
                <ArrowRight className="w-4 h-4" />
              </Button>
              <p className="text-xs text-muted-foreground/60">
                Free portfolio analysis • No spam • 30s setup
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-1 sm:pt-2 pb-4 sm:pb-6 lg:pb-8 space-y-2 sm:space-y-3 max-w-[1600px] mx-auto">
      {/* Comparison Banner - shows when comparison is active */}
      <ComparisonBanner />

      {priceMatchStats && priceMatchDetails && (
        <PriceMatchDialog
          open={showMatchDetails}
          onOpenChange={setShowMatchDetails}
          details={priceMatchDetails}
          stats={priceMatchStats}
        />
      )}

      {/* Page Title + calibrate/match status in same row */}
      <div className="flex items-center justify-center gap-3">
        <div className="text-center flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-none text-center">Portfolio Overview</h1>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isPriceMatching && priceMatchProgress && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-success/10 border border-success/20 animate-fade-in">
              <CheckCircle2 className="w-3.5 h-3.5 text-success flex-shrink-0" />
              <span className="text-xs text-success font-medium whitespace-nowrap">
                Calibrating… {priceMatchProgress.completed}/{priceMatchProgress.total}
              </span>
              <ChevronRight className="w-3 h-3 text-success" />
            </div>
          )}
          {priceMatchStats && !isPriceMatching && (
            <button
              onClick={() => setShowMatchDetails(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success/10 border border-success/20 hover:bg-success/15 transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-success flex-shrink-0" />
              <span className="text-xs text-success font-medium whitespace-nowrap">
                {priceMatchStats.matched}/{priceMatchStats.total} matched
              </span>
              <ChevronRight className="w-3 h-3 text-success" />
            </button>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-[1fr_3fr_1fr] gap-4">
        {/* Signals Column */}
        <div className="rounded-lg border border-border bg-card p-3 flex flex-col gap-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
            Action Signals
          </h3>
          
          {insights.slice(0, 4).map((insight) => {
            const isLoss = insight.type === 'loss';
            const isProfit = insight.type === 'profit';
            const isConcentration = insight.type === 'concentration';
            const isAllocation = insight.type === 'allocation';

            // Colorize numbers in the message
            const colorizeMessage = (msg: string) => {
              return msg.split(/(\+?\-?\d+[\d,.]*%?)/g).map((part, i) => {
                const isNumber = /^[+\-]?\d[\d,.]*%?$/.test(part);
                if (!isNumber) return part;
                const isNeg = part.startsWith('-');
                const isPos = part.startsWith('+') || (!isNeg && parseFloat(part) > 0 && part.includes('%'));
                return (
                  <span key={i} className={cn(
                    "font-bold",
                    isNeg && "text-destructive",
                    isPos && "text-success",
                    !isNeg && !isPos && "text-foreground"
                  )}>
                    {part}
                  </span>
                );
              });
            };

            const Icon = isLoss ? AlertTriangle : isProfit ? TrendingUp : isConcentration ? Shield : isAllocation ? Scale : Lightbulb;
            const iconColor = isLoss ? 'text-destructive' : isProfit ? 'text-success' : isConcentration ? 'text-warning' : isAllocation ? 'text-primary' : 'text-muted-foreground';

            return (
              <div
                key={insight.id}
                className="flex items-start gap-2 py-2 border-b border-border/50 last:border-0"
              >
                <Icon className={cn("w-3.5 h-3.5 flex-shrink-0 mt-0.5", iconColor)} />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {colorizeMessage(insight.message)}
                </p>
              </div>
            );
          })}
        </div>

        {/* Main Content (Summary + Allocation + Strengths) */}
        <div className="flex flex-col gap-4">
          <PortfolioSummaryCard />
          <div className="grid sm:grid-cols-2 gap-4">
            <AllocationDonut />
            <EraAllocationDonut />
          </div>
          <StrengthsWeaknesses />
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-4">
          {summary && (
            <HealthScoreCard 
              score={healthScoreBreakdown?.overall ?? summary.healthScore} 
              breakdown={healthScoreBreakdown}
            />
          )}
          <ConcentrationCard />
        </div>
      </div>

      {/* Collection Value Chart — full width at bottom */}
      <PortfolioValueChart />
    </div>
  );
}
