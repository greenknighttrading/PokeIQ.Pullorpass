import { ScanLine, Sparkles, TrendingUp, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function CardIntelligence() {
  return (
    <div className="px-6 lg:px-10 py-8 max-w-[1200px] mx-auto">
      <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2">Card Intelligence</div>
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Card Intelligence</h1>
        <ScanLine className="w-7 h-7 text-primary" />
      </div>
      <p className="text-sm text-muted-foreground mb-8 max-w-2xl">
        Community-powered taste signals for every Pokémon card — what collectors feel about it, how it trends, and who else loves it.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { icon: Sparkles, title: 'Mood tags', desc: 'Crowd-sourced aesthetic and emotional tags per card.' },
          { icon: TrendingUp, title: 'Popularity & trend', desc: 'Pull-rate, 7d and 30d trending scores from real swipes.' },
          { icon: Users, title: 'Similar collectors', desc: 'Find people whose taste lines up with yours.' },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="rounded-xl border border-border/60 bg-card/30 p-5">
            <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center mb-3"><Icon className="w-5 h-5 text-primary" /></div>
            <div className="font-semibold mb-1">{title}</div>
            <p className="text-xs text-muted-foreground">{desc}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border/60 bg-card/30 p-6 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-medium mb-3">
          <Sparkles className="w-3 h-3" /> Coming soon
        </div>
        <div className="font-semibold mb-2">Train the engine while we build the interface</div>
        <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
          Every swipe and tag teaches PokeIQ how the community feels. The more we collect, the smarter Card Intelligence gets.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Link to="/swipe"><Button size="sm">Pull or Pass</Button></Link>
          <Link to="/pokeyelp"><Button size="sm" variant="outline">Tag cards</Button></Link>
        </div>
      </div>
    </div>
  );
}