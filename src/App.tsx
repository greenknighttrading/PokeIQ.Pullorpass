import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PortfolioProvider } from "@/contexts/PortfolioContext";
import { BuyListProvider } from "@/contexts/BuyListContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { PokeIQShell } from "@/components/layout/PokeIQShell";
import SmartList from "@/pages/SmartList";
import { PremiumGate } from "@/components/PremiumGate";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useLocation } from "react-router-dom";

// Eager: home (LCP) + lightweight 404
import PokeIQDaily from "./pages/PokeIQDaily";
import NotFound from "./pages/NotFound";

// Lazy: everything else
const Landing = lazy(() => import("./pages/Landing"));
const Auth = lazy(() => import("./pages/Auth"));
const GetStarted = lazy(() => import("./pages/GetStarted"));
const Index = lazy(() => import("./pages/Index"));
const SimulatorLayout = lazy(() => import("./pages/simulator/SimulatorLayout"));
const SimulatorOverview = lazy(() => import("./pages/simulator/SimulatorOverview"));
const SimulatorAssets = lazy(() => import("./pages/simulator/SimulatorAssets"));
const SimulatorEras = lazy(() => import("./pages/simulator/SimulatorEras"));
const SimulatorRoadmap = lazy(() => import("./pages/simulator/SimulatorRoadmap"));
const SimulatorInsights = lazy(() => import("./pages/simulator/SimulatorInsights"));
const SimulatorPlans = lazy(() => import("./pages/simulator/SimulatorPlans"));
const Insights = lazy(() => import("./pages/Insights"));
const Winners = lazy(() => import("./pages/Winners"));
const FilteredItems = lazy(() => import("./pages/FilteredItems"));
const Rebalance = lazy(() => import("./pages/Rebalance"));
const EraAllocation = lazy(() => import("./pages/EraAllocation"));
const Report = lazy(() => import("./pages/Report"));
const GeneratedReport = lazy(() => import("./pages/GeneratedReport"));
const PrintReport = lazy(() => import("./pages/PrintReport"));
const PersonalityTest = lazy(() => import("./pages/PersonalityTest"));
const PersonalityTypes = lazy(() => import("./pages/PersonalityTypes"));
const CollectorShare = lazy(() => import("./pages/CollectorShare"));
const MyCollection = lazy(() => import("./pages/MyCollection"));
const SmartFeed = lazy(() => import("./pages/SmartFeed"));
const SmartFeedBrief = lazy(() => import("./pages/SmartFeedBrief"));

const BuyListLanding = lazy(() => import("./pages/buylist/BuyListLanding"));
const BuyListAccess = lazy(() => import("./pages/buylist/BuyListAccess"));
const BuyListMain = lazy(() => import("./pages/buylist/BuyListMain"));
const BuyListPickDetail = lazy(() => import("./pages/buylist/BuyListPickDetail"));
const BuyListOpportunities = lazy(() => import("./pages/buylist/BuyListOpportunities"));
const BuyListAdmin = lazy(() => import("./pages/buylist/BuyListAdmin"));
const BuyListMoverDetail = lazy(() => import("./pages/buylist/BuyListMoverDetail"));
const BuyListSets = lazy(() => import("./pages/buylist/BuyListSets"));
const BuyListMovers = lazy(() => import("./pages/buylist/BuyListMovers"));
const BuyListWatchlist = lazy(() => import("./pages/buylist/BuyListWatchlist"));
const BuyListScanner = lazy(() => import("./pages/buylist/BuyListScanner"));
const DailyReport = lazy(() => import("./pages/DailyReport"));
const BuyListPicks = lazy(() => import("./pages/BuyListPicks"));
const SealedVsCards = lazy(() => import("./pages/tools/SealedVsCards"));
const PackGainsCalculator = lazy(() => import("./pages/PackGainsCalculator"));
const MintdDaily = lazy(() => import("./pages/MintdDaily"));
const PullOrPass = lazy(() => import("./pages/PullOrPass"));
const Matches = lazy(() => import("./pages/Matches"));
const MatchesResults = lazy(() => import("./pages/MatchesResults"));
const MatchesCollection = lazy(() => import("./pages/MatchesCollection"));
const PokeYelp = lazy(() => import("./pages/PokeYelp"));
const ThisOrThat = lazy(() => import("./pages/ThisOrThat"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const PokeIQLeaderboard = lazy(() => import("./pages/pokeiq/Leaderboard"));
const PokeIQPremium = lazy(() => import("./pages/pokeiq/Premium"));
const PokeIQCardIntelligence = lazy(() => import("./pages/pokeiq/CardIntelligence"));
const PokeIQLastRound = lazy(() => import("./pages/pokeiq/LastRound"));
const CheckoutReturn = lazy(() => import("./pages/CheckoutReturn"));
const Settings = lazy(() => import("./pages/Settings"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminProfileView = lazy(() => import("./pages/AdminProfileView"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000,
      gcTime: 30 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 1,
    },
  },
});

function PageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );
}

