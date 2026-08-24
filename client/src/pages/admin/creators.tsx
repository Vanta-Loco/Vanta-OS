import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ExternalLink, ShieldCheck, Sparkles, Users } from "lucide-react";
import { AdminGuard, AdminLayout } from "@/components/admin/admin-layout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAdmin } from "@/hooks/use-admin";

type Creator = {
  id: string;
  username: string;
  display_name: string;
  creator_type: string;
  disciplines: string[];
  is_certified: boolean;
  certified_at: string | null;
  created_at: string;
};

export default function AdminCreators() {
  return <AdminGuard><CreatorsContent /></AdminGuard>;
}

function CreatorsContent() {
  const { isAuthenticated } = useAdmin();
  const { toast } = useToast();
  const { data: creators = [], isLoading, isError } = useQuery<Creator[]>({
    queryKey: ["/api/admin/creators"],
    enabled: isAuthenticated,
  });

  const certification = useMutation({
    mutationFn: async ({ id, certified }: { id: string; certified: boolean }) => {
      const response = await apiRequest("PATCH", `/api/admin/creators/${id}/certification`, { certified });
      return response.json() as Promise<Partial<Creator> & { id: string }>;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<Creator[]>(["/api/admin/creators"], current =>
        current?.map(creator => creator.id === updated.id ? { ...creator, ...updated } : creator),
      );
      toast({ title: updated.is_certified ? "Creator certified." : "Certification removed.", description: "The public profile will reflect this change on refresh." });
    },
    onError: (error: Error) => toast({ title: "Certification update failed.", description: error.message, variant: "destructive" }),
  });

  function toggleCertification(creator: Creator) {
    const next = !creator.is_certified;
    const action = next ? "certify" : "remove certification from";
    if (!window.confirm(`Are you sure you want to ${action} ${creator.display_name || `@${creator.username}`}?`)) return;
    certification.mutate({ id: creator.id, certified: next });
  }

  return (
    <AdminLayout title="Creators">
      <div className="flex flex-wrap items-start justify-between gap-5 mb-8">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Community / Creator identity</p>
          <h1 className="font-display text-3xl font-bold mt-2">Certified Creators</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl">Review real Creator Profiles and deliberately mark trusted identities across Vanta.</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground/60 border border-border rounded-md px-3 py-2">
          <Users className="w-3.5 h-3.5" /> {creators.length} {creators.length === 1 ? "profile" : "profiles"}
        </div>
      </div>

      {isLoading ? (
        <div className="border border-dashed border-border rounded-lg py-16 text-center text-sm text-muted-foreground">Loading Creator Profiles…</div>
      ) : isError ? (
        <div className="border border-dashed border-destructive/40 rounded-lg py-16 text-center text-sm text-destructive">Creator Profiles could not be loaded.</div>
      ) : creators.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg py-16 px-6 text-center">
          <Sparkles className="w-7 h-7 text-muted-foreground/40 mx-auto mb-4" />
          <p className="font-display text-xl">No Creator Profiles yet.</p>
          <p className="text-sm text-muted-foreground mt-2">Profiles created by real Members will appear here.</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="hidden md:grid md:grid-cols-[1.5fr_1.2fr_1fr_150px] gap-4 px-5 py-3 bg-muted/30 border-b border-border text-[10px] uppercase tracking-widest font-mono text-muted-foreground/60">
            <span>Creator</span><span>Discipline</span><span>Status</span><span>Action</span>
          </div>
          <div className="divide-y divide-border">
            {creators.map(creator => (
              <div key={creator.id} className="grid md:grid-cols-[1.5fr_1.2fr_1fr_150px] gap-4 items-center px-5 py-5">
                <div className="min-w-0">
                  <p className="font-medium truncate">{creator.display_name || "Unnamed creator"}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-1">@{creator.username}</p>
                  <p className="text-[11px] text-muted-foreground/50 mt-2">Joined {new Date(creator.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[creator.creator_type, ...(creator.disciplines || [])].filter((item, index, all) => item && all.indexOf(item) === index).map(item => <span key={item} className="text-[11px] border border-border rounded px-2 py-1 text-muted-foreground">{item}</span>)}
                  {!creator.creator_type && !creator.disciplines?.length && <span className="text-xs text-muted-foreground/50">Not specified</span>}
                </div>
                <div>
                  {creator.is_certified ? <span className="inline-flex items-center gap-1.5 text-xs text-primary"><ShieldCheck className="w-3.5 h-3.5" /> Certified</span> : <span className="text-xs text-muted-foreground">Uncertified</span>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant={creator.is_certified ? "outline" : "default"} disabled={certification.isPending} onClick={() => toggleCertification(creator)}>{creator.is_certified ? "Remove" : "Certify"}</Button>
                  <Link href={`/creators/${creator.username}`}><Button size="icon" variant="ghost" title="View Profile" aria-label={`View @${creator.username}`}><ExternalLink className="w-4 h-4" /></Button></Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}