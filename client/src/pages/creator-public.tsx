import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useRoute } from "wouter";
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  BriefcaseBusiness,
  ExternalLink,
  MapPin,
  Radio,
  Sparkles,
  Store,
  Users,
} from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { deliveryLabel, priceLabel } from "./marketplace";
import { WorkCard, type WorkItem } from "@/components/creator-work";
import { FollowButton } from "@/components/social/FollowButton";
import { getUserToken } from "@/hooks/use-user";

type Listing = {
  id: string;
  title: string;
  description: string;
  category: string;
  price_amount?: string | null;
  currency: string;
  price_type: string;
  delivery_mode: string;
  city?: string | null;
  room_id?: string | null;
  room_name?: string | null;
  room_slug?: string | null;
};

type Profile = {
  username: string;
  display_name: string;
  bio: string;
  city?: string | null;
  country?: string | null;
  profile_image_url?: string | null;
  creator_type: string;
  disciplines: string[];
  instagram_url?: string | null;
  website_url?: string | null;
  spotify_url?: string | null;
  soundcloud_url?: string | null;
  is_certified: boolean;
  created_at: string;
  active_marketplace_listings: Listing[];
};

type TabKey = "overview" | "work" | "listings";
type RoomAssociation = { id: string; name: string; slug?: string | null };

