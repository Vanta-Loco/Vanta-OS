import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  ArrowUpRight,
  BadgeCheck,
  BriefcaseBusiness,
  Search,
  Sparkles,
  Store,
  Users,
  X,
} from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type DirectoryFilter = "all" | "certified" | "with_work";

type Creator = {
  username: string;
  display_name: string;
  bio: string | null;
  city: string | null;
  country: string | null;
  profile_image_url: string | null;
  creator_type: string;
  disciplines: string[];
  is_certified: boolean;
  work_count: number;
  listing_count: number;
  room_names: string[];
};

const DISCIPLINES = [
  "Artist",
  "Producer",
  "Engineer",
  "Photographer",
  "Filmmaker",
  "Model",
  "Designer",
  "Stylist",
  "Writer",
  "Journalist / Media",
  "Curator",
  "Developer",
  "Fashion",
  "Other",
];

const FILTERS: { value: DirectoryFilter; label: string; detail: string }[] = [
  { value: "all", label: "All Creators", detail: "Every active Creator Profile" },
  { value: "certified", label: "Certified", detail: "Vanta-certified identities" },
  { value: "with_work", label: "With Work", detail: "Creators with public Work" },
];

export default function Creators() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<DirectoryFilter>("all");
  const [discipline, setDiscipline] = useState("");
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({ filter });
      if (query.trim()) params.set("q", query.trim());
      if (discipline) params.set("discipline", discipline);

      setLoading(true);
      setError("");
      fetch(`/api/creators?${params.toString()}`)
        .then(response => {
          if (!response.ok) throw new Error("The Creator directory is unavailable.");
          return response.json();
        })
        .then(data => setCreators(Array.isArray(data.creators) ? data.creators : []))
        .catch(reason => {
          setCreators([]);
          setError(reason instanceof Error ? reason.message : "The Creator directory is unavailable.");
        })
        .finally(() => setLoading(false));
    }, 220);

    return () => window.clearTimeout(timer);
  }, [query, filter, discipline]);

  const hasFilters = Boolean(query.trim() || discipline || filter !== "all");

  function clearFilters() {
    setQuery("");
    setFilter("all");
    setDiscipline("");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="pt-20">
        <section className="relative overflow-hidden border-b border-border">
          <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] [background-size:48px_48px]" />
          <div className="relative mx-auto max-w-7xl px-6 py-16 lg:px-8 md:py-24">
            <div className="flex flex-wrap items-start justify-between gap-10">
              <div className="max-w-3xl">
                <p className="mb-5 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.32em] text-primary/75">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary))]" />
                  VANTA OS · CREATOR INDEX
                </p>
                <h1 className="font-display text-5xl font-bold tracking-tight md:text-7xl">
                  The creative network<span className="text-primary">.</span>
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
                  Browse the people shaping Vanta. An active Creator Profile is the entry point;
                  certification marks a deeper trust layer, not a gate.
                </p>
              </div>
              <div className="border border-border/80 bg-card/30 px-5 py-4 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/55">
                <p>Directory status</p>
                <p className="mt-2 text-foreground/80">LIVE · PUBLIC RECORD</p>
              </div>
            </div>
          </div>
        </section>

        <section className="sticky top-16 z-30 border-b border-border bg-background/95 backdrop-blur-md">
          <div className="mx-auto max-w-7xl space-y-4 px-6 py-5 lg:px-8">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/55" />
                <Input
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder="Search username, name, discipline, or bio…"
                  aria-label="Search Creators"
                  className="h-11 border-border bg-card/40 pl-10 pr-10 font-mono text-xs"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="Clear Creator search"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/55 hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <select
                value={discipline}
                onChange={event => setDiscipline(event.target.value)}
                aria-label="Filter by discipline"
                className="h-11 rounded-md border border-input bg-card/40 px-3 text-xs text-foreground lg:w-56"
              >
                <option value="">All disciplines</option>
                {DISCIPLINES.map(item => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Creator directory filters">
              {FILTERS.map(item => (
                <Button
                  key={item.value}
                  type="button"
                  size="sm"
                  variant={filter === item.value ? "default" : "outline"}
                  onClick={() => setFilter(item.value)}
                  className="shrink-0 font-mono text-[10px] uppercase tracking-widest"
                  title={item.detail}
                >
                  {item.label}
                </Button>
              ))}
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="ml-auto shrink-0 px-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60 hover:text-foreground"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-10 lg:px-8 md:py-14">
          <div className="mb-7 flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-muted-foreground/50">
                {loading ? "Scanning records…" : `${creators.length} ${creators.length === 1 ? "Creator" : "Creators"} found`}
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold md:text-3xl">
                {filter === "all" ? "All active Creators" : FILTERS.find(item => item.value === filter)?.label}
              </h2>
            </div>
            <span className="hidden items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40 sm:flex">
              <Users className="h-3.5 w-3.5" /> Public network
            </span>
          </div>

          {loading && <DirectorySkeleton />}
          {!loading && error && (
            <div className="border border-destructive/30 bg-destructive/5 px-5 py-12 text-center">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-destructive">Directory unavailable</p>
              <p className="mt-3 text-sm text-muted-foreground">{error}</p>
            </div>
          )}
          {!loading && !error && !creators.length && (
            <div className="border border-dashed border-border px-6 py-20 text-center">
              <Sparkles className="mx-auto h-6 w-6 text-muted-foreground/35" />
              <p className="mt-5 font-display text-3xl">NO CREATORS FOUND</p>
              <p className="mt-3 text-sm text-muted-foreground">Try another discipline or search.</p>
              {hasFilters && <Button variant="outline" size="sm" onClick={clearFilters} className="mt-6">Reset directory</Button>}
            </div>
          )}
          {!loading && !error && creators.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {creators.map((creator, index) => <CreatorCard key={creator.username} creator={creator} index={index} />)}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}

function CreatorCard({ creator, index }: { creator: Creator; index: number }) {
  const location = [creator.city, creator.country].filter(Boolean).join(", ");
  const rooms = (creator.room_names || []).slice(0, 2);

  return (
    <Link href={`/creators/${creator.username}`}>
      <article className={`group relative flex h-full min-h-[310px] cursor-pointer flex-col overflow-hidden border bg-card/25 p-5 transition-all hover:-translate-y-0.5 hover:bg-card/45 ${
        creator.is_certified ? "border-primary/45 hover:border-primary" : "border-border hover:border-primary/45"
      }`}>
        <div className="mb-7 flex items-center justify-between text-[9px] font-mono uppercase tracking-[0.24em] text-muted-foreground/45">
          <span>CREATOR // {String(index + 1).padStart(2, "0")}</span>
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
        </div>
        <div className="flex items-start gap-4">
          <div className={`flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden border bg-muted/50 ${
            creator.is_certified ? "border-primary/50" : "border-border"
          }`}>
            {creator.profile_image_url
              ? <img src={creator.profile_image_url} alt="" className="h-full w-full object-cover" />
              : <Sparkles className="h-6 w-6 text-primary/45" />}
          </div>
          <div className="min-w-0 pt-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-display text-xl font-semibold">{creator.display_name}</h3>
              {creator.is_certified && (
                <span className="inline-flex shrink-0 items-center gap-1 text-[9px] font-mono uppercase tracking-widest text-primary">
                  <BadgeCheck className="h-3.5 w-3.5" /> Certified
                </span>
              )}
            </div>
            <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground/60">@{creator.username}</p>
            {location && <p className="mt-2 truncate text-[11px] text-muted-foreground/55">{location}</p>}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-1.5">
          {(creator.disciplines || []).slice(0, 3).map(item => (
            <span key={item} className="border border-border/80 px-2 py-1 text-[9px] font-mono uppercase tracking-widest text-muted-foreground/70">{item}</span>
          ))}
          {(creator.disciplines || []).length > 3 && <span className="px-1 py-1 text-[9px] font-mono text-muted-foreground/45">+{creator.disciplines.length - 3}</span>}
        </div>

        <p className="mt-5 line-clamp-3 min-h-[3.75rem] text-sm leading-relaxed text-muted-foreground">
          {creator.bio || "Public Creator Profile activated on Vanta."}
        </p>

        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/60 pt-4 text-[9px] font-mono uppercase tracking-widest text-muted-foreground/50">
          {creator.work_count > 0 && <span className="flex items-center gap-1.5"><BriefcaseBusiness className="h-3 w-3" /> {creator.work_count} {creator.work_count === 1 ? "Work" : "Works"}</span>}
          {creator.listing_count > 0 && <span className="flex items-center gap-1.5 text-emerald-300/65"><Store className="h-3 w-3" /> Available</span>}
          {rooms.map(room => <span key={room} className="truncate text-primary/60">{room}</span>)}
          {!creator.work_count && !creator.listing_count && !rooms.length && <span>Profile active</span>}
        </div>
      </article>
    </Link>
  );
}

function DirectorySkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-[310px] animate-pulse border border-border/60 bg-card/20 p-5">
          <div className="h-3 w-24 bg-muted/70" />
          <div className="mt-7 flex gap-4">
            <div className="h-16 w-16 bg-muted/70" />
            <div className="flex-1 space-y-3 pt-1"><div className="h-5 w-3/4 bg-muted/70" /><div className="h-3 w-1/2 bg-muted/50" /></div>
          </div>
          <div className="mt-7 h-3 w-2/3 bg-muted/50" />
          <div className="mt-6 space-y-3"><div className="h-3 w-full bg-muted/40" /><div className="h-3 w-5/6 bg-muted/40" /><div className="h-3 w-4/6 bg-muted/40" /></div>
        </div>
      ))}
    </div>
  );
}