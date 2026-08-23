import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, MapPin, Plus, Radio, Users } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getUserToken, useUser } from "@/hooks/use-user";
import { MarketplaceForm, MARKETPLACE_CATEGORIES, MarketplaceRoom, ListingFormValue } from "@/components/marketplace-form";

type Listing = {
  id: string; title: string; description: string; category: string; creator_user_id: string;
  creator_username: string; creator_display_name?: string; price_amount?: string | null;
  currency: string; price_type: string; city?: string | null; delivery_mode: string;
  room_id?: string | null; room_name?: string | null; status: string;
};

const priceLabel = (listing: Listing) => listing.price_type === "contact" ? "Contact for price" : listing.price_type === "negotiable" ? (listing.price_amount ? `From ${listing.currency} ${listing.price_amount} · negotiable` : "Negotiable") : `${listing.currency} ${listing.price_amount}`;
const deliveryLabel = (mode: string) => mode === "in_person" ? "In-person" : mode === "both" ? "Remote + in-person" : "Remote";

export default function Marketplace() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useUser();
  const { toast } = useToast();
  const [listings, setListings] = useState<Listing[]>([]);
  const [rooms, setRooms] = useState<MarketplaceRoom[]>([]);
  const [category, setCategory] = useState("");
  const [delivery, setDelivery] = useState("");
  const [city, setCity] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  async function loadListings() {
    setLoading(true);
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (delivery) params.set("delivery_mode", delivery);
    if (city.trim()) params.set("city", city.trim());
    try {
      const response = await fetch(`/api/marketplace${params.toString() ? `?${params}` : ""}`);
      if (!response.ok) throw new Error();
      setListings((await response.json()).listings);
    } catch { toast({ title: "Marketplace unavailable", description: "The board could not be loaded.", variant: "destructive" }); }
    finally { setLoading(false); }
  }
  useEffect(() => { loadListings(); }, [category, delivery]);
  useEffect(() => {
    if (!isAuthenticated) return;
    fetch("/api/rooms", { headers: { "X-User-Token": getUserToken() || "" } }).then(r => r.ok ? r.json() : null).then(data => {
      if (data) setRooms((data.rooms || []).filter((room: MarketplaceRoom) => room.joined && room.visibility === "public"));
    }).catch(() => {});
  }, [isAuthenticated]);
  async function createListing(value: ListingFormValue) {
    if (!isAuthenticated) return navigate("/login");
    const response = await fetch("/api/marketplace", {
      method: "POST", headers: { "Content-Type": "application/json", "X-User-Token": getUserToken() || "" },
      body: JSON.stringify({ ...value, price_amount: value.price_type === "contact" ? null : value.price_amount || null, city: value.city || null, room_id: value.room_id || null }),
    });
    const data = await response.json();
    if (!response.ok) { toast({ title: "Could not post listing", description: data.error, variant: "destructive" }); return; }
    setShowForm(false); navigate(`/marketplace/${data.id}`);
  }
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pt-20">
        <section className="border-b border-border bg-[radial-gradient(circle_at_78%_20%,rgba(105,74,145,.17),transparent_34%)]">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16 md:py-20">
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-primary/70 mb-4">VANTA OS · CREATIVE MARKETPLACE</p>
            <div className="flex flex-wrap items-end justify-between gap-8">
              <div><h1 className="text-4xl md:text-6xl font-display font-bold tracking-tight">The board<span className="text-primary">.</span></h1><p className="mt-4 max-w-xl text-muted-foreground leading-relaxed">Creative services, unfinished ideas and skilled hands moving through the Vanta network.</p></div>
              <Button onClick={() => isAuthenticated ? setShowForm(open => !open) : navigate("/login")} className="gap-2"><Plus className="w-4 h-4" /> Post Listing</Button>
            </div>
            {showForm && <div className="mt-10 max-w-3xl"><MarketplaceForm rooms={rooms} submitLabel="Put it on the board" onSubmit={createListing} /></div>}
          </div>
        </section>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10">
          <div className="flex flex-wrap items-center gap-3 mb-10">
            <select aria-label="Filter by category" className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={category} onChange={e => setCategory(e.target.value)}><option value="">All categories</option>{MARKETPLACE_CATEGORIES.map(item => <option key={item}>{item}</option>)}</select>
            <select aria-label="Filter by delivery mode" className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={delivery} onChange={e => setDelivery(e.target.value)}><option value="">Any delivery</option><option value="remote">Remote</option><option value="in_person">In-person</option><option value="both">Both</option></select>
            <form onSubmit={e => { e.preventDefault(); loadListings(); }} className="flex gap-2"><Input aria-label="Filter by city" className="h-9 w-36 sm:w-48" value={city} onChange={e => setCity(e.target.value)} placeholder="Filter city" /><Button type="submit" variant="outline" size="sm">Apply</Button></form>
            <span className="ml-auto text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50">{listings.length} active {listings.length === 1 ? "listing" : "listings"}</span>
          </div>
          {loading ? <p className="py-20 text-center text-sm text-muted-foreground">Scanning the board…</p> : listings.length ? <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {listings.map(listing => <Link key={listing.id} href={`/marketplace/${listing.id}`}><article className="h-full border border-border rounded-xl p-5 bg-card/50 hover:border-primary/50 hover:-translate-y-0.5 transition-all group"><div className="flex justify-between gap-4 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50"><span>{listing.category}</span><span>{listing.price_type === "negotiable" ? "Negotiable" : listing.price_type === "contact" ? "Contact" : "Fixed"}</span></div><h2 className="font-display text-xl font-semibold mt-8 group-hover:text-primary transition-colors">{listing.title}</h2><p className="text-sm text-muted-foreground leading-relaxed mt-2 line-clamp-3">{listing.description}</p><div className="mt-7 space-y-2 text-xs text-muted-foreground/70"><p className="flex items-center gap-2 text-foreground"><Users className="w-3.5 h-3.5" /> @{listing.creator_username}</p><p className="flex items-center gap-2"><Radio className="w-3.5 h-3.5" /> {deliveryLabel(listing.delivery_mode)} · {priceLabel(listing)}</p>{listing.city && <p className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> {listing.city}</p>}{listing.room_name && <p className="text-primary/70">Room · {listing.room_name}</p>}</div><div className="flex justify-end mt-6"><ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" /></div></article></Link>)}
          </div> : <div className="border border-dashed border-border rounded-xl py-20 px-6 text-center max-w-2xl mx-auto"><p className="font-display text-2xl">No listings on the board yet.</p><p className="text-sm text-muted-foreground mt-3">Be the first Member to put something up.</p><Button onClick={() => isAuthenticated ? setShowForm(true) : navigate("/login")} variant="outline" className="mt-7">Post a Listing</Button></div>}
        </div>
      </main><Footer />
    </div>
  );
}

export { priceLabel, deliveryLabel };