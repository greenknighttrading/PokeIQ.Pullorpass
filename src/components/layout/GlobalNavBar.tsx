import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { TrendingUp, Search, Sparkles, User, LogOut, Bell, LogIn, Eye, ChevronDown, FileText, Mail, Menu, Scale, Package, Heart, MessageSquare, Compass, Wrench, Briefcase, Home, Users, Sun, Moon } from 'lucide-react';
import { Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FeedbackDialog } from '@/components/feedback/FeedbackDialog';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from '@/hooks/useTheme';
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
  const { theme, toggleTheme } = useTheme();
  const [alerts, setAlerts] = useState<WatchlistAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    const check = () => {
      try {
        const until = Number(localStorage.getItem('pokeiq_premium_until') || '0');
        setIsPremium(until > Date.now());
      } catch { setIsPremium(false); }
    };
    check();
    window.addEventListener('focus', check);
    window.addEventListener('storage', check);
    return () => {
      window.removeEventListener('focus', check);
      window.removeEventListener('storage', check);
    };
  }, []);

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
    { label: 'Home', href: '/pokeiq-daily', icon: Home, requiresAuth: false },
  ];

  const personalityItems = [
    { label: 'Personality Test', href: '/test', icon: Sparkles },
    { label: 'Collector Types', href: '/personality-types', icon: Users },
  ];

  const discoverItems = [
    { label: 'Pull or Pass', href: '/swipe', icon: Heart },
    { label: 'Matches', href: '/matches', icon: Heart },
    { label: 'Earn Credits', href: '/earn', icon: MessageSquare },
  ];

  const toolsItems = [
    { label: 'Scanner', href: '/buylist/scanner', icon: Search },
    { label: 'Smart List', href: '/buylist/movers', icon: TrendingUp },
    { label: 'Watchlist', href: '/buylist/watchlist', icon: Eye },
    { label: 'Pack Gains', href: '/pack-gains', icon: Package },
    { label: 'Sealed vs Cards', href: '/tools/sealed-vs-cards', icon: Scale },
  ];

  const isDiscoverActive = discoverItems.some(i => location.pathname.startsWith(i.href));
  const isToolsActive = toolsItems.some(i => location.pathname.startsWith(i.href));
  const isPersonalityActive = personalityItems.some(i => location.pathname.startsWith(i.href));
  const isCollectActive = location.pathname.startsWith('/home') || location.pathname.startsWith('/collection') || location.pathname.startsWith('/winners') || location.pathname.startsWith('/insights') || location.pathname.startsWith('/rebalance') || location.pathname.startsWith('/era-allocation') || location.pathname.startsWith('/report') || location.pathname.startsWith('/smart-feed') || location.pathname.startsWith('/simulator');

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
              <div className="px-3 pt-3 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Personality</div>
              {personalityItems.map((item) => (
                <Link key={item.href} to={item.href}>
                  <div className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors', location.pathname === item.href ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted/50')}>
                    <item.icon className="w-4 h-4" />{item.label}
                  </div>
                </Link>
              ))}
              <div className="px-3 pt-3 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Discover</div>
              {discoverItems.map((item) => (
                <Link key={item.href} to={item.href}>
                  <div className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors', location.pathname.startsWith(item.href) ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted/50')}>
                    <item.icon className="w-4 h-4" />{item.label}
                  </div>
                </Link>
              ))}
              <div className="px-3 pt-3 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Collect</div>
              <Link to="/home">
                <div className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors', isCollectActive ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted/50')}>
                  <Briefcase className="w-4 h-4" />My Portfolio
                </div>
              </Link>
              <div className="px-3 pt-3 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Tools</div>
              {toolsItems.map((item) => (
                <Link key={item.href} to={item.href}>
                  <div className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors', location.pathname.startsWith(item.href) ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted/50')}>
                    <item.icon className="w-4 h-4" />{item.label}
                  </div>
                </Link>
              ))}
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

          {/* Personality dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={isPersonalityActive ? 'secondary' : 'ghost'}
                size="sm"
                className={cn('gap-1.5 shrink-0', isPersonalityActive && 'bg-primary/10 text-primary')}
              >
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">Personality</span>
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {personalityItems.map((item) => (
                <DropdownMenuItem key={item.href} onClick={() => navigate(item.href)}>
                  <item.icon className="w-4 h-4 mr-2" />{item.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Discover dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={isDiscoverActive ? 'secondary' : 'ghost'}
                size="sm"
                className={cn('gap-1.5 shrink-0', isDiscoverActive && 'bg-primary/10 text-primary')}
              >
                <Compass className="w-4 h-4" />
                <span className="hidden sm:inline">Discover</span>
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {discoverItems.map((item) => (
                <DropdownMenuItem key={item.href} onClick={() => navigate(item.href)}>
                  <item.icon className="w-4 h-4 mr-2" />{item.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Collect */}
          <Link to="/home">
            <Button
              variant={isCollectActive ? 'secondary' : 'ghost'}
              size="sm"
              className={cn('gap-2 shrink-0', isCollectActive && 'bg-primary/10 text-primary')}
            >
              <Briefcase className="w-4 h-4" />
              <span className="hidden sm:inline">Collect</span>
            </Button>
          </Link>

          {/* Tools dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={isToolsActive ? 'secondary' : 'ghost'}
                size="sm"
                className={cn('gap-1.5 shrink-0', isToolsActive && 'bg-primary/10 text-primary')}
              >
                <Wrench className="w-4 h-4" />
                <span className="hidden sm:inline">Tools</span>
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {toolsItems.map((item) => (
                <DropdownMenuItem key={item.href} onClick={() => navigate(item.href)}>
                  <item.icon className="w-4 h-4 mr-2" />{item.label}
                </DropdownMenuItem>
              ))}
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
                <Button variant="ghost" size="sm" className="shrink-0 gap-1.5">
                  <User className="w-4 h-4" />
                  {isPremium ? (
                    <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-gradient-to-r from-amber-400 to-amber-500 text-zinc-950">
                      <Crown className="w-3 h-3" /> Pro
                    </span>
                  ) : (
                    <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      Free
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[200px]">
                {userEmail && (
                  <div className="px-2 py-2 border-b border-border">
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Mail className="w-3 h-3" />
                      {userEmail}
                    </p>
                    <p className="text-[11px] mt-1 flex items-center gap-1.5">
                      <span className="text-muted-foreground">Account:</span>
                      {isPremium ? (
                        <span className="inline-flex items-center gap-1 font-bold text-amber-500">
                          <Crown className="w-3 h-3" /> PokeIQ Pro
                        </span>
                      ) : (
                        <span className="font-bold text-foreground">Free</span>
                      )}
                    </p>
                  </div>
                )}
                <DropdownMenuItem onClick={(e) => { e.preventDefault(); toggleTheme(); }}>
                  {theme === 'dark' ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
                  {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/home')}>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  My Portfolio
                </DropdownMenuItem>
                {!isPremium && (
                  <DropdownMenuItem onClick={() => navigate('/get-started')}>
                    <Crown className="w-4 h-4 mr-2 text-amber-500" />
                    Go PokeIQ Pro
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Log Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="shrink-0">
                    <User className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[180px]">
                  <DropdownMenuItem onClick={(e) => { e.preventDefault(); toggleTheme(); }}>
                    {theme === 'dark' ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
                    {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/auth')}>
                    <LogIn className="w-4 h-4 mr-2" />
                    Sign In
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
