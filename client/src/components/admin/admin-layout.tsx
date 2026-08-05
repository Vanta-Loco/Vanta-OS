import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAdmin } from "@/hooks/use-admin";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  FileText, Disc3, Package, Leaf, Globe2, Search, Users,
  BookOpen, Clock, Smartphone, Settings, LogOut, Menu, X,
  LayoutDashboard, Shield,
} from "lucide-react";

type NavItem = { label: string; href: string; icon: React.ElementType };
type NavGroup = { group: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    group: "CONTENT",
    items: [
      { label: "Blog",        href: "/admin/blog",       icon: FileText   },
      { label: "Releases",    href: "/admin/releases",   icon: Disc3      },
      { label: "Vault",       href: "/admin/vault",      icon: Package    },
      { label: "Stonerism",   href: "/admin/stonerism",  icon: Leaf       },
      { label: "Dev Logs",    href: "/admin/devlogs",    icon: BookOpen   },
    ],
  },
  {
    group: "ECOSYSTEM",
    items: [
      { label: "World Alpha", href: "/admin/world",        icon: Globe2     },
      { label: "Black Index", href: "/admin/black-index",  icon: Search     },
      { label: "App Teasers", href: "/admin/apps",         icon: Smartphone },
      { label: "Early Access",href: "/admin/waitlists",    icon: Clock      },
    ],
  },
  {
    group: "COMMUNITY",
    items: [
      { label: "Users",       href: "/admin/users",      icon: Users      },
    ],
  },
  {
    group: "SYSTEM",
    items: [
      { label: "Site Settings", href: "/admin/settings", icon: Settings   },
    ],
  },
];

function NavLink({ item, onClick }: { item: NavItem; onClick?: () => void }) {
  const [location] = useLocation();
  const active = location === item.href;
  const Icon = item.icon;
  return (
    <Link href={item.href} onClick={onClick}>
      <div
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors cursor-pointer",
          active
            ? "bg-primary/10 text-primary font-medium"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
        )}
      >
        <Icon className="w-4 h-4 shrink-0" />
        {item.label}
      </div>
    </Link>
  );
}

function Sidebar({ onClose }: { onClose?: () => void }) {
  const { logout } = useAdmin();
  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-4 py-5 border-b border-border flex items-center justify-between">
        <Link href="/admin" onClick={onClose}>
          <div className="flex items-center gap-2 cursor-pointer">
            <Shield className="w-4 h-4 text-primary" />
            <div>
              <p className="font-display font-bold text-sm tracking-tight leading-none">VANTA COLD</p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mt-0.5">Admin</p>
            </div>
          </div>
        </Link>
        {onClose && (
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Overview link */}
      <div className="px-3 pt-4">
        <NavLink item={{ label: "Dashboard", href: "/admin", icon: LayoutDashboard }} onClick={onClose} />
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
        {NAV.map((group) => (
          <div key={group.group}>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-mono px-3 mb-1">
              {group.group}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink key={item.href} item={item} onClick={onClose} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 pt-3 border-t border-border space-y-1">
        <Link href="/" onClick={onClose}>
          <div className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer transition-colors">
            <Globe2 className="w-4 h-4 shrink-0" />
            View Site
          </div>
        </Link>
        <button
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {logout.isPending ? "Logging out…" : "Logout"}
        </button>
      </div>
    </div>
  );
}

export function AdminLayout({
  children,
  title,
  action,
}: {
  children: React.ReactNode;
  title?: string;
  action?: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-border bg-card/30 fixed top-0 left-0 h-screen z-40">
        <Sidebar />
      </aside>

      {/* Mobile overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-screen w-64 border-r border-border bg-card z-50 lg:hidden transition-transform duration-200",
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <Sidebar onClose={() => setDrawerOpen(false)} />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:ml-60 min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-md h-14 flex items-center px-4 lg:px-8 gap-4">
          <button
            className="lg:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setDrawerOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1 flex items-center gap-3">
            {title && (
              <h1 className="font-display font-bold text-base tracking-tight">{title}</h1>
            )}
          </div>
          {action && <div className="flex items-center gap-2">{action}</div>}
        </header>

        {/* Page content */}
        <main className="flex-1 px-4 lg:px-8 py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

/** Auth guard — wraps any admin section. Redirects to /admin/login if not authenticated. */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const [, navigate] = useLocation();
  const { isAuthenticated, isLoading, isFetching } = useAdmin();

  // Must use useEffect — calling navigate during render causes React warnings
  const shouldRedirect = !isLoading && !isFetching && !isAuthenticated;
  useEffect(() => {
    if (shouldRedirect) navigate("/admin/login");
  }, [shouldRedirect, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return <>{children}</>;
}
