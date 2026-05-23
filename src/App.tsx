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
const PokeYelp = lazy(() => import("./pages/PokeYelp"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, refetchOnWindowFocus: false, retry: 1 },
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
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        {/* Public pages */}
        <Route path="/" element={<PokeIQDaily />} />
        <Route path="/pokeiq-daily" element={<PokeIQDaily />} />
        <Route path="/mintd-daily" element={<MintdDaily />} />
        <Route path="/about" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/test" element={<PersonalityTest />} />
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
        <Route path="/buylist/scanner" element={<BuyListScanner />} />
        <Route path="/buylist/list" element={<BuyListMain />} />
        <Route path="/buylist/pick/:id" element={<BuyListPickDetail />} />
        <Route path="/buylist/mover/:id" element={<BuyListMoverDetail />} />
        <Route path="/buylist/sets" element={<BuyListSets />} />
        <Route path="/buylist/opportunities" element={<BuyListOpportunities />} />
        <Route path="/buylist/admin" element={<BuyListAdmin />} />

        {/* Tools */}
        <Route path="/tools/sealed-vs-cards" element={<SealedVsCards />} />
        <Route path="/pack-gains" element={<PackGainsCalculator />} />
        <Route path="/swipe" element={<PullOrPass />} />
        <Route path="/pokeyelp" element={<PokeYelp />} />

        {/* Standalone report pages - no layout */}
        <Route path="/report/generated" element={<GeneratedReport />} />
        <Route path="/report/print" element={<PrintReport />} />

        {/* All other pages with AppLayout */}
        <Route path="/home" element={<AppLayout><Index /></AppLayout>} />
        <Route path="/collection" element={<AppLayout><MyCollection /></AppLayout>} />
        <Route path="/insights" element={<AppLayout><Insights /></AppLayout>} />
        <Route path="/winners" element={<AppLayout><Winners /></AppLayout>} />
        <Route path="/items" element={<AppLayout><FilteredItems /></AppLayout>} />
        <Route path="/rebalance" element={<AppLayout><Rebalance /></AppLayout>} />
        <Route path="/era-allocation" element={<AppLayout><EraAllocation /></AppLayout>} />
        <Route path="/report" element={<AppLayout><Report /></AppLayout>} />
        <Route path="/smart-feed" element={<SmartFeed />} />
        <Route path="/smart-feed/brief" element={<SmartFeedBrief />} />
        <Route path="/buy-list" element={<AppLayout><BuyListPicks /></AppLayout>} />
        <Route path="*" element={<AppLayout><NotFound /></AppLayout>} />
      </Routes>
    </Suspense>
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
