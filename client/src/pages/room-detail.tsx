import { useEffect, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { ArrowLeft, Lock, Send, Users, Wrench } from "lucide-react";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getUserToken, useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import fashionWarehouseImage from "@assets/generated_images/fashion_warehouse_environment.png";
import musicBedroomStudioImage from "@assets/generated_images/music_bedroom_studio_environment.png";

type Room = {
  id: string; name: string; description: string; category: string;
  visibility: "public" | "private"; member_count: number; joined: boolean;
  is_owner: boolean; owner_user_id?: string | null; owner_username?: string; owner_display_name?: string;
};
type Post = { id: string; body: string; created_at: string; username: string; display_name?: string };
type Member = { id: string; username: string; display_name?: string; owner: boolean };

type RoomTheme = "warehouse" | "studio" | "default";

function getRoomTheme(room: Room): RoomTheme {
  if (room.category === "Fashion" && !room.owner_user_id) return "warehouse";
  if (room.category === "Music" && !room.owner_user_id) return "studio";
  return "default";
}

function EnvironmentDecor({ theme }: { theme: RoomTheme }) {
  if (theme === "default") return null;
  if (theme === "warehouse") {
    return (
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <img src={fashionWarehouseImage} alt="" className="absolute inset-0 h-full w-full object-cover object-center opacity-75 md:object-center" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,8,10,.78)_0%,rgba(8,8,10,.35)_34%,rgba(8,8,10,.62)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,8,10,.48),transparent_48%,rgba(30,12,44,.2))]" />
      </div>
    );
  }
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <img src={musicBedroomStudioImage} alt="" className="absolute inset-0 h-full w-full object-cover object-center opacity-75" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,8,14,.78)_0%,rgba(7,8,14,.3)_36%,rgba(7,8,14,.68)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,8,14,.5),transparent_48%,rgba(41,19,66,.24))]" />
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
        <div className="border-b border-border pb-8">
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
        <div className="flex gap-1 border-b border-border mt-8 mb-8 overflow-x-auto">{tabs.map(item => <Button key={item} variant="ghost" onClick={() => setTab(item)} className={`rounded-none border-b-2 ${tab === item ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>{item}</Button>)}</div>
        {tab === "Feed" && <div className="max-w-2xl">
          {room.joined && <form onSubmit={publish} className="flex gap-3 mb-8"><Textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Add a signal to the Room…" maxLength={2000} className="min-h-12" /><Button type="submit" size="icon" aria-label="Publish post" disabled={!body.trim()}><Send className="w-4 h-4" /></Button></form>}
          {!room.joined && <p className="text-xs text-muted-foreground border border-border rounded-lg p-4 mb-5">Join this Room to publish to the Feed.</p>}
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