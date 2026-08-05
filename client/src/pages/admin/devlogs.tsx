import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout, AdminGuard } from "@/components/admin/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/use-admin";
import { Plus, Pencil, Trash2, X, Save, Loader2, Eye, EyeOff, BookOpen } from "lucide-react";
import { format } from "date-fns";

type DevLog = {
  id: string; title: string; slug: string; summary: string; body: string;
  status: string; affected_apps: string[]; known_issues: string; next_steps: string;
  published_at: string | null; created_at: string; updated_at: string;
};

const APPS = ["Vanta OS", "World Alpha", "Vault", "Stonerism", "Wireline", "Rooms", "Voice", "Studio", "Vanta Deck", "Black Index"];

export default function AdminDevLogs() {
  return <AdminGuard><DevLogsContent /></AdminGuard>;
}

function DevLogsContent() {
  const { toast } = useToast();
  const { isAuthenticated } = useAdmin();
  const [editing, setEditing] = useState<DevLog | "new" | null>(null);
  const [form, setForm] = useState<Partial<DevLog & { affected_apps_str: string }>>({});

  const { data: logs, isLoading } = useQuery<DevLog[]>({
    queryKey: ["/api/admin/devlogs"],
    enabled: isAuthenticated,
  });

  const upsert = useMutation({
    mutationFn: (data: any) => {
      if (editing && editing !== "new") {
        return apiRequest("PATCH", `/api/admin/devlogs/${(editing as DevLog).id}`, data);
      }
      return apiRequest("POST", "/api/admin/devlogs", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/devlogs"] });
      setEditing(null);
      toast({ title: editing === "new" ? "Log created." : "Log updated." });
    },
    onError: () => toast({ title: "Save failed.", variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/devlogs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/devlogs"] });
      toast({ title: "Log deleted." });
    },
    onError: () => toast({ title: "Delete failed.", variant: "destructive" }),
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/admin/devlogs/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/devlogs"] }),
    onError: () => toast({ title: "Update failed.", variant: "destructive" }),
  });

  function openNew() {
    setEditing("new");
    setForm({ title: "", slug: "", summary: "", body: "", status: "draft", affected_apps: [], affected_apps_str: "", known_issues: "", next_steps: "" });
  }

  function openEdit(log: DevLog) {
    setEditing(log);
    setForm({ ...log, affected_apps_str: (log.affected_apps || []).join(", ") });
  }

  function field(k: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));
  }

  function submit() {
    const payload = {
      ...form,
      affected_apps: (form.affected_apps_str || "").split(",").map((s: string) => s.trim()).filter(Boolean),
    };
    delete (payload as any).affected_apps_str;
    upsert.mutate(payload);
  }

  function autoSlug(title: string) {
    return title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 80);
  }

  return (
    <AdminLayout title="Developer Logs" action={
      <Button size="sm" className="gap-2 text-xs" onClick={openNew}>
        <Plus className="w-3.5 h-3.5" /> New Log
      </Button>
    }>
      {editing && (
        <div className="border border-border rounded-lg p-6 mb-8 space-y-4 bg-card/30">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">{editing === "new" ? "New Dev Log" : "Edit Dev Log"}</h3>
            <Button variant="ghost" size="icon" onClick={() => setEditing(null)}><X className="w-4 h-4" /></Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Title</p>
              <Input value={form.title || ""} onChange={e => {
                setForm(f => ({ ...f, title: e.target.value, slug: f.slug || autoSlug(e.target.value) }));
              }} placeholder="v0.4.2 — Stability fixes" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Slug</p>
              <Input value={form.slug || ""} onChange={field("slug")} placeholder="v0-4-2-stability-fixes" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Status</p>
              <select value={form.status || "draft"} onChange={field("status")}
                className="w-full text-sm bg-background border border-border rounded-md px-3 py-2 text-foreground">
                {["draft", "published", "archived"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Affected Apps (comma-separated)</p>
              <Input value={form.affected_apps_str || ""} onChange={field("affected_apps_str")} placeholder="World Alpha, Vault, Stonerism" />
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Summary</p>
            <Textarea value={form.summary || ""} onChange={field("summary")} rows={2} className="resize-none" placeholder="Short public summary of this log entry" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Body (Markdown)</p>
            <Textarea value={form.body || ""} onChange={field("body")} rows={6} className="resize-none font-mono text-xs" placeholder="Full log content..." />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Known Issues</p>
              <Textarea value={form.known_issues || ""} onChange={field("known_issues")} rows={2} className="resize-none" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Next Steps</p>
              <Textarea value={form.next_steps || ""} onChange={field("next_steps")} rows={2} className="resize-none" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(null)}>Cancel</Button>
            <Button size="sm" className="gap-2" disabled={upsert.isPending} onClick={submit}>
              {upsert.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: "Total", value: logs?.length ?? 0 },
          { label: "Published", value: logs?.filter(l => l.status === "published").length ?? 0 },
          { label: "Drafts", value: logs?.filter(l => l.status === "draft").length ?? 0 },
        ].map(s => (
          <div key={s.label} className="border border-border rounded-md p-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-1">{s.label}</p>
            <p className="text-2xl font-display font-bold">{isLoading ? "—" : s.value}</p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2 animate-pulse">{[1,2,3].map(i => <div key={i} className="h-14 bg-muted rounded-md" />)}</div>
      ) : !logs?.length ? (
        <div className="border border-dashed border-border rounded-md py-16 text-center">
          <BookOpen className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No developer logs yet.</p>
          <Button size="sm" className="mt-4 gap-2" onClick={openNew}><Plus className="w-3.5 h-3.5" />New Log</Button>
        </div>
      ) : (
        <div className="border border-border rounded-md divide-y divide-border">
          {logs.map(log => (
            <div key={log.id} className="flex items-center gap-3 px-4 py-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{log.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {format(new Date(log.created_at), "MMM d, yyyy")}
                  {(log.affected_apps || []).length > 0 && ` · ${log.affected_apps.join(", ")}`}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Badge variant={log.status === "published" ? "default" : "outline"} className="text-xs capitalize">
                  {log.status}
                </Badge>
                <Button variant="ghost" size="icon" title={log.status === "published" ? "Unpublish" : "Publish"}
                  onClick={() => toggleStatus.mutate({ id: log.id, status: log.status === "published" ? "draft" : "published" })}>
                  {log.status === "published" ? <Eye className="w-4 h-4 text-muted-foreground" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                </Button>
                <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(log)}>
                  <Pencil className="w-4 h-4 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" title="Delete"
                  onClick={() => window.confirm(`Delete "${log.title}"?`) && del.mutate(log.id)}>
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
