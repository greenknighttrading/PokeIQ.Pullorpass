import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useIsPremium } from '@/hooks/useIsPremium';

const ADMIN_EMAIL = 'bryantjen06@gmail.com';

/**
 * Filter access is granted if:
 *  - user has at least one completed referral, OR
 *  - user is premium, OR
 *  - user is the admin email.
 * Guests always return false.
 */
export function useHasFilterAccess() {
  const { isPremium, loading: premiumLoading } = useIsPremium();
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [completedCount, setCompletedCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const recheck = async () => {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user || user.is_anonymous) {
      setUserId(null); setEmail(null); setCompletedCount(0); setLoading(false); return;
    }
    setUserId(user.id);
    setEmail(user.email?.toLowerCase() ?? null);
    const { count } = await supabase
      .from('pullorpass_referrals')
      .select('id', { count: 'exact', head: true })
      .eq('referrer_id', user.id)
      .not('completed_at', 'is', null);
    setCompletedCount(count ?? 0);
    setLoading(false);
  };

  useEffect(() => {
    recheck();
    const { data: sub } = supabase.auth.onAuthStateChange(() => { recheck(); });
    return () => { try { sub.subscription.unsubscribe(); } catch {} };
  }, []);

  const isAdmin = email === ADMIN_EMAIL;
  const hasAccess = !!userId && (completedCount > 0 || isPremium || isAdmin);

  return {
    hasAccess,
    isAuthenticated: !!userId,
    userId,
    completedReferrals: completedCount,
    loading: loading || premiumLoading,
    refresh: recheck,
  };
}