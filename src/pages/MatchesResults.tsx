import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Seo } from '@/components/seo/Seo';
import { supabase } from '@/integrations/supabase/client';
import { ResultsView } from './PullOrPass';
import type { SwipeCard, SwipeRecord } from '@/lib/pullorpass';

type Stored = { records: SwipeRecord[]; roundId: string; cards: SwipeCard[]; index?: number };

function todayKey() {
  const d = new Date();
  // MUST match PullOrPass.tsx's todayKey() (non-padded) so we read the
  // same localStorage key it writes to.
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// Every swipe of the day (across rounds) is appended here by PullOrPass.
function readTodayRecords(): SwipeRecord[] {
  try {
    const raw = localStorage.getItem('pop_today_swiped_' + todayKey());
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((x: any) => x && x.card_id && (x.decision === 'pull' || x.decision === 'pass'))
      .map((x: any): SwipeRecord => ({
        card: {
          card_id: x.card_id,
          name: x.name ?? '',
          set_name: x.set_name ?? null,
          image_url: x.image_url ?? null,
          price: typeof x.price === 'number' ? x.price : 0,
          rarity: x.rarity ?? null,
        },
        decision: x.decision,
        tags: Array.isArray(x.tags) ? x.tags : [],
      }));
  } catch { return []; }
}

function readResults(): Stored | null {
  try {
    const raw = localStorage.getItem('pop_results_v1');
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (!v?.records?.length) return null;
    return v as Stored;
  } catch { return null; }
}

function readResume(): Stored | null {
  try {
    const raw = localStorage.getItem('pop_resume_v1');
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (!v?.records?.length) return null;
    return { records: v.records, roundId: v.roundId, cards: v.cards };
  } catch { return null; }
}

export default function MatchesResults() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<SwipeRecord[] | null>(null);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    (async () => {
      // 1) For authed users, always prefer their server-side latest round so
      //    reloads reflect the true most recent round (local caches can be
    //    stale from earlier rounds or other tabs).
      let serverRecords: SwipeRecord[] | null = null;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const authed = !!session?.user && !session.user.is_anonymous;
        setIsAuthed(authed);
        if (authed) {
          const { data: latest } = await supabase
            .from('pullorpass_swipes')
            .select('round_id, created_at')
            .eq('user_id', session!.user.id)
            .order('created_at', { ascending: false })
            .limit(1);
          const roundId = latest?.[0]?.round_id;
          const { data } = roundId ? await supabase
            .from('pullorpass_swipes')
            .select('card_id, card_name, card_set, card_image, card_price, card_rarity, decision, tags, created_at')
            .eq('user_id', session!.user.id)
            .eq('round_id', roundId)
            .order('created_at', { ascending: false })
            .limit(500) : { data: null } as any;
          if (data && data.length) {
            serverRecords = data.map((x: any): SwipeRecord => ({
              card: {
                card_id: x.card_id,
                name: x.card_name ?? '',
                set_name: x.card_set ?? null,
                image_url: x.card_image ?? null,
                price: typeof x.card_price === 'number' ? x.card_price : Number(x.card_price) || 0,
                rarity: x.card_rarity ?? null,
              },
              decision: x.decision,
              tags: Array.isArray(x.tags) ? x.tags : [],
            }));
          }
        }
      } catch (e) {
        console.warn('matches: server fetch failed', e);
      }

      if (serverRecords && serverRecords.length) {
        setRecords(serverRecords);
        return;
      }

      // 2) Guests / no server data — fall back to local state (in-progress
      //    round first, then last completed round, then today's history).
      const active = readResume();
      if (active?.records?.length) { setRecords(active.records); return; }
      const latestLocal = readResults();
      if (latestLocal?.records?.length) { setRecords(latestLocal.records); return; }
      const today = readTodayRecords();
      if (today.length) {
        setRecords(today);
        return;
      }
      setRecords([]);
    })();
  }, []);

  if (records === null) return null;

  if (records.length === 0) {
    return (
      <>
        <Seo title="Your Matches | PokeIQ" description="Cards you pulled in your latest Pull or Pass round." />
        <div className="min-h-screen flex items-center justify-center px-4">
          <Card className="p-10 text-center max-w-md space-y-4">
            <Sparkles className="w-8 h-8 text-primary mx-auto" />
            <h1 className="text-2xl font-bold">No matches yet</h1>
            <p className="text-sm text-muted-foreground">
              Start a Pull or Pass round and your likes &amp; passes will show up here.
            </p>
            <Link to="/swipe">
              <Button className="gap-2">Start swiping <ArrowRight className="w-4 h-4" /></Button>
            </Link>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Seo title="Your Matches | PokeIQ" description="Cards you pulled in your latest Pull or Pass round." />
      <div className="min-h-screen bg-background">
        <main className="w-full mx-auto py-3 flex-col select-none flex md:items-center md:justify-start">
          <ResultsView
            records={records}
            onPlayAgain={() => navigate('/swipe')}
            isAuthed={isAuthed}
            onSignUp={() => navigate('/auth', { state: { from: '/matches' } })}
          />
        </main>
      </div>
    </>
  );
}