export default function CreatorPublic() {
  const [, params] = useRoute("/creators/:username");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [tab, setTab] = useState<TabKey>("overview");
  const [work, setWork] = useState<WorkItem[]>([]);
  const [workLoading, setWorkLoading] = useState(true);
  const { data: socialState } = useQuery<{ follower_count: number; following_count: number; is_following: boolean }>({
    queryKey: ["/api/social/follow-state", profile?.username],
    enabled: Boolean(profile?.username),
    queryFn: async () => {
      const token = getUserToken();
      const response = await fetch(`/api/social/follow-state/${encodeURIComponent(profile?.username || "")}`, {
        headers: token ? { "X-User-Token": token } : {},
      });
      if (!response.ok) throw new Error("Could not load creator connections");
      return response.json();
    },
  });

  useEffect(() => {
    if (!params?.username) return;
    let active = true;
    setLoading(true);
    setMissing(false);
    setTab("overview");

    fetch(`/api/creators/${encodeURIComponent(params.username)}`)
      .then(response => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then(data => {
        if (active) setProfile(data);
      })
      .catch(() => {
        if (active) setMissing(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    setWorkLoading(true);
    fetch(`/api/creators/${encodeURIComponent(params.username)}/work`)
      .then(response => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then(data => {
        if (active) setWork(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (active) setWork([]);
      })
      .finally(() => {
        if (active) setWorkLoading(false);
      });

    return () => {
      active = false;
    };
  }, [params?.username]);

  const rooms = useMemo(() => {
    const map = new Map<string, RoomAssociation>();
    for (const item of work) {
      if (item.room_id && item.room_name) {
        map.set(item.room_id, { id: item.room_id, name: item.room_name, slug: item.room_slug });
      }
    }
    for (const listing of profile?.active_marketplace_listings || []) {
      if (listing.room_id && listing.room_name) {
        map.set(listing.room_id, { id: listing.room_id, name: listing.room_name, slug: listing.room_slug });
      }
    }
    return Array.from(map.values());
  }, [profile?.active_marketplace_listings, work]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background px-6 pt-32 text-center text-sm text-muted-foreground">
        Locating Creator Profile…
      </div>
    );
  }

  if (missing || !profile) {
    return (
      <div className="min-h-screen bg-background px-6 pt-32 text-center">
        <p className="font-display text-3xl">Creator not found<span className="text-primary">.</span></p>
        <p className="mt-3 text-sm text-muted-foreground">This identity has not activated a public profile yet.</p>
        <Link href="/creators"><Button variant="outline" className="mt-7">Return to Creator Index</Button></Link>
      </div>
    );
  }

  const location = [profile.city, profile.country].filter(Boolean).join(", ");
  const links = [
    { label: "Instagram", url: profile.instagram_url },
    { label: "Website", url: profile.website_url },
    { label: "Spotify", url: profile.spotify_url },
    { label: "SoundCloud", url: profile.soundcloud_url },
  ].filter(item => item.url);
  const featuredWork = work.find(item => item.is_featured) || work[0];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pt-20">
        <section className={`relative overflow-hidden border-b ${profile.is_certified ? "border-primary/35" : "border-border"}`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_12%,rgba(117,77,160,.32),transparent_34%),linear-gradient(120deg,hsl(var(--muted)),transparent_68%),repeating-linear-gradient(135deg,transparent_0_22px,rgba(255,255,255,.035)_22px_23px)]" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />
          <div className="relative mx-auto max-w-7xl px-6 pb-8 pt-8 lg:px-8 md:pb-10 md:pt-10">
            <Link href="/creators" className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground/60 transition-colors hover:text-primary">
              <ArrowLeft className="h-3.5 w-3.5" /> Creator Index
            </Link>
            <div className="mt-12 grid items-end gap-8 lg:grid-cols-[auto_1fr_auto]">
              <div className={`flex h-28 w-28 items-center justify-center overflow-hidden border-8 border-background bg-muted shadow-2xl md:h-40 md:w-40 ${profile.is_certified ? "ring-1 ring-primary/60" : ""}`}>
                {profile.profile_image_url
                  ? <img src={profile.profile_image_url} alt="" className="h-full w-full object-cover" />
                  : <Sparkles className="h-10 w-10 text-primary/45" />}
              </div>
              <div className="min-w-0">
                <p className="mb-3 text-[10px] font-mono uppercase tracking-[0.3em] text-primary/75">
                  {profile.creator_type || "Vanta Creator"} <span className="text-muted-foreground/35">//</span> Creator Profile
                </p>
                <h1 className="break-words font-display text-4xl font-bold tracking-tight md:text-6xl">
                  {profile.display_name}<span className="text-primary">.</span>
                </h1>
                <p className="mt-2 font-mono text-sm text-muted-foreground/70">@{profile.username}</p>
                {location && <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5 text-primary/70" />{location}</p>}
              </div>
              {profile.is_certified && (
                <div className="flex items-center gap-3 border border-primary/45 bg-background/65 px-4 py-3 text-primary backdrop-blur-sm">
                  <BadgeCheck className="h-5 w-5" />
                  <div>
                    <p className="text-[9px] font-mono uppercase tracking-[0.22em] text-primary/70">Vanta status</p>
                    <p className="mt-1 text-[11px] font-mono uppercase tracking-[0.18em]">Certified Creator</p>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-8 flex flex-wrap gap-2">
              {(profile.disciplines || []).map(item => (
                <span key={item} className="border border-border/80 bg-background/30 px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/80">
                  {item}
                </span>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <span className="text-xs text-muted-foreground"><strong className="text-foreground">{socialState?.follower_count ?? 0}</strong> followers</span>
              <span className="text-xs text-muted-foreground"><strong className="text-foreground">{socialState?.following_count ?? 0}</strong> following</span>
              <FollowButton username={profile.username} initialFollowing={socialState?.is_following ?? false} />
            </div>
            {profile.bio && <p className="mt-7 max-w-3xl text-base leading-relaxed text-muted-foreground md:text-lg">{profile.bio}</p>}
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid border-x border-b border-border bg-card/20 sm:grid-cols-3">
            <StatusMetric icon={<BriefcaseBusiness className="h-4 w-4" />} label="Work" value={workLoading ? "—" : String(work.length)} />
            <StatusMetric icon={<Store className="h-4 w-4" />} label="Active listings" value={String(profile.active_marketplace_listings.length)} />
            <StatusMetric icon={<Users className="h-4 w-4" />} label="Public spaces" value={workLoading ? "—" : String(rooms.length)} />
          </div>

          <div className="py-8 md:py-12">
            <div className="mb-10 flex items-center gap-6 overflow-x-auto border-b border-border" role="tablist" aria-label="Creator profile sections">
              <Tab active={tab === "overview"} onClick={() => setTab("overview")}>Overview</Tab>
              <Tab active={tab === "work"} onClick={() => setTab("work")}>Work <Count>{workLoading ? "—" : work.length}</Count></Tab>
              <Tab active={tab === "listings"} onClick={() => setTab("listings")}>Listings <Count>{profile.active_marketplace_listings.length}</Count></Tab>
            </div>

            {tab === "overview" && (
              <Overview
                profile={profile}
                featuredWork={featuredWork}
                workLoading={workLoading}
                rooms={rooms}
                links={links}
                onOpenWork={() => setTab("work")}
                onOpenListings={() => setTab("listings")}
              />
            )}
            {tab === "work" && <PublicWork work={work} loading={workLoading} />}
            {tab === "listings" && <Listings listings={profile.active_marketplace_listings} />}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function StatusMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-border p-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0 md:px-6">
      <span className="text-primary/70">{icon}</span>
      <div>
        <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-muted-foreground/50">{label}</p>
        <p className="mt-1 font-display text-xl font-semibold">{value}</p>
      </div>
    </div>
  );
}

function Overview({
  profile,
  featuredWork,
  workLoading,
  rooms,
  links,
  onOpenWork,
  onOpenListings,
}: {
  profile: Profile;
  featuredWork?: WorkItem;
  workLoading: boolean;
  rooms: RoomAssociation[];
  links: { label: string; url?: string | null }[];
  onOpenWork: () => void;
  onOpenListings: () => void;
}) {
  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="space-y-10">
        <div>
          <SectionLabel>About the practice</SectionLabel>
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">{profile.bio || "This Creator has not added a bio yet."}</p>
        </div>
        <div>
          <SectionLabel>Disciplines</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {profile.disciplines.length
              ? profile.disciplines.map(item => <span key={item} className="border border-border px-3 py-2 text-xs text-muted-foreground">{item}</span>)
              : <p className="text-sm text-muted-foreground">No disciplines listed yet.</p>}
          </div>
        </div>
        <div>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div><SectionLabel>Featured from the archive</SectionLabel><p className="text-sm text-muted-foreground">A first look at what this Creator makes.</p></div>
            {featuredWork && <button type="button" onClick={onOpenWork} className="shrink-0 text-[10px] font-mono uppercase tracking-widest text-primary/75 hover:text-primary">View all Work</button>}
          </div>
          {workLoading ? <div className="h-28 animate-pulse border border-border bg-card/30" /> : featuredWork ? <FeaturedWorkPreview item={featuredWork} /> : <EmptyInline copy="No public Work in the archive yet." />}
        </div>
      </section>
      <aside className="space-y-9">
        <div>
          <SectionLabel>Spaces</SectionLabel>
          {rooms.length ? <div className="space-y-2">{rooms.map(room => <Link key={room.id} href={`/rooms/${room.id}`} className="flex items-center justify-between border border-border bg-card/25 px-4 py-3 text-xs transition-colors hover:border-primary/50 hover:text-primary"><span className="flex min-w-0 items-center gap-2"><Users className="h-3.5 w-3.5 shrink-0 text-primary/65" /><span className="truncate">{room.name}</span></span><ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/45" /></Link>)}</div> : <EmptyInline copy="No public Room associations yet." />}
        </div>
        <div>
          <SectionLabel>Marketplace presence</SectionLabel>
          {profile.active_marketplace_listings.length ? <button type="button" onClick={onOpenListings} className="flex w-full items-center justify-between border border-emerald-300/25 bg-emerald-300/[0.04] px-4 py-3 text-left text-xs text-emerald-200/80 transition-colors hover:border-emerald-300/50"><span className="flex items-center gap-2"><Store className="h-3.5 w-3.5" />{profile.active_marketplace_listings.length} active listing{profile.active_marketplace_listings.length === 1 ? "" : "s"}</span><ArrowUpRight className="h-3.5 w-3.5" /></button> : <EmptyInline copy="No active Marketplace listings." />}
        </div>
        <div>
          <SectionLabel>Open channels</SectionLabel>
          {links.length ? <div className="space-y-2">{links.map(link => <a key={link.label} href={link.url!} target="_blank" rel="noreferrer" className="flex items-center justify-between border border-border px-4 py-3 text-sm transition-colors hover:border-primary/50"><span>{link.label}</span><ExternalLink className="h-3.5 w-3.5 text-muted-foreground" /></a>)}</div> : <p className="text-sm text-muted-foreground">No public links added yet.</p>}
        </div>
      </aside>
    </div>
  );
}

function FeaturedWorkPreview({ item }: { item: WorkItem }) {
  return (
    <article className="group overflow-hidden border border-primary/35 bg-card/35">
      <div className={`flex min-h-28 items-center gap-5 ${item.thumbnail_url ? "" : "bg-[radial-gradient(circle_at_70%_25%,rgba(140,92,190,.32),transparent_38%),linear-gradient(135deg,hsl(var(--muted)),hsl(var(--background)))]"}`}>
        <div className="flex h-28 w-36 shrink-0 items-center justify-center overflow-hidden border-r border-border/60">
          {item.thumbnail_url ? <img src={item.thumbnail_url} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /> : <Radio className="h-8 w-8 text-primary/45" />}
        </div>
        <div className="min-w-0 py-4 pr-5">
          <p className="text-[9px] font-mono uppercase tracking-widest text-primary/70">{item.is_featured ? "Featured Work" : "Archive Entry"} · {item.work_type}</p>
          <h3 className="mt-2 truncate font-display text-xl font-semibold">{item.title}</h3>
          {item.description && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{item.description}</p>}
          {item.external_url && <a href={item.external_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-foreground hover:text-primary">View Work <ExternalLink className="h-3 w-3" /></a>}
        </div>
      </div>
    </article>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button role="tab" aria-selected={active} type="button" onClick={onClick} className={`shrink-0 pb-3 text-sm whitespace-nowrap border-b-2 transition-colors ${active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{children}</button>;
}

function Count({ children }: { children: React.ReactNode }) {
  return <span className="ml-1 text-muted-foreground/50">({children})</span>;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 mt-2 text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground/55">{children}</p>;
}

function EmptyInline({ copy }: { copy: string }) {
  return <div className="border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">{copy}</div>;
}

function EmptySection({ title, copy }: { title: string; copy: string }) {
  return <div className="border border-dashed border-border px-6 py-24 text-center"><p className="font-display text-3xl">{title}</p><p className="mt-3 text-sm text-muted-foreground">{copy}</p></div>;
}

function PublicWork({ work, loading }: { work: WorkItem[]; loading: boolean }) {
  if (loading) return <p className="py-20 text-center text-sm text-muted-foreground">Opening the archive…</p>;
  if (!work.length) return <EmptySection title="No work in the archive yet." copy="This Creator has not added public Work yet." />;
  return (
    <div>
      <div className="mb-7 flex items-end justify-between gap-4">
        <div><SectionLabel>Selected Work</SectionLabel><p className="text-sm text-muted-foreground">The pieces this Creator chose to leave behind.</p></div>
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50">{work.length} {work.length === 1 ? "item" : "items"}</span>
      </div>
      <div className="grid gap-5 md:grid-cols-2">{work.map(item => <WorkCard key={item.id} item={item} />)}</div>
    </div>
  );
}

function Listings({ listings }: { listings: Listing[] }) {
  if (!listings.length) return <EmptySection title="No active listings." copy="This Creator has not put an offer on the Marketplace board yet." />;
  return (
    <div>
      <div className="mb-7"><SectionLabel>Available through Vanta</SectionLabel><p className="text-sm text-muted-foreground">Active Marketplace listings connected to this Creator identity.</p></div>
      <div className="grid gap-5 md:grid-cols-2">
        {listings.map(listing => (
          <Link key={listing.id} href={`/marketplace/${listing.id}`}>
            <article className="group h-full border border-border bg-card/35 p-5 transition-colors hover:border-primary/50">
              <div className="flex justify-between gap-4 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50"><span>{listing.category}</span><ArrowUpRight className="h-3.5 w-3.5 group-hover:text-primary" /></div>
              <h2 className="mt-8 font-display text-2xl group-hover:text-primary">{listing.title}</h2>
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{listing.description}</p>
              <div className="mt-7 space-y-2 text-xs text-muted-foreground/75">
                <p className="flex items-center gap-2 text-foreground"><Radio className="h-3.5 w-3.5" />{priceLabel(listing as any)}</p>
                <p>{deliveryLabel(listing.delivery_mode)}{listing.city ? ` · ${listing.city}` : ""}</p>
                {listing.room_name && <Link href={`/rooms/${listing.room_id}`} className="flex items-center gap-2 text-primary/75 hover:text-primary"><Users className="h-3.5 w-3.5" />Room · {listing.room_name}</Link>}
              </div>
              <div className="mt-7 inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-foreground">View Listing <ArrowUpRight className="h-3.5 w-3.5" /></div>
            </article>
          </Link>
        ))}
      </div>
    </div>
  );
}