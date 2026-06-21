import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  PenSquare, Search, LayoutDashboard, LogOut, LockKeyhole, Terminal, ChevronDown,
  MapPin, Database, Radio, Coins, Mountain, Skull,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAdmin } from "@/hooks/use-admin";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/releases", label: "Releases" },
  { href: "/worlds", label: "Worlds" },
  { href: "/about", label: "About" },
];

const osLinks = [
  { href: "/world", label: "District", desc: "Vanta City map", Icon: MapPin },
  { href: "/search", label: "Black Index", desc: "Archive search", Icon: Database },
  { href: "/wireline", label: "Wireline", desc: "Dispatch relay", Icon: Radio },
  { href: "/fract", label: "FRACT", desc: "Reputation economy", Icon: Coins },
  { href: "/himalayas", label: "Hidden Himalayas", desc: "Cold expansion", Icon: Mountain },
  { href: "/fgh", label: "Fractured Godhead", desc: "Lore archive", Icon: Skull },
];

export function Header() {
  const [location, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const { isAuthenticated: isAdmin, logout } = useAdmin();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border backdrop-blur-md bg-background/80">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          <Link href="/" data-testid="link-home">
            <span className="text-2xl font-display font-bold tracking-tight hover-elevate cursor-pointer px-3 py-2 rounded-md transition-colors">
              VANTA COLD
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, label }) => (
              <Link key={href} href={href} data-testid={`link-nav-${label.toLowerCase()}`}>
                <Button
                  variant="ghost"
                  className={`text-sm uppercase tracking-wide font-medium ${
                    location === href ? "text-foreground" : "text-muted-foreground"
                  }`}
                  data-testid={`button-nav-${label.toLowerCase()}`}
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
                    osLinks.some((l) => l.href === location) ? "text-foreground" : "text-muted-foreground"
                  }`}
                  data-testid="button-nav-os"
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
                    <Link href={href} data-testid={`link-os-${label.toLowerCase().replace(/\s+/g, "-")}`}>
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

          <div className="flex items-center gap-2">
            <form onSubmit={handleSearch} className="relative hidden lg:block">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search transmissions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
                data-testid="input-search"
              />
            </form>
            <ThemeToggle />

            {/* Vault link — always visible, distinct from admin */}
            <Link href="/vault" data-testid="link-vault">
              <Button
                variant="ghost"
                size="icon"
                title="Vault"
                data-testid="button-vault-link"
                className={`text-muted-foreground/50 hover:text-muted-foreground ${
                  location === "/vault" ? "text-foreground" : ""
                }`}
              >
                <LockKeyhole className="w-4 h-4" />
              </Button>
            </Link>

            {isAdmin ? (
              <>
                <Link href="/create" data-testid="link-create-post">
                  <Button
                    variant="default"
                    size="default"
                    className="hidden sm:flex items-center gap-2"
                    data-testid="button-create-post"
                  >
                    <PenSquare className="w-4 h-4" />
                    <span>New Transmission</span>
                  </Button>
                </Link>
                <Link href="/admin" data-testid="link-admin-dashboard">
                  <Button variant="ghost" size="icon" data-testid="button-admin-dashboard" title="Admin Dashboard">
                    <LayoutDashboard className="w-4 h-4" />
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => logout.mutate()}
                  data-testid="button-admin-logout"
                  title="Log out"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <Link href="/admin/login" data-testid="link-admin-login">
                <Button
                  variant="ghost"
                  size="icon"
                  data-testid="button-admin-login"
                  title="Admin login"
                  className="text-muted-foreground/40 hover:text-muted-foreground"
                >
                  <LayoutDashboard className="w-4 h-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
