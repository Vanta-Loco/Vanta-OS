import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, Lock, Plus, Users, Waves } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { getUserToken, useUser } from "@/hooks/use-user";

type Room = {
  id: string;
  name: string;
  description: string;
  category: string;
  visibility: "public" | "private";
  owner_user_id: string | null;
  member_count: number;
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

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pt-20">
        <section className="border-b border-border">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16 md:py-20">
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-muted-foreground/50 mb-4">VANTA OS · ROOMS</p>
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <h1 className="text-4xl md:text-6xl font-display font-bold tracking-tight">Rooms</h1>
                <p className="mt-4 max-w-xl text-muted-foreground leading-relaxed">
                  Persistent spaces for the people, references, and ideas moving through Vanta.
                </p>
              </div>
              <Button onClick={() => isAuthenticated ? setShowCreate(open => !open) : navigate("/login")} className="gap-2">
                <Plus className="w-4 h-4" /> Create a Room
              </Button>
            </div>
            {showCreate && (
              <form onSubmit={createRoom} className="mt-10 max-w-2xl border border-border rounded-xl p-5 bg-card grid gap-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input required minLength={3} maxLength={80} placeholder="Room name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                  <select aria-label="Room category" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                    {categories.slice(1).map(item => <option key={item}>{item}</option>)}
                  </select>
                </div>
                <Textarea maxLength={500} placeholder="What is this space for?" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                <div className="flex flex-wrap items-center justify-between gap-4">
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
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10">
          <div className="flex flex-wrap gap-2 mb-8" role="group" aria-label="Room categories">
            {categories.map(item => <Button key={item} variant={category === item ? "default" : "outline"} size="sm" onClick={() => setCategory(item)}>{item}</Button>)}
          </div>
          {loading ? <p className="py-16 text-center text-sm text-muted-foreground">Scanning public Rooms…</p> : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {rooms.map(room => (
                <Link key={room.id} href={`/rooms/${room.id}`}>
                  <article className="h-full border border-border rounded-xl p-5 hover:border-primary/50 hover:bg-muted/20 transition-all cursor-pointer group">
                    <div className="flex justify-between items-start mb-8">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50">{room.category}</span>
                      {room.visibility === "private" ? <Lock className="w-3.5 h-3.5 text-muted-foreground/50" /> : <Waves className="w-3.5 h-3.5 text-muted-foreground/50" />}
                    </div>
                    <h2 className="font-display text-xl font-semibold group-hover:text-primary transition-colors">{room.name}</h2>
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-3 leading-relaxed">{room.description}</p>
                    <div className="flex items-center justify-between mt-8 text-xs text-muted-foreground/60">
                      <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {room.member_count} members</span>
                      <span className="flex items-center gap-2">{room.owner_user_id ? "Member-led" : "Official"} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></span>
                    </div>
                    {room.joined && <p className="mt-3 text-[10px] uppercase tracking-widest text-primary">Joined</p>}
                  </article>
                </Link>
              ))}
            </div>
          )}
          {!loading && !rooms.length && <p className="py-16 text-center text-sm text-muted-foreground">No public Rooms in this category yet.</p>}
        </div>
      </main>
      <Footer />
    </div>
  );
}