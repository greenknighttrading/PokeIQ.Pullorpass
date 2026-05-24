import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, Star, X, ArrowLeft, ImageOff, Search, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { GlobalNavBar } from '@/components/layout/GlobalNavBar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Seo } from '@/components/seo/Seo';

const PAGE_SIZE = 24;

type Swipe = {
  id: string;
  card_id: string;
  card_name: string;
  card_set: string | null;
  card_image: string | null;
  card_price: number | null;
  card_rarity: string | null;
  tags: string[];
  decision: 'pull' | 'pass';
  created_at: string;
};

type Category = 'matches' | 'likes' | 'passes';

const CONFIG: Record<Category, { title: string; subtitle: string; badge: 'match' | 'like' | 'pass'; icon: React.ReactNode }> = {
  matches: { title: 'All Matches',  subtitle: 'Every card PokeIQ has flagged as on-taste for you.', badge: 'match', icon: <Sparkles className="w-5 h-5 text-primary" /> },
  likes:   { title: 'All Likes',    subtitle: 'Every card you pulled or super-liked.',               badge: 'like',  icon: <Heart className="w-5 h-5 text-primary fill-primary" /> },
  passes:  { title: 'All Passes',   subtitle: "Cards that didn't speak to you.",                     badge: 'pass',  icon: <X className="w-5 h-5 text-muted-foreground" /> },
};

export default function MatchesCollection() {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const cat = (category as Category) in CONFIG ? (category as Category) : 'matches';
  const cfg = CONFIG[cat];

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Swipe[]>([]);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'recent' | 'price-desc' | 'price-asc' | 'name'>('recent');
  const [page, setPage] = useState(1);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || session.user.is_anonymous) {
        setLoading(false);
        return;
      }
      let q = supabase.from('pullorpass_swipes').select('*').eq('user_id', session.user.id);
      if (cat === 'matches') q = q.contains('tags', ['Match']);
      else if (cat === 'likes') q = q.eq('decision', 'pull');
      else q = q.eq('decision', 'pass');

      const { data } = await q.order('created_at', { ascending: false }).limit(1000);
      let rows = (data as any[]) || [];
      if (cat === 'likes') rows = rows.filter((r) => !(r.tags || []).includes('Match'));
      setItems(rows);
      setLoading(false);
    })();
  }, [cat]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let r = q
      ? items.filter((i) =>
          i.card_name?.toLowerCase().includes(q) ||
          (i.card_set ?? '').toLowerCase().includes(q))
      : items;
    if (sort === 'price-desc') r = [...r].sort((a, b) => (Number(b.card_price) || 0) - (Number(a.card_price) || 0));
    else if (sort === 'price-asc') r = [...r].sort((a, b) => (Number(a.card_price) || 0) - (Number(b.card_price) || 0));
    else if (sort === 'name') r = [...r].sort((a, b) => a.card_name.localeCompare(b.card_name));
    return r;
  }, [items, query, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [query, sort, cat]);

  return (
    <>
      <Seo title={`${cfg.title} — PokeIQ`} description={cfg.subtitle} />
      <div className="min-h-screen bg-background flex flex-col">
        <GlobalNavBar />
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
          <Link to="/matches" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-3">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Matches
          </Link>
          <div className="flex items-center gap-2 mb-1">
            {cfg.icon}
            <h1 className="text-2xl font-bold text-foreground">{cfg.title}</h1>
            <span className="text-sm text-muted-foreground tabular-nums">· {filtered.length}</span>
          </div>
          <p className="text-sm text-muted-foreground mb-5">{cfg.subtitle}</p>

          {/* Filter/sort bar */}
          <Card className="p-3 mb-5 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search card or set…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={sort} onValueChange={(v: any) => setSort(v)}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most recent</SelectItem>
                <SelectItem value="price-desc">Price: high → low</SelectItem>
                <SelectItem value="price-asc">Price: low → high</SelectItem>
                <SelectItem value="name">Name (A–Z)</SelectItem>
              </SelectContent>
            </Select>
          </Card>

          {loading ? (
            <Card className="p-10 text-center text-sm text-muted-foreground">Loading…</Card>
          ) : filtered.length === 0 ? (
            <Card className="p-10 text-center text-sm text-muted-foreground">No cards found.</Card>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                {pageItems.map((m) => <Thumb key={m.id} m={m} badge={cfg.badge} />)}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                  <span className="text-xs text-muted-foreground tabular-nums px-2">Page {page} / {totalPages}</span>
                  <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
}

function Thumb({ m, badge }: { m: Swipe; badge: 'match' | 'like' | 'pass' }) {
  const [err, setErr] = useState(false);
  const dim = badge === 'pass';
  const superLiked = (m.tags || []).includes('Loved');
  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.03 }}
      transition={{ type: 'spring', stiffness: 280, damping: 20 }}
      className="space-y-1.5 group"
    >
      <div className={`relative aspect-[2.5/3.5] rounded-xl overflow-hidden bg-muted/30 shadow-md transition-shadow duration-300 group-hover:shadow-[0_12px_40px_-12px_hsl(var(--primary)/0.45)] ring-1 ring-border/40 group-hover:ring-primary/40 ${dim ? 'opacity-50 grayscale group-hover:opacity-80 group-hover:grayscale-0' : ''}`}>
        {m.card_image && !err ? (
          <img src={m.card_image} alt={m.card_name} className="w-full h-full object-cover" onError={() => setErr(true)} />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><ImageOff className="w-5 h-5 text-muted-foreground" /></div>
        )}
        {superLiked && (
          <div className="absolute top-1.5 right-1.5 z-10">
            <div className="bg-background/70 backdrop-blur-sm rounded-full p-1 shadow-lg ring-1 ring-amber-400/50">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.7)]" />
            </div>
          </div>
        )}
        {badge === 'match' && (
          <div className={`absolute ${superLiked ? 'top-1.5 left-1.5' : 'top-1.5 right-1.5'} bg-primary/90 rounded-full p-1 shadow-md`}>
            <Sparkles className="w-3 h-3 text-white" />
          </div>
        )}
        {badge === 'like' && !superLiked && (
          <div className="absolute top-1.5 right-1.5 bg-primary/80 rounded-full p-1 shadow-md">
            <Heart className="w-3 h-3 text-white fill-white" />
          </div>
        )}
        {badge === 'pass' && (
          <div className="absolute top-1.5 right-1.5 bg-muted-foreground/80 rounded-full p-1 shadow-md">
            <X className="w-3 h-3 text-background" />
          </div>
        )}
      </div>
      <p className="text-xs text-foreground truncate font-medium">{m.card_name}</p>
      <p className="text-[10px] text-muted-foreground truncate">
        {m.card_set ?? '—'}{m.card_price ? ` · $${Number(m.card_price).toFixed(0)}` : ''}
      </p>
    </motion.div>
  );
}