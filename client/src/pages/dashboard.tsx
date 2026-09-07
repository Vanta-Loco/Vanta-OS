import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ArrowUpRight,
  BadgeCheck,
  BookOpen,
  Box,
  Compass,
  Crown,
  Gamepad2,
  Globe2,
  Image as ImageIcon,
  LockKeyhole,
  MapPin,
  Music2,
  Radio,
  Search,
  ShoppingBag,
  Sparkles,
  Terminal,
  Trophy,
  UserRound,
  Users,
  Waves,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { getUserToken, useUser } from "@/hooks/use-user";
import type { Post } from "@shared/schema";

type PassportData = {
  passport_id: string;
  passport_level: number;
  passport_xp: number;
};

type Room = {
  id: string;
  name: string;
  category: string;
  visibility: "public" | "private";
  member_count: number;
  joined: boolean;
};

type CreatorProfile = {
  username: string;
  display_name: string;
  profile_image_url: string | null;
  creator_type: string;
  is_certified: boolean;
};

type WorkItem = {
  id: string;
  title: string;
  work_type: string;
  thumbnail_url: string | null;
  is_featured: boolean;
  created_at: string;
};

type Listing = {
  id: string;
  title: string;
  category: string;
  creator_username: string;
  creator_display_name?: string | null;
  price_amount?: string | null;
  currency: string;
  price_type: string;
};

type Game = {
  id: string;
  sport: string;
  city: string;
  venue: string;
  date: string;
  time: string;
  players: number;
  capacity: number;
};

type Module = {
  label: string;
  code: string;
  description: string;
  href: string;
  Icon: LucideIcon;
  tone: string;
};

const MODULES: Module[] = [
  {
    label: "Passport",
    code: "IDENTITY",
    description: "Your level, activity, and achievements across Vanta.",
    href: "/passport",
    Icon: UserRound,
    tone: "text-sky-300",
  },
  {
    label: "Rooms",
    code: "COMMUNITY",
    description: "Persistent spaces for the people and ideas moving through Vanta.",
    href: "/rooms",
    Icon: Users,
    tone: "text-violet-300",
  },
  {
    label: "Creator / Work",
    code: "ARCHIVE",
    description: "Your public creative identity and the work that represents it.",
    href: "/creator",
    Icon: Sparkles,
    tone: "text-fuchsia-300",
  },
  {
    label: "Marketplace",
    code: "EXCHANGE",
    description: "Creative services, unfinished ideas, and skilled hands.",
    href: "/marketplace",
    Icon: ShoppingBag,
    tone: "text-amber-300",
  },
  {
    label: "Vanta Play",
    code: "ACTIVITY",
    description: "Find real-world games and build a sporting identity.",
    href: "/play",
    Icon: Trophy,
    tone: "text-emerald-300",
  },
  {
    label: "Transmission",
    code: "EDITORIAL",
    description: "Music, process, culture, and the latest public transmissions.",
    href: "/",
    Icon: Radio,
    tone: "text-rose-300",
  },
  {
    label: "Vault",
    code: "RESTRICTED",
    description: "A private archive for unreleased audio and material.",
    href: "/vault",
    Icon: LockKeyhole,
    tone: "text-lime-300",
  },
  {
    label: "World",
    code: "DISTRICT",
    description: "Enter Vanta City and explore the World Alpha district.",
    href: "/world",
    Icon: Globe2,
    tone: "text-cyan-300",
  },
];

function authHeaders(): Record<string, string> {
  const token = getUserToken();
  return token ? { "X-User-Token": token } : {};
}

async function fetchJson<T>(url: string, authenticated = false): Promise<T> {
  const response = await fetch(url, {
    headers: authenticated ? authHeaders() : undefined,
  });
  if (!response.ok) throw new Error(`Unable to load ${url}`);
  return response.json();
}

function dateLabel(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function listingPrice(listing: Listing): string {
  if (listing.price_type === "contact") return "Contact for price";
  if (listing.price_type === "negotiable") return listing.price_amount
    ? `From ${listing.currency} ${listing.price_amount}`
    : "Negotiable";
  return `${listing.currency} ${listing.price_amount || "—"}`;
}

function SectionLabel({ children, detail }: { children: React.ReactNode; detail?: string }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-muted-foreground/55">
        {children}
      </p>
      {detail && <span className="text-[10px] font-mono text-muted-foreground/35">{detail}</span>}
    </div>
  );
}

