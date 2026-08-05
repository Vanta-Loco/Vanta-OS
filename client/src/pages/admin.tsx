import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { AdminLayout, AdminGuard } from "@/components/admin/admin-layout";
import { Button } from "@/components/ui/button";
import { useAdmin } from "@/hooks/use-admin";
import {
  FileText, Disc3, Package, Leaf, Globe2, Search, Users,
  BookOpen, Clock, Smartphone, Settings, ArrowRight,
} from "lucide-react";

export default function Admin() {
  return (
    <AdminGuard>
      <DashboardContent />
    </AdminGuard>
  );
}

function StatCard({ label, value, loading }: { label: string; value: number; loading: boolean }) {
  return (
    <div className="border border-border rounded-md p-4">
      <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-1">{label}</p>
      <p className="text-2xl font-display font-bold">{loading ? "—" : value}</p>
    </div>
  );
}

type Section = {
  label: string;
  href: string;
  icon: React.ElementType;
  desc: string;
  group: string;
};

const SECTIONS: Section[] = [
  { label: "Blog",          href: "/admin/blog",        icon: FileText,   desc: "Manage posts, drafts, and featured content",        group: "Content"   },
  { label: "Releases",      href: "/admin/releases",    icon: Disc3,      desc: "Manage music releases and discography",             group: "Content"   },
  { label: "Vault",         href: "/admin/vault",       icon: Package,    desc: "Manage vault tracks and audio files",               group: "Content"   },
  { label: "Stonerism",     href: "/admin/stonerism",   icon: Leaf,       desc: "Articles, businesses, reviews, events, newsletter", group: "Content"   },
  { label: "Dev Logs",      href: "/admin/devlogs",     icon: BookOpen,   desc: "Create and publish developer log entries",          group: "Content"   },
  { label: "World Alpha",   href: "/admin/world",       icon: Globe2,     desc: "Status, version, availability settings",           group: "Ecosystem" },
  { label: "Black Index",   href: "/admin/black-index", icon: Search,     desc: "Control which content types are publicly indexed",  group: "Ecosystem" },
  { label: "App Teasers",   href: "/admin/apps",        icon: Smartphone, desc: "Manage upcoming app announcements",                 group: "Ecosystem" },
  { label: "Early Access",  href: "/admin/waitlists",   icon: Clock,      desc: "View and manage waitlist signups",                  group: "Ecosystem" },
  { label: "Users",         href: "/admin/users",       icon: Users,      desc: "User and profile management",                      group: "Community" },
  { label: "Site Settings", href: "/admin/settings",    icon: Settings,   desc: "Edit About page and site-wide content",            group: "System"    },
];

function DashboardContent() {
  const { isAuthenticated } = useAdmin();

  const { data: posts,    isLoading: postsLoading    } = useQuery<any[]>({ queryKey: ["/api/admin/posts"],        enabled: isAuthenticated });
  const { data: releases, isLoading: releasesLoading } = useQuery<any[]>({ queryKey: ["/api/releases"],           enabled: isAuthenticated });
  const { data: vault,    isLoading: vaultLoading    } = useQuery<any[]>({ queryKey: ["/api/admin/vault/items"],  enabled: isAuthenticated });
  const { data: devlogs,  isLoading: devlogsLoading  } = useQuery<any[]>({ queryKey: ["/api/admin/devlogs"],      enabled: isAuthenticated });
  const { data: waitlists,isLoading: waitlistsLoading} = useQuery<any[]>({ queryKey: ["/api/admin/waitlists"],    enabled: isAuthenticated });
  const { data: apps,     isLoading: appsLoading     } = useQuery<any[]>({ queryKey: ["/api/admin/apps"],         enabled: isAuthenticated });

  const groups = Array.from(new Set(SECTIONS.map(s => s.group)));

  return (
    <AdminLayout title="Dashboard">
      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-10">
        <StatCard label="Posts"     value={posts?.length    ?? 0} loading={postsLoading} />
        <StatCard label="Releases"  value={releases?.length ?? 0} loading={releasesLoading} />
        <StatCard label="Vault"     value={vault?.length    ?? 0} loading={vaultLoading} />
        <StatCard label="Dev Logs"  value={devlogs?.length  ?? 0} loading={devlogsLoading} />
        <StatCard label="Waitlists" value={waitlists?.length?? 0} loading={waitlistsLoading} />
        <StatCard label="Teasers"   value={apps?.length     ?? 0} loading={appsLoading} />
      </div>

      {/* Section cards by group */}
      {groups.map(group => (
        <div key={group} className="mb-8">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-mono mb-3">{group}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {SECTIONS.filter(s => s.group === group).map(section => {
              const Icon = section.icon;
              return (
                <Link key={section.href} href={section.href}>
                  <div className="border border-border rounded-lg p-4 hover:border-primary/40 hover:bg-muted/30 transition-colors cursor-pointer group">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{section.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{section.desc}</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground/40 shrink-0 mt-0.5 group-hover:text-muted-foreground transition-colors" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ))}

      {/* Quick links */}
      <div className="border-t border-border pt-6 mt-4">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-mono mb-3">Quick Actions</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/create"><Button variant="outline" size="sm" className="text-xs">New Blog Post</Button></Link>
          <Link href="/releases/new"><Button variant="outline" size="sm" className="text-xs">New Release</Button></Link>
        </div>
      </div>
    </AdminLayout>
  );
}
