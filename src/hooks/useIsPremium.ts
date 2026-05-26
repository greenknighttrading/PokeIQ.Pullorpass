import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Placeholder premium check. Wire to real subscription state later.
export function useIsPremium() {
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      const email = data.user?.email?.toLowerCase();
      // Admin always premium
      setIsPremium(email === 'bryantjen06@gmail.com');
      setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  return { isPremium, loading };
}