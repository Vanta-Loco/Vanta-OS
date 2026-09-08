import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowRight,
  BriefcaseBusiness,
  Grid2X2,
  Lock,
  Plus,
  Store,
  Users,
  Waves,
} from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { getUserToken, useUser } from "@/hooks/use-user";
import fashionWarehouseImage from "@assets/generated_images/fashion_warehouse_environment.png";
import musicBedroomStudioImage from "@assets/generated_images/music_bedroom_studio_environment.png";
import visualStudioImage from "@assets/generated_images/visual_studio_environment.png";
import mediaArchiveImage from "@assets/generated_images/media_archive_environment.png";

type Room = {
  id: string;
  name: string;
  description: string;
  category: string;
  visibility: "public" | "private";
  owner_user_id: string | null;
  member_count: number;
  work_count: number;
  listing_count: number;
  joined: boolean;
};

const categories = ["All", "Music", "Visual", "Fashion", "Media"];

export default function Rooms() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useUser();
  const { toast } = useToast();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", category: "Music", visibility: "public" });

  async function loadRooms() {
    setLoading(true);
    try {
      const query = category === "All" ? "" : `?category=${encodeURIComponent(category)}`;
      const response = await fetch(`/api/rooms${query}`);
      if (!response.ok) throw new Error("Unable to load Rooms");
      setRooms((await response.json()).rooms);
    } catch {
      toast({ title: "Rooms unavailable", description: "The directory could not be loaded.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadRooms(); }, [category]);

  async function createRoom(event: React.FormEvent) {
    event.preventDefault();
    if (!isAuthenticated) return navigate("/login");
    const response = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Token": getUserToken() || "" },
      body: JSON.stringify(form),
    });
    const data = await response.json();
    if (!response.ok) {
      toast({ title: "Could not create Room", description: data.error || "Please try again.", variant: "destructive" });
      return;
    }
    navigate(`/rooms/${data.id}`);
  }

  const joinedRooms = rooms.filter(room => room.joined);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pt-20">
        <section className="relative overflow-hidden border-b border-border">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_16%,rgba(105,74,145,.22),transparent_36%),linear-gradient(120deg,transparent_35%,rgba(255,255,255,.025))]" />
          <div className="relative mx-auto max-w-7xl px-6 py-16 lg:px-8 md:py-20">
            <div className="flex flex-wrap items-end justify-between gap-8">
              <div>
                <p className="mb-4 text-[10px] font-mono uppercase tracking-[0.32em] text-primary/75">VANTA OS · ROOMS</p>
                <h1 className="font-display text-5xl font-bold tracking-tight md:text-7xl">Vanta Rooms<span className="text-primary">.</span></h1>
                <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">Creative spaces inside the Vanta network.</p>
              </div>
              <Button onClick={() => isAuthenticated ? setShowCreate(open => !open) : navigate("/login")} className="gap-2">
                <Plus className="h-4 w-4" /> Create a Room
              </Button>
            </div>
            {showCreate && (
              <form onSubmit={createRoom} className="mt-10 max-w-2xl border border-primary/30 bg-card/80 p-5 backdrop-blur-sm">
                <p className="mb-5 text-[10px] font-mono uppercase tracking-[0.25em] text-primary/70">Open a new space</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input required minLength={3} maxLength={80} placeholder="Room name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                  <select aria-label="Room category" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                    {categories.slice(1).map(item => <option key={item}>{item}</option>)}
                  </select>
                </div>
                <Textarea maxLength={500} placeholder="What is this space for?" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="mt-4" />
                <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                  <select aria-label="Room visibility" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.visibility} onChange={e => setForm({ ...form, visibility: e.target.value })}>
                    <option value="public">Public — discoverable</option>
                    <option value="private">Private — invite only</option>
                  </select>
                  <Button type="submit">Open Room</Button>
                </div>
              </form>
            )}
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8 md:py-14">
          {isAuthenticated && !loading && joinedRooms.length === 0 && rooms.length > 0 && (
            <div className="mb-10 border border-primary/30 bg-primary/[0.045] px-6 py-5 md:flex md:items-center md:justify-between md:gap-6">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-primary/75">First arrival</p>
                <h2 className="mt-2 font-display text-2xl font-semibold">FIND YOUR SPACE<span className="text-primary">.</span></h2>
                <p className="mt-1 text-sm text-muted-foreground">Enter a Room and find the signal that feels like yours.</p>
              </div>
              <span className="mt-4 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/55 md:mt-0">Public Rooms await</span>
            </div>
          )}

          <div className="mb-8 flex flex-wrap items-center gap-2" role="group" aria-label="Room categories">
            <span className="mr-2 hidden text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground/45 sm:inline">Filter</span>
            {categories.map(item => <Button key={item} variant={category === item ? "default" : "outline"} size="sm" onClick={() => setCategory(item)} className="font-mono text-[10px] uppercase tracking-widest">{item}</Button>)}
            {!loading && <span className="ml-auto text-[10px] font-mono uppercase tracking-widest text-muted-foreground/45">{rooms.length} {rooms.length === 1 ? "space" : "spaces"}</span>}
          </div>

          {loading ? <RoomSkeleton /> : (
            <div className="grid gap-5 md:grid-cols-2">
              {rooms.map(room => <RoomCard key={room.id} room={room} />)}
            </div>
          )}
          {!loading && !rooms.length && <div className="border border-dashed border-border px-6 py-20 text-center"><Grid2X2 className="mx-auto h-6 w-6 text-muted-foreground/35" /><p className="mt-5 font-display text-3xl">NO ROOMS FOUND</p><p className="mt-3 text-sm text-muted-foreground">No public Rooms in this category yet.</p></div>}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function RoomCard({ room }: { room: Room }) {
  const environment = !room.owner_user_id
    ? room.category === "Music"
      ? musicBedroomStudioImage
      : room.category === "Fashion"
        ? fashionWarehouseImage
        : room.category === "Visual"
          ? visualStudioImage
          : room.category === "Media"
            ? mediaArchiveImage
            : null
    : null;

  return (
    <Link href={`/rooms/${room.id}`}>
      <article className={`group relative min-h-[390px] cursor-pointer overflow-hidden border transition-all duration-300 hover:-translate-y-1 ${
        room.joined ? "border-primary/55 shadow-[0_0_32px_rgba(150,100,220,.12)]" : "border-border hover:border-primary/50"
      }`}>
        {environment ? (
          <img src={environment} alt="" className="absolute inset-0 h-full w-full object-cover object-center opacity-75 transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <div className={`absolute inset-0 ${room.category === "Visual" ? "bg-[radial-gradient(circle_at_70%_20%,rgba(70,130,180,.28),transparent_38%),linear-gradient(135deg,hsl(var(--muted)),hsl(var(--background)))]" : room.category === "Media" ? "bg-[radial-gradient(circle_at_25%_18%,rgba(190,100,70,.24),transparent_36%),linear-gradient(135deg,hsl(var(--background)),hsl(var(--muted)))]" : "bg-[radial-gradient(circle_at_75%_15%,rgba(130,80,180,.25),transparent_36%),linear-gradient(135deg,hsl(var(--muted)),hsl(var(--background)))]"}`} />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,8,14,.76)_0%,rgba(7,8,14,.2)_38%,rgba(7,8,14,.9)_100%)]" />
        <div className="relative flex min-h-[390px] flex-col justify-between p-5 md:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="border border-white/20 bg-black/20 px-2.5 py-1 text-[9px] font-mono uppercase tracking-[0.22em] text-white/75">{room.category}</span>
              {room.owner_user_id ? <span className="text-[9px] font-mono uppercase tracking-widest text-white/45">Member-led</span> : <span className="text-[9px] font-mono uppercase tracking-widest text-primary/80">Official</span>}
            </div>
            {room.joined ? <span className="border border-primary/60 bg-primary/15 px-2.5 py-1 text-[9px] font-mono uppercase tracking-[0.2em] text-primary">Member</span> : room.visibility === "private" ? <Lock className="h-4 w-4 text-white/55" /> : <Waves className="h-4 w-4 text-white/55" />}
          </div>
          <div>
            <p className="mb-3 text-[10px] font-mono uppercase tracking-[0.26em] text-white/55">VANTA SPACE // {room.id.slice(0, 4).toUpperCase()}</p>
            <h2 className="font-display text-3xl font-bold text-white md:text-4xl">{room.name}<span className="text-primary">.</span></h2>
            <p className="mt-3 line-clamp-3 max-w-xl text-sm leading-relaxed text-white/70">{room.description || "A public space inside the Vanta network."}</p>
            <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-[10px] font-mono uppercase tracking-widest text-white/60">
              <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-primary/80" /> {room.member_count} Members</span>
              {room.work_count > 0 && <span className="flex items-center gap-1.5"><BriefcaseBusiness className="h-3.5 w-3.5 text-primary/80" /> {room.work_count} Work{room.work_count === 1 ? "" : "s"}</span>}
              {room.listing_count > 0 && <span className="flex items-center gap-1.5"><Store className="h-3.5 w-3.5 text-emerald-300/75" /> {room.listing_count} Listings</span>}
            </div>
            <div className="mt-6 flex items-center justify-between border-t border-white/15 pt-4">
              <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/80">{room.joined ? "Enter Room" : "View Room"}</span>
              <ArrowRight className="h-4 w-4 text-primary transition-transform group-hover:translate-x-1.5" />
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}

function RoomSkeleton() {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-[390px] animate-pulse border border-border bg-card/30 p-6"><div className="h-4 w-24 bg-muted/60" /><div className="mt-64 h-8 w-2/3 bg-muted/60" /><div className="mt-4 h-3 w-full bg-muted/40" /><div className="mt-6 h-3 w-1/2 bg-muted/40" /></div>)}
    </div>
  );
}