// ─── Vanta OS Dashboard ───────────────────────────────────────────────────────
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import {
  Globe2, Package, Leaf, Database, FileText, Disc3, BookOpen,
  Clock, Lock, ArrowRight, Radio, User,
} from "lucide-react";

interface FeaturedApp {
  label: string; href: string; icon: React.ElementType;
  desc: string; status?: string; color?: string;
}

const FEATURED_APPS: FeaturedApp[] = [
  { label: "Vault",        href: "/vault",      icon: Package,  desc: "Restricted audio archive and unreleased demos",  status: "Online",  color: "#4a9a4a" },
  { label: "World Alpha",  href: "/world",       icon: Globe2,   desc: "Explore Vanta City — open-world district",       status: "Alpha",   color: "#9a7a2a" },
  { label: "Stonerism",    href: "/stonerism",   icon: Leaf,     desc: "Cannabis culture magazine",                       status: "Online",  color: "#4a8a3a" },
  { label: "Black Index",  href: "/search",      icon: Database, desc: "Search and index across the Vanta ecosystem",    status: "Online",  color: "#3a6a9a" },
  { label: "Blog",         href: "/",            icon: FileText, desc: "Transmissions — music, process, culture",         status: "Online",  color: "#7a4a9a" },
  { label: "Music",        href: "/releases",    icon: Disc3,    desc: "Full discography — albums, singles, EPs",         status: "Online",  color: "#9a3a5a" },
  { label: "Dev Logs",     href: "/devlogs",     icon: BookOpen, desc: "Build journal — behind the platform",            status: "Online",  color: "#4a7a7a" },
  { label: "Early Access", href: "/early-access",icon: Clock,    desc: "Join waitlists for upcoming Vanta apps",         status: "Online",  color: "#7a5a3a" },
];

interface UpcomingApp {
  label: string; href: string; desc: string; status: string; slug: string;
}

const UPCOMING_APPS: UpcomingApp[] = [
  { label: "Wireline",      href: "/early-access/wireline",   desc: "Private communications and community",   status: "Coming Soon",         slug: "wireline"  },
  { label: "Rooms",         href: "/early-access/rooms",      desc: "Persistent digital spaces and events",   status: "Concept / In Dev",    slug: "rooms"     },
  { label: "Vanta Deck",    href: "/early-access/vanta-deck", desc: "Custom physical cyberdeck access device", status: "Hardware Concept",    slug: "vanta-deck"},
  { label: "Full Vanta OS", href: "/early-access/vanta-os",   desc: "The complete culture operating environment", status: "In Development",  slug: "vanta-os"  },
  { label: "Voice",         href: "/early-access/voice",      desc: "Live voice and conversation tools",      status: "Concept",             slug: "voice"     },
  { label: "Studio",        href: "/early-access/studio",     desc: "Creator and music production tools",     status: "Concept",             slug: "studio"    },
];

export default function Dashboard() {
  const { user, isAuthenticated } = useUser();

  const { data: posts   = [] } = useQuery<any[]>({ queryKey: ["/api/posts"] });
  const { data: releases= [] } = useQuery<any[]>({ queryKey: ["/api/releases"] });
  const { data: devlogs = [] } = useQuery<any[]>({ queryKey: ["/api/devlogs"] });
  const { data: apps    = [] } = useQuery<any[]>({ queryKey: ["/api/apps"] });
  const { data: world            } = useQuery<any>({ queryKey: ["/api/admin/world"], retry: false,
    queryFn: () => fetch("/api/world-status").then(r => r.ok ? r.json() : null).catch(() => null) });

  const latestPost    = posts[0];
  const latestRelease = releases[0];
  const latestLog     = devlogs[0];

  // Merge DB app teasers with static ones
  const displayedUpcoming = UPCOMING_APPS;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20">

        {/* ── Welcome ── */}
        <div className="mb-10">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40 mb-2">
            VANTA OS · DASHBOARD
          </p>
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-display font-bold tracking-wide">
                {isAuthenticated && user
                  ? `Welcome back, ${user.display_name || user.username}`
                  : "Welcome to Vanta"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {isAuthenticated ? "Your culture operating system." : "Explore the ecosystem."}
              </p>
            </div>
            {!isAuthenticated && (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button variant="outline" size="sm" className="text-xs">Sign In</Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" className="text-xs">Create Profile</Button>
                </Link>
              </div>
            )}
            {isAuthenticated && user && (
              <Link href={`/profile/${user.username}`}>
                <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <User className="w-4 h-4" />
                    )}
                  </div>
                  <span className="text-xs font-mono">@{user.username}</span>
                </div>
              </Link>
            )}
          </div>
        </div>

        {/* ── Latest from Vanta ── */}
        {(latestPost || latestRelease || latestLog) && (
          <div className="mb-10">
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40 mb-4">Latest</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {latestPost && (
                <Link href={`/post/${latestPost.id}`}>
                  <div className="border border-border rounded-lg p-4 hover:border-primary/30 hover:bg-muted/20 transition-all cursor-pointer group">
                    <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/40 mb-2">Blog</p>
                    <p className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors">{latestPost.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{latestPost.excerpt}</p>
                  </div>
                </Link>
              )}
              {latestRelease && (
                <Link href="/releases">
                  <div className="border border-border rounded-lg p-4 hover:border-primary/30 hover:bg-muted/20 transition-all cursor-pointer group">
                    <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/40 mb-2">Release</p>
                    <p className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors">{latestRelease.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{latestRelease.type} · {latestRelease.releaseDate}</p>
                  </div>
                </Link>
              )}
              {latestLog && (
                <Link href={`/devlogs/${latestLog.slug}`}>
                  <div className="border border-border rounded-lg p-4 hover:border-primary/30 hover:bg-muted/20 transition-all cursor-pointer group">
                    <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/40 mb-2">Dev Log</p>
                    <p className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors">{latestLog.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{latestLog.summary}</p>
                  </div>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* ── Featured Apps ── */}
        <div className="mb-10">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40 mb-4">Applications</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {FEATURED_APPS.map(app => {
              const Icon = app.icon;
              return (
                <Link key={app.label} href={app.href}>
                  <div className="border border-border rounded-xl p-4 hover:border-primary/30 hover:bg-muted/20 transition-all cursor-pointer group flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center"
                        style={{ background: `${app.color}18` }}
                      >
                        <Icon className="w-4 h-4" style={{ color: app.color }} />
                      </div>
                      {app.status && (
                        <span className="text-[9px] font-mono" style={{ color: `${app.color}99` }}>
                          {app.status}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{app.label}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{app.desc}</p>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground/40 group-hover:text-muted-foreground transition-colors mt-auto">
                      <span>Open</span>
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* ── Upcoming Apps ── */}
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40 mb-4">Upcoming</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {displayedUpcoming.map(app => (
              <div key={app.label} className="border border-border/50 rounded-xl p-4 flex flex-col gap-3 opacity-80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-muted-foreground/30" />
                    <p className="text-sm font-medium text-muted-foreground">{app.label}</p>
                  </div>
                  <span className="text-[9px] font-mono text-muted-foreground/40 uppercase tracking-wide">
                    {app.status}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground/60 leading-relaxed">{app.desc}</p>
                <Link href={app.href}>
                  <Button variant="outline" size="sm" className="text-xs w-full">
                    Join Early Access
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