function AppRoutes() {
  const location = useLocation();
  return (
    <ErrorBoundary resetKey={location.pathname}>
      <Suspense fallback={<PageFallback />}>
        <Routes>
        {/* Public pages */}
        <Route path="/" element={<PokeIQShell><PullOrPass /></PokeIQShell>} />
        <Route path="/pokeiq-daily" element={<PokeIQShell><PokeIQDaily /></PokeIQShell>} />
        <Route path="/mintd-daily" element={<MintdDaily />} />
        <Route path="/about" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/test" element={<PokeIQShell><PersonalityTest /></PokeIQShell>} />
        <Route path="/personality-types" element={<PokeIQShell><PersonalityTypes /></PokeIQShell>} />
        <Route path="/collector/:slug" element={<PokeIQShell><CollectorShare /></PokeIQShell>} />
        <Route path="/get-started" element={<GetStarted />} />

        {/* Portfolio Simulator */}
        <Route path="/simulator" element={<SimulatorLayout />}>
          <Route index element={<SimulatorOverview />} />
          <Route path="assets" element={<SimulatorAssets />} />
          <Route path="eras" element={<SimulatorEras />} />
          <Route path="roadmap" element={<SimulatorRoadmap />} />
          <Route path="insights" element={<SimulatorInsights />} />
          <Route path="plans" element={<SimulatorPlans />} />
        </Route>

        {/* BUY List */}
        <Route path="/buylist" element={<BuyListLanding />} />
        <Route path="/buylist/access" element={<BuyListAccess />} />
        <Route path="/buylist/brief" element={<PokeIQDaily />} />
        <Route path="/daily-report" element={<DailyReport />} />
        <Route path="/buylist/watchlist" element={<BuyListWatchlist />} />
        <Route path="/buylist/movers" element={<BuyListMovers />} />
        <Route path="/smartlist" element={<PokeIQShell><SmartList /></PokeIQShell>} />
        <Route path="/buylist/scanner" element={<PokeIQShell><BuyListScanner /></PokeIQShell>} />
        <Route path="/buylist/list" element={<PremiumGate><BuyListMain /></PremiumGate>} />
        <Route path="/buylist/pick/:id" element={<BuyListPickDetail />} />
        <Route path="/buylist/mover/:id" element={<BuyListMoverDetail />} />
        <Route path="/buylist/sets" element={<PremiumGate><BuyListSets /></PremiumGate>} />
        <Route path="/buylist/opportunities" element={<BuyListOpportunities />} />
        <Route path="/buylist/admin" element={<BuyListAdmin />} />

        {/* Tools */}
        <Route path="/tools/sealed-vs-cards" element={<SealedVsCards />} />
        <Route path="/pack-gains" element={<PackGainsCalculator />} />
        <Route path="/swipe" element={<PokeIQShell><PullOrPass /></PokeIQShell>} />
        <Route path="/matches" element={<PokeIQShell><MatchesResults /></PokeIQShell>} />
        <Route path="/matches/:category" element={<MatchesCollection />} />
        <Route path="/profile" element={<PokeIQShell><Matches /></PokeIQShell>} />
        <Route path="/binder" element={<PokeIQShell><Matches view="binder" /></PokeIQShell>} />
        <Route path="/pokeyelp" element={<PokeIQShell><PokeYelp /></PokeIQShell>} />
        <Route path="/earn" element={<PokeIQShell><PokeYelp /></PokeIQShell>} />
        <Route path="/this-or-that" element={<PokeIQShell><ThisOrThat /></PokeIQShell>} />
        <Route path="/leaderboard" element={<PokeIQShell><PokeIQLeaderboard /></PokeIQShell>} />
        <Route path="/card-intelligence" element={<PokeIQShell><BuyListScanner /></PokeIQShell>} />
        <Route path="/premium" element={<PokeIQShell><PokeIQPremium /></PokeIQShell>} />
        <Route path="/checkout/return" element={<CheckoutReturn />} />
        <Route path="/settings" element={<PokeIQShell><Settings /></PokeIQShell>} />
        <Route path="/u/:username" element={<PublicProfile />} />

        {/* Admin (gated by email server-side + client-side) */}
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/profile/:userId" element={<PokeIQShell><AdminProfileView /></PokeIQShell>} />

        {/* Standalone report pages - no layout */}
        <Route path="/report/generated" element={<GeneratedReport />} />
        <Route path="/report/print" element={<PrintReport />} />

        {/* Advanced Analytics — premium gated, wrapped in PokeIQShell so left sidebar is always present */}
        <Route path="/home" element={<PremiumGate><PokeIQShell><AppLayout><Index /></AppLayout></PokeIQShell></PremiumGate>} />
        <Route path="/collection" element={<PremiumGate><PokeIQShell><AppLayout><MyCollection /></AppLayout></PokeIQShell></PremiumGate>} />
        <Route path="/insights" element={<PremiumGate><PokeIQShell><AppLayout><Insights /></AppLayout></PokeIQShell></PremiumGate>} />
        <Route path="/winners" element={<PremiumGate><PokeIQShell><AppLayout><Winners /></AppLayout></PokeIQShell></PremiumGate>} />
        <Route path="/items" element={<PremiumGate><PokeIQShell><AppLayout><FilteredItems /></AppLayout></PokeIQShell></PremiumGate>} />
        <Route path="/rebalance" element={<PremiumGate><PokeIQShell><AppLayout><Rebalance /></AppLayout></PokeIQShell></PremiumGate>} />
        <Route path="/era-allocation" element={<PremiumGate><PokeIQShell><AppLayout><EraAllocation /></AppLayout></PokeIQShell></PremiumGate>} />
        <Route path="/report" element={<PremiumGate><PokeIQShell><AppLayout><Report /></AppLayout></PokeIQShell></PremiumGate>} />
        <Route path="/smart-feed" element={<PremiumGate><PokeIQShell><SmartFeed /></PokeIQShell></PremiumGate>} />
        <Route path="/smart-feed/brief" element={<PremiumGate><PokeIQShell><SmartFeedBrief /></PokeIQShell></PremiumGate>} />
        <Route path="/buy-list" element={<PremiumGate><PokeIQShell><AppLayout><BuyListPicks /></AppLayout></PokeIQShell></PremiumGate>} />
        <Route path="*" element={<AppLayout><NotFound /></AppLayout>} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <PortfolioProvider>
          <BuyListProvider>
            <Toaster />
            <Sonner />
            <AppRoutes />
          </BuyListProvider>
        </PortfolioProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
