import { useEffect, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { ArrowLeft, Lock, Send, Users, Wrench } from "lucide-react";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getUserToken, useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";

type Room = {
  id: string; name: string; description: string; category: string;
  visibility: "public" | "private"; member_count: number; joined: boolean;
  is_owner: boolean; owner_username?: string; owner_display_name?: string;
};
type Post = { id: string; body: string; created_at: string; username: string; display_name?: string };
type Member = { id: string; username: string; display_name?: string; owner: boolean };

type RoomTheme = "warehouse" | "studio" | "creator" | "archive";

function getRoomTheme(room: Room): RoomTheme {
  if (room.category === "Fashion" || room.name.toLowerCase() === "fashion") return "warehouse";
  if (room.category === "Music" || room.name.toLowerCase() === "music") return "studio";
  if (room.category === "Visual") return "creator";
  return "archive";
}

function EnvironmentDecor({ theme }: { theme: RoomTheme }) {
  if (theme === "warehouse") {
    return (
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_10%,rgba(168,145,112,.14),transparent_48%),linear-gradient(180deg,rgba(255,255,255,.025),transparent_45%,rgba(0,0,0,.22))]" />
        <div className="absolute inset-x-0 bottom-0 h-[28%] bg-[linear-gradient(105deg,transparent_0%,rgba(255,255,255,.06)_50%,transparent_100%)] [clip-path:polygon(0_35%,100%_0,100%_100%,0_100%)]" />
        <div className="absolute left-[6%] top-[13%] h-52 w-36 border border-white/15 bg-white/[0.035] shadow-[inset_0_0_35px_rgba(255,255,255,.04)] md:h-72 md:w-56">
          <div className="absolute inset-y-0 left-1/3 w-px bg-white/15" /><div className="absolute inset-y-0 left-2/3 w-px bg-white/15" />
          <div className="absolute inset-x-0 top-1/2 h-px bg-white/15" />
        </div>
        <div className="absolute bottom-[12%] left-[8%] h-20 w-48 border-y-2 border-white/15 md:h-28 md:w-72">
          <div className="absolute left-[16%] top-[-38px] h-10 w-1 bg-white/20 md:h-16" /><div className="absolute left-[43%] top-[-38px] h-10 w-1 bg-white/20 md:h-16" /><div className="absolute left-[70%] top-[-38px] h-10 w-1 bg-white/20 md:h-16" />
          <div className="absolute left-[11%] top-[-25px] h-8 w-9 rotate-[-12deg] border-b border-white/20 md:h-12 md:w-14" /><div className="absolute left-[37%] top-[-23px] h-9 w-11 rotate-[8deg] border-b border-white/20 md:h-14 md:w-16" />
        </div>
        <div className="absolute right-[9%] top-[30%] hidden h-56 w-28 border border-white/20 bg-white/[0.035] shadow-[0_18px_50px_rgba(0,0,0,.25)] md:block"><div className="absolute inset-3 border border-white/10" /></div>
        <div className="absolute bottom-[10%] right-[7%] h-16 w-24 border border-white/15 bg-white/[0.06] md:h-24 md:w-36">
          <div className="absolute -top-5 left-3 h-5 w-20 border border-white/15 bg-white/[0.05] md:w-32" /><div className="absolute bottom-4 left-3 h-1 w-14 bg-amber-100/20 md:w-24" />
        </div>
      </div>
    );
  }
  if (theme === "studio") return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden opacity-70">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_22%,rgba(105,135,210,.22),transparent_32%),radial-gradient(circle_at_20%_72%,rgba(150,72,142,.15),transparent_28%)]" />
      <div className="absolute right-[8%] top-[15%] h-32 w-52 border border-cyan-100/15 bg-slate-950/70 shadow-[0_0_80px_rgba(72,137,183,.18)] md:h-52 md:w-80">
        <div className="absolute inset-3 border border-cyan-100/10 bg-cyan-200/[0.035]" /><div className="absolute left-6 top-6 h-1 w-24 bg-cyan-200/30 md:w-40" /><div className="absolute left-6 top-10 h-px w-16 bg-purple-200/20 md:w-28" />
      </div>
      <div className="absolute bottom-[12%] left-[7%] h-16 w-72 border-y border-white/15 bg-white/[0.035] md:h-24 md:w-[28rem]">
        <div className="absolute left-[18%] top-[-28px] h-7 w-2 bg-white/20 md:h-10" /><div className="absolute left-[42%] top-[-28px] h-7 w-2 bg-white/20 md:h-10" /><div className="absolute left-[66%] top-[-28px] h-7 w-2 bg-white/20 md:h-10" />
        <div className="absolute left-[22%] top-[-10px] h-2 w-20 border border-white/20 md:w-32" />
      </div>
      <div className="absolute bottom-[8%] right-[12%] hidden h-24 w-16 rounded-full border border-white/15 md:block" /><div className="absolute bottom-[5%] right-[7%] h-px w-48 rotate-[12deg] bg-white/20 md:w-80" />
    </div>
  );
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden opacity-60">
      <div className={`absolute inset-0 ${theme === "creator" ? "bg-[radial-gradient(circle_at_22%_18%,rgba(48,160,180,.16),transparent_30%),linear-gradient(135deg,transparent,rgba(255,255,255,.025))]" : "bg-[radial-gradient(circle_at_75%_15%,rgba(191,139,68,.14),transparent_30%),linear-gradient(120deg,transparent,rgba(255,255,255,.025))]"}`} />
      <div className="absolute left-[8%] top-[18%] h-40 w-28 border border-white/12 bg-white/[0.025] md:h-64 md:w-44"><div className="absolute inset-4 border border-white/10" /><div className="absolute -right-6 top-1/2 w-14 h-px bg-white/15" /></div>
      <div className="absolute right-[8%] bottom-[12%] h-20 w-64 border-y border-white/12 bg-white/[0.025] md:h-28 md:w-96"><div className="absolute left-8 top-[-26px] h-7 w-1 bg-white/15" /><div className="absolute left-28 top-[-26px] h-7 w-1 bg-white/15" /></div>
    </div>
  );
}

