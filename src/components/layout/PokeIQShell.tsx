import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  User, Crown, Zap, Users, Lock, Activity,
  ChevronDown, ChevronRight, LayoutDashboard, Layers, Scale,
  Clock, FileText, Sparkles, Lightbulb, BarChart3, PieChart,
  Package, Calculator, Newspaper, ShoppingBag, LogIn, LogOut,
  Menu, Check, Settings as SettingsIcon, BookOpen, Trophy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useIsPremium } from '@/hooks/useIsPremium';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import pokeiqLogo from '@/assets/pokeiq-logo.png';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const primaryNav: NavItem[] = [
  { label: 'Pull or Pass', href: '/swipe', icon: Layers },
  { label: 'Profile', href: '/profile', icon: User },
  { label: 'Binder', href: '/binder', icon: BookOpen },
  { label: 'Earn', href: '/pokeyelp', icon: Zap },
  { label: 'Feed', href: '/pokeiq-daily', icon: Activity },
  { label: 'Social', href: '/leaderboard', icon: Trophy },
];

// Mobile bottom bar order (Profile lives in the top-right avatar)
const mobileNav: NavItem[] = [
  { label: 'Swipe', href: '/swipe', icon: Layers },
  { label: 'Binder', href: '/binder', icon: BookOpen },
  { label: 'Feed', href: '/pokeiq-daily', icon: Activity },
  { label: 'Earn', href: '/pokeyelp', icon: Zap },
  { label: 'Social', href: '/leaderboard', icon: Trophy },
];

const premiumCollect: NavItem[] = [
  { label: 'Advanced Analytics', href: '/home', icon: LayoutDashboard, badge: 'BETA' },
  { label: 'Collector Report Card', href: '/report', icon: FileText },
  { label: 'Smart Feed', href: '/smart-feed', icon: Sparkles },
];

const premiumTools: NavItem[] = [];

