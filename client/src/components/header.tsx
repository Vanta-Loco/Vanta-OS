import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { PenSquare, Search } from "lucide-react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/releases", label: "Releases" },
  { href: "/worlds", label: "Worlds" },
  { href: "/about", label: "About" },
];

export function Header() {
  const [location, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border backdrop-blur-md bg-background/80">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
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
            <Link href="/create" data-testid="link-create-post-mobile">
              <Button
                variant="default"
                size="icon"
                className="sm:hidden"
                data-testid="button-create-post-mobile"
              >
                <PenSquare className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
