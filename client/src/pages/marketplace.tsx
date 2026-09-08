import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, BadgeCheck, BriefcaseBusiness, MapPin, Plus, Radio, Search, Store, Users } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getUserToken, useUser } from "@/hooks/use-user";
import { MarketplaceForm, MARKETPLACE_CATEGORIES, MarketplaceRoom, ListingFormValue } from "@/components/marketplace-form";

type Listing = {
  id: string; title: string; description: string; category: string; creator_user_id: string;
  creator_username: string; creator_display_name?: string; creator_type?: string | null; creator_disciplines?: string[] | null; creator_is_certified?: boolean;
  currency: string; price_type: string; city?: string | null; delivery_mode: string;
  room_id?: string | null; room_name?: string | null; room_slug?: string | null; room_visibility?: string | null; room_category?: string | null; price_amount?: string | null; status: string;
};

const priceLabel = (listing: Listing) => listing.price_type === "contact" ? "Contact for price" : listing.price_type === "negotiable" ? (listing.price_amount ? `From ${listing.currency} ${listing.price_amount} · negotiable` : "Negotiable") : `${listing.currency} ${listing.price_amount}`;
const priceTypeLabel = (type: string) => type === "negotiable" ? "Negotiable" : type === "contact" ? "Contact" : "Fixed";
const deliveryLabel = (mode: string) => mode === "in_person" ? "In-person" : mode === "both" ? "Remote + in-person" : "Remote";

