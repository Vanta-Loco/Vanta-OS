import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useLocation, useRoute } from "wouter";
import { ArrowLeft, BadgeCheck, ExternalLink, ShieldCheck, UserRound } from "lucide-react";
import { AdminGuard, AdminLayout } from "@/components/admin/admin-layout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Member } from "./users";

export default function AdminUserDetail() {
  return <AdminGuard><DetailContent /></AdminGuard>;
}

function DetailContent() {
  const [, params] = useRoute("/admin/users/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { data: member, isLoading, isError } = useQuery<Member>({
    queryKey: [`/api/admin/users/${params?.id || ""}`],
    enabled: Boolean(params?.id),
  });

  const statusMutation = useMutation({
    mutationFn: async (account_status: "active" | "suspended") => {
      const response = await apiRequest("PATCH", `/api/admin/users/${params?.id}/status`, { account_status });
      return response.json() as Promise<Pick<Member, "id" | "username" | "display_name" | "role" | "account_status" | "created_at">>;
    },
    onSuccess: updated => {
      queryClient.setQueryData<Member>([`/api/admin/users/${params?.id}`], current => current ? { ...current, ...updated } : current);
      queryClient.setQueriesData<Member[]>({ queryKey: ["/api/admin/users"] }, current => current?.map(item => item.id === updated.id ? { ...item, ...updated } : item));
      toast({ title: updated.account_status === "suspended" ? "Member suspended." : "Member reactivated.", description: "Account status updated." });
    },
    onError: (error: Error) => toast({ title: "Status update failed.", description: error.message, variant: "destructive" }),
  });

  if (isLoading) return <AdminLayout title="Member"><div className="py-16 text-center text-sm text-muted-foreground">Loading Member…</div></AdminLayout>;
  if (isError || !member) return <AdminLayout title="Member"><div className="py-16 text-center text-sm text-destructive">Member could not be loaded.</div></AdminLayout>;

  const nextStatus = member.account_status === "active" ? "suspended" : "active";
  const action = nextStatus === "suspended" ? "Suspend" : "Reactivate";
  return <AdminLayout title="Member">
    <Link href="/admin/users"><Button variant="ghost" size="sm" className="gap-2 -ml-3 mb-7"><ArrowLeft className="w-4 h-4" /> Back to Members</Button></Link>
    <div className="flex flex-wrap items-start justify-between gap-6 border-b border-border pb-8 mb-8">
      <div><p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Member record</p><h1 className="font-display text-4xl font-bold mt-2">{member.display_name || "Unnamed Member"}</h1><p className="font-mono text-sm text-muted-foreground mt-2">@{member.username}</p></div>
      <Button variant={nextStatus === "suspended" ? "destructive" : "default"} disabled={statusMutation.isPending} onClick={() => { if (window.confirm(`${action} @${member.username}?`)) statusMutation.mutate(nextStatus); }}>{statusMutation.isPending ? "Updating…" : `${action} Member`}</Button>
    </div>
    <div className="border border-amber-500/30 bg-amber-500/5 rounded-lg px-4 py-3 text-xs text-amber-500/90 mb-8">Account status is recorded here. Enforcement across Member-authenticated actions will be completed in the next stage.</div>
    <div className="grid md:grid-cols-3 gap-5">
      <InfoCard icon={<UserRound className="w-4 h-4" />} title="Account"><Detail label="Username" value={`@${member.username}`} /><Detail label="Status" value={member.account_status.toUpperCase()} /><Detail label="Role" value={member.role} /><Detail label="Joined" value={new Date(member.created_at).toLocaleDateString()} /></InfoCard>
      <InfoCard icon={<ShieldCheck className="w-4 h-4" />} title="Passport">{member.passport.exists ? <><Detail label="Status" value="PASSPORT ACTIVE" /><Detail label="Passport ID" value={member.passport.passport_id || "—"} mono /><Detail label="Level" value={String(member.passport.level ?? "—")} /></> : <p className="text-sm text-muted-foreground">This Member has not initialized a Passport.</p>}</InfoCard>
      <InfoCard icon={<BadgeCheck className="w-4 h-4" />} title="Creator">{member.creator.exists ? <><Detail label="Status" value="CREATOR PROFILE" /><Detail label="Display name" value={member.creator.display_name || "—"} /><Detail label="Certification" value={member.creator.is_certified ? "CERTIFIED CREATOR" : "Not certified"} /><Link href={`/creators/${member.username}`}><Button variant="outline" size="sm" className="mt-4 gap-2">View Creator Profile <ExternalLink className="w-3.5 h-3.5" /></Button></Link></> : <p className="text-sm text-muted-foreground">This Member has not activated a Creator Profile.</p>}</InfoCard>
    </div>
  </AdminLayout>;
}

function InfoCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) { return <section className="border border-border rounded-lg p-5"><div className="flex items-center gap-2 text-primary mb-5"><span>{icon}</span><h2 className="font-display text-xl font-semibold text-foreground">{title}</h2></div>{children}</section>; }
function Detail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) { return <div className="border-b border-border/60 py-3 last:border-0"><p className="text-[10px] uppercase tracking-widest text-muted-foreground/55">{label}</p><p className={`text-sm mt-1 ${mono ? "font-mono text-xs" : ""}`}>{value}</p></div>; }