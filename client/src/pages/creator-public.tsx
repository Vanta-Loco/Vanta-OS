import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { ArrowLeft, ArrowUpRight, ExternalLink, MapPin, Radio, Sparkles, Users } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { deliveryLabel, priceLabel } from "./marketplace";
import { WorkCard, type WorkItem } from "@/components/creator-work";

type Listing = {
  id: string; title: string; description: string; category: string; price_amount?: string | null;
  currency: string; price_type: string; delivery_mode: string; city?: string | null;
  room_id?: string | null; room_name?: string | null; room_slug?: string | null;
};
type Profile = {
  username: string; display_name: string; bio: string; city?: string | null; country?: string | null;
  profile_image_url?: string | null; banner_image_url?: string | null; creator_type: string;
  disciplines: string[]; instagram_url?: string | null; website_url?: string | null;
  spotify_url?: string | null; soundcloud_url?: string | null; is_certified: boolean;
  created_at: string; active_marketplace_listings: Listing[];
};

export default function CreatorPublic() {
  const [, params] = useRoute("/creators/:username");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [tab, setTab] = useState<"overview" | "work" | "listings">("overview");
  const [work, setWork] = useState<WorkItem[]>([]);
  const [workLoading, setWorkLoading] = useState(false);

  useEffect(() => {
    if (!params?.username) return;
    setLoading(true);
    fetch(`/api/creators/${encodeURIComponent(params.username)}`)
      .then(response => { if (!response.ok) throw new Error(); return response.json(); })
      .then(setProfile)
      .catch(() => setMissing(true))
      .finally(() => setLoading(false));
  }, [params?.username]);

  useEffect(() => {
    if (tab !== "work" || !params?.username) return;
    setWorkLoading(true);
    fetch(`/api/creators/${encodeURIComponent(params.username)}/work`)
      .then(response => { if (!response.ok) throw new Error(); return response.json(); })
      .then(setWork).catch(() => setWork([])).finally(() => setWorkLoading(false));
  }, [tab, params?.username]);

  if (loading) return <div className="min-h-screen bg-background pt-32 text-center text-sm text-muted-foreground">Locating Creator Profile…</div>;
  if (missing || !profile) return <div className="min-h-screen bg-background pt-32 text-center px-6"><p className="font-display text-3xl">Creator not found<span className="text-primary">.</span></p><p className="text-sm text-muted-foreground mt-3">This identity has not activated a public profile yet.</p><Link href="/"><Button variant="outline" className="mt-7">Return to Vanta</Button></Link></div>;
  const location = [profile.city, profile.country].filter(Boolean).join(", ");
  const links = [{ label: "Instagram", url: profile.instagram_url }, { label: "Website", url: profile.website_url }, { label: "Spotify", url: profile.spotify_url }, { label: "SoundCloud", url: profile.soundcloud_url }].filter(item => item.url);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pt-20">
        <section className="relative overflow-hidden border-b border-border">
          <div className="h-44 md:h-64 bg-[radial-gradient(circle_at_72%_20%,rgba(117,77,160,.34),transparent_37%),linear-gradient(120deg,hsl(var(--muted)),transparent_65%),repeating-linear-gradient(135deg,transparent_0_22px,rgba(255,255,255,.035)_22px_23px)]" />
          <div className="max-w-6xl mx-auto px-6 lg:px-8 -mt-16 md:-mt-20 relative">
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl border-8 border-background bg-muted flex items-center justify-center overflow-hidden shadow-2xl">{profile.profile_image_url ? <img src={profile.profile_image_url} alt="" className="w-full h-full object-cover" /> : <Sparkles className="w-10 h-10 text-muted-foreground/40" />}</div>
              {profile.is_certified && <div className="mb-2 rounded-full border border-primary/60 bg-background/90 px-4 py-2 flex items-center gap-2 text-primary shadow-lg"><span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary))]" /><span className="text-[10px] font-mono uppercase tracking-[0.2em]">Vanta Certified Creator</span></div>}
            </div>
            <div className="py-8 md:py-10">
              <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-primary/75 mb-3">{profile.creator_type || "Vanta creator"}</p>
              <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight">{profile.display_name}<span className="text-primary">.</span></h1>
              <p className="font-mono text-sm text-muted-foreground mt-2">@{profile.username}</p>
              <div className="flex flex-wrap gap-x-5 gap-y-2 mt-5 text-sm text-muted-foreground">{location && <span className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" />{location}</span>}<span className="flex items-center gap-2"><Users className="w-3.5 h-3.5" />Vanta creator</span></div>
              {profile.bio && <p className="max-w-2xl text-muted-foreground leading-relaxed mt-6">{profile.bio}</p>}
            </div>
          </div>
        </section>
        <div className="max-w-6xl mx-auto px-6 lg:px-8 py-8 md:py-12">
          <div className="flex gap-6 border-b border-border mb-8 overflow-x-auto"><Tab active={tab === "overview"} onClick={() => setTab("overview")}>Overview</Tab><Tab active={tab === "work"} onClick={() => setTab("work")}>Work</Tab><Tab active={tab === "listings"} onClick={() => setTab("listings")}>Listings <span className="ml-1 text-muted-foreground/50">({profile.active_marketplace_listings.length})</span></Tab></div>
          {tab === "overview" && <div className="grid lg:grid-cols-[1fr_300px] gap-10"><section><SectionLabel>About the practice</SectionLabel><p className="text-muted-foreground leading-relaxed max-w-2xl">{profile.bio || "This creator has not added a bio yet."}</p><SectionLabel>Disciplines</SectionLabel><div className="flex flex-wrap gap-2">{profile.disciplines.length ? profile.disciplines.map(item => <span key={item} className="text-xs border border-border rounded-md px-3 py-2 text-muted-foreground">{item}</span>) : <p className="text-sm text-muted-foreground">No disciplines listed yet.</p>}</div></section><aside><SectionLabel>Open channels</SectionLabel>{links.length ? <div className="space-y-2">{links.map(link => <a key={link.label} href={link.url!} target="_blank" rel="noreferrer" className="flex items-center justify-between border border-border rounded-lg px-4 py-3 text-sm hover:border-primary/50 transition-colors"><span>{link.label}</span><ExternalLink className="w-3.5 h-3.5 text-muted-foreground" /></a>)}</div> : <p className="text-sm text-muted-foreground">No public links added yet.</p>}</aside></div>}
          {tab === "work" && <PublicWork work={work} loading={workLoading} />}
          {tab === "listings" && <Listings listings={profile.active_marketplace_listings} />}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <button onClick={onClick} className={`pb-3 text-sm whitespace-nowrap border-b-2 transition-colors ${active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{children}</button>; }
function SectionLabel({ children }: { children: React.ReactNode }) { return <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground/55 mb-4 mt-2">{children}</p>; }
function EmptySection({ title, copy }: { title: string; copy: string }) { return <div className="border border-dashed border-border rounded-2xl py-24 px-6 text-center"><p className="font-display text-3xl">{title}</p><p className="text-sm text-muted-foreground mt-3">{copy}</p></div>; }
function PublicWork({ work, loading }: { work: WorkItem[]; loading: boolean }) {
  if (loading) return <p className="py-20 text-center text-sm text-muted-foreground">Opening the archive…</p>;
  if (!work.length) return <EmptySection title="No work in the archive yet." copy="This Creator has not added public work yet." />;
  return <div><div className="mb-7 flex items-center justify-between"><div><SectionLabel>Selected work</SectionLabel><p className="text-sm text-muted-foreground">The pieces this Creator chose to leave behind.</p></div><span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50">{work.length} {work.length === 1 ? "item" : "items"}</span></div><div className="grid gap-5 md:grid-cols-2">{work.map(item => <WorkCard key={item.id} item={item} />)}</div></div>;
}
function Listings({ listings }: { listings: Listing[] }) { if (!listings.length) return <EmptySection title="No active listings." copy="This creator has not put an offer on the Marketplace board yet." />; return <div className="grid md:grid-cols-2 gap-5">{listings.map(listing => <Link key={listing.id} href={`/marketplace/${listing.id}`}><article className="border border-border rounded-xl p-5 bg-card/40 hover:border-primary/50 transition-colors group"><div className="flex justify-between gap-4 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50"><span>{listing.category}</span><ArrowUpRight className="w-3.5 h-3.5 group-hover:text-primary" /></div><h2 className="font-display text-2xl mt-8 group-hover:text-primary transition-colors">{listing.title}</h2><p className="text-sm text-muted-foreground leading-relaxed mt-2 line-clamp-2">{listing.description}</p><div className="mt-7 space-y-2 text-xs text-muted-foreground/75"><p className="flex items-center gap-2 text-foreground"><Radio className="w-3.5 h-3.5" />{priceLabel(listing as any)}</p><p>{deliveryLabel(listing.delivery_mode)}{listing.city ? ` · ${listing.city}` : ""}</p>{listing.room_name && <p className="flex items-center gap-2 text-primary/75"><Users className="w-3.5 h-3.5" />Room · {listing.room_name}</p>}</div></article></Link>)}</div>; }