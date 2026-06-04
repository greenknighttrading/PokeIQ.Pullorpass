import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck, ShieldOff, Search } from "lucide-react";

type Me = { email: string | null; id: string | null };

async function invoke<T = any>(action: string, payload?: any): Promise<T> {
  const { data, error } = await supabase.functions.invoke("admin-api", {
    body: { action, payload },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as T;
}

function StatsTab() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    invoke("stats").then(setStats).catch((e) => toast({ title: "Stats failed", description: e.message })).finally(() => setLoading(false));
  }, []);
  if (loading) return <Loader2 className="w-5 h-5 animate-spin" />;
  if (!stats) return null;
  const tiles = [
    { label: "Total users", value: stats.userCount },
    { label: "Active Pro (live)", value: stats.activePro },
    { label: "Total swipes", value: stats.swipeCount },
    { label: "Total likes", value: stats.likeCount },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {tiles.map((t) => (
        <Card key={t.label}>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-normal">{t.label}</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-semibold tabular-nums">{(t.value ?? 0).toLocaleString()}</div></CardContent>
        </Card>
      ))}
    </div>
  );
}

function UsersTab({ onView }: { onView: (id: string) => void }) {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async (p = page, q = search) => {
    setLoading(true);
    try {
      const res = await invoke<{ users: any[] }>("list_users", { page: p, search: q });
      setUsers(res.users);
    } catch (e: any) {
      toast({ title: "Load failed", description: e.message });
    } finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { load(1, ""); /* eslint-disable-next-line */ }, []);

  async function togglePro(u: any) {
    setBusy(u.id);
    try {
      await invoke(u.is_pro ? "revoke_pro" : "grant_pro", { userId: u.id });
      toast({ title: u.is_pro ? "Pro revoked" : "Pro granted", description: u.email });
      await load(page, search);
    } catch (e: any) {
      toast({ title: "Action failed", description: e.message });
    } finally { setBusy(null); }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load(1, search)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={() => load(1, search)}>Search</Button>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => { const p = page - 1; setPage(p); load(p, search); }}>Prev</Button>
          <span className="text-sm text-muted-foreground self-center">Page {page}</span>
          <Button variant="outline" size="sm" onClick={() => { const p = page + 1; setPage(p); load(p, search); }}>Next</Button>
        </div>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Signed up</TableHead>
              <TableHead>Last seen</TableHead>
              <TableHead className="text-right">Swipes</TableHead>
              <TableHead>Pro</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin inline" /></TableCell></TableRow>
            )}
            {!loading && users.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No users</TableCell></TableRow>
            )}
            {!loading && users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.email ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}</TableCell>
                <TableCell className="text-muted-foreground">{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{u.swipe_count}</TableCell>
                <TableCell>{u.is_pro ? <Badge>Pro</Badge> : <Badge variant="outline">Free</Badge>}</TableCell>
                <TableCell className="text-right space-x-2 whitespace-nowrap">
                  <Button size="sm" variant="ghost" onClick={() => onView(u.id)}>View</Button>
                  <Button size="sm" variant={u.is_pro ? "outline" : "default"} disabled={busy === u.id} onClick={() => togglePro(u)}>
                    {busy === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : u.is_pro ? (<><ShieldOff className="w-3 h-3" /> Revoke</>) : (<><ShieldCheck className="w-3 h-3" /> Grant Pro</>)}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function GrantTab() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function findAndGrant(grant: boolean) {
    if (!email.trim()) return;
    setBusy(true);
    try {
      // search via list_users
      const res = await invoke<{ users: any[] }>("list_users", { page: 1, search: email.trim().toLowerCase() });
      const match = res.users.find((u) => (u.email ?? "").toLowerCase() === email.trim().toLowerCase());
      if (!match) {
        toast({ title: "Not found", description: "No user with that email (try first page; use Users tab for paging)." });
        return;
      }
      await invoke(grant ? "grant_pro" : "revoke_pro", { userId: match.id });
      toast({ title: grant ? "Pro granted" : "Pro revoked", description: email });
    } catch (e: any) {
      toast({ title: "Failed", description: e.message });
    } finally { setBusy(false); }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Grant or revoke Pro by email</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <Input placeholder="user@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <div className="flex gap-2">
          <Button onClick={() => findAndGrant(true)} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} Grant Pro
          </Button>
          <Button variant="outline" onClick={() => findAndGrant(false)} disabled={busy}>
            <ShieldOff className="w-4 h-4" /> Revoke Pro
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Inserts a live-environment subscription row with a 100-year period end. Reversible.</p>
      </CardContent>
    </Card>
  );
}

