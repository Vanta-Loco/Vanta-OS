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
import { Plus, Pencil, Trash2, X, Save, Loader2, Eye, EyeOff, Smartphone } from "lucide-react";

type AppTeaser = {
  id: string; name: string; slug: string; description: string; status: string;
  planned_features: string[]; teaser_image: string; early_access_enabled: string;
  display_order: number; published: string; created_at: string;
};

const STATUS_OPTIONS = ["coming-soon", "in-development", "beta", "launching-soon", "live"];

export default function AdminApps() {
  return <AdminGuard><AppsContent /></AdminGuard>;
}

function AppsContent() {
  const { toast } = useToast();
  const { isAuthenticated } = useAdmin();
  const [editing, setEditing] = useState<AppTeaser | "new" | null>(null);
  const [form, setForm] = useState<Partial<AppTeaser & { features_str: string }>>({});

  const { data: apps, isLoading } = useQuery<AppTeaser[]>({
    queryKey: ["/api/admin/apps"],
    enabled: isAuthenticated,
  });

  const upsert = useMutation({
    mutationFn: (data: any) => {
      if (editing && editing !== "new") {
        return apiRequest("PATCH", `/api/admin/apps/${(editing as AppTeaser).id}`, data);
      }
      return apiRequest("POST", "/api/admin/apps", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/apps"] });
      setEditing(null);
      toast({ title: editing === "new" ? "App teaser created." : "App teaser updated." });
    },
    onError: () => toast({ title: "Save failed.", variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/apps/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/apps"] });
      toast({ title: "App teaser deleted." });
    },
    onError: () => toast({ title: "Delete failed.", variant: "destructive" }),
  });

  const togglePublished = useMutation({
    mutationFn: ({ id, published }: { id: string; published: string }) =>
      apiRequest("PATCH", `/api/admin/apps/${id}`, { published }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/apps"] }),
    onError: () => toast({ title: "Update failed.", variant: "destructive" }),
  });

  function openNew() {
    setEditing("new");
    setForm({ name: "", slug: "", description: "", status: "coming-soon", features_str: "", teaser_image: "", early_access_enabled: "false", display_order: 0, published: "false" });
  }

  function openEdit(app: AppTeaser) {
    setEditing(app);
    setForm({ ...app, features_str: (app.planned_features || []).join(", ") });
  }

  function field(k: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));
  }

  function submit() {
    const payload = {
      ...form,
      planned_features: (form.features_str || "").split(",").map((s: string) => s.trim()).filter(Boolean),
      display_order: Number(form.display_order) || 0,
    };
    delete (payload as any).features_str;
    upsert.mutate(payload);
  }

  function autoSlug(name: string) {
    return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  }

  return (
    <AdminLayout title="App Teasers" action={
      <Button size="sm" className="gap-2 text-xs" onClick={openNew}>
        <Plus className="w-3.5 h-3.5" /> New Teaser
      </Button>
    }>
      {editing && (
        <div className="border border-border rounded-lg p-6 mb-8 space-y-4 bg-card/30">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">{editing === "new" ? "New App Teaser" : `Edit: ${(editing as AppTeaser).name}`}</h3>
            <Button variant="ghost" size="icon" onClick={() => setEditing(null)}><X className="w-4 h-4" /></Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">App Name</p>
              <Input value={form.name || ""} onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: f.slug || autoSlug(e.target.value) }))} placeholder="Wireline" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Slug</p>
              <Input value={form.slug || ""} onChange={field("slug")} placeholder="wireline" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Status</p>
              <select value={form.status || "coming-soon"} onChange={field("status")}
                className="w-full text-sm bg-background border border-border rounded-md px-3 py-2 text-foreground">
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Display Order</p>
              <Input type="number" value={form.display_order ?? 0} onChange={field("display_order")} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Teaser Image URL</p>
              <Input value={form.teaser_image || ""} onChange={field("teaser_image")} placeholder="/uploads/..." />
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Early Access</p>
                <select value={form.early_access_enabled || "false"} onChange={field("early_access_enabled")}
                  className="w-full text-sm bg-background border border-border rounded-md px-3 py-2 text-foreground">
                  <option value="false">Disabled</option>
                  <option value="true">Enabled</option>
                </select>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Published</p>
                <select value={form.published || "false"} onChange={field("published")}
                  className="w-full text-sm bg-background border border-border rounded-md px-3 py-2 text-foreground">
                  <option value="false">Hidden</option>
                  <option value="true">Published</option>
                </select>
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Description</p>
            <Textarea value={form.description || ""} onChange={field("description")} rows={2} className="resize-none" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Planned Features (comma-separated)</p>
            <Input value={form.features_str || ""} onChange={field("features_str")} placeholder="Real-time sync, End-to-end encryption, Voice channels" />
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

      <div className="grid grid-cols-2 gap-3 mb-8">
        <div className="border border-border rounded-md p-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-1">Total Teasers</p>
          <p className="text-2xl font-display font-bold">{isLoading ? "—" : apps?.length ?? 0}</p>
        </div>
        <div className="border border-border rounded-md p-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-1">Published</p>
          <p className="text-2xl font-display font-bold">{isLoading ? "—" : apps?.filter(a => a.published === "true").length ?? 0}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2 animate-pulse">{[1,2,3].map(i => <div key={i} className="h-14 bg-muted rounded-md" />)}</div>
      ) : !apps?.length ? (
        <div className="border border-dashed border-border rounded-md py-16 text-center">
          <Smartphone className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No app teasers yet.</p>
          <Button size="sm" className="mt-4 gap-2" onClick={openNew}><Plus className="w-3.5 h-3.5" />New Teaser</Button>
        </div>
      ) : (
        <div className="border border-border rounded-md divide-y divide-border">
          {apps.map(app => (
            <div key={app.id} className="flex items-center gap-3 px-4 py-3 flex-wrap">
              {app.teaser_image ? (
                <img src={app.teaser_image} alt="" className="w-10 h-10 rounded-sm object-cover shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-sm bg-muted flex items-center justify-center shrink-0">
                  <Smartphone className="w-4 h-4 text-muted-foreground/40" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{app.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                  {app.status} · order {app.display_order}
                  {app.early_access_enabled === "true" && " · early access"}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {app.published !== "true" && <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-400 bg-amber-500/10">Hidden</Badge>}
                <Button variant="ghost" size="icon" title={app.published === "true" ? "Hide" : "Publish"}
                  onClick={() => togglePublished.mutate({ id: app.id, published: app.published === "true" ? "false" : "true" })}>
                  {app.published === "true" ? <Eye className="w-4 h-4 text-muted-foreground" /> : <EyeOff className="w-4 h-4 text-muted-foreground/50" />}
                </Button>
                <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(app)}>
                  <Pencil className="w-4 h-4 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" title="Delete"
                  onClick={() => window.confirm(`Delete "${app.name}"?`) && del.mutate(app.id)}>
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
