import React from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  LogOut,
  LayoutDashboard,
  PieChart,
  Clock,
  Map,
  Lightbulb,
  Save,
  ChevronRight,
  Lock,
  CheckCircle2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SimulatorProvider, useSimulator } from './SimulatorContext';
import { cn } from '@/lib/utils';
import { GlobalNavBar } from '@/components/layout/GlobalNavBar';

const NAV_ITEMS = [
  { path: '/simulator', label: 'Overview', icon: LayoutDashboard, end: true, step: 0 },
  { path: '/simulator/assets', label: 'Asset Types', icon: PieChart, step: 1 },
  { path: '/simulator/eras', label: 'Era Allocation', icon: Clock, step: 2 },
  { path: '/simulator/roadmap', label: 'Roadmap', icon: Map, step: 3 },
  { path: '/simulator/insights', label: 'Insights', icon: Lightbulb, step: 4 },
  { path: '/simulator/plans', label: 'Save & Compare', icon: Save, step: 5 },
];

function SimulatorSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { topLevelValid, gradedValid, rawValid, sealedValid, eraValid } = useSimulator();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  // Determine which steps are complete
  const isOverviewComplete = true; // Overview is always accessible
  const isAssetsComplete = topLevelValid && gradedValid && rawValid && sealedValid;
  const isErasComplete = eraValid;
  const isRoadmapComplete = isAssetsComplete && isErasComplete;
  const isInsightsComplete = isRoadmapComplete;

  const stepStatus = [
    { complete: isOverviewComplete, accessible: true },
    { complete: isAssetsComplete, accessible: true },
    { complete: isErasComplete, accessible: isAssetsComplete },
    { complete: isRoadmapComplete, accessible: isAssetsComplete && isErasComplete },
    { complete: isInsightsComplete, accessible: isAssetsComplete && isErasComplete },
    { complete: false, accessible: isAssetsComplete && isErasComplete },
  ];

  return (
    <aside className="w-64 border-r border-border bg-sidebar flex flex-col h-screen sticky top-0">

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item, index) => {
          const isActive = item.end 
            ? location.pathname === item.path 
            : location.pathname.startsWith(item.path) && location.pathname !== '/simulator';
          const status = stepStatus[index];
          const isLocked = !status.accessible;

          return (
            <Link 
              key={item.path} 
              to={isLocked ? '#' : item.path}
              onClick={(e) => isLocked && e.preventDefault()}
            >
              <div 
                className={cn(
                  'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive && 'bg-primary/10 text-primary',
                  !isActive && !isLocked && 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                  isLocked && 'opacity-50 cursor-not-allowed text-muted-foreground'
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="flex-1">{item.label}</span>
                {isActive && <ChevronRight className="w-4 h-4" />}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer Actions */}
      <div className="px-4 py-4 border-t border-border space-y-2">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleLogout} 
          className="w-full gap-2 justify-start text-muted-foreground"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}

function SimulatorContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { topLevelValid, gradedValid, rawValid, sealedValid, eraValid } = useSimulator();

  // Determine current step and next step
  const currentPath = location.pathname;
  const currentIndex = NAV_ITEMS.findIndex(item => 
    item.end ? currentPath === item.path : currentPath.startsWith(item.path) && currentPath !== '/simulator'
  );
  
  const isAssetsComplete = topLevelValid && gradedValid && rawValid && sealedValid;
  const isErasComplete = eraValid;
  
  // Determine if continue button should show and be enabled
  const showContinue = currentIndex < NAV_ITEMS.length - 1;
  let canContinue = false;
  let nextPath = '';

  if (currentIndex === 0) {
    // Overview -> Assets (always can continue)
    canContinue = true;
    nextPath = '/simulator/assets';
  } else if (currentIndex === 1) {
    // Assets -> Eras (need assets complete)
    canContinue = isAssetsComplete;
    nextPath = '/simulator/eras';
  } else if (currentIndex === 2) {
    // Eras -> Roadmap (need eras complete)
    canContinue = isErasComplete;
    nextPath = '/simulator/roadmap';
  } else if (currentIndex === 3) {
    // Roadmap -> Insights
    canContinue = true;
    nextPath = '/simulator/insights';
  } else if (currentIndex === 4) {
    // Insights -> Plans
    canContinue = true;
    nextPath = '/simulator/plans';
  }

  const handleContinue = () => {
    if (canContinue && nextPath) {
      navigate(nextPath);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <motion.main
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 max-w-6xl mx-auto w-full px-6 py-6"
      >
        <Outlet />
      </motion.main>

      {/* Continue Button */}
      {showContinue && (
        <div className="sticky bottom-0 bg-background/80 backdrop-blur-sm border-t border-border p-4">
          <div className="max-w-6xl mx-auto flex justify-end">
            <Button 
              onClick={handleContinue}
              disabled={!canContinue}
              className="gap-2"
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Mobile navigation header
function MobileNav() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <header className="md:hidden border-b border-border bg-card/50 backdrop-blur-sm p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <PieChart className="w-4 h-4 text-primary" />
          </div>
          <div>
            <span className="font-semibold text-sm">Portfolio Simulator</span>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
      
      {/* Mobile step indicator */}
      <nav className="flex items-center gap-1 mt-3 overflow-x-auto pb-1">
        {NAV_ITEMS.map((item, index) => {
          const isActive = item.end 
            ? location.pathname === item.path 
            : location.pathname.startsWith(item.path) && location.pathname !== '/simulator';
          return (
            <Link key={item.path} to={item.path}>
              <Button 
                variant={isActive ? 'secondary' : 'ghost'} 
                size="sm"
                className={cn(
                  'gap-1 text-xs whitespace-nowrap',
                  isActive && 'bg-primary/10 text-primary'
                )}
              >
                <item.icon className="w-3.5 h-3.5" />
                {item.label}
              </Button>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

export default function SimulatorLayout() {
  return (
    <SimulatorProvider>
      <div className="min-h-screen bg-background flex flex-col">
        {/* Global Navigation - always at top */}
        <GlobalNavBar showSimulatorHome={true} simulatorHomeLink="/simulator" />
        
        <div className="flex flex-1">
          {/* Desktop Sidebar */}
          <div className="hidden md:block">
            <SimulatorSidebar />
          </div>
          
          {/* Mobile Header */}
          <div className="md:hidden w-full">
            <MobileNav />
            <SimulatorContent />
          </div>
          
          {/* Desktop Content */}
          <div className="hidden md:flex flex-1">
            <SimulatorContent />
          </div>
        </div>
      </div>
    </SimulatorProvider>
  );
}
