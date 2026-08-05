// ─── Vanta App Launcher ───────────────────────────────────────────────────────
// Grid overlay / bottom-sheet that lists all Vanta apps.
import { useEffect, useRef } from "react";
import { Link } from "wouter";
import {
  Home, FileText, Disc3, Package, Globe2, Leaf, Database,
  Radio, BookOpen, Clock, Lock, X,
} from "lucide-react";

interface AppEntry {
  label: string;
  href: string;
  icon: React.ElementType;
  desc: string;
  locked?: boolean;
}

const LIVE_APPS: AppEntry[] = [
  { label: "Home",         href: "/",           icon: Home,     desc: "Main feed"           },
  { label: "Blog",         href: "/",           icon: FileText, desc: "Transmissions"       },
  { label: "Music",        href: "/music",       icon: Radio,    desc: "Listening"           },
  { label: "Releases",     href: "/releases",    icon: Disc3,    desc: "Discography"         },
  { label: "Vault",        href: "/vault",       icon: Package,  desc: "Restricted archive"  },
  { label: "World",        href: "/world",       icon: Globe2,   desc: "City alpha"          },
  { label: "Stonerism",    href: "/stonerism",   icon: Leaf,     desc: "Cannabis culture"    },
  { label: "Black Index",  href: "/search",      icon: Database, desc: "Search archive"      },
  { label: "Profiles",     href: "/dashboard",   icon: Radio,    desc: "Your identity"       },
  { label: "Dev Logs",     href: "/devlogs",     icon: BookOpen, desc: "Build journal"       },
  { label: "Early Access", href: "/early-access",icon: Clock,    desc: "Upcoming apps"       },
];

const UPCOMING_APPS: AppEntry[] = [
  { label: "Wireline",     href: "/early-access/wireline",   icon: Lock, desc: "Communications", locked: true },
  { label: "Rooms",        href: "/early-access/rooms",      icon: Lock, desc: "Community spaces", locked: true },
  { label: "Voice",        href: "/early-access/voice",      icon: Lock, desc: "Live audio", locked: true },
  { label: "Studio",       href: "/early-access/studio",     icon: Lock, desc: "Creator tools", locked: true },
  { label: "Market",       href: "/early-access",            icon: Lock, desc: "Coming soon", locked: true },
  { label: "Vanta Deck",   href: "/early-access/vanta-deck", icon: Lock, desc: "Hardware", locked: true },
  { label: "Full Vanta OS",href: "/early-access/vanta-os",   icon: Lock, desc: "Complete OS", locked: true },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AppLauncher({ open, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, onClose]);

  // Body scroll lock on mobile
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [open]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Vanta App Launcher"
        className="fixed z-[201] bg-background border border-border overflow-y-auto"
        style={{
          // Desktop: floating panel from top-right
          top: 68,
          right: 16,
          width: "min(460px, calc(100vw - 32px))",
          maxHeight: "calc(100vh - 100px)",
          borderRadius: 8,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50">VANTA OS</p>
            <p className="text-sm font-semibold tracking-wide">Apps</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-muted transition-colors text-muted-foreground"
            aria-label="Close launcher"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4">
          {/* Live apps grid */}
          <p className="text-[9px] font-mono uppercase tracking-[0.22em] text-muted-foreground/40 mb-3">Available</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-6">
            {LIVE_APPS.map(app => {
              const Icon = app.icon;
              return (
                <Link key={app.label} href={app.href} onClick={onClose}>
                  <div className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-muted/60 transition-colors cursor-pointer group text-center">
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                      <Icon className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                    <div>
                      <p className="text-xs font-medium leading-tight">{app.label}</p>
                      <p className="text-[10px] text-muted-foreground/50 leading-tight mt-0.5 hidden sm:block">{app.desc}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Upcoming apps */}
          <div className="border-t border-border pt-4">
            <p className="text-[9px] font-mono uppercase tracking-[0.22em] text-muted-foreground/40 mb-3">Coming Soon</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {UPCOMING_APPS.map(app => {
                const Icon = app.icon;
                return (
                  <Link key={app.label} href={app.href} onClick={onClose}>
                    <div className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-muted/40 transition-colors cursor-pointer group text-center opacity-60 hover:opacity-80">
                      <div className="w-10 h-10 rounded-xl bg-muted/50 border border-border flex items-center justify-center relative">
                        <Icon className="w-4 h-4 text-muted-foreground/40" />
                        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-muted border border-border flex items-center justify-center">
                          <Lock className="w-1.5 h-1.5 text-muted-foreground/60" />
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium leading-tight text-muted-foreground">{app.label}</p>
                        <p className="text-[10px] text-muted-foreground/40 leading-tight mt-0.5 hidden sm:block">Soon</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
