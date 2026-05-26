import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useIsPremium } from '@/hooks/useIsPremium';

/**
 * Wrap a route element to require Premium. Non-premium users are
 * redirected to /premium where they can subscribe.
 */
export function PremiumGate({ children }: { children: React.ReactNode }) {
  const { isPremium, loading } = useIsPremium();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isPremium) {
    return <Navigate to="/premium" replace />;
  }

  return <>{children}</>;
}