function UserDetailModal({ userId, onClose }: { userId: string | null; onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!userId) { setData(null); return; }
    setLoading(true);
    invoke("user_detail", { userId }).then(setData).catch((e) => toast({ title: "Failed", description: e.message })).finally(() => setLoading(false));
  }, [userId]);
  if (!userId) return null;
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div className="max-w-3xl mx-auto my-10 p-6 bg-card border rounded-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">User detail</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        </div>
        {loading && <Loader2 className="w-5 h-5 animate-spin" />}
        {data && (
          <div className="space-y-6 text-sm">
            <div>
              <div className="text-muted-foreground">Email</div>
              <div className="font-medium">{data.user?.email}</div>
              <div className="text-xs text-muted-foreground mt-1">ID: {data.user?.id}</div>
              <div className="text-xs text-muted-foreground">Joined: {data.user?.created_at && new Date(data.user.created_at).toLocaleString()}</div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Card><CardContent className="pt-6"><div className="text-muted-foreground text-xs">Swipes</div><div className="text-2xl font-semibold">{data.swipeCount ?? 0}</div></CardContent></Card>
              <Card><CardContent className="pt-6"><div className="text-muted-foreground text-xs">Likes</div><div className="text-2xl font-semibold">{data.likeCount ?? 0}</div></CardContent></Card>
              <Card><CardContent className="pt-6"><div className="text-muted-foreground text-xs">Subscriptions</div><div className="text-2xl font-semibold">{data.subscriptions?.length ?? 0}</div></CardContent></Card>
            </div>
            {data.dna && (
              <div>
                <h3 className="font-medium mb-2">Collector DNA</h3>
                <pre className="text-xs bg-muted/30 p-3 rounded overflow-auto max-h-48">{JSON.stringify(data.dna, null, 2)}</pre>
              </div>
            )}
            <div>
              <h3 className="font-medium mb-2">Recent swipes</h3>
              <div className="space-y-1">
                {(data.recentSwipes ?? []).map((s: any, i: number) => (
                  <div key={i} className="flex justify-between border-b py-1 text-xs">
                    <span>{s.card_name} <span className="text-muted-foreground">— {s.card_set}</span></span>
                    <span className={s.decision === "pull" ? "text-primary" : "text-muted-foreground"}>{s.decision}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-medium mb-2">Recent likes</h3>
              <div className="space-y-1">
                {(data.recentLikes ?? []).map((s: any, i: number) => (
                  <div key={i} className="flex justify-between border-b py-1 text-xs">
                    <span>{s.card_name} <span className="text-muted-foreground">— {s.card_set}</span></span>
                    <span className="text-muted-foreground">{s.liked_at && new Date(s.liked_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Admin() {
  const [me, setMe] = useState<Me | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [viewUser, setViewUser] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setMe({ email: data.user?.email ?? null, id: data.user?.id ?? null });
      setAuthChecked(true);
    });
  }, []);

  if (!authChecked) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  const isAdmin = me?.email?.toLowerCase() === "bryantjen06@gmail.com";

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardHeader><CardTitle>Admin only</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>This area is restricted. Sign in with an admin account.</p>
            {me?.email && <p>Signed in as <span className="font-mono">{me.email}</span></p>}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">Signed in as {me?.email}</p>
        </div>
        <Tabs defaultValue="stats">
          <TabsList>
            <TabsTrigger value="stats">Stats</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="grant">Grant Pro</TabsTrigger>
          </TabsList>
          <TabsContent value="stats" className="mt-6"><StatsTab /></TabsContent>
          <TabsContent value="users" className="mt-6"><UsersTab onView={setViewUser} /></TabsContent>
          <TabsContent value="grant" className="mt-6"><GrantTab /></TabsContent>
        </Tabs>
      </div>
      <UserDetailModal userId={viewUser} onClose={() => setViewUser(null)} />
    </div>
  );
}