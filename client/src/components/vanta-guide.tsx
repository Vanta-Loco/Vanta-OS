import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  ArrowUpRight,
  BadgeCheck,
  BookOpen,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  Compass,
  Gamepad2,
  Globe2,
  Image as ImageIcon,
  LayoutDashboard,
  LockKeyhole,
  MapPin,
  Radio,
  Search,
  ShoppingBag,
  Sparkles,
  Terminal,
  Trophy,
  UserRound,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getUserToken, useUser } from "@/hooks/use-user";

type GuideKind = "GO TO" | "HOW TO" | "ABOUT";

type GuideEntry = {
  id: string;
  kind: GuideKind;
  title: string;
  description: string;
  href?: string;
  keywords: string[];
  Icon: LucideIcon;
};

type Room = { joined: boolean };
type CreatorProfile = { profile: null } | { display_name: string; is_certified: boolean };
type WorkItem = { id: string };

const NAVIGATION: GuideEntry[] = [
  {
    id: "dashboard",
    kind: "GO TO",
    title: "Dashboard",
    description: "Your connected Vanta OS home and NEXT MOVE.",
    href: "/dashboard",
    keywords: ["home", "overview", "os", "start"],
    Icon: LayoutDashboard,
  },
  {
    id: "passport",
    kind: "GO TO",
    title: "Passport",
    description: "Your identity, level, achievements, and activity across Vanta.",
    href: "/passport",
    keywords: ["identity", "xp", "level", "achievements", "member"],
    Icon: UserRound,
  },
  {
    id: "rooms",
    kind: "GO TO",
    title: "Rooms",
    description: "Creative spaces and communities inside Vanta.",
    href: "/rooms",
    keywords: ["community", "music room", "fashion room", "visual room", "media room", "spaces"],
    Icon: Users,
  },
  {
    id: "creator-profile",
    kind: "GO TO",
    title: "Creator Profile",
    description: "Activate and manage the creative identity connected to your Member account.",
    href: "/creator",
    keywords: ["creator", "profile", "become a creator", "activate creator"],
    Icon: Sparkles,
  },
  {
    id: "creator-work",
    kind: "GO TO",
    title: "Creator Work",
    description: "Manage your portfolio and the work in your public archive.",
    href: "/creator",
    keywords: ["work", "portfolio", "archive", "upload work", "add work", "manage work"],
    Icon: ImageIcon,
  },
  {
    id: "marketplace",
    kind: "GO TO",
    title: "Marketplace",
    description: "Find producers, designers, services, and creative collaborators.",
    href: "/marketplace",
    keywords: ["producer", "producers", "designer", "designers", "beats", "services", "collaboration", "exchange"],
    Icon: ShoppingBag,
  },
  {
    id: "play",
    kind: "GO TO",
    title: "Vanta Play",
    description: "Find real-world games, sports, and community activity.",
    href: "/play",
    keywords: ["sports", "sport", "games", "game", "activity", "football", "basketball"],
    Icon: Gamepad2,
  },
  {
    id: "transmission",
    kind: "GO TO",
    title: "Transmission",
    description: "Vanta content, music, news, and public editorial signals.",
    href: "/",
    keywords: ["blog", "news", "music", "content", "editorial", "posts", "signal"],
    Icon: Radio,
  },
  {
    id: "vault",
    kind: "GO TO",
    title: "Vault",
    description: "The restricted archive for unreleased audio and material.",
    href: "/vault",
    keywords: ["audio", "unreleased", "demos", "private", "archive"],
    Icon: LockKeyhole,
  },
  {
    id: "releases",
    kind: "GO TO",
    title: "Releases",
    description: "Published music releases and listening links.",
    href: "/releases",
    keywords: ["music", "albums", "singles", "ep", "release"],
    Icon: BookOpen,
  },
  {
    id: "world",
    kind: "GO TO",
    title: "World",
    description: "Enter World Alpha and explore Vanta City.",
    href: "/world",
    keywords: ["city", "vanta city", "world alpha", "district", "map", "explore"],
    Icon: Globe2,
  },
  {
    id: "about",
    kind: "GO TO",
    title: "About",
    description: "Learn what Vanta Cold is and what it is building.",
    href: "/about",
    keywords: ["about", "vanta", "information"],
    Icon: CircleHelp,
  },
];

