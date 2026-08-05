// ─── Developer Logs — Public Listing ─────────────────────────────────────────
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Header } from "@/components/header";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Calendar, ChevronRight } from "lucide-react";

const FILTERS = ["All", "Vanta OS", "World", "Vault", "Stonerism", "Black Index", "Profiles"];

interface DevLog {
  id: string;
  title: string;
  slug: string;
  summary: string;
  status: string;
  affected_apps: string[];
  log_number: number | null;
  cover_image: string;
  author: string;
  published_at: string | null;
  created_at: string;
}

export default function DevLogs() {
  const [filter, setFilter] = useState("All");

  const { data: logs = [], isLoading } = useQuery<DevLog[]>({
    queryKey: ["/api/devlogs"],
    queryFn: () => fetch("/api/devlogs").then(r => r.json()),
  });

  const filtered = filter === "All"
    ? logs
    : logs.filter(l =>
        (l.affected_apps || []).some(a =>
          a.toLowerCase().includes(filter.toLowerCase())
        )
      );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20">
        {/* Header */}
        <div className="mb-10">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40 mb-2">
            VANTA OS · DEV LOGS
          </p>
          <h1 className="text-2xl font-display font-bold tracking-wide mb-2">Developer Logs</h1>
          <p className="text-sm text-muted-foreground">
            Build journal — transparent development updates from the Vanta team.
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap mb-8">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs font-mono px-3 py-1.5 rounded-md border transition-colors ${
                filter === f
                  ? "bg-foreground text-background border-foreground"
                  : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Logs */}
        {isLoading ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="border border-border rounded-xl p-6 animate-pulse">
                <div className="h-4 bg-muted rounded w-24 mb-3" />
                <div className="h-5 bg-muted rounded w-64 mb-2" />
                <div className="h-4 bg-muted rounded w-full" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="border border-border rounded-xl p-12 text-center">
            <BookOpen className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {filter !== "All" ? `No dev logs tagged with "${filter}" yet.` : "No dev logs published yet."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filtered.map(log => (
              <Link key={log.id} href={`/devlogs/${log.slug}`}>
                <div className="border border-border rounded-xl p-6 hover:border-primary/30 hover:bg-muted/10 transition-all cursor-pointer group">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        {log.log_number != null && (
                          <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest">
                            #{String(log.log_number).padStart(3, "0")}
                          </span>
                        )}
                        {(log.affected_apps || []).slice(0, 3).map(app => (
                          <Badge key={app} variant="outline" className="text-[10px] font-mono py-0">
                            {app}
                          </Badge>
                        ))}
                      </div>
                      <h2 className="text-base font-semibold tracking-wide mb-2 group-hover:text-primary transition-colors">
                        {log.title}
                      </h2>
                      {log.summary && (
                        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                          {log.summary}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground/50 font-mono">
                        {log.published_at && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(log.published_at).toLocaleDateString("en-GB", {
                              day: "numeric", month: "short", year: "numeric",
                            })}
                          </span>
                        )}
                        {log.author && <span>{log.author}</span>}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors mt-1 shrink-0" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
