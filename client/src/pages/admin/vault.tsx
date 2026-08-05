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
import { Plus, Pencil, Trash2, X, Save, Loader2, Music } from "lucide-react";

type VaultItem = {
  id: string; title: string; description: string; type: string;
  category: string; fileUrl: string; compressedUrl?: string;
  coverImage: string; notes: string; createdAt: string;
};

const VAULT_TYPES = ["demo", "instrumental", "stem", "sample", "loop", "vocal", "full-track", "other"];
const VAULT_CATS = ["unreleased", "archive", "collaboration", "experiment", "remix"];

export default function AdminVault() {
  return <AdminGuard><VaultContent /></AdminGuard>;
}

function VaultContent() {
  const { toast } = useToast();
  const { isAuthenticated } = useAdmin();
  const [editing, setEditing] = useState<VaultItem | null | "new">(null);
  const [form, setForm] = useState<Partial<VaultItem>>({});

  const { data: items, isLoading } = useQuery<VaultItem[]>({
    queryKey: ["/api/admin/vault/items"],
    enabled: isAuthenticated,
  });

  const upsert = useMutation({
    mutationFn: (data: Partial<VaultItem>) => {
      if (editing && editing !== "new" && editing.id) {
        return apiRequest("PATCH", `/api/vault/items/${editing.id}`, data);
      }
      return apiRequest("POST", "/api/vault/items", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/vault/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vault/items"] });
      setEditing(null);
      toast({ title: editing === "new" ? "Track added." : "Track updated." });
    },
    onError: () => toast({ title: "Save failed.", variant: "destructive" }),
  });

  const deleteItem = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/vault/items/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/vault/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vault/items"] });
      toast({ title: "Track removed." });
    },
    onError: () => toast({ title: "Delete failed.", variant: "destructive" }),
  });

  function openNew() {
    setEditing("new");
    setForm({ type: "demo", category: "unreleased", title: "", fileUrl: "", description: "", notes: "" });
  }

  function openEdit(item: VaultItem) {
    setEditing(item);
    setForm({ ...item });
  }

  function field(k: keyof VaultItem) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));
  }

  function confirmDelete(title: string, id: string) {
    if (window.confirm(`Remove "${title}" from the Vault? This cannot be undone.`)) deleteItem.mutate(id);
  }

  return (
    <AdminLayout
      title="Vault"
      action={
        <Button size="sm" className="gap-2 text-xs" onClick={openNew}>
          <Plus className="w-3.5 h-3.5" /> Add Track
        </Button>
      }
    >
      {/* Edit form */}
      {editing && (
        <div className="border border-border rounded-lg p-6 mb-8 space-y-4 bg-card/30">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">{editing === "new" ? "New Track" : "Edit Track"}</h3>
            <Button variant="ghost" size="icon" onClick={() => setEditing(null)}><X className="w-4 h-4" /></Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Title</p>
              <Input value={form.title || ""} onChange={field("title")} placeholder="Track title" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">File URL</p>
              <Input value={form.fileUrl || ""} onChange={field("fileUrl")} placeholder="/uploads/track.mp3" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Type</p>
              <select value={form.type || "demo"} onChange={field("type")}
                className="w-full text-sm bg-background border border-border rounded-md px-3 py-2 text-foreground">
                {VAULT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Category</p>
              <select value={form.category || "unreleased"} onChange={field("category")}
                className="w-full text-sm bg-background border border-border rounded-md px-3 py-2 text-foreground">
                {VAULT_CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Cover Image URL</p>
              <Input value={form.coverImage || ""} onChange={field("coverImage")} placeholder="Image URL" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Description</p>
              <Input value={form.description || ""} onChange={field("description")} placeholder="Short description" />
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Notes (internal)</p>
            <Textarea value={form.notes || ""} onChange={field("notes")} rows={2} className="resize-none" placeholder="Internal notes — not public" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(null)}>Cancel</Button>
            <Button size="sm" className="gap-2" disabled={upsert.isPending}
              onClick={() => upsert.mutate(form)}>
              {upsert.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save
            </Button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <div className="border border-border rounded-md p-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-1">Total Tracks</p>
          <p className="text-2xl font-display font-bold">{isLoading ? "—" : items?.length ?? 0}</p>
        </div>
        <div className="border border-border rounded-md p-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-1">Demos</p>
          <p className="text-2xl font-display font-bold">
            {isLoading ? "—" : items?.filter(i => i.type === "demo").length ?? 0}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2 animate-pulse">
          {[1,2,3].map(i => <div key={i} className="h-14 bg-muted rounded-md" />)}
        </div>
      ) : !items?.length ? (
        <div className="border border-dashed border-border rounded-md py-16 text-center">
          <Music className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No vault tracks yet.</p>
          <Button size="sm" className="mt-4 gap-2" onClick={openNew}><Plus className="w-3.5 h-3.5" />Add Track</Button>
        </div>
      ) : (
        <div className="border border-border rounded-md divide-y divide-border">
          {items.map(item => (
            <div key={item.id} className="flex items-center gap-3 px-4 py-3 flex-wrap">
              {item.coverImage ? (
                <img src={item.coverImage} alt="" className="w-10 h-10 rounded-sm object-cover shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-sm bg-muted flex items-center justify-center shrink-0">
                  <Music className="w-4 h-4 text-muted-foreground/40" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 capitalize">{item.type} · {item.category}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Badge variant="outline" className="text-xs capitalize">{item.type}</Badge>
                <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(item)}>
                  <Pencil className="w-4 h-4 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" title="Delete" onClick={() => confirmDelete(item.title, item.id)}>
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