export default function Marketplace() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useUser();
  const { toast } = useToast();
  const [listings, setListings] = useState<Listing[]>([]);
  const [rooms, setRooms] = useState<MarketplaceRoom[]>([]);
  const [category, setCategory] = useState(() => new URLSearchParams(window.location.search).get("category") || "");
  const [delivery, setDelivery] = useState("");
  const [priceType, setPriceType] = useState("");
  const [city, setCity] = useState("");
  const [search, setSearch] = useState("");
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

  const visibleListings = useMemo(() => {
    const query = search.trim().toLowerCase();
    return listings.filter(listing => {
      if (priceType && listing.price_type !== priceType) return false;
      if (!query) return true;
      const searchable = [
        listing.title,
        listing.category,
        listing.description,
        listing.creator_display_name,
        listing.creator_username,
        listing.creator_type,
        ...(listing.creator_disciplines || []),
      ].filter(Boolean).join(" ").toLowerCase();
      return searchable.includes(query);
    });
  }, [listings, priceType, search]);

  function openListing(event: React.MouseEvent<HTMLElement>, id: string) {
    if ((event.target as HTMLElement).closest("a,button,select,input")) return;
    navigate(`/marketplace/${id}`);
  }

  function openListingFromKeyboard(event: React.KeyboardEvent<HTMLElement>, id: string) {
    if ((event.target as HTMLElement).closest("a,button,select,input")) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      navigate(`/marketplace/${id}`);
    }
  }
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pt-20">
        <section className="border-b border-border bg-[radial-gradient(circle_at_78%_20%,rgba(105,74,145,.17),transparent_34%)]">
          <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8 md:py-20">
            <p className="mb-4 text-[10px] font-mono uppercase tracking-[0.3em] text-primary/70">VANTA OS · CREATIVE MARKETPLACE</p>
            <div className="flex flex-wrap items-end justify-between gap-8">
              <div>
                <h1 className="font-display text-4xl font-bold tracking-tight md:text-6xl">VANTA MARKETPLACE<span className="text-primary">.</span></h1>
                <p className="mt-4 max-w-xl leading-relaxed text-muted-foreground">Creative services, work, and opportunities across the Vanta network.</p>
              </div>
              <Button onClick={() => isAuthenticated ? setShowForm(open => !open) : navigate("/login")} className="gap-2"><Plus className="h-4 w-4" /> Post Listing</Button>
            </div>
            {showForm && <div className="mt-10 max-w-3xl"><MarketplaceForm rooms={rooms} submitLabel="Put it on the board" onSubmit={createListing} /></div>}
          </div>
        </section>
        <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8 md:py-10">
          <div className="mb-5 flex items-center gap-3 border-b border-border pb-5">
            <Search className="h-4 w-4 shrink-0 text-primary/70" />
            <Input aria-label="Search Marketplace listings" className="h-10 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search listings, creators, disciplines…" />
            {search && <button type="button" onClick={() => setSearch("")} className="shrink-0 text-[10px] font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground">Clear</button>}
          </div>
          <div className="mb-10 flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <FilterSelect ariaLabel="Filter by category" value={category} onChange={setCategory}>
                <option value="">All categories</option>
                {MARKETPLACE_CATEGORIES.map(item => <option key={item}>{item}</option>)}
              </FilterSelect>
              <FilterSelect ariaLabel="Filter by delivery mode" value={delivery} onChange={setDelivery}>
                <option value="">Any delivery</option>
                <option value="remote">Remote</option>
                <option value="in_person">In-person</option>
                <option value="both">Both</option>
              </FilterSelect>
              <FilterSelect ariaLabel="Filter by price type" value={priceType} onChange={setPriceType}>
                <option value="">Any price</option>
                <option value="fixed">Fixed</option>
                <option value="negotiable">Negotiable</option>
                <option value="contact">Contact</option>
              </FilterSelect>
              <form onSubmit={e => { e.preventDefault(); loadListings(); }} className="flex min-w-0 w-full gap-2 sm:w-auto">
                <Input aria-label="Filter by city" className="h-9 w-full sm:w-44" value={city} onChange={e => setCity(e.target.value)} placeholder="Filter city" />
                <Button type="submit" variant="outline" size="sm">Apply</Button>
              </form>
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50 sm:ml-auto">{visibleListings.length} active {visibleListings.length === 1 ? "listing" : "listings"}</span>
            </div>
          </div>
          {loading ? <p className="py-20 text-center text-sm text-muted-foreground">Scanning the board…</p> : visibleListings.length ? <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {visibleListings.map(listing => (
              <article
                key={listing.id}
                role="link"
                tabIndex={0}
                onClick={event => openListing(event, listing.id)}
                onKeyDown={event => openListingFromKeyboard(event, listing.id)}
                className="group flex h-full min-w-0 cursor-pointer flex-col border border-border bg-card/35 p-5 transition-all hover:-translate-y-0.5 hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <div className="flex items-start justify-between gap-4 border-b border-border/70 pb-4">
                  <span className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.16em] text-primary/75"><BriefcaseBusiness className="h-3.5 w-3.5" /> {listing.category}</span>
                  <span className="shrink-0 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/55">{priceTypeLabel(listing.price_type)}</span>
                </div>
                <h2 className="mt-5 line-clamp-2 font-display text-xl font-semibold transition-colors group-hover:text-primary">{listing.title}</h2>
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{listing.description}</p>
                <div className="mt-6 flex-1 space-y-3 text-xs text-muted-foreground/75">
                  <Link href={`/creators/${listing.creator_username}`} onClick={event => event.stopPropagation()} className="flex min-w-0 items-center gap-2 text-foreground hover:text-primary">
                    <Users className="h-3.5 w-3.5 shrink-0 text-primary/75" />
                    <span className="min-w-0 truncate">{listing.creator_display_name || `@${listing.creator_username}`} <span className="text-muted-foreground/55">· @{listing.creator_username}</span></span>
                    {listing.creator_is_certified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-primary" aria-label="Certified Creator" />}
                  </Link>
                  {(listing.creator_disciplines?.length || listing.creator_type) && <p className="truncate pl-5 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/55">{listing.creator_disciplines?.slice(0, 3).join(" · ") || listing.creator_type}</p>}
                  <p className="flex items-center gap-2 text-foreground"><Radio className="h-3.5 w-3.5 shrink-0 text-primary/70" /> {deliveryLabel(listing.delivery_mode)}</p>
                  <p className="flex items-center gap-2 font-display text-lg text-foreground"><span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/55">Offer</span> {priceLabel(listing)}</p>
                  {listing.city && <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 shrink-0" /> {listing.city}</p>}
                  {listing.room_name && listing.room_id && <Link href={`/rooms/${listing.room_id}`} onClick={event => event.stopPropagation()} className="flex min-w-0 items-center gap-2 border-t border-border/60 pt-3 text-primary/80 hover:text-primary"><Store className="h-3.5 w-3.5 shrink-0" /><span className="truncate">Room · {listing.room_name}</span>{listing.room_category && <span className="shrink-0 text-[9px] font-mono uppercase tracking-widest text-muted-foreground/50">{listing.room_category}</span>}</Link>}
                </div>
                <div className="mt-6 flex items-center justify-between border-t border-border/70 pt-4 text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground/60">
                  <span>View listing</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </article>
            ))}
          </div> : listings.length ? <EmptyMarketplaceState title="NO LISTINGS FOUND" description="Try another category, search, delivery mode, or price type." /> : <EmptyMarketplaceState title="THE BOARD IS QUIET" description="No listings are active yet." action={isAuthenticated ? "Post Listing" : undefined} onAction={() => isAuthenticated ? setShowForm(true) : navigate("/login")} />}
        </div>
      </main><Footer />
    </div>
  );
}

function FilterSelect({ ariaLabel, value, onChange, children }: { ariaLabel: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return <select aria-label={ariaLabel} className="h-9 w-full max-w-full rounded-md border border-input bg-background px-3 text-sm sm:w-auto" value={value} onChange={event => onChange(event.target.value)}>{children}</select>;
}

function EmptyMarketplaceState({ title, description, action, onAction }: { title: string; description: string; action?: string; onAction?: () => void }) {
  return <div className="mx-auto max-w-2xl border border-dashed border-border px-6 py-20 text-center"><p className="font-display text-2xl">{title}</p><p className="mt-3 text-sm text-muted-foreground">{description}</p>{action && onAction && <Button onClick={onAction} variant="outline" className="mt-7">{action}</Button>}</div>;
}

export { priceLabel, deliveryLabel };