function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-border bg-card/35 ${className}`}>
      {children}
    </section>
  );
}

function ModuleCard({ module }: { module: Module }) {
  const Icon = module.Icon;
  return (
    <Link href={module.href}>
      <article className="group flex h-full min-h-[150px] cursor-pointer flex-col justify-between rounded-xl border border-border bg-card/25 p-4 transition-colors hover:border-primary/45 hover:bg-card/65">
        <div className="flex items-start justify-between gap-3">
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-muted/60 ${module.tone}`}>
            <Icon className="h-4 w-4" />
          </div>
          <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/30 transition-colors group-hover:text-primary" />
        </div>
        <div className="mt-5">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-base font-semibold">{module.label}</h3>
            <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/35">{module.code}</span>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground/70">{module.description}</p>
        </div>
      </article>
    </Link>
  );
}

function RoomTile({ room }: { room: Room }) {
  const treatment = room.category === "Music"
    ? "from-violet-500/25 via-background to-background"
    : room.category === "Visual"
      ? "from-cyan-500/25 via-background to-background"
      : room.category === "Fashion"
        ? "from-rose-500/25 via-background to-background"
        : "from-amber-500/25 via-background to-background";
  return (
    <Link href={`/rooms/${room.id}`}>
      <article className={`group relative min-h-[145px] overflow-hidden rounded-lg border border-border bg-gradient-to-br ${treatment} p-4 transition-colors hover:border-primary/50`}>
        <Waves className="absolute -bottom-4 -right-3 h-24 w-24 text-foreground/[0.035]" />
        <div className="relative flex h-full flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-muted-foreground/60">{room.category}</span>
            <span className="text-[9px] font-mono uppercase tracking-widest text-primary">Joined</span>
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold group-hover:text-primary">{room.name}</h3>
            <p className="mt-1 text-[11px] text-muted-foreground/60">{room.member_count} members · Enter Room →</p>
          </div>
        </div>
      </article>
    </Link>
  );
}

