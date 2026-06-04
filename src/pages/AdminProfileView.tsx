import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Matches from "./Matches";
import { Loader2, ArrowLeft } from "lucide-react";

export default function AdminProfileView() {
  const { userId } = useParams<{ userId: string }>();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const e = data.user?.email?.toLowerCase() ?? null;
      setEmail(e);
      setAllowed(e === "bryantjen06@gmail.com");
    });
  }, []);

  if (allowed === null) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }
  if (!allowed) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Admin only.</div>;
  }
  if (!userId) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Missing user id.</div>;
  }
  return (
    <div>
      <div className="max-w-[1380px] mx-auto px-5 sm:px-8 pt-6 flex items-center justify-between">
        <Link to="/admin" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to admin
        </Link>
        <div className="text-xs text-muted-foreground">Admin view · user <span className="font-mono">{userId.slice(0, 8)}</span></div>
      </div>
      <Matches viewedUserId={userId} viewedDisplayName="Collector" isPublicView isAdminView />
    </div>
  );
}
