import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout, AdminGuard } from "@/components/admin/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/use-admin";
import { Trash2, Download, Search, Clock } from "lucide-react";
import { format } from "date-fns";

type Signup = {
  id: string; app_name: string; email: string; name: string;
  status: string; internal_notes: string; created_at: string;
};

const APPS = ["Wireline", "Rooms", "Voice", "Studio", "Vanta Deck", "Full Vanta OS"];

export default function AdminWaitlists() {
  return <AdminGuard><WaitlistsContent /></AdminGuard>;
}

function WaitlistsContent() {
  const { toast } = useToast();
  const { isAuthenticated } = useAdmin();
  const [search, setSearch] = useState("");
  const [appFilter, setAppFilter] = useState("all");

  const { data: signups, isLoading } = useQuery<Signup[]>({
    queryKey: ["/api/admin/waitlists"],
    enabled: isAuthenticated,
  });

  const del = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/waitlists/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/waitlists"] });
      toast({ title: "Signup removed." });
    },
    onError: () => toast({ title: "Delete failed.", variant: "destructive" }),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/admin/waitlists/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/waitlists"] }),
    onError: () => toast({ title: "Update failed.", variant: "destructive" }),
  });

  const filtered = (signups || []).filter(s => {
    const matchApp = appFilter === "all" || s.app_name === appFilter;
    const matchSearch = !search || s.email.toLowerCase().includes(search.toLowerCase()) ||
      s.name.toLowerCase().includes(search.toLowerCase());
    return matchApp && matchSearch;
  });

  const byApp = APPS.reduce<Record<string, number>>((acc, app) => {
    acc[app] = (signups || []).filter(s => s.app_name === app).length;
    return acc;
  }, {});

  function exportCSV() {
    window.open("/api/admin/waitlists/export.csv", "_blank");
  }

  return (
    <AdminLayout title="Early Access Waitlists" action={
      <Button size="sm" variant="outline" className="gap-2 text-xs" onClick={exportCSV}>
        <Download className="w-3.5 h-3.5" /> Export CSV
      </Button>
    }>
      {/* Stats per app */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
        <div className="border border-border rounded-md p-4 col-span-2 md:col-span-1">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-1">Total Signups</p>
          <p className="text-2xl font-display font-bold">{isLoading ? "—" : signups?.length ?? 0}</p>
        </div>
        {APPS.map(app => (
          <div key={app} className="border border-border rounded-md p-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-1 truncate">{app}</p>
            <p className="text-2xl font-display font-bold">{isLoading ? "—" : byApp[app] || 0}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search email or name…"
            className="pl-8 text-sm w-60"
          />
        </div>
        <select value={appFilter} onChange={e => setAppFilter(e.target.value)}
          className="text-sm bg-background border border-border rounded-md px-3 py-2 text-foreground">
          <option value="all">All apps</option>
          {APPS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        {(search || appFilter !== "all") && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setAppFilter("all"); }}>
            Clear filters
          </Button>
        )}
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {isLoading ? (
        <div className="space-y-2 animate-pulse">{[1,2,3,4].map(i => <div key={i} className="h-12 bg-muted rounded-md" />)}</div>
      ) : !filtered.length ? (
        <div className="border border-dashed border-border rounded-md py-16 text-center">
          <Clock className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">{signups?.length ? "No results match your filters." : "No waitlist signups yet."}</p>
        </div>
      ) : (
        <div className="border border-border rounded-md divide-y divide-border">
          {filtered.map(signup => (
            <div key={signup.id} className="flex items-center gap-3 px-4 py-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm">{signup.email}</p>
                  {signup.name && <span className="text-xs text-muted-foreground">({signup.name})</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {signup.app_name} · {format(new Date(signup.created_at), "MMM d, yyyy")}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={signup.status}
                  onChange={e => updateStatus.mutate({ id: signup.id, status: e.target.value })}
                  className="text-xs bg-background border border-border rounded px-2 py-1 text-foreground"
                >
                  {["pending", "approved", "rejected", "notified"].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <Button variant="ghost" size="icon" title="Remove"
                  onClick={() => window.confirm(`Remove ${signup.email} from waitlist?`) && del.mutate(signup.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
