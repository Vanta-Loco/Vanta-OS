import { AdminLayout, AdminGuard } from "@/components/admin/admin-layout";
import { Link } from "wouter";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BadgeCheck, CircleUserRound, Search, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdminUsers() {
  return <AdminGuard><UsersContent /></AdminGuard>;
}

function UsersContent() {
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const query = submittedSearch ? `?search=${encodeURIComponent(submittedSearch)}` : "";
  const { data: members = [], isLoading, isError } = useQuery<Member[]>({
    queryKey: [`/api/admin/users${query}`],
  });

  return <AdminLayout title="Users">
    <div className="flex flex-wrap items-start justify-between gap-5 mb-8">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Community / Member identity</p>
        <h1 className="font-display text-3xl font-bold mt-2">Members</h1>
        <p className="text-sm text-muted-foreground mt-2">Manage registered Vanta Members and inspect their connected systems.</p>
      </div>
      <span className="text-xs font-mono text-muted-foreground/60 border border-border rounded-md px-3 py-2">{members.length} {members.length === 1 ? "member" : "members"}</span>
    </div>

    <form onSubmit={event => { event.preventDefault(); setSubmittedSearch(search.trim()); }} className="flex gap-2 max-w-xl mb-7">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
        <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search username or Creator display name" className="pl-9" aria-label="Search Members" />
      </div>
      <Button type="submit" variant="outline">Search</Button>
    </form>

    {isLoading ? <StateMessage>Loading registered Members…</StateMessage>
      : isError ? <StateMessage error>Member directory could not be loaded.</StateMessage>
      : members.length === 0 ? <StateMessage>{submittedSearch ? "No Members match that search." : "No registered Members yet."}</StateMessage>
      : <div className="border border-border rounded-lg overflow-hidden">
        <div className="hidden lg:grid lg:grid-cols-[1.3fr_1fr_1.1fr_1.1fr_110px] gap-4 px-5 py-3 bg-muted/30 border-b border-border text-[10px] uppercase tracking-widest font-mono text-muted-foreground/60">
          <span>Member</span><span>Account</span><span>Passport</span><span>Creator</span><span />
        </div>
        <div className="divide-y divide-border">{members.map(member => <MemberRow key={member.id} member={member} />)}</div>
      </div>}
  </AdminLayout>;
}

export type Member = {
  id: string;
  username: string;
  display_name: string;
  role: string;
  account_status: "active" | "suspended";
  created_at: string;
  passport: { exists: boolean; passport_id?: string; level?: number };
  creator: { exists: boolean; profile_id?: string; display_name?: string; is_certified?: boolean; certified_at?: string | null };
};

function MemberRow({ member }: { member: Member }) {
  return <div className="grid lg:grid-cols-[1.3fr_1fr_1.1fr_1.1fr_110px] gap-4 items-center px-5 py-5">
    <div className="min-w-0">
      <p className="font-medium truncate">{member.display_name || "Unnamed Member"}</p>
      <p className="text-xs text-muted-foreground font-mono mt-1">@{member.username}</p>
      <p className="text-[11px] text-muted-foreground/50 mt-2">Joined {new Date(member.created_at).toLocaleDateString()}</p>
    </div>
    <div><StatusPill status={member.account_status} /><p className="text-[11px] text-muted-foreground/50 mt-2 uppercase font-mono">{member.role}</p></div>
    <div className="text-xs text-muted-foreground">{member.passport.exists ? <><p className="flex items-center gap-1.5 text-foreground"><ShieldCheck className="w-3.5 h-3.5 text-primary" /> PASSPORT</p><p className="font-mono mt-1">{member.passport.passport_id}</p><p className="mt-1">Level {member.passport.level}</p></> : <span className="text-muted-foreground/50">No Passport</span>}</div>
    <div className="text-xs text-muted-foreground">{member.creator.exists ? <><p className="flex items-center gap-1.5 text-foreground"><CircleUserRound className="w-3.5 h-3.5 text-primary" /> CREATOR</p><p className="mt-1 truncate">{member.creator.display_name || "Profile active"}</p>{member.creator.is_certified && <p className="flex items-center gap-1 mt-1 text-primary"><BadgeCheck className="w-3.5 h-3.5" /> CERTIFIED CREATOR</p>}</> : <span className="text-muted-foreground/50">No Creator Profile</span>}</div>
    <Link href={`/admin/users/${member.id}`}><Button variant="outline" size="sm" className="gap-2">Manage <ArrowRight className="w-3.5 h-3.5" /></Button></Link>
  </div>;
}

function StatusPill({ status }: { status: Member["account_status"] }) {
  return <span className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-mono ${status === "active" ? "text-emerald-500" : "text-amber-500"}`}><span className={`w-1.5 h-1.5 rounded-full ${status === "active" ? "bg-emerald-500" : "bg-amber-500"}`} />{status}</span>;
}

function StateMessage({ children, error = false }: { children: React.ReactNode; error?: boolean }) {
  return <div className={`border border-dashed rounded-lg py-16 text-center text-sm ${error ? "border-destructive/40 text-destructive" : "border-border text-muted-foreground"}`}><UserRound className="w-6 h-6 mx-auto mb-3 opacity-40" />{children}</div>;
}
