import { useState } from 'react';
import { Swords, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import DailyBattle from '@/pages/DailyBattle';
import Leaderboard from '@/pages/pokeiq/Leaderboard';

type Tab = 'arena' | 'leaderboard';

export default function Arena() {
  const [tab, setTab] = useState<Tab>('arena');

  return (
    <div className="bg-background">
      <div className="max-w-3xl mx-auto px-4 pt-3 flex justify-center">
        <div className="inline-flex rounded-full border border-border bg-card p-1">
          {([
            { id: 'arena', label: 'Arena', icon: Swords },
            { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
                tab === id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>
      </div>
      {tab === 'arena' ? <DailyBattle /> : <Leaderboard />}
    </div>
  );
}
