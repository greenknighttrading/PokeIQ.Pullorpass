import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle2, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CheckoutReturn() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [waited, setWaited] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setWaited(true), 1500);
    return () => clearTimeout(t);
  }, []);

  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <div>
          <p className="text-muted-foreground mb-4">No checkout session found.</p>
          <Button asChild><Link to="/premium">Back to Premium</Link></Button>
        </div>
      </div>
    );
  }

  if (!waited) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-violet-500/15 border border-violet-500/30 mb-6">
          <CheckCircle2 className="w-8 h-8 text-violet-300" />
        </div>
        <h1 className="text-3xl font-bold mb-3 flex items-center justify-center gap-2">
          <Crown className="w-6 h-6 text-violet-300" /> Welcome to Premium
        </h1>
        <p className="text-muted-foreground mb-6">
          Your payment is complete. Your account will be upgraded shortly — refresh if you don't see Premium features yet.
        </p>
        <div className="flex gap-3 justify-center">
          <Button asChild className="bg-violet-500 hover:bg-violet-600">
            <Link to="/swipe">Start swiping</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/premium">Back to Premium</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}