import { useMutation, useQuery } from "@tanstack/react-query";
import { AdminGuard, AdminLayout } from "@/components/admin/admin-layout";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldAlert } from "lucide-react";

type SocialReport = {
  id: string;
  target_type: "transmission" | "comment" | "project";
  target_id: string;
  reason: string;
  status: "open" | "reviewed" | "dismissed" | "actioned";
  created_at: string;
  reporter_username: string;
  target_summary: string | null;
  moderation_status: string | null;
  target_author_username: string | null;
};

export default function AdminSocial() {
  return <AdminGuard><SocialReports /></AdminGuard>;
}

function SocialReports() {
  const { toast } = useToast();
  const { data, isLoading, error } = useQuery<{ reports: SocialReport[] }>({
    queryKey: ["/api/admin/social/reports"],
  });
  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "dismissed" | "reviewed" | "actioned" }) =>
      apiRequest("PATCH", `/api/admin/social/reports/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/social/reports"] });
      toast({ title: "Report updated." });
    },
    onError: () => toast({ title: "Could not update report.", variant: "destructive" }),
  });

  return (
    <AdminLayout title="Social Reports">
      <div className="mb-6 max-w-3xl">
        <p className="text-sm text-muted-foreground">Review reports on Member Transmissions, comments, and Creator project pages. Hiding a reported item removes it from public views while preserving the record for moderation.</p>
      </div>
      {isLoading && <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading reports…</div>}
      {error && <div role="alert" className="rounded-lg border border-destructive/40 p-5 text-sm text-destructive">Reports could not be loaded. Check administrator access and the database migration.</div>}
      {!isLoading && !error && data?.reports.length === 0 && (
        <div className="max-w-3xl rounded-xl border border-dashed border-border p-12 text-center">
          <ShieldAlert className="mx-auto h-6 w-6 text-muted-foreground/35" />
          <p className="mt-3 font-display text-xl">No open reports.</p>
          <p className="mt-1 text-sm text-muted-foreground">New member reports will appear here.</p>
        </div>
      )}
      <div className="max-w-4xl space-y-4">
        {data?.reports.map(report => (
          <article key={report.id} className="rounded-xl border border-border bg-card/35 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-primary/40 px-2.5 py-1 text-[9px] font-mono uppercase tracking-widest text-primary">{report.target_type}</span>
                <span className="text-xs text-muted-foreground">Reported by @{report.reporter_username}</span>
              </div>
              <time className="text-[10px] font-mono text-muted-foreground/50">{new Date(report.created_at).toLocaleString()}</time>
            </div>
            <p className="mt-4 text-sm leading-relaxed">{report.reason}</p>
            <div className="mt-3 rounded-lg border border-border/60 bg-background/40 p-4">
              <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/50">Reported content {report.target_author_username ? `· @${report.target_author_username}` : ""} {report.moderation_status ? `· ${report.moderation_status}` : ""}</p>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">{report.target_summary || "Content was removed or is no longer available."}</p>
            </div>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button size="sm" variant="ghost" disabled={update.isPending} onClick={() => update.mutate({ id: report.id, status: "dismissed" })}>Dismiss</Button>
              <Button size="sm" variant="outline" disabled={update.isPending} onClick={() => update.mutate({ id: report.id, status: "reviewed" })}>Mark reviewed</Button>
              <Button size="sm" variant="destructive" disabled={update.isPending} onClick={() => update.mutate({ id: report.id, status: "actioned" })}>Hide content</Button>
            </div>
          </article>
        ))}
      </div>
    </AdminLayout>
  );
}
