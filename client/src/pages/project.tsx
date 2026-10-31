import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { ArrowLeft, ArrowUpRight, MapPin, ShieldAlert } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { getUserToken, useUser } from "@/hooks/use-user";

type Project = {
  id: string;
  title: string;
  description: string;
  work_type: string;
  external_url: string | null;
  thumbnail_url: string | null;
  room_id: string | null;
  room_name: string | null;
  room_slug: string | null;
  is_featured: boolean;
  created_at: string;
  creator_username: string;
  creator_display_name: string;
  creator_image_url: string | null;
  creator_is_certified: boolean;
};

export default function ProjectPage() {
  const { id = "" } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useUser();
  const { data, isLoading, error } = useQuery<{ project: Project }>({
    queryKey: ["/api/projects", id],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${encodeURIComponent(id)}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Project not found");
      return result;
    },
  });
  const project = data?.project;

  async function reportProject() {
    const reason = window.prompt("Briefly describe the concern. Reports are reviewed privately.");
    if (!reason?.trim()) return;
    const token = getUserToken();
    try {
      const response = await fetch("/api/social/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { "X-User-Token": token } : {}) },
        body: JSON.stringify({ targetType: "project", targetId: id, reason }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Could not submit report");
      window.alert("Report submitted for review.");
    } catch (reportError) {
      window.alert(reportError instanceof Error ? reportError.message : "Could not submit report.");
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto min-h-[70vh] max-w-5xl px-5 pb-20 pt-28 sm:px-8">
        <Link href={project ? `/creators/${project.creator_username}` : "/creators"} className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-3.5 w-3.5" /> Creator archive
        </Link>
        {isLoading && <div className="mt-8 h-96 animate-pulse rounded-2xl border border-border bg-card/30" />}
        {error && <div className="mt-8 rounded-xl border border-border p-8 text-center"><h1 className="font-display text-3xl">Project unavailable.</h1><p className="mt-2 text-sm text-muted-foreground">{error.message}</p><Link href="/creators"><Button className="mt-6" variant="outline">Browse Creators</Button></Link></div>}
        {project && (
          <article className="mt-8 overflow-hidden rounded-2xl border border-border bg-card/35">
            <div className="relative aspect-[16/8] overflow-hidden bg-[radial-gradient(circle_at_65%_25%,rgba(140,92,190,.35),transparent_38%),linear-gradient(135deg,hsl(var(--muted)),hsl(var(--background)))]">
              {project.thumbnail_url && <img src={project.thumbnail_url} alt="" className="h-full w-full object-cover" />}
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 sm:bottom-8 sm:left-8">
                <p className="text-[10px] font-mono uppercase tracking-[.3em] text-primary/80">{project.work_type} · Creator Project</p>
                <h1 className="mt-2 max-w-3xl font-display text-4xl font-semibold tracking-tight sm:text-6xl">{project.title}<span className="text-primary">.</span></h1>
              </div>
            </div>
            <div className="grid gap-8 p-5 sm:p-8 md:grid-cols-[1fr_270px]">
              <div>
                <p className="whitespace-pre-wrap break-words text-sm leading-7 text-foreground/85 sm:text-base">{project.description || "This creator has not added a project description yet."}</p>
                {project.room_id && project.room_name && (
                  <Link href={`/rooms/${project.room_id}`} className="mt-6 inline-flex items-center gap-2 text-xs text-primary hover:underline">
                    <MapPin className="h-3.5 w-3.5" /> {project.room_name}
                  </Link>
                )}
              </div>
              <aside className="h-fit rounded-xl border border-border bg-background/50 p-5">
                <p className="text-[9px] font-mono uppercase tracking-[.25em] text-muted-foreground/55">Creator</p>
                <Link href={`/creators/${project.creator_username}`} className="mt-4 flex items-center gap-3 group">
                  {project.creator_image_url
                    ? <img src={project.creator_image_url} alt="" className="h-11 w-11 rounded-full border border-border object-cover" />
                    : <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-primary/30 bg-primary/10 font-mono text-primary">{(project.creator_display_name || project.creator_username).slice(0, 1).toUpperCase()}</span>}
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium group-hover:text-primary">{project.creator_display_name || project.creator_username}</span>
                    <span className="mt-1 block text-[10px] font-mono text-muted-foreground/55">@{project.creator_username}</span>
                  </span>
                </Link>
                {project.creator_is_certified && <p className="mt-3 text-[9px] font-mono uppercase tracking-widest text-primary">Certified Creator</p>}
                {project.external_url && <a href={project.external_url} target="_blank" rel="noopener noreferrer"><Button className="mt-5 w-full gap-2" variant="outline">View Work <ArrowUpRight className="h-3.5 w-3.5" /></Button></a>}
                {isAuthenticated && user?.username !== project.creator_username && <button type="button" onClick={reportProject} className="mt-5 inline-flex items-center gap-2 text-xs text-muted-foreground/55 hover:text-amber-200"><ShieldAlert className="h-3.5 w-3.5" /> Report project</button>}
              </aside>
            </div>
          </article>
        )}
      </main>
      <Footer />
    </div>
  );
}
