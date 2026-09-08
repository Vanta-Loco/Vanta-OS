import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useSearch } from "wouter";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Database,
  Disc3,
  Gamepad2,
  Image as ImageIcon,
  MapPin,
  Radio,
  Search,
  ShoppingBag,
  Sparkles,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ReturnToCity } from "@/components/return-to-city";
import { Button } from "@/components/ui/button";

type CreatorResult = {
  username: string;
  display_name: string;
  disciplines: string[];
  bio: string | null;
  city: string | null;
  country: string | null;
  profile_image_url: string | null;
  is_certified: boolean;
};

type WorkResult = {
  id: string;
  title: string;
  description: string | null;
  work_type: string;
  thumbnail_url: string | null;
  is_featured: boolean;
  created_at: string;
  creator_username: string;
  creator_display_name: string;
  creator_is_certified: boolean;
  room_name: string | null;
};

type RoomResult = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  member_count: number;
  created_at: string;
};

type MarketplaceResult = {
  id: string;
  title: string;
  description: string;
  category: string;
  price_amount: string | null;
  currency: string;
  price_type: string;
  city: string | null;
  delivery_mode: string;
  creator_username: string;
  creator_display_name: string;
};

type TransmissionResult = {
  id: string;
  title: string;
  excerpt: string;
  cover_image: string;
  category: string;
  created_at: string;
  read_time: string;
};

type ReleaseResult = {
  id: string;
  title: string;
  type: string;
  cover_image: string;
  description: string;
  release_date: string;
  genre: string;
  subgenre: string;
  mood_tags: string[];
};

type PlayResult = {
  id: string;
  sport: string;
  city: string;
  venue: string;
  date: string;
  time: string;
  skill: string;
  capacity: number;
  players: number;
};

type SearchResponse = {
  query: string;
  creators: CreatorResult[];
  work: WorkResult[];
  rooms: RoomResult[];
  marketplace: MarketplaceResult[];
  transmission: TransmissionResult[];
  releases: ReleaseResult[];
  play: PlayResult[];
};

type FilterKey = "all" | "creators" | "work" | "rooms" | "marketplace" | "transmission" | "releases" | "play";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "creators", label: "Creators" },
  { key: "work", label: "Work" },
  { key: "rooms", label: "Rooms" },
  { key: "marketplace", label: "Marketplace" },
  { key: "transmission", label: "Transmission" },
  { key: "releases", label: "Releases" },
  { key: "play", label: "Play" },
];

const EXPLORE = [
  { label: "Creators", detail: "People, disciplines, and public creative identities.", Icon: Sparkles },
  { label: "Work", detail: "The public archive of what Members make.", Icon: ImageIcon },
  { label: "Rooms", detail: "Persistent spaces and communities inside Vanta.", Icon: Users },
  { label: "Marketplace", detail: "Services, collaborators, and creative exchange.", Icon: ShoppingBag },
  { label: "Transmission", detail: "Public content, music, and editorial signals.", Icon: Radio },
];

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatPrice(result: MarketplaceResult): string {
  if (result.price_type === "contact") return "Contact for price";
  if (result.price_type === "negotiable") return result.price_amount
    ? `From ${result.currency} ${result.price_amount}`
    : "Negotiable";
  return `${result.currency} ${result.price_amount || "—"}`;
}

function ResultShell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-border/70 bg-card/25" data-testid={`results-group-${label.toLowerCase()}`}>
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-purple-300/80">{label}</h2>
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40">Index record</span>
      </div>
      <div className="divide-y divide-border/50">{children}</div>
    </section>
  );
}

function ResultLink({
  href,
  children,
  testId,
}: {
  href: string;
  children: React.ReactNode;
  testId: string;
}) {
  return (
    <Link href={href} data-testid={testId}>
      <div className="group flex min-w-0 items-start gap-3 px-4 py-4 transition-colors hover:bg-purple-500/[0.045] sm:gap-4">
        {children}
        <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground/25 transition-colors group-hover:text-purple-300/80" />
      </div>
    </Link>
  );
}

