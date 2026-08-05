import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { AdminLayout, AdminGuard } from "@/components/admin/admin-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/use-admin";
import type { Post } from "@shared/schema";
import { Plus, Pencil, Trash2, Star, StarOff, Eye, EyeOff, Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function AdminBlog() {
  return (
    <AdminGuard>
      <BlogContent />
    </AdminGuard>
  );
}

function BlogContent() {
  const { toast } = useToast();
  const { isAuthenticated } = useAdmin();

  const { data: posts, isLoading } = useQuery<Post[]>({
    queryKey: ["/api/admin/posts"],
    enabled: isAuthenticated,
  });

  const deletePost = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/posts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      toast({ title: "Post deleted." });
    },
    onError: () => toast({ title: "Delete failed.", variant: "destructive" }),
  });

  const togglePublished = useMutation({
    mutationFn: ({ id, published }: { id: string; published: string }) =>
      apiRequest("PATCH", `/api/posts/${id}`, { published }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    },
    onError: () => toast({ title: "Update failed.", variant: "destructive" }),
  });

  const toggleFeatured = useMutation({
    mutationFn: ({ id, featured }: { id: string; featured: string }) =>
      apiRequest("PATCH", `/api/posts/${id}`, { featured }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    },
    onError: () => toast({ title: "Update failed.", variant: "destructive" }),
  });

  function confirmDelete(label: string, action: () => void) {
    if (window.confirm(`Delete "${label}"? This cannot be undone.`)) action();
  }

  const published = posts?.filter(p => p.published === "true").length ?? 0;
  const drafts = (posts?.length ?? 0) - published;

  return (
    <AdminLayout
      title="Blog"
      action={
        <Link href="/create">
          <Button size="sm" className="gap-2 text-xs">
            <Plus className="w-3.5 h-3.5" /> New Post
          </Button>
        </Link>
      }
    >
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: "Total", value: posts?.length ?? 0 },
          { label: "Published", value: published },
          { label: "Drafts", value: drafts },
        ].map(s => (
          <div key={s.label} className="border border-border rounded-md p-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-1">{s.label}</p>
            <p className="text-2xl font-display font-bold">{isLoading ? "—" : s.value}</p>
          </div>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2 animate-pulse">
          {[1,2,3].map(i => <div key={i} className="h-14 bg-muted rounded-md" />)}
        </div>
      ) : !posts?.length ? (
        <div className="border border-dashed border-border rounded-md py-16 text-center">
          <p className="text-muted-foreground text-sm">No posts yet.</p>
          <Link href="/create">
            <Button size="sm" className="mt-4 gap-2"><Plus className="w-3.5 h-3.5" />New Post</Button>
          </Link>
        </div>
      ) : (
        <div className="border border-border rounded-md divide-y divide-border">
          {posts.map(post => (
            <div key={post.id} className="flex items-center gap-3 px-4 py-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{post.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {post.category} · {format(new Date(post.createdAt), "MMM d, yyyy")}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0 flex-wrap">
                {post.published !== "true" && (
                  <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-400 bg-amber-500/10">Draft</Badge>
                )}
                {post.featured === "true" && (
                  <Badge variant="secondary" className="text-xs">Featured</Badge>
                )}
                <Button variant="ghost" size="icon" title={post.published === "true" ? "Unpublish" : "Publish"}
                  onClick={() => togglePublished.mutate({ id: post.id, published: post.published === "true" ? "false" : "true" })}>
                  {post.published === "true"
                    ? <Eye className="w-4 h-4 text-muted-foreground" />
                    : <EyeOff className="w-4 h-4 text-amber-400/70" />}
                </Button>
                <Button variant="ghost" size="icon" title={post.featured === "true" ? "Unfeature" : "Feature"}
                  onClick={() => toggleFeatured.mutate({ id: post.id, featured: post.featured === "true" ? "false" : "true" })}>
                  {post.featured === "true"
                    ? <StarOff className="w-4 h-4 text-muted-foreground" />
                    : <Star className="w-4 h-4 text-muted-foreground" />}
                </Button>
                <Link href={`/edit/${post.id}`}>
                  <Button variant="ghost" size="icon" title="Edit"><Pencil className="w-4 h-4 text-muted-foreground" /></Button>
                </Link>
                <Button variant="ghost" size="icon" title="Delete"
                  onClick={() => confirmDelete(post.title, () => deletePost.mutate(post.id))}>
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
