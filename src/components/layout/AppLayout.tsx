import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Lightbulb, 
  Trophy, 
  Scale,
  Clock,
  FileText,
  Layers,
  ChevronDown,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { CreditsModal } from '@/components/upload/CreditsModal';
import { ComparisonUpload } from '@/components/upload/ComparisonUpload';
import { ManualCardEntry } from '@/components/upload/ManualCardEntry';
import { GlobalNavBar } from '@/components/layout/GlobalNavBar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AppLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Overview', href: '/home', icon: LayoutDashboard },
  { name: 'Manage Collection', href: '/collection', icon: Layers },
  // Insights dropdown inserted after this
  { name: 'Asset Type', href: '/rebalance', icon: Scale },
  { name: 'Era Allocation', href: '/era-allocation', icon: Clock },
  { name: 'Generate Report', href: '/report', icon: FileText },
  { name: 'Smart Feed', href: '/smart-feed', icon: Sparkles },
];

const insightsSubItems = [
  { name: 'Position Details', href: '/winners', icon: Trophy },
  { name: 'Signals', href: '/insights', icon: Lightbulb },
];

function NavArrow() {
  return null;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [creditsModalOpen, setCreditsModalOpen] = useState(false);
  const [comparisonUploadOpen, setComparisonUploadOpen] = useState(false);
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isDataLoaded } = usePortfolio();

  const isInsightsActive = location.pathname === '/winners' || location.pathname === '/insights';
  const isBuyListActive = location.pathname === '/buy-list';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <GlobalNavBar />

      {/* Sub-navigation bar */}
      <div className="sticky top-12 z-30 bg-background/95 backdrop-blur-xl border-b border-border">
        <nav className="max-w-7xl mx-auto px-4 flex items-center gap-0.5 overflow-x-auto scrollbar-hide py-2">
          {navigation.map((item, index) => {
            const isActive = location.pathname === item.href;
            return (
              <React.Fragment key={item.name}>
                {/* Arrow before every item except Overview */}
                {index > 0 && <NavArrow />}

                <NavLink
                  to={item.href}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50',
                    !isDataLoaded && item.href !== '/home' && 'opacity-50 pointer-events-none'
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{item.name}</span>
                </NavLink>

                {/* Insert Insights dropdown after Manage Collection */}
                {item.name === 'Manage Collection' && (
                  <>
                    <NavArrow />
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors outline-none',
                          isInsightsActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50',
                          !isDataLoaded && 'opacity-50 pointer-events-none'
                        )}
                        disabled={!isDataLoaded}
                      >
                        <Lightbulb className="w-4 h-4" />
                        <span className="hidden sm:inline">Insights</span>
                        <ChevronDown className="w-3 h-3" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {insightsSubItems.map((sub) => (
                          <DropdownMenuItem key={sub.href} onClick={() => navigate(sub.href)}>
                            <sub.icon className="w-4 h-4 mr-2" />
                            {sub.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
              </React.Fragment>
            );
          })}

        
        </nav>
      </div>

      <CreditsModal open={creditsModalOpen} onOpenChange={setCreditsModalOpen} />
      <ComparisonUpload open={comparisonUploadOpen} onOpenChange={setComparisonUploadOpen} />
      <ManualCardEntry isOpen={manualEntryOpen} onClose={() => setManualEntryOpen(false)} />

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-x-auto">
        {children}
      </main>
    </div>
  );
}