function CreatorGroup({ results }: { results: CreatorResult[] }) {
  return (
    <ResultShell label="Creators">
      {results.map(result => (
        <ResultLink key={result.username} href={`/creators/${result.username}`} testId={`result-creator-${result.username}`}>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted/50">
            {result.profile_image_url ? <img src={result.profile_image_url} alt="" className="h-full w-full object-cover" /> : <Sparkles className="h-4 w-4 text-purple-300/60" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-display text-base font-semibold">{result.display_name}</h3>
              {result.is_certified && <span className="inline-flex items-center gap-1 rounded-full border border-purple-400/30 bg-purple-400/10 px-2 py-0.5 text-[9px] font-mono uppercase tracking-widest text-purple-200"><BadgeCheck className="h-3 w-3" /> Certified</span>}
            </div>
            <p className="mt-1 text-[11px] font-mono text-muted-foreground/60">@{result.username}{result.city ? ` · ${result.city}` : ""}</p>
            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{result.disciplines?.join(" · ") || result.bio || "Public Creator Profile"}</p>
          </div>
        </ResultLink>
      ))}
    </ResultShell>
  );
}

function WorkGroup({ results }: { results: WorkResult[] }) {
  return (
    <ResultShell label="Work">
      {results.map(result => (
        <ResultLink key={result.id} href={`/creators/${result.creator_username}`} testId={`result-work-${result.id}`}>
          <div className="flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted/50">
            {result.thumbnail_url ? <img src={result.thumbnail_url} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="h-5 w-5 text-cyan-300/45" />}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-display text-base font-semibold">{result.title}</h3>
            <p className="mt-1 text-[10px] font-mono uppercase tracking-widest text-cyan-200/60">{result.work_type}{result.is_featured ? " · Featured" : ""}</p>
            <p className="mt-2 truncate text-xs text-muted-foreground">{result.creator_display_name} <span className="text-muted-foreground/45">· @{result.creator_username}</span>{result.room_name ? ` · ${result.room_name}` : ""}</p>
          </div>
        </ResultLink>
      ))}
    </ResultShell>
  );
}

function RoomsGroup({ results }: { results: RoomResult[] }) {
  return (
    <ResultShell label="Rooms">
      {results.map(result => (
        <ResultLink key={result.id} href={`/rooms/${result.id}`} testId={`result-room-${result.id}`}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-muted/50 text-amber-200/70"><Users className="h-4 w-4" /></div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-display text-base font-semibold">{result.name}</h3>
            <p className="mt-1 text-[10px] font-mono uppercase tracking-widest text-amber-200/60">{result.category} · {result.member_count} members</p>
            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{result.description || "Public Room inside Vanta."}</p>
          </div>
        </ResultLink>
      ))}
    </ResultShell>
  );
}

function MarketplaceGroup({ results }: { results: MarketplaceResult[] }) {
  return (
    <ResultShell label="Marketplace">
      {results.map(result => (
        <ResultLink key={result.id} href={`/marketplace/${result.id}`} testId={`result-marketplace-${result.id}`}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-muted/50 text-emerald-200/70"><ShoppingBag className="h-4 w-4" /></div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-display text-base font-semibold">{result.title}</h3>
            <p className="mt-1 text-[10px] font-mono uppercase tracking-widest text-emerald-200/60">{result.category} · {formatPrice(result)}</p>
            <p className="mt-2 truncate text-xs text-muted-foreground">{result.creator_display_name} <span className="text-muted-foreground/45">· @{result.creator_username}</span>{result.city ? ` · ${result.city}` : ""}</p>
          </div>
        </ResultLink>
      ))}
    </ResultShell>
  );
}

function TransmissionGroup({ results }: { results: TransmissionResult[] }) {
  return (
    <ResultShell label="Transmission">
      {results.map(result => (
        <ResultLink key={result.id} href={`/post/${result.id}`} testId={`result-transmission-${result.id}`}>
          <img src={result.cover_image} alt="" className="h-14 w-20 shrink-0 rounded-md border border-border object-cover" />
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 font-display text-base font-semibold">{result.title}</h3>
            <p className="mt-1 text-[10px] font-mono uppercase tracking-widest text-rose-200/60">{result.category} · {formatDate(result.created_at)}</p>
            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{result.excerpt}</p>
          </div>
        </ResultLink>
      ))}
    </ResultShell>
  );
}

function ReleasesGroup({ results }: { results: ReleaseResult[] }) {
  return (
    <ResultShell label="Releases">
      {results.map(result => (
        <ResultLink key={result.id} href="/releases" testId={`result-release-${result.id}`}>
          <img src={result.cover_image} alt="" className="h-14 w-14 shrink-0 rounded-md border border-border object-cover" />
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-display text-base font-semibold">{result.title}</h3>
            <p className="mt-1 text-[10px] font-mono uppercase tracking-widest text-sky-200/60">{result.type} · {result.genre || result.subgenre || "Release"} · {formatDate(result.release_date)}</p>
            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{result.description}</p>
          </div>
        </ResultLink>
      ))}
    </ResultShell>
  );
}

function PlayGroup({ results }: { results: PlayResult[] }) {
  return (
    <ResultShell label="Play">
      {results.map(result => (
        <ResultLink key={result.id} href="/play" testId={`result-play-${result.id}`}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-muted/50 text-orange-200/70"><Gamepad2 className="h-4 w-4" /></div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-display text-base font-semibold">{result.venue}</h3>
            <p className="mt-1 text-[10px] font-mono uppercase tracking-widest text-orange-200/60">{result.sport} · {result.city}</p>
            <p className="mt-2 text-xs text-muted-foreground"><CalendarDays className="mr-1 inline h-3 w-3" />{formatDate(result.date)} · {result.time} · {result.players}/{result.capacity} players</p>
          </div>
        </ResultLink>
      ))}
    </ResultShell>
  );
}

export default function SearchPage() {
  const rawSearch = useSearch();
  const [, navigate] = useLocation();
  const urlQuery = new URLSearchParams(rawSearch).get("q")?.trim() || "";
  const [inputValue, setInputValue] = useState(urlQuery);
  const [filter, setFilter] = useState<FilterKey>("all");

  useEffect(() => {
    setInputValue(urlQuery);
    setFilter("all");
  }, [urlQuery]);

  useEffect(() => {
    if (inputValue.trim() === urlQuery) return;
    const timer = window.setTimeout(() => {
      const query = inputValue.trim();
      navigate(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
    }, 350);
    return () => window.clearTimeout(timer);
  }, [inputValue, navigate, urlQuery]);

  const { data, isLoading, isError } = useQuery<SearchResponse>({
    queryKey: ["/api/search", urlQuery],
    queryFn: async () => {
      const response = await fetch(`/api/search?q=${encodeURIComponent(urlQuery)}`);
      if (!response.ok) throw new Error("Search failed");
      return response.json();
    },
    enabled: Boolean(urlQuery),
  });

  const totalCount = useMemo(() => {
    if (!data) return 0;
    return Object.entries(data)
      .filter(([key]) => key !== "query")
      .reduce((sum, [, value]) => sum + (Array.isArray(value) ? value.length : 0), 0);
  }, [data]);

  const filterCounts: Record<FilterKey, number> = {
    all: totalCount,
    creators: data?.creators.length || 0,
    work: data?.work.length || 0,
    rooms: data?.rooms.length || 0,
    marketplace: data?.marketplace.length || 0,
    transmission: data?.transmission.length || 0,
    releases: data?.releases.length || 0,
    play: data?.play.length || 0,
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const query = inputValue.trim();
    navigate(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
  };

  const clearSearch = () => {
    setInputValue("");
    navigate("/search");
  };

  const show = (key: FilterKey) => filter === "all" || filter === key;

  return (
    <div className="min-h-screen bg-background">
      <ReturnToCity />
      <Header />
      <main className="pt-20">
        <section className="relative overflow-hidden border-b border-border">
          <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: "linear-gradient(#a855f7 1px, transparent 1px), linear-gradient(90deg, #a855f7 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
          <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
            <p className="mb-4 text-[10px] font-mono uppercase tracking-[0.3em] text-purple-300/70">Vanta OS / Universal Ecosystem Search</p>
            <div className="flex items-end gap-4">
              <h1 className="font-display text-5xl font-bold leading-none tracking-tight sm:text-6xl md:text-7xl">BLACK INDEX</h1>
              <span className="mb-1.5 hidden items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/55 sm:flex"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-purple-400" />LIVE INDEX</span>
            </div>
            <p className="mt-5 max-w-2xl font-mono text-sm leading-relaxed text-muted-foreground">Find people, work, spaces, services, content, releases, and games that already exist inside Vanta.</p>
            <form onSubmit={handleSubmit} className="relative mt-8 max-w-3xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-purple-300/70" />
              <input
                value={inputValue}
                onChange={event => setInputValue(event.target.value)}
                placeholder="SEARCH VANTA…"
                aria-label="Search Vanta"
                autoFocus
                className="h-14 w-full rounded-md border border-border/80 bg-background/85 pl-11 pr-12 font-mono text-sm outline-none placeholder:text-muted-foreground/40 focus:border-purple-400/55 focus:ring-2 focus:ring-purple-400/10"
                data-testid="input-search-page"
              />
              {inputValue && <button type="button" onClick={clearSearch} aria-label="Clear search" className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>}
            </form>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
          {!urlQuery && (
            <section className="border border-border/70 bg-card/20 p-5 sm:p-8" data-testid="text-search-prompt">
              <div className="mb-6 flex items-center gap-3">
                <Database className="h-5 w-5 text-purple-300/70" />
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-purple-300/75">Explore the Index</p>
                  <p className="mt-1 text-sm text-muted-foreground">Search the live public ecosystem. No invented activity, no private layers.</p>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                {EXPLORE.map(({ label, detail, Icon }) => (
                  <div key={label} className="border border-border/60 bg-background/25 p-4">
                    <Icon className="h-4 w-4 text-muted-foreground/65" />
                    <p className="mt-4 text-sm font-medium">{label}</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground/65">{detail}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {urlQuery && (
            <>
              <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2" data-testid="search-type-filters">
                  {FILTERS.map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setFilter(key)}
                      data-testid={`filter-type-${key}`}
                      className={`rounded-sm border px-3 py-2 text-[10px] font-mono uppercase tracking-widest transition-colors ${
                        filter === key ? "border-purple-400/45 bg-purple-400/10 text-purple-200" : "border-border text-muted-foreground hover:border-purple-400/35 hover:text-foreground"
                      }`}
                    >
                      {label}{data && <span className="ml-1.5 text-muted-foreground/45">{filterCounts[key]}</span>}
                    </button>
                  ))}
                </div>
                {isLoading ? <span className="text-[10px] font-mono uppercase tracking-widest text-purple-300/70">Searching index…</span> : data && <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50">{totalCount} record{totalCount === 1 ? "" : "s"} retrieved</span>}
              </div>

              {isLoading && (
                <div className="border border-purple-400/20 bg-card/25 p-6 font-mono" data-testid="search-loading">
                  <div className="flex items-center gap-3 text-xs uppercase tracking-[0.22em] text-purple-300/75"><Database className="h-4 w-4 animate-pulse" /> Searching index…</div>
                  <div className="mt-5 space-y-2 text-xs text-muted-foreground/45">
                    {["Cross-referencing public identities", "Scanning work and Rooms", "Reading live transmissions"].map(line => <p key={line}><span className="mr-3 text-purple-300/60">›</span>{line}<span className="float-right animate-pulse">···</span></p>)}
                  </div>
                </div>
              )}

              {isError && !isLoading && <div className="border border-red-400/20 bg-red-400/[0.03] p-8 text-center font-mono text-sm text-red-200/70">The index could not be reached. Try the search again.</div>}

              {!isLoading && !isError && data && totalCount === 0 && (
                <div className="border border-border/70 bg-card/20 px-5 py-20 text-center" data-testid="text-no-results">
                  <Database className="mx-auto h-9 w-9 text-muted-foreground/20" />
                  <p className="mt-5 font-mono text-sm uppercase tracking-[0.25em] text-red-200/70">Nothing indexed under that search.</p>
                  <p className="mt-3 text-sm text-muted-foreground">Try a broader name, category, discipline, location, or title.</p>
                </div>
              )}

              {!isLoading && !isError && data && totalCount > 0 && (
                <div className="space-y-4" data-testid="search-results">
                  {show("creators") && data.creators.length > 0 && <CreatorGroup results={data.creators} />}
                  {show("work") && data.work.length > 0 && <WorkGroup results={data.work} />}
                  {show("rooms") && data.rooms.length > 0 && <RoomsGroup results={data.rooms} />}
                  {show("marketplace") && data.marketplace.length > 0 && <MarketplaceGroup results={data.marketplace} />}
                  {show("transmission") && data.transmission.length > 0 && <TransmissionGroup results={data.transmission} />}
                  {show("releases") && data.releases.length > 0 && <ReleasesGroup results={data.releases} />}
                  {show("play") && data.play.length > 0 && <PlayGroup results={data.play} />}
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}