const HELP: GuideEntry[] = [
  {
    id: "what-is-passport",
    kind: "ABOUT",
    title: "What is Vanta Passport?",
    description: "Passport is your identity across Vanta.",
    href: "/passport",
    keywords: ["what is passport", "passport identity", "identity"],
    Icon: UserRound,
  },
  {
    id: "what-are-rooms",
    kind: "ABOUT",
    title: "What are Rooms?",
    description: "Rooms are creative spaces and communities inside Vanta.",
    href: "/rooms",
    keywords: ["what are rooms", "rooms community", "communities", "find communities"],
    Icon: Users,
  },
  {
    id: "become-creator",
    kind: "HOW TO",
    title: "How do I become a Creator?",
    description: "Activate an existing Creator Profile from your Member account.",
    href: "/creator",
    keywords: ["become creator", "how creator", "activate creator", "creator profile"],
    Icon: Sparkles,
  },
  {
    id: "add-work",
    kind: "HOW TO",
    title: "How do I add Work?",
    description: "Open Creator Profile → Work → Add Work.",
    href: "/creator",
    keywords: ["how add work", "add work", "upload work", "creator work", "portfolio"],
    Icon: ImageIcon,
  },
  {
    id: "certified-creator",
    kind: "ABOUT",
    title: "How do I become Certified?",
    description: "Certified Creator status is granted by Vanta/Admin and cannot be self-assigned.",
    href: "/creator",
    keywords: ["certified", "certification", "become certified", "certified creator"],
    Icon: BadgeCheck,
  },
  {
    id: "find-creators",
    kind: "HOW TO",
    title: "Where do I find producers and designers?",
    description: "Marketplace is where Members discover creative services and collaborators.",
    href: "/marketplace",
    keywords: ["find producer", "find producers", "find designers", "services", "collaborators"],
    Icon: ShoppingBag,
  },
  {
    id: "find-sports",
    kind: "HOW TO",
    title: "Where do I play sports?",
    description: "Vanta Play lists open games and community sports activity.",
    href: "/play",
    keywords: ["where play sports", "play sports", "sports", "games"],
    Icon: Trophy,
  },
  {
    id: "find-city",
    kind: "HOW TO",
    title: "Where is the city?",
    description: "World Alpha is Vanta City’s explorable district.",
    href: "/world",
    keywords: ["where city", "city", "world alpha", "vanta city"],
    Icon: MapPin,
  },
  {
    id: "find-content",
    kind: "HOW TO",
    title: "Where is Vanta content and news?",
    description: "Transmission is the public stream for Vanta content, music, and news.",
    href: "/",
    keywords: ["where content", "where news", "content news", "transmission", "music"],
    Icon: Radio,
  },
];

const QUICK_ACCESS_IDS = ["dashboard", "passport", "rooms", "creator-profile", "marketplace", "world"];
const QUESTION_IDS = ["what-is-passport", "add-work", "what-are-rooms", "certified-creator"];

function requestHeaders(): Record<string, string> {
  const token = getUserToken();
  return token ? { "X-User-Token": token } : {};
}

async function guideFetch<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: requestHeaders() });
  if (!response.ok) throw new Error("Guide context unavailable");
  return response.json();
}

function matches(entry: GuideEntry, query: string): boolean {
  const haystack = `${entry.title} ${entry.description} ${entry.keywords.join(" ")}`.toLowerCase();
  const tokens = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return tokens.length === 0 || tokens.every(token => haystack.includes(token));
}