function EmptyState({
  children,
  href,
  action,
}: {
  children: React.ReactNode;
  href?: string;
  action?: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border/80 px-5 py-8 text-center">
      <p className="text-sm text-muted-foreground">{children}</p>
      {href && action && (
        <Link href={href}>
          <Button variant="outline" size="sm" className="mt-4">{action}</Button>
        </Link>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { user, isAuthenticated, isLoading: authLoading } = useUser();

  const { data: passport, isLoading: passportLoading } = useQuery<PassportData>({
    queryKey: ["/api/passport"],
    queryFn: () => fetchJson<PassportData>("/api/passport", true),
    enabled: isAuthenticated,
    retry: false,
  });
  const { data: roomsData } = useQuery<{ rooms: Room[] }>({
    queryKey: ["/api/rooms", "dashboard"],
    queryFn: () => fetchJson<{ rooms: Room[] }>("/api/rooms", true),
    enabled: isAuthenticated,
  });
  const { data: creatorData } = useQuery<CreatorProfile | { profile: null }>({
    queryKey: ["/api/creator/me"],
    queryFn: () => fetchJson<CreatorProfile | { profile: null }>("/api/creator/me", true),
    enabled: isAuthenticated,
    retry: false,
  });
  const { data: work = [] } = useQuery<WorkItem[]>({
    queryKey: ["/api/creator/work", "dashboard"],
    queryFn: () => fetchJson<WorkItem[]>("/api/creator/work", true),
    enabled: isAuthenticated && !!creatorData && (!("profile" in creatorData) || !!creatorData.profile),
    retry: false,
  });
  const { data: marketplaceData } = useQuery<{ listings: Listing[] }>({
    queryKey: ["/api/marketplace", "dashboard"],
    queryFn: () => fetchJson<{ listings: Listing[] }>("/api/marketplace"),
    enabled: isAuthenticated,
  });
  const { data: posts = [] } = useQuery<Post[]>({
    queryKey: ["/api/posts", "dashboard"],
    queryFn: () => fetchJson<Post[]>("/api/posts"),
    enabled: isAuthenticated,
  });
  const { data: games = [] } = useQuery<Game[]>({
    queryKey: ["/api/play/games", "dashboard"],
    queryFn: () => fetchJson<Game[]>("/api/play/games", true),
    enabled: isAuthenticated,
  });

  const joinedRooms = useMemo(
    () => (roomsData?.rooms || []).filter(room => room.joined).slice(0, 4),
    [roomsData?.rooms],
  );
  const creatorProfile = creatorData && "profile" in creatorData
    ? creatorData.profile
    : creatorData || null;
  const workPreview = work.slice(0, 3);
  const listings = (marketplaceData?.listings || []).slice(0, 4);
  const transmissions = posts.filter(post => post.published !== "false").slice(0, 3);
  const playPreview = games.slice(0, 3);

  const nextMove = useMemo(() => {
    if (!passport) {
      return {
        title: "Set up your Passport",
        description: "Activate the identity layer that carries your progress across Vanta.",
        href: "/passport",
        Icon: UserRound,
        secondary: { label: "Explore Rooms", href: "/rooms" },
      };
    }
    if (joinedRooms.length === 0) {
      return {
        title: "Enter your first Room",
        description: "Find a persistent space for the people and ideas moving through Vanta.",
        href: "/rooms",
        Icon: Users,
        secondary: { label: "Open Passport", href: "/passport" },
      };
    }
    if (!creatorProfile) {
      return {
        title: "Activate Creator Profile",
        description: "Connect your Member identity to your work, Rooms, and Marketplace presence.",
        href: "/creator",
        Icon: Sparkles,
        secondary: { label: "View your Rooms", href: "/rooms" },
      };
    }
    if (workPreview.length === 0) {
      return {
        title: "Add your first Work",
        description: "Start the archive with the piece that says what you make.",
        href: "/creator",
        Icon: ImageIcon,
        secondary: { label: "View Creator Profile", href: "/creator" },
      };
    }
    return {
      title: "Explore Marketplace",
      description: "See what other creators are offering and where your work could connect.",
      href: "/marketplace",
      Icon: ShoppingBag,
      secondary: { label: "Enter World Alpha", href: "/world" },
    };
  }, [creatorProfile, joinedRooms.length, passport, workPreview.length]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background pt-32 text-center text-sm text-muted-foreground">
        Initializing Member interface…
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-4xl items-center px-5 py-24">
          <div className="w-full rounded-2xl border border-border bg-card/35 p-7 md:p-12">
            <p className="text-[10px] font-mono uppercase tracking-[0.32em] text-primary/70">VANTA OS · MEMBER ACCESS</p>
            <div className="mt-7 flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/40 text-primary">
                <Terminal className="h-5 w-5" />
              </div>
              <div>
                <h1 className="font-display text-3xl font-bold tracking-tight md:text-5xl">The system is waiting.</h1>
                <p className="mt-4 max-w-xl leading-relaxed text-muted-foreground">
                  Sign in to open your connected Vanta Dashboard, or become a Member to establish your identity.
                </p>
              </div>
            </div>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/login"><Button>Sign In</Button></Link>
              <Link href="/register"><Button variant="outline">Become a Member</Button></Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const IdentityIcon = nextMove.Icon;

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <Header />
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-24 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.32em] text-primary/75">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_9px_hsl(var(--primary))]" />
              VANTA OS · CONNECTED DASHBOARD
            </p>
            <h1 className="mt-4 font-display text-4xl font-bold tracking-tight md:text-6xl">
              Good to see you, {user.display_name || user.username}<span className="text-primary">.</span>
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">Your creative operating system, in one place.</p>
          </div>
          <Link href={`/profile/${user.username}`} className="group">
            <div className="flex items-center gap-3 rounded-lg border border-border bg-card/35 px-3 py-2 transition-colors group-hover:border-primary/40">
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
                {user.avatar_url ? <img src={user.avatar_url} alt="" className="h-full w-full object-cover" /> : <UserRound className="h-4 w-4 text-muted-foreground" />}
              </div>
              <div>
                <p className="text-xs font-mono text-foreground">@{user.username}</p>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/55">Member profile</p>
              </div>
            </div>
          </Link>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
          <Panel className="relative overflow-hidden p-5 md:p-7">
            <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-primary/[0.07] blur-3xl" />
            <div className="relative">
              <SectionLabel detail="IDENTITY STATUS">Member Identity</SectionLabel>
              <div className="grid gap-7 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-primary/30 bg-primary/[0.06] shadow-[0_0_32px_rgba(150,100,220,.08)]">
                  {user.avatar_url ? <img src={user.avatar_url} alt="" className="h-full w-full rounded-2xl object-cover" /> : <UserRound className="h-8 w-8 text-primary/70" />}
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground/55">@{user.username}</p>
                  <h2 className="mt-2 font-display text-2xl font-semibold">{creatorProfile?.display_name || user.display_name || user.username}</h2>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full border border-border px-2.5 py-1">Member</span>
                    {creatorProfile?.creator_type && <span className="rounded-full border border-border px-2.5 py-1">{creatorProfile.creator_type}</span>}
                    {creatorProfile?.is_certified && <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-primary"><BadgeCheck className="h-3 w-3" /> Certified Creator</span>}
                  </div>
                </div>
                <div className="min-w-[150px] rounded-lg border border-border/80 bg-background/35 p-4">
                  <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-muted-foreground/55">Passport level</p>
                  <p className="mt-2 font-display text-4xl font-semibold">{passportLoading ? "--" : String(passport?.passport_level || 1).padStart(2, "0")}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{passport ? `${passport.passport_xp} XP recorded` : "Not activated"}</p>
                </div>
              </div>
            </div>
          </Panel>

          <Panel className="border-primary/35 bg-primary/[0.045] p-5 md:p-7">
            <SectionLabel detail="RULE-BASED">Next Move</SectionLabel>
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/35 bg-primary/10 text-primary">
                <IdentityIcon className="h-4 w-4" />
              </div>
              <div>
                <h2 className="font-display text-xl font-semibold">{nextMove.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{nextMove.description}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Link href={nextMove.href}><Button size="sm">{nextMove.title} <ArrowUpRight className="ml-1 h-3.5 w-3.5" /></Button></Link>
                  <Link href={nextMove.secondary.href}><Button size="sm" variant="ghost">{nextMove.secondary.label}</Button></Link>
                </div>
              </div>
            </div>
          </Panel>
        </div>

        <section className="mt-10">
          <SectionLabel detail="8 MODULES">Vanta Ecosystem</SectionLabel>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {MODULES.map(module => <ModuleCard key={module.label} module={module} />)}
          </div>
        </section>

        <div className="mt-10 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <Panel className="p-5 md:p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <SectionLabel detail={joinedRooms.length ? `${joinedRooms.length} SHOWN` : "NO MEMBERSHIPS"}>Your Rooms</SectionLabel>
                <h2 className="font-display text-2xl font-semibold">Places you belong.</h2>
              </div>
              <Link href="/rooms" className="hidden text-xs text-muted-foreground hover:text-primary sm:inline-flex sm:items-center sm:gap-1">All Rooms <ArrowUpRight className="h-3 w-3" /></Link>
            </div>
            <div className="mt-5">
              {joinedRooms.length ? (
                <div className="grid gap-3 sm:grid-cols-2">{joinedRooms.map(room => <RoomTile key={room.id} room={room} />)}</div>
              ) : (
                <EmptyState href="/rooms" action="Enter your first Room">You haven't entered any Rooms yet.</EmptyState>
              )}
            </div>
          </Panel>

          <Panel className="p-5 md:p-6">
            <SectionLabel detail={creatorProfile ? "CREATOR PROFILE ACTIVE" : "PROFILE NOT ACTIVE"}>Your Work</SectionLabel>
            {creatorProfile ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
                    {creatorProfile.profile_image_url ? <img src={creatorProfile.profile_image_url} alt="" className="h-full w-full object-cover" /> : <Sparkles className="h-4 w-4 text-primary/70" />}
                  </div>
                  <div>
                    <h2 className="font-display text-2xl font-semibold">{creatorProfile.display_name || "Your archive"}</h2>
                    <p className="text-xs font-mono text-muted-foreground/60">@{creatorProfile.username}</p>
                  </div>
                </div>
                <div className="mt-5">
                  {workPreview.length ? (
                    <div className="space-y-2">
                      {workPreview.map(item => (
                        <Link key={item.id} href="/creator">
                          <div className="group flex items-center gap-3 rounded-lg border border-border/80 bg-background/25 p-3 hover:border-primary/40">
                            <div className="flex h-11 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                              {item.thumbnail_url ? <img src={item.thumbnail_url} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="h-4 w-4 text-muted-foreground/45" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium group-hover:text-primary">{item.title}</p>
                              <p className="mt-1 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/55">{item.work_type}{item.is_featured ? " · Featured" : ""}</p>
                            </div>
                            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/35" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <EmptyState href="/creator" action="Add Work">Your archive is empty.</EmptyState>
                  )}
                </div>
              </>
            ) : (
              <EmptyState href="/creator" action="Activate Creator Profile">Your creative identity is not active yet.</EmptyState>
            )}
          </Panel>
        </div>

        <div className="mt-10 grid gap-4 xl:grid-cols-3">
          <Panel className="p-5 md:p-6">
            <SectionLabel detail={`${listings.length} SHOWN`}>Marketplace Preview</SectionLabel>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-2xl font-semibold">The board.</h2>
              <Link href="/marketplace"><Button variant="ghost" size="sm">Open <ArrowUpRight className="ml-1 h-3 w-3" /></Button></Link>
            </div>
            <div className="mt-4 space-y-2">
              {listings.length ? listings.map(listing => (
                <Link key={listing.id} href={`/marketplace/${listing.id}`}>
                  <div className="rounded-lg border border-border/80 p-3 transition-colors hover:border-primary/40">
                    <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/55">{listing.category}</p>
                    <p className="mt-1 truncate text-sm font-medium">{listing.title}</p>
                    <p className="mt-2 text-[11px] text-muted-foreground">@{listing.creator_username} · {listingPrice(listing)}</p>
                  </div>
                </Link>
              )) : <EmptyState href="/marketplace" action="Open Marketplace">No active listings yet.</EmptyState>}
            </div>
          </Panel>

          <Panel className="p-5 md:p-6">
            <SectionLabel detail={`${transmissions.length} RECENT`}>Transmission Preview</SectionLabel>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-2xl font-semibold">Signal received.</h2>
              <Link href="/"><Button variant="ghost" size="sm">Open <ArrowUpRight className="ml-1 h-3 w-3" /></Button></Link>
            </div>
            <div className="mt-4 space-y-3">
              {transmissions.length ? transmissions.map(post => (
                <Link key={post.id} href={`/post/${post.id}`}>
                  <div className="group flex gap-3 border-b border-border/70 pb-3 last:border-0 last:pb-0">
                    <img src={post.coverImage} alt="" className="h-12 w-16 shrink-0 rounded-md object-cover" />
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-sm font-medium group-hover:text-primary">{post.title}</p>
                      <p className="mt-1 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/55">{post.category} · {dateLabel(post.createdAt)}</p>
                    </div>
                  </div>
                </Link>
              )) : <EmptyState href="/" action="Open Transmission">No public transmissions yet.</EmptyState>}
            </div>
          </Panel>

          <Panel className="p-5 md:p-6">
            <SectionLabel detail={`${playPreview.length} OPEN`}>Vanta Play Preview</SectionLabel>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-2xl font-semibold">Find a Game.</h2>
              <Link href="/play"><Button variant="ghost" size="sm">Open <ArrowUpRight className="ml-1 h-3 w-3" /></Button></Link>
            </div>
            <div className="mt-4 space-y-2">
              {playPreview.length ? playPreview.map(game => (
                <Link key={game.id} href="/play">
                  <div className="rounded-lg border border-border/80 p-3 hover:border-primary/40">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium">{game.venue}</p>
                      <Gamepad2 className="h-3.5 w-3.5 text-emerald-300/70" />
                    </div>
                    <p className="mt-1 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/55">{game.sport} · {game.city}</p>
                    <p className="mt-2 text-[11px] text-muted-foreground">{dateLabel(game.date)} · {game.time} · {game.players}/{game.capacity} players</p>
                  </div>
                </Link>
              )) : <EmptyState href="/play" action="Find a Game">No open games are scheduled yet.</EmptyState>}
            </div>
          </Panel>
        </div>

        <Link href="/world">
          <section className="group relative mt-10 overflow-hidden rounded-xl border border-border bg-[radial-gradient(circle_at_82%_35%,rgba(70,160,180,.2),transparent_30%),linear-gradient(110deg,hsl(var(--card)),hsl(var(--background)))] p-6 transition-colors hover:border-primary/45 md:p-8">
            <div className="absolute right-8 top-1/2 hidden -translate-y-1/2 opacity-25 transition-opacity group-hover:opacity-45 sm:block">
              <Compass className="h-32 w-32 text-cyan-300" strokeWidth={0.7} />
            </div>
            <div className="relative max-w-xl">
              <SectionLabel detail="WORLD ALPHA">Vanta World</SectionLabel>
              <h2 className="font-display text-3xl font-semibold">Enter the city.</h2>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">A living district for exploration, identity, and the next layer of Vanta.</p>
              <div className="mt-5 inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-primary">Open World Alpha <ArrowUpRight className="h-3.5 w-3.5" /></div>
            </div>
          </section>
        </Link>
      </main>
    </div>
  );
}