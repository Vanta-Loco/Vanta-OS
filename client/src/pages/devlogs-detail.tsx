// ─── Developer Log — Detail Page ─────────────────────────────────────────────
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { Header } from "@/components/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, AlertCircle, ArrowRight, Calendar } from "lucide-react";

interface DevLog {
  id: string;
  title: string;
  slug: string;
  summary: string;
  body: string;
  status: string;
  affected_apps: string[];
  log_number: number | null;
  cover_image: string;
  author: string;
  completed_changes: string[];
  in_progress: string[];
  known_issues: string;
  next_steps: string;
  published_at: string | null;
  created_at: string;
}

export default function DevLogDetail() {
  const { slug } = useParams<{ slug: string }>();

  const { data: log, isLoading, error } = useQuery<DevLog>({
    queryKey: ["/api/devlogs", slug],
    queryFn: () =>
      fetch(`/api/devlogs/${slug}`).then(r => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      }),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-24 pb-20 animate-pulse">
          <div className="h-4 bg-muted rounded w-32 mb-6" />
          <div className="h-7 bg-muted rounded w-72 mb-4" />
          <div className="h-4 bg-muted rounded w-full mb-2" />
          <div className="h-4 bg-muted rounded w-5/6" />
        </div>
      </div>
    );
  }

  if (error || !log) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-24 pb-20 text-center">
          <AlertCircle className="w-10 h-10 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">Dev log not found.</p>
          <Link href="/devlogs">
            <Button variant="outline" size="sm">Back to Dev Logs</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20">
        {/* Back */}
        <Link href="/devlogs">
          <Button variant="ghost" size="sm" className="mb-8 -ml-2 text-muted-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Dev Logs
          </Button>
        </Link>

        {/* Cover image */}
        {log.cover_image && (
          <div className="w-full h-48 rounded-xl overflow-hidden mb-8 border border-border">
            <img src={log.cover_image} alt={log.title} className="w-full h-full object-cover" />
          </div>
        )}

        {/* Meta */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {log.log_number != null && (
            <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest">
              DEV LOG #{String(log.log_number).padStart(3, "0")}
            </span>
          )}
          {(log.affected_apps || []).map(app => (
            <Badge key={app} variant="outline" className="text-[10px] font-mono py-0">{app}</Badge>
          ))}
        </div>

        <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-wide mb-4">
          {log.title}
        </h1>

        {log.summary && (
          <p className="text-base text-muted-foreground mb-6 leading-relaxed">{log.summary}</p>
        )}

        <div className="flex items-center gap-4 text-xs text-muted-foreground/50 font-mono mb-8">
          {log.published_at && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(log.published_at).toLocaleDateString("en-GB", {
                day: "numeric", month: "long", year: "numeric",
              })}
            </span>
          )}
          {log.author && <span>by {log.author}</span>}
        </div>

        <div className="w-full h-px bg-border mb-8" />

        {/* Completed changes */}
        {(log.completed_changes || []).length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-widest font-mono mb-4 text-muted-foreground">
              Completed
            </h2>
            <ul className="flex flex-col gap-2">
              {log.completed_changes.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-primary/60 mt-0.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* In progress */}
        {(log.in_progress || []).length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-widest font-mono mb-4 text-muted-foreground">
              In Development
            </h2>
            <ul className="flex flex-col gap-2">
              {log.in_progress.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <div className="w-4 h-4 rounded-full border border-muted-foreground/30 mt-0.5 shrink-0 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                  </div>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Body content */}
        {log.body && (
          <div className="mb-8">
            <div className="prose prose-sm max-w-none dark:prose-invert text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {log.body}
            </div>
          </div>
        )}

        {/* Known issues */}
        {log.known_issues && (
          <div className="mb-8 border border-border/60 rounded-xl p-5">
            <h2 className="text-sm font-semibold uppercase tracking-widest font-mono mb-3 text-muted-foreground flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Known Issues
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{log.known_issues}</p>
          </div>
        )}

        {/* Next steps */}
        {log.next_steps && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-widest font-mono mb-3 text-muted-foreground flex items-center gap-2">
              <ArrowRight className="w-4 h-4" />
              Next
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{log.next_steps}</p>
          </div>
        )}

        <div className="border-t border-border pt-6 mt-8">
          <Link href="/devlogs">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dev Logs
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
