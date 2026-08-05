import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { AdminLayout, AdminGuard } from "@/components/admin/admin-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/use-admin";
import type { Release } from "@shared/schema";
import { Plus, Pencil, Trash2, Star, StarOff } from "lucide-react";

export default function AdminReleases() {
  return (
    <AdminGuard>
      <ReleasesContent />
    </AdminGuard>
  );
}

function ReleasesContent() {
  const { toast } = useToast();
  const { isAuthenticated } = useAdmin();

  const { data: releases, isLoading } = useQuery<Release[]>({
    queryKey: ["/api/releases"],
    enabled: isAuthenticated,
  });

  const deleteRelease = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/releases/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/releases"] });
      toast({ title: "Release deleted." });
    },
    onError: () => toast({ title: "Delete failed.", variant: "destructive" }),
  });

  const toggleFeatured = useMutation({
    mutationFn: ({ id, featured }: { id: string; featured: string }) =>
      apiRequest("PATCH", `/api/releases/${id}`, { featured }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/releases"] }),
    onError: () => toast({ title: "Update failed.", variant: "destructive" }),
  });

  function confirmDelete(label: string, action: () => void) {
    if (window.confirm(`Delete "${label}"? This cannot be undone.`)) action();
  }

  return (
    <AdminLayout
      title="Releases"
      action={
        <Link href="/releases/new">
          <Button size="sm" className="gap-2 text-xs">
            <Plus className="w-3.5 h-3.5" /> New Release
          </Button>
        </Link>
      }
    >
      <div className="grid grid-cols-2 gap-3 mb-8">
        {[
          { label: "Total Releases", value: releases?.length ?? 0 },
          { label: "Featured", value: releases?.filter(r => r.featured === "true").length ?? 0 },
        ].map(s => (
          <div key={s.label} className="border border-border rounded-md p-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-1">{s.label}</p>
            <p className="text-2xl font-display font-bold">{isLoading ? "—" : s.value}</p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2 animate-pulse">
          {[1,2,3].map(i => <div key={i} className="h-14 bg-muted rounded-md" />)}
        </div>
      ) : !releases?.length ? (
        <div className="border border-dashed border-border rounded-md py-16 text-center">
          <p className="text-muted-foreground text-sm">No releases yet.</p>
          <Link href="/releases/new">
            <Button size="sm" className="mt-4 gap-2"><Plus className="w-3.5 h-3.5" />New Release</Button>
          </Link>
        </div>
      ) : (
        <div className="border border-border rounded-md divide-y divide-border">
          {releases.map(release => (
            <div key={release.id} className="flex items-center gap-3 px-4 py-3 flex-wrap">
              {release.coverImage && (
                <img src={release.coverImage} alt={release.title} className="w-10 h-10 rounded-sm object-cover shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{release.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                  {release.type} · {release.releaseDate}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {release.featured === "true" && (
                  <Badge variant="secondary" className="text-xs">Featured</Badge>
                )}
                <Button variant="ghost" size="icon" title={release.featured === "true" ? "Unfeature" : "Feature"}
                  onClick={() => toggleFeatured.mutate({ id: release.id, featured: release.featured === "true" ? "false" : "true" })}>
                  {release.featured === "true"
                    ? <StarOff className="w-4 h-4 text-muted-foreground" />
                    : <Star className="w-4 h-4 text-muted-foreground" />}
                </Button>
                <Link href={`/releases/edit/${release.id}`}>
                  <Button variant="ghost" size="icon" title="Edit"><Pencil className="w-4 h-4 text-muted-foreground" /></Button>
                </Link>
                <Button variant="ghost" size="icon" title="Delete"
                  onClick={() => confirmDelete(release.title, () => deleteRelease.mutate(release.id))}>
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