export default function RoomDetail() {
  const [, params] = useRoute("/rooms/:id");
  const [, navigate] = useLocation();
  const { isAuthenticated } = useUser();
  const { toast } = useToast();
  const [room, setRoom] = useState<Room | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [tab, setTab] = useState("Feed");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadRoom() {
    if (!params?.id) return;
    setLoading(true);
    const authHeaders = { "X-User-Token": getUserToken() || "" };
    const [roomResponse, postsResponse, membersResponse] = await Promise.all([
      fetch(`/api/rooms/${params.id}`, { headers: authHeaders }),
      fetch(`/api/rooms/${params.id}/posts`, { headers: authHeaders }),
      fetch(`/api/rooms/${params.id}/members`, { headers: authHeaders }),
    ]);
    if (!roomResponse.ok) { setRoom(null); setLoading(false); return; }
    setRoom(await roomResponse.json());
    if (postsResponse.ok) setPosts(await postsResponse.json());
    if (membersResponse.ok) setMembers(await membersResponse.json());
    setLoading(false);
  }

  useEffect(() => { loadRoom(); }, [params?.id]);
  const tokenHeaders = { "X-User-Token": getUserToken() || "" };

  async function changeMembership(action: "join" | "leave") {
    if (!isAuthenticated) return navigate("/login");
    if (action === "leave" && !window.confirm("Leave this Room? You can rejoin it later.")) return;
    const response = await fetch(`/api/rooms/${room?.id}/${action}`, { method: action === "join" ? "POST" : "DELETE", headers: tokenHeaders });
    const data = await response.json();
    if (!response.ok) return toast({ title: "Room action failed", description: data.error, variant: "destructive" });
    await loadRoom();
  }

  async function publish(event: React.FormEvent) {
    event.preventDefault();
    if (!body.trim() || !room) return;
    const response = await fetch(`/api/rooms/${room.id}/posts`, {
      method: "POST",
      headers: { ...tokenHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ body: body.trim() }),
    });
    const data = await response.json();
    if (!response.ok) return toast({ title: "Could not publish", description: data.error, variant: "destructive" });
    setBody("");
    await loadRoom();
  }

  if (loading) return <div className="min-h-screen bg-background pt-32 text-center text-sm text-muted-foreground">Loading Room…</div>;
  if (!room) return <div className="min-h-screen bg-background pt-32 text-center"><p className="text-muted-foreground">Room not found.</p><Link href="/rooms"><Button variant="outline" className="mt-4">Back to Rooms</Button></Link></div>;

  const tabs = ["Feed", "Members", "Work", "Listings"];
  const ownerLabel = room.owner_username ? `@${room.owner_username}` : "Vanta Official";
  const theme = getRoomTheme(room);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className={`relative isolate max-w-5xl mx-auto overflow-hidden px-6 lg:px-8 pt-28 pb-20 ${theme === "warehouse" ? "bg-stone-950/30" : theme === "studio" ? "bg-slate-950/20" : ""}`}>
        <EnvironmentDecor theme={theme} />
        <div className="relative z-10">
        <Link href="/rooms"><Button variant="ghost" size="sm" className="gap-2 mb-8 -ml-3"><ArrowLeft className="w-4 h-4" /> All Rooms</Button></Link>
        <div className="border-b border-border pb-8 bg-background/35 backdrop-blur-[2px]">
          <div className="flex flex-wrap justify-between gap-6 items-start">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50 mb-3">{room.category} · {room.visibility === "private" ? "Private" : "Public"}</p>
              <h1 className="text-4xl md:text-5xl font-display font-bold">{room.name}</h1>
              <p className="mt-4 max-w-2xl text-muted-foreground leading-relaxed">{room.description}</p>
              <p className="text-xs text-muted-foreground mt-5">Hosted by <span className="text-foreground">{room.owner_display_name || ownerLabel}</span>{room.owner_display_name && <span className="ml-2 font-mono text-muted-foreground/60">{ownerLabel}</span>}</p>
            </div>
            <div className="flex items-center gap-3">
              {room.is_owner ? <span className="text-xs font-mono text-muted-foreground border border-border rounded-md px-3 py-2">OWNER</span> : <Button onClick={() => changeMembership(room.joined ? "leave" : "join")} variant={room.joined ? "outline" : "default"}>{room.joined ? "Leave Room" : "Join Room"}</Button>}
            </div>
          </div>
          <div className="flex gap-5 mt-6 text-xs text-muted-foreground"><span className="flex gap-1 items-center"><Users className="w-3.5 h-3.5" /> {room.member_count} members</span>{room.visibility === "private" && <span className="flex gap-1 items-center"><Lock className="w-3.5 h-3.5" /> Invite only</span>}</div>
        </div>
        <div className="flex gap-1 border-b border-border mt-8 mb-10 overflow-x-auto bg-background/20">{tabs.map(item => <Button key={item} variant="ghost" onClick={() => setTab(item)} className={`rounded-none border-b-2 ${tab === item ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>{item}</Button>)}</div>
        {tab === "Feed" && <div className="max-w-2xl">
          {room.joined && <form onSubmit={publish} className="mb-9 rounded-xl border border-border bg-background/60 p-4 shadow-lg shadow-black/5"><p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50 mb-3">Room signal</p><div className="flex gap-3"><Textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Add a signal to the Room…" maxLength={2000} className="min-h-12 bg-background/50" /><Button type="submit" size="icon" aria-label="Publish post" disabled={!body.trim()}><Send className="w-4 h-4" /></Button></div></form>}
          {!room.joined && <div className="rounded-xl border border-dashed border-border bg-background/50 p-6 mb-7"><p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50 mb-2">Read-only access</p><p className="text-sm text-muted-foreground">Join this Room to publish to the Feed.</p><Button onClick={() => changeMembership("join")} variant="outline" size="sm" className="mt-4">Join Room</Button></div>}
          {posts.map(post => <article key={post.id} className="border-b border-border py-5"><p className="text-sm whitespace-pre-wrap leading-relaxed">{post.body}</p><p className="text-[10px] font-mono text-muted-foreground/50 mt-3">@{post.username} · {new Date(post.created_at).toLocaleDateString()}</p></article>)}
          {!posts.length && <p className="text-sm text-muted-foreground py-10">No signals yet. Be the first to post.</p>}
        </div>}
        {tab === "Members" && <div className="grid sm:grid-cols-2 gap-3 max-w-2xl">{members.map(member => <Link href={`/profile/${member.username}`} key={member.id}><div className="border border-border rounded-lg p-4 flex justify-between"><span className="text-sm">@{member.username}</span>{member.owner && <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Owner</span>}</div></Link>)}</div>}
        {tab === "Work" && <EmptyState title="Work sharing coming soon." description="This Phase 1 space is ready for conversation. Work tools will arrive in a later phase." />}
        {tab === "Listings" && <EmptyState title="Creative Marketplace listings coming soon." description="Listings are not part of Rooms Phase 1." />}
        </div>
      </main>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="border border-dashed border-border rounded-xl p-12 text-center max-w-2xl"><Wrench className="w-6 h-6 mx-auto text-muted-foreground/40 mb-4" /><h2 className="font-display text-lg">{title}</h2><p className="text-sm text-muted-foreground mt-2">{description}</p></div>;
}