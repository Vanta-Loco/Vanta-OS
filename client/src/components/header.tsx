import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppLauncher } from "@/components/app-launcher";
import { useAdmin } from "@/hooks/use-admin";
import { useUser } from "@/hooks/use-user";
import {
  PenSquare, Search, LayoutDashboard, LogOut, LockKeyhole,
  Terminal, ChevronDown, Menu, X,
  MapPin, Database, Radio, Coins, Mountain, Skull, Leaf,
  Grid3x3, User, Settings, BookOpen, Clock, Trophy,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navLinks = [
  { href: "/",         label: "Home"     },
  { href: "/releases", label: "Releases" },
  { href: "/worlds",   label: "Worlds"   },
  { href: "/play",     label: "Play" },
  { href: "/about",    label: "About"    },
];

const osLinks = [
  { href: "/world",      label: "District",         desc: "Vanta City map",       Icon: MapPin    },
  { href: "/play",       label: "Play",             desc: "Pickup sports, competitions and community activity", Icon: Trophy},
  { href: "/search",     label: "Black Index",       desc: "Archive search",       Icon: Database  },
  { href: "/wireline",   label: "Wireline",          desc: "Dispatch relay",       Icon: Radio     },
  { href: "/stonerism",  label: "Stonerism",         desc: "Cannabis culture",     Icon: Leaf      },
  { href: "/fract",      label: "FRACT",             desc: "Reputation economy",   Icon: Coins     },
  { href: "/himalayas",  label: "Hidden Himalayas",  desc: "Cold expansion",       Icon: Mountain  },
  { href: "/fgh",        label: "Fractured Godhead", desc: "Lore archive",         Icon: Skull     },
  { href: "/devlogs",    label: "Dev Logs",          desc: "Build journal",        Icon: BookOpen  },
  { href: "/early-access", label: "Early Access",   desc: "Upcoming apps",        Icon: Clock     },
];

export function Header() {
  const [location, navigate] = useLocation();
  const [searchQuery, setSearchQuery]   = useState("");
  const [mobileOpen, setMobileOpen]     = useState(false);
  const [launcherOpen, setLauncherOpen] = useState(false);
  const backdropRef                     = useRef<HTMLDivElement>(null);
  const { isAuthenticated: isAdmin, logout: adminLogout } = useAdmin();
  const { user, isAuthenticated: isUser, logout: userLogout } = useUser();

  // ── Close drawer on route change ────────────────────────────────
  useEffect(() => { setMobileOpen(false); }, [location]);

  // ── Escape key ───────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setMobileOpen(false); };
    if (mobileOpen) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [mobileOpen]);

  // ── Body scroll lock ─────────────────────────────────────────────
  useEffect(() => {
    if (mobileOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [mobileOpen]);

  const close = useCallback(() => setMobileOpen(false), []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === backdropRef.current) close();
  };

  return (
    <>
      <AppLauncher open={launcherOpen} onClose={() => setLauncherOpen(false)} />

      {/* ── Fixed header bar ──────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border backdrop-blur-md bg-background/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20 gap-2">

            {/* Wordmark */}
            <Link href="/" data-testid="link-home">
              <span className="text-xl sm:text-2xl font-display font-bold tracking-tight hover-elevate cursor-pointer px-2 sm:px-3 py-2 rounded-md transition-colors whitespace-nowrap">
                VANTA COLD
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
              {navLinks.map(({ href, label }) => (
                <Link key={href} href={href} data-testid={`link-nav-${label.toLowerCase()}`}>
                  <Button
                    variant="ghost"
                    className={`text-sm uppercase tracking-wide font-medium ${
                      location === href ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {label}
                  </Button>
                </Link>
              ))}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className={`text-sm uppercase tracking-wide font-medium gap-1.5 ${
                      osLinks.some(l => l.href === location) ? "text-foreground" : "text-muted-foreground"
                    }`}
                    aria-label="Vanta OS apps"
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    OS
                    <ChevronDown className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground/60">
                    Vanta OS
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {osLinks.map(({ href, label, desc, Icon }) => (
                    <DropdownMenuItem key={href} asChild className="gap-3 cursor-pointer">
                      <Link href={href}>
                        <Icon className="w-4 h-4 text-muted-foreground/60 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-tight">{label}</p>
                          <p className="text-[11px] text-muted-foreground/50 font-mono leading-tight mt-0.5">{desc}</p>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>

            {/* Right-side actions */}
            <div className="flex items-center gap-1 sm:gap-2">
              <form onSubmit={handleSearch} className="relative hidden lg:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search transmissions..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </form>

              <div className="hidden sm:block">
                <ThemeToggle />
              </div>

              {/* App Launcher */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLauncherOpen(o => !o)}
                aria-label="App launcher"
                title="App launcher"
                className={`text-muted-foreground/50 hover:text-muted-foreground ${launcherOpen ? "text-foreground bg-muted" : ""}`}
              >
                <Grid3x3 className="w-4 h-4" />
              </Button>

              <Link href="/vault">
                <Button
                  variant="ghost"
                  size="icon"
                  title="Vault"
                  className={`text-muted-foreground/50 hover:text-muted-foreground ${location === "/vault" ? "text-foreground" : ""}`}
                >
                  <LockKeyhole className="w-4 h-4" />
                </Button>
              </Link>

              {/* User profile menu */}
              {isUser && user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" title={`@${user.username}`} className="hidden sm:inline-flex">
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel className="font-normal">
                      <p className="text-sm font-medium">{user.display_name || user.username}</p>
                      <p className="text-xs text-muted-foreground font-mono">@{user.username}</p>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link href={`/profile/${user.username}`}>
                        <User className="w-4 h-4 mr-2" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link href="/dashboard">
                        <LayoutDashboard className="w-4 h-4 mr-2" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link href="/profile/edit">
                        <Settings className="w-4 h-4 mr-2" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="cursor-pointer text-muted-foreground"
                      onClick={() => userLogout.mutate()}
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : !isUser && !isAdmin && (
                <Link href="/login" className="hidden sm:inline-flex">
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground/70">
                    Sign In
                  </Button>
                </Link>
              )}

              {isAdmin && (
                <>
                  <Link href="/create">
                    <Button variant="default" size="default" className="hidden sm:flex items-center gap-2">
                      <PenSquare className="w-4 h-4" />
                      <span>New Transmission</span>
                    </Button>
                  </Link>
                  <Link href="/admin">
                    <Button variant="ghost" size="icon" title="Admin Dashboard">
                      <LayoutDashboard className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => adminLogout.mutate()}
                    title="Admin log out"
                    className="hidden sm:inline-flex"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </>
              )}

              {/* Mobile hamburger */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden ml-1"
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileOpen}
                aria-controls="mobile-nav-drawer"
                onClick={() => setMobileOpen(o => !o)}
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Mobile drawer backdrop ─────────────────────────────────── */}
      {mobileOpen && (
        <div
          ref={backdropRef}
          onClick={handleBackdropClick}
          style={{
            position: "fixed", inset: 0, zIndex: 49,
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(2px)",
          }}
          aria-hidden="true"
        />
      )}

      <nav
        id="mobile-nav-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
        style={{
          position: "fixed",
          top: 0, right: 0, bottom: 0,
          width: "min(320px, 88vw)",
          zIndex: 51,
          background: "hsl(var(--background))",
          borderLeft: "1px solid hsl(var(--border))",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          transform: mobileOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.25s cubic-bezier(0.32,0,0.67,0)",
          willChange: "transform",
        }}
        className="md:hidden"
      >
        {/* Drawer header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid hsl(var(--border))", minHeight: 64 }}>
          <span className="font-display font-bold text-lg tracking-tight">VANTA COLD</span>
          <button
            onClick={close}
            aria-label="Close menu"
            style={{ background: "none", border: "none", cursor: "pointer", color: "hsl(var(--foreground))", padding: 8, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", minWidth: 44, minHeight: 44 }}
          >
            <X size={20} />
          </button>
        </div>

        {/* User info in drawer */}
        {isUser && user && (
          <div style={{ padding: "12px 20px", borderBottom: "1px solid hsl(var(--border))" }}>
            <Link href={`/profile/${user.username}`} onClick={close}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "hsl(var(--muted))", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                  {user.avatar_url ? <img src={user.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <User size={14} />}
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600 }}>{user.display_name || user.username}</p>
                  <p style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", fontFamily: "monospace" }}>@{user.username}</p>
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* Theme toggle in drawer */}
        <div style={{ padding: "12px 20px", borderBottom: "1px solid hsl(var(--border))", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em" }}>Theme</span>
          <ThemeToggle />
        </div>

        {/* Main nav */}
        <div style={{ padding: "12px 0" }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "hsl(var(--muted-foreground))", padding: "8px 20px 6px", fontFamily: "var(--font-mono, monospace)" }}>Navigation</p>
          {navLinks.map(({ href, label }) => (
            <Link key={href} href={href} onClick={close}>
              <span style={{ display: "flex", alignItems: "center", padding: "14px 20px", fontSize: 15, fontWeight: 600, color: location === href ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))", borderLeft: location === href ? "2px solid hsl(var(--foreground))" : "2px solid transparent", cursor: "pointer", transition: "color 0.12s", minHeight: 48 }}>
                {label}
              </span>
            </Link>
          ))}
        </div>

        <div style={{ height: 1, background: "hsl(var(--border))", margin: "0 20px" }} />

        {/* Vanta OS */}
        <div style={{ padding: "12px 0 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 20px 6px" }}>
            <Terminal size={12} style={{ color: "hsl(var(--muted-foreground))" }} />
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "hsl(var(--muted-foreground))", fontFamily: "var(--font-mono, monospace)" }}>Vanta OS</p>
          </div>
          {osLinks.map(({ href, label, desc, Icon }) => (
            <Link key={href} href={href} onClick={close}>
              <span style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 20px", cursor: "pointer", borderLeft: location === href ? "2px solid hsl(var(--foreground))" : "2px solid transparent", minHeight: 52, transition: "background 0.12s" }}>
                <Icon size={18} style={{ color: location === href ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))", flexShrink: 0 }} />
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 14, fontWeight: 600, lineHeight: 1.25, color: location === href ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))" }}>{label}</span>
                  <span style={{ display: "block", fontSize: 11, color: "hsl(var(--muted-foreground))", opacity: 0.7, fontFamily: "var(--font-mono, monospace)", lineHeight: 1.4, marginTop: 2 }}>{desc}</span>
                </span>
              </span>
            </Link>
          ))}
        </div>

        {/* Auth actions */}
        <div style={{ padding: "12px 20px 24px", borderTop: "1px solid hsl(var(--border))", display: "flex", flexDirection: "column", gap: 8 }}>
          {isUser ? (
            <>
              <Link href="/dashboard" onClick={close}>
                <Button variant="outline" size="sm" className="w-full text-xs gap-2">
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  Dashboard
                </Button>
              </Link>
              <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground gap-2"
                onClick={() => { userLogout.mutate(); close(); }}>
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Link href="/login" onClick={close}>
                <Button variant="outline" size="sm" className="w-full text-xs">Sign In</Button>
              </Link>
              <Link href="/register" onClick={close}>
                <Button size="sm" className="w-full text-xs">Create Profile</Button>
              </Link>
            </>
          )}
        </div>
      </nav>
    </>
  );
}
