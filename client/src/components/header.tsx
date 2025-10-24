import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { PenSquare } from "lucide-react";

export function Header() {
  const [location] = useLocation();

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
            <Link href="/" data-testid="link-nav-home">
              <Button
                variant="ghost"
                className={`text-sm uppercase tracking-wide font-medium ${
                  location === "/" ? "text-foreground" : "text-muted-foreground"
                }`}
                data-testid="button-nav-home"
              >
                Home
              </Button>
            </Link>
            <Link href="/about" data-testid="link-nav-about">
              <Button
                variant="ghost"
                className={`text-sm uppercase tracking-wide font-medium ${
                  location === "/about" ? "text-foreground" : "text-muted-foreground"
                }`}
                data-testid="button-nav-about"
              >
                About
              </Button>
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/create" data-testid="link-create-post">
              <Button
                variant="default"
                size="default"
                className="hidden sm:flex items-center gap-2"
                data-testid="button-create-post"
              >
                <PenSquare className="w-4 h-4" />
                <span>New Post</span>
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