function ResultRow({
  entry,
  active,
  onSelect,
}: {
  entry: GuideEntry;
  active: boolean;
  onSelect: () => void;
}) {
  const Icon = entry.Icon;
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onClick={onSelect}
      className={`group flex w-full items-start gap-3 rounded-lg border px-3 py-3 text-left transition-colors ${
        active ? "border-primary/50 bg-primary/[0.08]" : "border-transparent hover:border-border hover:bg-muted/45"
      }`}
    >
      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${
        active ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-muted/50 text-muted-foreground"
      }`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{entry.title}</span>
          <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-muted-foreground/50">{entry.kind}</span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{entry.description}</p>
      </div>
      {entry.href && <ArrowUpRight className={`mt-1 h-3.5 w-3.5 shrink-0 ${active ? "text-primary" : "text-muted-foreground/35"}`} />}
    </button>
  );
}

export function VantaGuide({
  open,
  onOpen,
  onClose,
}: {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useUser();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: roomsData } = useQuery<{ rooms: Room[] }>({
    queryKey: ["/api/rooms", "guide-context"],
    queryFn: () => guideFetch<{ rooms: Room[] }>("/api/rooms"),
    enabled: open && isAuthenticated,
    staleTime: 60_000,
    retry: false,
  });
  const { data: creatorData } = useQuery<CreatorProfile>({
    queryKey: ["/api/creator/me", "guide-context"],
    queryFn: () => guideFetch<CreatorProfile>("/api/creator/me"),
    enabled: open && isAuthenticated,
    staleTime: 60_000,
    retry: false,
  });
  const hasCreatorProfile = !!creatorData && !("profile" in creatorData);
  const { data: work = [] } = useQuery<WorkItem[]>({
    queryKey: ["/api/creator/work", "guide-context"],
    queryFn: () => guideFetch<WorkItem[]>("/api/creator/work"),
    enabled: open && isAuthenticated && hasCreatorProfile,
    staleTime: 60_000,
    retry: false,
  });

  const contextual = useMemo<GuideEntry[]>(() => {
    if (!isAuthenticated) return [];
    const suggestions: GuideEntry[] = [];
    const joinedRooms = roomsData?.rooms?.some(room => room.joined);
    if (roomsData && !joinedRooms) {
      suggestions.push({
        id: "context-find-room",
        kind: "GO TO",
        title: "Find a Room",
        description: "You have not joined a Room yet. Browse the Vanta communities.",
        href: "/rooms",
        keywords: ["room", "community", "next", "suggestion"],
        Icon: Compass,
      });
    }
    if (creatorData && "profile" in creatorData) {
      suggestions.push({
        id: "context-activate-creator",
        kind: "GO TO",
        title: "Activate Creator Profile",
        description: "Connect your Member identity to your creative archive.",
        href: "/creator",
        keywords: ["creator", "profile", "activate", "suggestion"],
        Icon: Sparkles,
      });
    } else if (hasCreatorProfile && work.length === 0) {
      suggestions.push({
        id: "context-add-work",
        kind: "GO TO",
        title: "Add your first Work",
        description: "Start your Creator archive with the work that represents you.",
        href: "/creator",
        keywords: ["work", "portfolio", "suggestion"],
        Icon: ImageIcon,
      });
    }
    return suggestions.slice(0, 2);
  }, [creatorData, hasCreatorProfile, isAuthenticated, roomsData, work.length]);

  const allEntries = useMemo(() => [...contextual, ...NAVIGATION, ...HELP], [contextual]);
  const visibleEntries = useMemo(() => {
    if (!query.trim()) return [];
    const result = allEntries.filter(entry => matches(entry, query));
    return result.filter((entry, index) => result.findIndex(candidate => candidate.id === entry.id) === index).slice(0, 12);
  }, [allEntries, query]);
  const quickAccess = QUICK_ACCESS_IDS.map(id => NAVIGATION.find(entry => entry.id === id)).filter(Boolean) as GuideEntry[];
  const commonQuestions = QUESTION_IDS.map(id => HELP.find(entry => entry.id === id)).filter(Boolean) as GuideEntry[];
  const displayEntries = query.trim() ? visibleEntries : [...contextual, ...quickAccess, ...commonQuestions];

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelectedIndex(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target && (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      );
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k" && !typing) {
        event.preventDefault();
        if (open) {
          onClose();
        } else {
          setQuery("");
          setSelectedIndex(0);
          onOpen();
        }
        return;
      }
      if (open && event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose, onOpen, open]);

  useEffect(() => {
    setSelectedIndex(index => Math.min(index, Math.max(0, displayEntries.length - 1)));
  }, [displayEntries.length]);

  if (!open) return null;

  const selectEntry = (entry: GuideEntry) => {
    if (!entry.href) return;
    onClose();
    navigate(entry.href);
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex(index => Math.min(index + 1, Math.max(0, displayEntries.length - 1)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex(index => Math.max(0, index - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const selected = displayEntries[selectedIndex];
      if (selected) selectEntry(selected);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/70 px-3 py-[8vh] backdrop-blur-sm sm:px-6"
      onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="vanta-guide-title"
        className="w-full max-w-2xl overflow-hidden rounded-xl border border-primary/25 bg-background shadow-[0_24px_100px_rgba(0,0,0,.6)]"
      >
        <div className="border-b border-border bg-card/45 p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-md border border-primary/40 bg-primary/10 text-primary">
                <Terminal className="h-4 w-4" />
              </div>
              <div>
                <h2 id="vanta-guide-title" className="font-display text-sm font-semibold uppercase tracking-[0.18em]">Vanta Guide</h2>
                <p className="mt-0.5 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50">Navigation / Help / System Index</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close Vanta Guide">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/65" />
            <input
              ref={inputRef}
              value={query}
              onChange={event => { setQuery(event.target.value); setSelectedIndex(0); }}
              onKeyDown={handleInputKeyDown}
              placeholder="Type a destination or ask how to do something…"
              aria-label="Search Vanta Guide"
              aria-controls="vanta-guide-results"
              className="h-12 w-full rounded-lg border border-border bg-background/70 pl-10 pr-16 text-sm outline-none ring-primary/30 placeholder:text-muted-foreground/45 focus:border-primary/55 focus:ring-2"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-border bg-muted/60 px-1.5 py-1 text-[10px] font-mono text-muted-foreground/60">ESC</kbd>
          </div>
        </div>

        <div id="vanta-guide-results" role="listbox" aria-label="Vanta Guide results" className="max-h-[min(58vh,520px)] overflow-y-auto p-3 sm:p-4">
          {!query.trim() && contextual.length > 0 && (
            <div className="mb-4">
              <p className="mb-2 px-2 text-[10px] font-mono uppercase tracking-[0.25em] text-primary/70">For You</p>
              <div className="space-y-1">{contextual.map((entry, index) => <ResultRow key={entry.id} entry={entry} active={selectedIndex === index} onSelect={() => selectEntry(entry)} />)}</div>
            </div>
          )}

          {!query.trim() && (
            <>
              <p className="mb-2 px-2 text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground/55">Quick Access</p>
              <div className="grid gap-1 sm:grid-cols-2">
                {quickAccess.map((entry, index) => {
                  const displayIndex = contextual.length + index;
                  return <ResultRow key={entry.id} entry={entry} active={selectedIndex === displayIndex} onSelect={() => selectEntry(entry)} />;
                })}
              </div>
              <p className="mb-2 mt-5 px-2 text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground/55">Common Questions</p>
              <div className="space-y-1">
                {commonQuestions.map((entry, index) => {
                  const displayIndex = contextual.length + quickAccess.length + index;
                  return <ResultRow key={entry.id} entry={entry} active={selectedIndex === displayIndex} onSelect={() => selectEntry(entry)} />;
                })}
              </div>
            </>
          )}

          {query.trim() && visibleEntries.length > 0 && (
            <div className="space-y-1">{visibleEntries.map((entry, index) => <ResultRow key={entry.id} entry={entry} active={selectedIndex === index} onSelect={() => selectEntry(entry)} />)}</div>
          )}

          {query.trim() && visibleEntries.length === 0 && (
            <div className="px-4 py-10 text-center">
              <Compass className="mx-auto h-6 w-6 text-muted-foreground/45" />
              <p className="mt-3 font-display text-lg font-semibold">No Vanta command found.</p>
              <p className="mt-1 text-sm text-muted-foreground">Try Passport, Rooms, producer, work, or World.</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {["passport", "rooms", "marketplace", "world"].map(term => (
                  <button key={term} type="button" onClick={() => setQuery(term)} className="rounded-full border border-border px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest text-muted-foreground hover:border-primary/45 hover:text-primary">{term}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-card/25 px-4 py-3 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/45">
          <span>⌘K / Ctrl+K to open</span>
          <span className="flex items-center gap-2"><ChevronUp className="h-3 w-3" /><ChevronDown className="h-3 w-3" /> navigate · Enter select · Esc close</span>
        </div>
      </section>
    </div>
  );
}