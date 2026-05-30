import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { isPaymentsConfigured, getStripeEnvironment } from '@/lib/stripe';

const CACHE_KEY = 'pokeiq_is_premium_v1';

function readCache(): boolean | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw === '1') return true;
    if (raw === '0') return false;
  } catch {}
  return null;
}

function writeCache(v: boolean) {
  try { localStorage.setItem(CACHE_KEY, v ? '1' : '0'); } catch {}
}

export function useIsPremium() {
  const cached = readCache();
  const [isPremium, setIsPremium] = useState<boolean>(cached ?? false);
  const [loading, setLoading] = useState(cached === null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      const user = data.user;
      const email = user?.email?.toLowerCase();
      if (email === 'bryantjen06@gmail.com') {
        setIsPremium(true);
        setLoading(false);
        writeCache(true);
        return;
      }
      if (!user || !isPaymentsConfigured()) {
        setIsPremium(false);
        setLoading(false);
        writeCache(false);
        return;
      }
      const env = getStripeEnvironment();
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('status,current_period_end')
        .eq('user_id', user.id)
        .eq('environment', env)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!mounted) return;
      const now = Date.now();
      const periodEnd = sub?.current_period_end ? new Date(sub.current_period_end).getTime() : null;
      const active = !!sub && (
        (['active', 'trialing', 'past_due'].includes(sub.status) && (!periodEnd || periodEnd > now)) ||
        (sub.status === 'canceled' && periodEnd && periodEnd > now)
      );
      const finalVal = Boolean(active);
      setIsPremium(finalVal);
      setLoading(false);
      writeCache(finalVal);
    })();
    return () => { mounted = false; };
  }, []);

  return { isPremium, loading };
}