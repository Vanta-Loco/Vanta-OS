import { useEffect, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { Archive, ArrowLeft, Camera, Clapperboard, Lock, Music2, Palette, PenLine, Radio, Search, Send, Shirt, Store, Users, Wrench, MapPin, ArrowRight } from "lucide-react";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getUserToken, useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import { WorkCard, type WorkItem } from "@/components/creator-work";
import fashionWarehouseImage from "@assets/generated_images/fashion_warehouse_environment.png";
import musicBedroomStudioImage from "@assets/generated_images/music_bedroom_studio_environment.png";
import visualStudioImage from "@assets/generated_images/visual_studio_environment.png";
import mediaArchiveImage from "@assets/generated_images/media_archive_environment.png";

type Room = {
  id: string; name: string; description: string; category: string;
  visibility: "public" | "private"; member_count: number; joined: boolean;
  is_owner: boolean; owner_user_id?: string | null; owner_username?: string; owner_display_name?: string;
};
type Post = { id: string; body: string; created_at: string; username: string; display_name?: string };
type Member = { id: string; username: string; display_name?: string; owner: boolean };
type MarketplaceListing = {
  id: string; title: string; description: string; category: string;
  creator_username: string; price_amount?: string | null; currency: string;
  price_type: string; city?: string | null; delivery_mode: string;
};

type RoomTheme = "warehouse" | "studio" | "visual-studio" | "media-archive" | "default";

function getRoomTheme(room: Room): RoomTheme {
  if (room.category === "Fashion" && !room.owner_user_id) return "warehouse";
  if (room.category === "Music" && !room.owner_user_id) return "studio";
  if (room.category === "Visual" && !room.owner_user_id) return "visual-studio";
  if (room.category === "Media" && !room.owner_user_id) return "media-archive";
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
  if (theme === "visual-studio") {
    return (
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <img src={visualStudioImage} alt="" className="absolute inset-0 h-full w-full object-cover object-center opacity-75 md:object-center" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,8,12,.82)_0%,rgba(7,8,12,.3)_34%,rgba(7,8,12,.72)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,8,12,.58),transparent_48%,rgba(47,20,70,.25))]" />
      </div>
    );
  }
  if (theme === "media-archive") {
    return (
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <img src={mediaArchiveImage} alt="" className="absolute inset-0 h-full w-full object-cover object-center opacity-75 md:object-center" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,8,9,.84)_0%,rgba(8,8,9,.28)_34%,rgba(8,8,9,.75)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,8,9,.58),transparent_48%,rgba(55,20,16,.24))]" />
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

type RoomTool = {
  label: string;
  detail: string;
  icon: typeof Music2;
  href?: string;
  tab?: string;
};

function toolsForOfficialRoom(category: string): RoomTool[] {
  if (category === "Music") {
    return [
      { label: "Music Work", detail: "Open the Room archive", icon: Music2, tab: "Work" },
      { label: "Find Creators", detail: "Artist · Producer · Engineer", icon: Search, href: "/creators?discipline=Artist" },
      { label: "Music Services", detail: "Beats · Recording · Mixing", icon: Store, href: "/marketplace?category=Recording" },
      { label: "Releases", detail: "Open the release log", icon: Radio, href: "/releases" },
      { label: "Vault", detail: "Enter the private archive", icon: Archive, href: "/vault" },
    ];
  }
  if (category === "Fashion") {
    return [
      { label: "Fashion Work", detail: "Open the Room archive", icon: Shirt, tab: "Work" },
      { label: "Find Creators", detail: "Designer · Model · Stylist", icon: Search, href: "/creators?discipline=Designer" },
      { label: "Fashion Services", detail: "Fashion Design · Styling · Modeling", icon: Store, href: "/marketplace?category=Fashion%20Design" },
    ];
  }
  if (category === "Visual") {
    return [
      { label: "Visual Work", detail: "Open the Room archive", icon: Palette, tab: "Work" },
      { label: "Find Creators", detail: "Photographer · Filmmaker · Designer", icon: Search, href: "/creators?discipline=Photographer" },
      { label: "Visual Services", detail: "Photography · Video · Artwork", icon: Store, href: "/marketplace?category=Photography" },
    ];
  }
  return [
    { label: "Media Work", detail: "Open the Room archive", icon: PenLine, tab: "Work" },
    { label: "Transmission", detail: "Open the public signal", icon: Radio, href: "/" },
    { label: "Find Creators", detail: "Writer · Journalist · Curator", icon: Search, href: "/creators?discipline=Writer" },
    { label: "Media Services", detail: "Writing · Video · Artwork", icon: Store, href: "/marketplace" },
  ];
}

