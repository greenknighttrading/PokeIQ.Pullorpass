import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { TrendingUp, Search, Sparkles, User, LogOut, Bell, LogIn, Eye, ChevronDown, FileText, Mail, Menu, Scale, Package, Heart, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FeedbackDialog } from '@/components/feedback/FeedbackDialog';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import pokeiqLogo from '@/assets/pokeiq-logo.png';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

interface GlobalNavBarProps {
  showSimulatorHome?: boolean;
  simulatorHomeLink?: string;
}

interface WatchlistAlert {
  name: string;
  change: number;
  timeLabel: string;
}

export function GlobalNavBar({ 
  showSimulatorHome = false, 
  simulatorHomeLink = '/simulator'
}: GlobalNavBarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<WatchlistAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthed(!!session?.user && !session.user.is_anonymous);
      setUserEmail(session?.user?.email ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthed(!!session?.user && !session.user.is_anonymous);
      setUserEmail(session?.user?.email ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const navItems = [
    { label: 'The Pulse', href: '/pokeiq-daily', icon: FileText, requiresAuth: false },
    { label: 'My Portfolio', href: '/home', icon: TrendingUp, requiresAuth: false },
    { label: 'Pack Gains', href: '/pack-gains', icon: Package, requiresAuth: false },
    { label: 'PULLorPASS', href: '/swipe', icon: Heart, requiresAuth: false },
    { label: 'PokeYelp', href: '/pokeyelp', icon: MessageSquare, requiresAuth: false },
    { label: 'Personality Test', href: '/test', icon: Sparkles, requiresAuth: false },
  ];

  // Fetch watchlist alerts
  useEffect(() => {
    const fetchAlerts = async () => {
      setAlertsLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) { setAlertsLoading(false); return; }

        const { data: watchlist } = await supabase
          .from('buylist_watchlist')
          .select('card_id, name')
          .eq('user_id', session.user.id);

        if (!watchlist || watchlist.length === 0) { setAlertsLoading(false); return; }

        const cardIds = watchlist.map(w => w.card_id);
        const { data: snapshots } = await supabase
          .from('market_snapshots')
          .select('card_id, name, price_change_7d, price_change_30d')
          .in('card_id', cardIds);

        if (snapshots) {
          const significant = snapshots
            .filter(s => {
              const change7d = Math.abs(s.price_change_7d ?? 0);
              const change30d = Math.abs(s.price_change_30d ?? 0);
              return change7d >= 10 || change30d >= 20;
            })
            .map(s => {
              const change7d = s.price_change_7d ?? 0;
              const change30d = s.price_change_30d ?? 0;
              const useWeekly = Math.abs(change7d) >= 10;
              return {
                name: s.name,
                change: useWeekly ? change7d : change30d,
                timeLabel: useWeekly ? '7D' : '30D',
              };
            })
            .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
            .slice(0, 10);
          setAlerts(significant);
        }
      } catch (e) {
        console.error('Alert fetch error:', e);
      } finally {
        setAlertsLoading(false);
      }
    };
    fetchAlerts();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div className="w-full border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="w-full px-4 py-2 flex items-center gap-4">
        {/* Left side: Logo */}
        <Link to="/" className="flex-shrink-0 flex items-center gap-2">
          <img src={pokeiqLogo} alt="PokeIQ" className="h-9 sm:h-10 w-auto" />
          <span className="font-bold text-foreground text-lg">PokeIQ</span>
        </Link>

        {/* Mobile menu button */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="sm:hidden shrink-0 ml-auto">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-64 p-0">
            <SheetHeader className="p-4 border-b border-border">
              <SheetTitle className="text-left text-sm font-bold">Pages</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col p-2">
              {navItems.map((item) => {
                const isActive = location.pathname === item.href || 
                  (item.href !== '/home' && item.href !== '/test' && location.pathname.startsWith(item.href));
                return (
                  <Link key={item.href} to={item.requiresAuth && !isAuthed ? '/auth' : item.href}>
                    <div className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted/50'
                    )}>
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </div>
                  </Link>
                );
              })}
              <Link to="/buylist/movers">
                <div className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors', location.pathname.startsWith('/buylist/movers') ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted/50')}>
                  <TrendingUp className="w-4 h-4" />Smart List
                </div>
              </Link>
              <Link to="/buylist/scanner">
                <div className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors', location.pathname.startsWith('/buylist/scanner') ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted/50')}>
                  <Search className="w-4 h-4" />Scanner
                </div>
              </Link>
              <Link to="/buylist/watchlist">
                <div className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors', location.pathname.startsWith('/buylist/watchlist') ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted/50')}>
                  <Eye className="w-4 h-4" />Watchlist
                </div>
              </Link>
              <Link to="/tools/sealed-vs-cards">
                <div className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors', location.pathname.startsWith('/tools/') ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted/50')}>
                  <Scale className="w-4 h-4" />Sealed vs Cards
                </div>
              </Link>
              {isAuthed && (
                <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-foreground hover:bg-muted/50 transition-colors">
                  <LogOut className="w-4 h-4" />Log Out
                </button>
              )}
              {!isAuthed && (
                <Link to="/auth">
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-foreground hover:bg-muted/50 transition-colors">
                    <LogIn className="w-4 h-4" />Sign In
                  </div>
                </Link>
              )}
            </nav>
          </SheetContent>
        </Sheet>

        {/* Desktop nav items */}
        <div className="hidden sm:flex items-center gap-1 sm:gap-2 overflow-x-auto ml-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href || 
              (item.href !== '/home' && item.href !== '/test' && location.pathname.startsWith(item.href));
            return (
              <Link key={item.href} to={item.requiresAuth && !isAuthed ? '/auth' : item.href}>
                <Button 
                  variant={isActive ? 'secondary' : 'ghost'} 
                  size="sm" 
                  className={cn(
                    'gap-2 shrink-0',
                    isActive && 'bg-primary/10 text-primary'
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Button>
              </Link>
            );
          })}

          {/* Tools dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant={location.pathname.startsWith('/buylist/movers') || location.pathname.startsWith('/buylist/scanner') || location.pathname.startsWith('/buylist/watchlist') || location.pathname.startsWith('/tools/') ? 'secondary' : 'ghost'} 
                size="sm" 
                className={cn(
                  'gap-1.5 shrink-0',
                  (location.pathname.startsWith('/buylist/movers') || location.pathname.startsWith('/buylist/scanner') || location.pathname.startsWith('/buylist/watchlist') || location.pathname.startsWith('/tools/')) && 'bg-primary/10 text-primary'
                )}
              >
                <TrendingUp className="w-4 h-4" />
                <span className="hidden sm:inline">Tools</span>
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate('/buylist/movers')}>
                <TrendingUp className="w-4 h-4 mr-2" />
                Smart List
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/buylist/scanner')}>
                <Search className="w-4 h-4 mr-2" />
                Scanner
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/buylist/watchlist')}>
                <Eye className="w-4 h-4 mr-2" />
                Watchlist
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/tools/sealed-vs-cards')}>
                <Scale className="w-4 h-4 mr-2" />
                Sealed vs Cards
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <FeedbackDialog />

          {/* Alerts Bell — only when authed */}
          {isAuthed && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="relative shrink-0">
                  <Bell className="w-4 h-4" />
                  {alerts.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                      {alerts.length}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <div className="p-3 border-b border-border">
                  <h4 className="font-semibold text-sm">Watchlist Alerts</h4>
                  <p className="text-[10px] text-muted-foreground">Significant price moves on your watchlist</p>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {alerts.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      {alertsLoading ? 'Loading...' : 'No significant moves right now'}
                    </div>
                  ) : (
                    alerts.map((alert, i) => (
                      <div key={i} className="px-3 py-2 border-b border-border/50 last:border-b-0 hover:bg-muted/30 transition-colors">
                        <p className="text-xs font-medium text-foreground truncate">{alert.name}</p>
                        <p className={cn(
                          'text-xs font-bold tabular-nums',
                          alert.change > 0 ? 'text-success' : 'text-warning'
                        )}>
                          {alert.change > 0 ? '+' : ''}{alert.change.toFixed(1)}% ({alert.timeLabel})
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Profile / Sign In */}
          {isAuthed ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="shrink-0">
                  <User className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[200px]">
                {userEmail && (
                  <div className="px-2 py-2 border-b border-border">
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Mail className="w-3 h-3" />
                      {userEmail}
                    </p>
                  </div>
                )}
                <DropdownMenuItem onClick={() => navigate('/home')}>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  My Portfolio
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Log Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="ghost" size="sm" className="gap-2 shrink-0" onClick={() => navigate('/auth')}>
              <LogIn className="w-4 h-4" />
              <span className="hidden sm:inline">Sign In</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
