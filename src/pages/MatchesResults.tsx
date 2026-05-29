import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Seo } from '@/components/seo/Seo';
import { supabase } from '@/integrations/supabase/client';
import { ResultsView } from './PullOrPass';
import type { SwipeCard, SwipeRecord } from '@/lib/pullorpass';

type Stored = { records: SwipeRecord[]; roundId: string; cards: SwipeCard[] };

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
    const stored = readResults() ?? readResume();
    setRecords(stored?.records ?? []);
    supabase.auth.getUser().then(({ data }) => {
      setIsAuthed(!!data.user && !data.user.is_anonymous);
    });
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
        <main className="w-full mx-auto py-3 flex flex-col select-none">
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