function RoomTools({ category, onOpenWork }: { category: string; onOpenWork: () => void }) {
  const tools = toolsForOfficialRoom(category);
  return (
    <section className="mt-8 border border-white/15 bg-black/25 p-4 backdrop-blur-md md:p-5" aria-label={`${category} Room Tools`}>
      <div className="mb-4 flex items-end justify-between gap-4 border-b border-white/10 pb-3">
        <div>
          <p className="text-[9px] font-mono uppercase tracking-[0.28em] text-primary/80">Official Room</p>
          <h2 className="mt-1 font-display text-lg font-semibold tracking-wide">Room Tools<span className="text-primary">.</span></h2>
        </div>
        <span className="hidden text-[9px] font-mono uppercase tracking-[0.2em] text-muted-foreground/50 sm:block">Context menu // {category}</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map(tool => {
          const Icon = tool.icon;
          const content = (
            <>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-primary/25 bg-primary/[0.08] text-primary/80"><Icon className="h-4 w-4" /></span>
              <span className="min-w-0">
                <span className="block text-[10px] font-mono uppercase tracking-[0.16em] text-foreground">{tool.label}</span>
                <span className="mt-1 block truncate text-[10px] text-muted-foreground/65">{tool.detail}</span>
              </span>
              <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground/45 transition-transform group-hover:translate-x-1 group-hover:text-primary" />
            </>
          );
          if (tool.tab) {
            return <button key={tool.label} type="button" onClick={onOpenWork} className="group flex min-w-0 items-center gap-3 border border-white/10 bg-white/[0.025] p-3 text-left transition-colors hover:border-primary/45 hover:bg-primary/[0.06]">{content}</button>;
          }
          return <Link key={tool.label} href={tool.href!} className="group flex min-w-0 items-center gap-3 border border-white/10 bg-white/[0.025] p-3 transition-colors hover:border-primary/45 hover:bg-primary/[0.06]">{content}</Link>;
        })}
      </div>
    </section>
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
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [work, setWork] = useState<WorkItem[]>([]);
  const [workLoading, setWorkLoading] = useState(false);
  const [hasCreatorProfile, setHasCreatorProfile] = useState(false);
  const [listingsLoading, setListingsLoading] = useState(false);
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

  async function loadListings(roomId: string) {
    setListingsLoading(true);
    try {
      const response = await fetch(`/api/marketplace?room_id=${encodeURIComponent(roomId)}`);
      if (!response.ok) throw new Error();
      const data = await response.json();
      setListings(data.listings || []);
    } catch {
      toast({ title: "Could not load Room listings", description: "The Marketplace board could not be reached.", variant: "destructive" });
    } finally {
      setListingsLoading(false);
    }
  }

  useEffect(() => {
    if (tab === "Listings" && room) loadListings(room.id);
  }, [tab, room?.id]);

  async function loadWork(roomId: string) {
    setWorkLoading(true);
    try {
      const response = await fetch(`/api/rooms/${roomId}/work`);
      if (!response.ok) throw new Error();
      setWork(await response.json());
      if (isAuthenticated && room?.joined) {
        const profileResponse = await fetch("/api/creator/me", { headers: tokenHeaders });
        if (profileResponse.ok) setHasCreatorProfile(Boolean((await profileResponse.json()).profile));
      }
    } catch {
      toast({ title: "Could not load Room Work", description: "The Room archive could not be reached.", variant: "destructive" });
    } finally {
      setWorkLoading(false);
    }
  }

  useEffect(() => {
    if (tab === "Work" && room) loadWork(room.id);
  }, [tab, room?.id, room?.joined, isAuthenticated]);

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
      <main className={`relative isolate max-w-5xl mx-auto overflow-hidden px-6 lg:px-8 pt-28 pb-20 ${theme === "warehouse" ? "bg-stone-950/30" : theme === "studio" ? "bg-slate-950/20" : theme === "visual-studio" ? "bg-zinc-950/30" : theme === "media-archive" ? "bg-stone-950/30" : ""}`}>
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
         {room.owner_user_id === null && <RoomTools category={room.category} onOpenWork={() => setTab("Work")} />}
        <div className="flex gap-1 border-b border-border mt-8 mb-8 overflow-x-auto">{tabs.map(item => <Button key={item} variant="ghost" onClick={() => setTab(item)} className={`rounded-none border-b-2 ${tab === item ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>{item}</Button>)}</div>
        {tab === "Feed" && <div className="max-w-2xl">
          {room.joined && <form onSubmit={publish} className="flex gap-3 mb-8"><Textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Add a signal to the Room…" maxLength={2000} className="min-h-12" /><Button type="submit" size="icon" aria-label="Publish post" disabled={!body.trim()}><Send className="w-4 h-4" /></Button></form>}
          {!room.joined && <p className="text-xs text-muted-foreground border border-border rounded-lg p-4 mb-5">Join this Room to publish to the Feed.</p>}
          {posts.map(post => <article key={post.id} className="border-b border-border py-5"><p className="text-sm whitespace-pre-wrap leading-relaxed">{post.body}</p><p className="text-[10px] font-mono text-muted-foreground/50 mt-3">@{post.username} · {new Date(post.created_at).toLocaleDateString()}</p></article>)}
          {!posts.length && <p className="text-sm text-muted-foreground py-10">No signals yet. Be the first to post.</p>}
        </div>}
        {tab === "Members" && <div className="grid sm:grid-cols-2 gap-3 max-w-2xl">{members.map(member => <Link href={`/profile/${member.username}`} key={member.id}><div className="border border-border rounded-lg p-4 flex justify-between"><span className="text-sm">@{member.username}</span>{member.owner && <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Owner</span>}</div></Link>)}</div>}
         {tab === "Work" && <RoomWork work={work} loading={workLoading} canAdd={isAuthenticated && room.joined && hasCreatorProfile} />}
         {tab === "Listings" && <RoomListings
           listings={listings}
           loading={listingsLoading}
           canPost={room.joined}
         />}
        </div>
      </main>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="border border-dashed border-border rounded-xl p-12 text-center max-w-2xl"><Wrench className="w-6 h-6 mx-auto text-muted-foreground/40 mb-4" /><h2 className="font-display text-lg">{title}</h2><p className="text-sm text-muted-foreground mt-2">{description}</p></div>;
}

function RoomWork({ work, loading, canAdd }: { work: WorkItem[]; loading: boolean; canAdd: boolean }) {
  if (loading) return <p className="max-w-3xl py-10 text-sm text-muted-foreground">Reading the Room wall…</p>;
  if (!work.length) {
    return <div className="max-w-3xl rounded-xl border border-dashed border-border bg-black/20 p-10 text-center backdrop-blur-sm">
      <Wrench className="mx-auto mb-4 h-6 w-6 text-muted-foreground/40" />
      <h2 className="font-display text-lg">Nothing on the wall yet.</h2>
      <p className="mt-2 text-sm text-muted-foreground">Creator work connected to this Room will appear here.</p>
      {canAdd && <Link href="/creator"><Button variant="outline" className="mt-6">Add Work</Button></Link>}
    </div>;
  }
  return <div className="max-w-3xl"><div className="mb-5 flex items-end justify-between"><div><p className="text-[10px] font-mono uppercase tracking-[.25em] text-muted-foreground/55">Room archive</p><p className="mt-2 text-sm text-muted-foreground">Work connected to this space.</p></div>{canAdd && <Link href="/creator"><Button variant="outline" size="sm">Add Work</Button></Link>}</div><div className="grid gap-4 sm:grid-cols-2">{work.map(item => <WorkCard key={item.id} item={item} />)}</div></div>;
}

function RoomListings({ listings, loading, canPost }: { listings: MarketplaceListing[]; loading: boolean; canPost: boolean }) {
  const price = (listing: MarketplaceListing) =>
    listing.price_type === "contact" ? "Contact for price" :
      listing.price_type === "negotiable" ? (listing.price_amount ? `From ${listing.currency} ${listing.price_amount} · negotiable` : "Negotiable") :
        `${listing.currency} ${listing.price_amount}`;
  const delivery = (mode: string) => mode === "in_person" ? "In-person" : mode === "both" ? "Remote + in-person" : "Remote";

  if (loading) return <p className="text-sm text-muted-foreground py-10">Scanning this Room’s board…</p>;
  if (!listings.length) {
    return <div className="border border-dashed border-border rounded-xl p-10 text-center max-w-2xl bg-black/20">
      <Wrench className="w-6 h-6 mx-auto text-muted-foreground/40 mb-4" />
      <h2 className="font-display text-lg">Nothing on the board yet.</h2>
      <p className="text-sm text-muted-foreground mt-2">Marketplace listings connected to this Room will appear here.</p>
      {canPost && <Link href="/marketplace"><Button variant="outline" className="mt-6">Post a Listing</Button></Link>}
    </div>;
  }
  return <div className="grid sm:grid-cols-2 gap-4 max-w-3xl">
    {listings.map(listing => <Link key={listing.id} href={`/marketplace/${listing.id}`}>
      <article className="h-full border border-border rounded-xl p-5 bg-black/25 backdrop-blur-sm hover:border-primary/50 hover:-translate-y-0.5 transition-all group">
        <div className="flex justify-between gap-3 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50"><span>{listing.category}</span><span>{listing.price_type === "fixed" ? "Fixed" : listing.price_type === "negotiable" ? "Negotiable" : "Contact"}</span></div>
        <h2 className="font-display text-lg font-semibold mt-6 group-hover:text-primary transition-colors">{listing.title}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mt-2 line-clamp-3">{listing.description}</p>
        <div className="mt-6 space-y-2 text-xs text-muted-foreground/70">
          <p className="text-foreground">@{listing.creator_username}</p>
          <p className="flex items-center gap-2"><Radio className="w-3.5 h-3.5" /> {delivery(listing.delivery_mode)} · {price(listing)}</p>
          {listing.city && <p className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> {listing.city}</p>}
        </div>
        <div className="flex justify-end mt-5"><ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" /></div>
      </article>
    </Link>)}
  </div>;
}