export function PokeIQShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isPremium } = useIsPremium();
  const [email, setEmail] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const e = data.user?.email ?? null;
      setEmail(data.user?.is_anonymous ? null : e);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user && !session.user.is_anonymous ? session.user.email ?? null : null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const initial = (email?.[0] ?? '?').toUpperCase();

  const isPremiumPath = [...premiumCollect, ...premiumTools].some(
    (i) => location.pathname === i.href || location.pathname.startsWith(i.href + '/')
  ) || location.pathname === '/premium';
  const [premiumOpen, setPremiumOpen] = useState(isPremiumPath);

  const handlePremiumLink = (e: React.MouseEvent, href: string) => {
    if (!isPremium) {
      e.preventDefault();
      navigate('/premium');
    }
  };

  const sidebarInner = (
    <>
      <Link to="/" className="flex items-center gap-2 px-5 py-5 border-b border-border/60">
        <img src={pokeiqLogo} alt="PokeIQ" className="h-8 w-auto" />
        <span className="font-bold text-lg tracking-tight">PokeIQ</span>
      </Link>

      <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-0.5">
        {primaryNav.map((item) => {
          const isActive =
            location.pathname === item.href ||
            (item.href !== '/' && location.pathname.startsWith(item.href));
          const Icon = item.icon;
          const isPullOrPass = item.label === 'Pull or Pass';
          const rainbowTextStyle = isPullOrPass
            ? {
                backgroundImage: 'linear-gradient(100deg, hsl(var(--primary)) 0%, #b8fff0 25%, hsl(var(--primary)) 50%, #c7a8ff 75%, hsl(var(--primary)) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 700,
              }
            : {};
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? isPullOrPass
                    ? 'bg-gradient-to-r from-primary/20 via-cyan-400/15 to-purple-500/20 shadow-[0_0_12px_hsl(var(--primary)/0.15)]'
                    : 'bg-primary/15 text-primary'
                  : isPullOrPass
                    ? 'hover:bg-gradient-to-r hover:from-primary/10 hover:via-cyan-400/10 hover:to-purple-400/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40',
                !isPullOrPass && isActive && 'text-primary',
                !isPullOrPass && !isActive && 'text-muted-foreground'
              )}
            >
              <Icon
                className={cn(
                  'w-4 h-4 shrink-0',
                  isPullOrPass && 'text-primary drop-shadow-[0_0_5px_hsl(var(--primary)/0.7)]'
                )}
              />
              <span
                className="flex-1 truncate"
                style={rainbowTextStyle as React.CSSProperties}
              >
                {item.label}
              </span>
              {item.badge && (
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}

        {/* Premium expandable */}
        <button
          onClick={() => setPremiumOpen((o) => !o)}
          className={cn(
            'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mt-1',
            isPremiumPath
              ? 'bg-violet-500/15 text-violet-300'
              : 'text-violet-300/90 hover:text-violet-200 hover:bg-violet-500/10'
          )}
        >
          <Crown className="w-4 h-4 shrink-0 text-violet-300" />
          <span className="flex-1 truncate text-left">
            {isPremium ? 'Premium User' : 'Premium'}
          </span>
          {isPremium && (
            <Check className="lucide lucide-check w-3.5 h-3.5 text-violet-400 mx-[12px] my-0 px-0 py-0" strokeWidth={3} />
          )}
          {premiumOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="lucide lucide-chevron-right w-3.5 h-3.5 px-0 my-0 mx-px" />}
        </button>

        {premiumOpen && (
          <div className="ml-2 pl-3 border-l border-border/50 flex flex-col gap-0.5 mt-1 mb-2">
            <Link
              to="/premium"
              className={cn(
                'flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium',
                location.pathname === '/premium'
                  ? 'text-violet-300'
                  : 'text-violet-300/80 hover:text-violet-200'
              )}
            >
              <Crown className="w-3.5 h-3.5" /> Unlimited Swipes
            </Link>
            {premiumCollect.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={(e) => handlePremiumLink(e, item.href)}
                  className={cn(
                    'flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
                    active ? 'bg-violet-500/15 text-violet-300' : 'text-muted-foreground/70 hover:text-violet-200 hover:bg-violet-500/10'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge && (
                    <span className="text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 rounded bg-violet-500/20 text-violet-300">
                      {item.badge}
                    </span>
                  )}
                  {!isPremium && <Lock className="w-3 h-3 text-violet-300/70" />}
                </Link>
              );
            })}
            {premiumTools.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={(e) => handlePremiumLink(e, item.href)}
                  className={cn(
                    'flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
                    active ? 'bg-violet-500/15 text-violet-300' : 'text-muted-foreground/70 hover:text-violet-200 hover:bg-violet-500/10'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="flex-1 truncate">{item.label}</span>
                  {!isPremium && <Lock className="w-3 h-3 text-violet-300/70" />}
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      {/* Go Premium card */}
      <div className="p-4">
        {isPremium ? (
          <div className="w-full rounded-xl border border-violet-500/30 bg-gradient-to-b from-violet-500/15 to-violet-500/5 p-4 text-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center">
                <Crown className="w-5 h-5 text-violet-300" />
              </div>
              <div className="font-semibold text-sm text-violet-200">You're a Premium User</div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                with unlocked swipes, advanced insights, and exclusive rewards.
              </p>
            </div>
          </div>
        ) : (
          <button
            onClick={() => navigate('/premium')}
            className="w-full rounded-xl border border-primary/30 bg-gradient-to-b from-primary/15 to-primary/5 p-4 text-left transition-all hover:border-primary/60 hover:from-primary/25"
          >
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Crown className="w-5 h-5 text-primary" />
              </div>
              <div className="font-semibold text-sm">Go PRO</div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Unlimited swipes, deeper collector insights, and advanced analytics catered to your taste.
              </p>
              <Button size="sm" variant="outline" className="w-full mt-1 h-8 text-xs border-primary/40 hover:border-primary hover:bg-primary/10">
                Upgrade Now
              </Button>
            </div>
          </button>
        )}
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <aside className="hidden md:flex md:w-60 lg:w-64 shrink-0 flex-col border-r border-border/60 bg-card/30 backdrop-blur-sm sticky top-0 h-screen">
        {sidebarInner}
      </aside>

      <main className="flex-1 min-w-0 pb-16 md:pb-0">
        {/* Top bar with profile in upper right */}
        <div
          className={cn(
            'sticky top-0 z-30 flex items-center gap-2 px-5 py-3 bg-background/70 backdrop-blur-md border-b border-border/40'
          )}
        >
          {/* Mobile brand */}
          <Link to="/" className="md:hidden flex items-center gap-2">
            <img src={pokeiqLogo} alt="PokeIQ" className="h-7 w-auto" />
            <span className="font-bold text-base tracking-tight">PokeIQ</span>
          </Link>

          <div className="flex-1" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="w-9 h-9 rounded-full bg-primary/15 text-primary border border-primary/30 flex items-center justify-center text-sm font-semibold hover:bg-primary/25 transition-colors"
                aria-label="Account"
              >
                {email ? initial : <User className="w-4 h-4" />}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {email ? (
                <>
                  <DropdownMenuLabel className="truncate">{email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="w-4 h-4 mr-2" /> Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/settings')}>
                    <SettingsIcon className="w-4 h-4 mr-2" /> Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/premium')}>
                    <Crown className="w-4 h-4 mr-2" /> {isPremium ? 'Premium User' : 'Go Premium'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={async () => { await supabase.auth.signOut(); navigate('/auth'); }}
                  >
                    <LogOut className="w-4 h-4 mr-2" /> Sign out
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/auth')}>
                    <LogIn className="w-4 h-4 mr-2" /> Sign in
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {children}

        {/* Mobile bottom tab bar */}
        <nav
          className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
          aria-label="Primary"
        >
          <ul className="flex items-stretch justify-around">
            {mobileNav.map((item) => {
              const Icon = item.icon;
              const isActive =
                location.pathname === item.href ||
                (item.href !== '/' && location.pathname.startsWith(item.href));
              return (
                <li key={item.href} className="flex-1">
                  <Link
                    to={item.href}
                    className={cn(
                      'flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
                      isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Icon className={cn('w-5 h-5', isActive && 'drop-shadow-[0_0_6px_hsl(var(--primary)/0.6)]')} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </main>
    </div>
  );
}

export default PokeIQShell;