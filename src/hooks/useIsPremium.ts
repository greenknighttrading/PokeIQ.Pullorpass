import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { isPaymentsConfigured, getStripeEnvironment } from '@/lib/stripe';

export function useIsPremium() {
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

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
        return;
      }
      if (!user || !isPaymentsConfigured()) {
        setIsPremium(false);
        setLoading(false);
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
      setIsPremium(Boolean(active));
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  return { isPremium, loading };
}