import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Heart, User, Trophy, ScanLine, Crown, Zap, Users, Lock, Activity,
  ChevronDown, ChevronRight, LayoutDashboard, Layers, Scale,
  Clock, FileText, Sparkles, Lightbulb, BarChart3, PieChart,
  Package, Calculator, Newspaper, ShoppingBag, LogIn, LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useIsPremium } from '@/hooks/useIsPremium';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import pokeiqLogo from '@/assets/pokeiq-logo.png';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const primaryNav: NavItem[] = [
  { label: 'Pull or Pass', href: '/swipe', icon: Heart },
  { label: 'Matches', href: '/matches', icon: Heart },
  { label: 'Smart Profile', href: '/profile', icon: User },
  { label: 'Training', href: '/pokeyelp', icon: Zap },
  { label: 'Leaderboard', href: '/leaderboard', icon: Trophy, badge: 'NEW' },
  { label: 'Personality Test', href: '/test', icon: Users },
  { label: 'Market Report', href: '/pokeiq-daily', icon: Activity },
  { label: 'Card Scanner', href: '/buylist/scanner', icon: ScanLine },
];

const premiumCollect: NavItem[] = [
  { label: 'Advanced Analytics', href: '/home', icon: LayoutDashboard },
  { label: 'Collector Report', href: '/report', icon: FileText },
  { label: 'Smart Feed', href: '/smart-feed', icon: Sparkles },
];

const premiumTools: NavItem[] = [
  { label: 'Buy List', href: '/buylist/list', icon: ShoppingBag },
  { label: 'Sets Explorer', href: '/buylist/sets', icon: PieChart },
];

export function PokeIQShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isPremium } = useIsPremium();
  const [email, setEmail] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <aside className="hidden md:flex md:w-60 lg:w-64 shrink-0 flex-col border-r border-border/60 bg-card/30 backdrop-blur-sm sticky top-0 h-screen">
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
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? isPullOrPass ? 'bg-rose-500/15 text-rose-400' : 'bg-primary/15 text-primary'
                    : isPullOrPass ? 'text-rose-400 hover:text-rose-300 hover:bg-rose-500/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                )}
              >
                <Icon className={cn('w-4 h-4 shrink-0', isPullOrPass && 'text-rose-400')} />
                <span className="flex-1 truncate">{item.label}</span>
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
            <span className="flex-1 truncate text-left">Premium</span>
            {premiumOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
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
                      active ? 'bg-primary/10 text-primary' : 'text-muted-foreground/70 hover:text-foreground hover:bg-muted/30'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="flex-1 truncate">{item.label}</span>
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
                      active ? 'bg-primary/10 text-primary' : 'text-muted-foreground/70 hover:text-foreground hover:bg-muted/30'
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
          <button
            onClick={() => navigate('/premium')}
            className="w-full rounded-xl border border-primary/30 bg-gradient-to-b from-primary/15 to-primary/5 p-4 text-left transition-all hover:border-primary/60 hover:from-primary/25"
          >
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Crown className="w-5 h-5 text-primary" />
              </div>
              <div className="font-semibold text-sm">Go Premium</div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Unlock unlimited swipes, advanced insights, and exclusive rewards.
              </p>
              <Button size="sm" variant="outline" className="w-full mt-1 h-8 text-xs border-primary/40 hover:border-primary hover:bg-primary/10">
                Upgrade Now
              </Button>
            </div>
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        {/* Top bar with profile in upper right */}
        <div className="sticky top-0 z-30 flex justify-end items-center gap-2 px-5 py-3 bg-background/70 backdrop-blur-md border-b border-border/40">
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
                    <User className="w-4 h-4 mr-2" /> Smart Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/premium')}>
                    <Crown className="w-4 h-4 mr-2" /> Premium
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={async () => { await supabase.auth.signOut(); navigate('/auth'); }}
                  >
                    <LogOut className="w-4 h-4 mr-2" /> Sign out
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem onClick={() => navigate('/auth')}>
                  <LogIn className="w-4 h-4 mr-2" /> Sign in
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {children}
      </main>
    </div>
  );
}

export default PokeIQShell;