import { useEffect, useState } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getUserToken, useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Lock, Send, Users, Wrench } from "lucide-react";

type Room = { id: string; name: string; description: string; category: string; visibility: string; member_count: number; joined: boolean; is_owner: boolean };
type Post = { id: string; body: string; created_at: string; username: string; display_name?: string };
type Member = { id: string; username: string; display_name?: string; owner: boolean };

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

  async function load() {
    const id = params?.id;
    if (!id) return;
    const [r, p, m] = await Promise.all([fetch(`/api/rooms/${id}`), fetch(`/api/rooms/${id}/posts`), fetch(`/api/rooms/${id}/members`)]);
    if (!r.ok) return setRoom(null);
    setRoom(await r.json()); if (p.ok) setPosts(await p.json()); if (m.ok) setMembers(await m.json());
  }
  useEffect(() => { load(); }, [params?.id]);
  const authHeaders = { "Content-Type": "application/json", "X-User-Token": getUserToken() || "" };

  async function membership(action: "join" | "leave") {
    if (!isAuthenticated) return navigate("/login");
    const response = await fetch(`/api/rooms/${room?.id}/${action}`, { method: action === "join" ? "POST" : "DELETE", headers: authHeaders });
    const data = await response.json();
    if (!response.ok) return toast({ title: "Room action failed", description: data.error, variant: "destructive" });
    await load();
  }
  async function publish(e: React.FormEvent) {
    e.preventDefault(); if (!body.trim()) return;
    const response = await fetch(`/api/rooms/${room?.id}/posts`, { method: "POST", headers: authHeaders, body: JSON.stringify({ body }) });
    const data = await response.json();
    if (!response.ok) return toast({ title: "Could not publish", description: data.error, variant: "destructive" });
    setBody(""); setPosts(current => [{ ...data, username: data.username }, ...current]);
  }
  if (!room) return <div className="min-h-screen bg-background pt-32 text-center"><p className="text-muted-foreground">Room not found.</p><Link href="/rooms"><Button variant="outline" className="mt-4">Back to Rooms</Button></Link></div>;
  const tabs = ["Feed", "Members", "Work", "Listings"];
  return (
    <div className="min-h-screen bg-background"><Header /><main className="max-w-5xl mx-auto px-6 lg:px-8 pt-28 pb-20">
      <Link href="/rooms"><Button variant="ghost" size="sm" className="gap-2 mb-8 -ml-3"><ArrowLeft className="w-4 h-4" /> All Rooms</Button></Link>
      <div className="border-b border-border pb-8">
        <div className="flex flex-wrap justify-between gap-6 items-start"><div><p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50 mb-3">{room.category} · {room.visibility === "private" ? "Private" : "Public"}</p><h1 className="text-4xl md:text-5xl font-display font-bold">{room.name}</h1><p className="mt-4 max-w-2xl text-muted-foreground leading-relaxed">{room.description}</p></div>{!room.is_owner && <Button onClick={() => membership(room.joined ? "leave" : "join")} variant={room.joined ? "outline" : "default"}>{room.joined ? "Leave Room" : "Join Room"}</Button>}{room.is_owner && <span className="text-xs font-mono text-muted-foreground border border-border rounded-md px-3 py-2">OWNER</span>}</div>
        <div className="flex gap-5 mt-6 text-xs text-muted-foreground"><span className="flex gap-1 items-center"><Users className="w-3.5 h-3.5" /> {room.member_count} members</span>{room.visibility === "private" && <span className="flex gap-1 items-center"><Lock className="w-3.5 h-3.5" /> Invite only</span>}</div>
      </div>
      <div className="flex gap-1 border-b border-border mt-8 mb-8 overflow-x-auto">{tabs.map(t => <Button key={t} variant="ghost" onClick={() => setTab(t)} className={`rounded-none border-b-2 ${tab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>{t}</Button>)}</div>
      {tab === "Feed" && <div className="max-w-2xl">{room.joined && <form onSubmit={publish} className="flex gap-3 mb-8"><Textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Add a signal to the room…" maxLength={2000} className="min-h-12" /><Button type="submit" size="icon" aria-label="Publish"><Send className="w-4 h-4" /></Button></form>}{posts.map(post => <article key={post.id} className="border-b border-border py-5"><p className="text-sm whitespace-pre-wrap leading-relaxed">{post.body}</p><p className="text-[10px] font-mono text-muted-foreground/50 mt-3">@{post.username} · {new Date(post.created_at).toLocaleDateString()}</p></article>)}{!posts.length && <p className="text-sm text-muted-foreground py-10">No signals yet. Be the first to post.</p>}</div>}
      {tab === "Members" && <div className="grid sm:grid-cols-2 gap-3 max-w-2xl">{members.map(member => <Link href={`/profile/${member.username}`} key={member.id}><div className="border border-border rounded-lg p-4 flex justify-between"><span className="text-sm">@{member.username}</span>{member.owner && <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Owner</span>}</div></Link>)}</div>}
      {(tab === "Work" || tab === "Listings") && <div className="border border-dashed border-border rounded-xl p-12 text-center max-w-2xl"><Wrench className="w-6 h-6 mx-auto text-muted-foreground/40 mb-4" /><h2 className="font-display text-lg">{tab} is coming to Rooms</h2><p className="text-sm text-muted-foreground mt-2">This Phase 1 space is ready for conversation. Tools and listings will arrive in a later phase.</p></div>}
    </main></div>
  );
}