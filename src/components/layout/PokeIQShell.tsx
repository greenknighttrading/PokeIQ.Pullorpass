import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Heart, User, Sparkles, Trophy, ScanLine, Crown, Zap, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
  { label: 'Profile', href: '/profile', icon: User },
  { label: 'Training', href: '/pokeyelp', icon: Zap },
  { label: 'Leaderboard', href: '/leaderboard', icon: Trophy, badge: 'NEW' },
  { label: 'Personality Test', href: '/test', icon: Users },
  { label: 'Card Intelligence', href: '/card-intelligence', icon: ScanLine },
  { label: 'Premium', href: '/premium', icon: Crown },
];

export function PokeIQShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();

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
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge && (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
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

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-card/80 backdrop-blur border-b border-border/60 px-3 py-2 flex items-center gap-2 overflow-x-auto">
        <Link to="/" className="flex items-center gap-2 shrink-0 mr-1">
          <img src={pokeiqLogo} alt="PokeIQ" className="h-7 w-auto" />
        </Link>
        {primaryNav.map((item) => {
          const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium shrink-0 transition-colors',
                isActive ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {item.label}
            </Link>
          );
        })}
      </div>

      <main className="flex-1 min-w-0 pt-14 md:pt-0">
        {children}
      </main>
    </div>
  );
}

export default PokeIQShell;