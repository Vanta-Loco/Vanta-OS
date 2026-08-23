import { useEffect, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { ArrowLeft, CalendarDays, Edit3, MapPin, MessageCircle, Radio, Trash2, Users } from "lucide-react";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getUserToken, useUser } from "@/hooks/use-user";
import { MarketplaceForm, MarketplaceRoom, ListingFormValue } from "@/components/marketplace-form";
import { deliveryLabel, priceLabel } from "./marketplace";

type Listing = {
  id: string; title: string; description: string; category: string; creator_user_id: string;
  creator_username: string; creator_display_name?: string; price_amount?: string | null;
  currency: string; price_type: string; city?: string | null; delivery_mode: string;
  room_id?: string | null; room_name?: string | null; room_slug?: string | null;
  status: string; created_at: string;
};

export default function MarketplaceDetail() {
  const [, params] = useRoute("/marketplace/:id");
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useUser();
  const { toast } = useToast();
  const [listing, setListing] = useState<Listing | null>(null);
  const [rooms, setRooms] = useState<MarketplaceRoom[]>([]);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  async function load() {
    if (!params?.id) return;
    const response = await fetch(`/api/marketplace/${params.id}`);
    if (response.ok) setListing(await response.json());
    setLoading(false);
  }
  useEffect(() => { load(); }, [params?.id]);
  useEffect(() => {
    if (!isAuthenticated) return;
    fetch("/api/rooms", { headers: { "X-User-Token": getUserToken() || "" } }).then(r => r.ok ? r.json() : null).then(data => {
      if (data) setRooms((data.rooms || []).filter((room: MarketplaceRoom) => room.joined && room.visibility === "public"));
    }).catch(() => {});
  }, [isAuthenticated]);
  async function updateListing(value: ListingFormValue) {
    if (!listing) return;
    const response = await fetch(`/api/marketplace/${listing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json", "X-User-Token": getUserToken() || "" }, body: JSON.stringify({ ...value, price_amount: value.price_type === "contact" ? null : value.price_amount || null, city: value.city || null, room_id: value.room_id || null }) });
    const data = await response.json();
    if (!response.ok) { toast({ title: "Could not update listing", description: data.error, variant: "destructive" }); return; }
    setListing(current => current ? { ...current, ...data } : data); setEditing(false);
  }
  async function closeListing() {
    if (!listing || !window.confirm("Close this listing? It will be removed from active browsing.")) return;
    const response = await fetch(`/api/marketplace/${listing.id}`, { method: "DELETE", headers: { "X-User-Token": getUserToken() || "" } });
    if (!response.ok) { const data = await response.json(); return toast({ title: "Could not close listing", description: data.error, variant: "destructive" }); }
    navigate("/marketplace");
  }
  if (loading) return <div className="min-h-screen bg-background pt-32 text-center text-sm text-muted-foreground">Loading listing…</div>;
  if (!listing) return <div className="min-h-screen bg-background pt-32 text-center"><p className="text-muted-foreground">Listing not found.</p><Link href="/marketplace"><Button variant="outline" className="mt-4">Back to Marketplace</Button></Link></div>;
  const own = user?.id === listing.creator_user_id;
  const initial = { title: listing.title, description: listing.description, category: listing.category, price_type: listing.price_type, price_amount: listing.price_amount || "", delivery_mode: listing.delivery_mode, city: listing.city || "", room_id: listing.room_id || "" };
  return <div className="min-h-screen bg-background"><Header /><main className="max-w-5xl mx-auto px-6 lg:px-8 pt-28 pb-20">
    <Link href="/marketplace"><Button variant="ghost" size="sm" className="gap-2 -ml-3 mb-8"><ArrowLeft className="w-4 h-4" /> Back to Marketplace</Button></Link>
    {editing ? <div className="max-w-3xl"><p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50 mb-4">Edit listing</p><MarketplaceForm initial={initial} rooms={rooms} submitLabel="Save changes" onSubmit={updateListing} onCancel={() => setEditing(false)} /></div> : <div className="grid lg:grid-cols-[1fr_300px] gap-10">
      <article><div className="flex flex-wrap items-center gap-3 text-[10px] font-mono uppercase tracking-widest text-primary/70"><span>{listing.category}</span><span className="text-muted-foreground/40">/</span><span>{listing.status}</span></div><h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight mt-5">{listing.title}</h1><p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap mt-7 max-w-2xl">{listing.description}</p><div className="flex flex-wrap gap-x-6 gap-y-3 mt-8 pt-6 border-t border-border text-sm text-muted-foreground"><span className="flex items-center gap-2"><Radio className="w-4 h-4" /> {deliveryLabel(listing.delivery_mode)}</span>{listing.city && <span className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {listing.city}</span>}<span className="flex items-center gap-2"><CalendarDays className="w-4 h-4" /> {new Date(listing.created_at).toLocaleDateString()}</span></div></article>
      <aside className="space-y-4"><div className="border border-border rounded-xl p-5 bg-card/60"><p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50">Offer</p><p className="font-display text-2xl mt-3">{priceLabel(listing)}</p><Button disabled className="w-full mt-6 gap-2" variant="default"><MessageCircle className="w-4 h-4" /> Contact / collaborate</Button><p className="text-[11px] text-muted-foreground/60 text-center mt-3">Collaboration tools coming next.</p></div><div className="border border-border rounded-xl p-5"><p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50">Creator</p><p className="mt-3 font-medium">@{listing.creator_username}</p>{listing.creator_display_name && <p className="text-sm text-muted-foreground">{listing.creator_display_name}</p>}{listing.room_name && <Link href={listing.room_slug ? `/rooms/${listing.room_id}` : "/rooms"}><p className="flex items-center gap-2 mt-5 pt-4 border-t border-border text-sm text-primary"><Users className="w-4 h-4" /> {listing.room_name}</p></Link>}</div>{own && <div className="border border-border rounded-xl p-3 flex gap-2"><Button variant="outline" size="sm" className="flex-1 gap-2" onClick={() => setEditing(true)}><Edit3 className="w-3.5 h-3.5" /> Edit</Button><Button variant="outline" size="sm" className="gap-2" onClick={closeListing}><Trash2 className="w-3.5 h-3.5" /> Close</Button></div>}</aside>
    </div>}
  </main></div>;
}