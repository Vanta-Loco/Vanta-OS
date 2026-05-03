import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAdmin } from "@/hooks/use-admin";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Post, Release, SiteContent } from "@shared/schema";
import { ABOUT_DEFAULTS } from "@shared/schema";
import {
  LogOut, Plus, Pencil, Trash2, Star, StarOff, Loader2, Save,
} from "lucide-react";
import { format } from "date-fns";

function AdminHeader({ onLogout, isPending }: { onLogout: () => void; isPending: boolean }) {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between h-16 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="font-display font-bold text-lg tracking-tight">VANTA COLD</span>
          <span className="text-muted-foreground text-xs">|</span>
          <span className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Admin</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/" data-testid="link-admin-view-site">
            <Button variant="ghost" size="default" className="text-xs">View Site</Button>
          </Link>
          <Button
            variant="outline"
            size="default"
            className="gap-2 text-xs"
            onClick={onLogout}
            disabled={isPending}
            data-testid="button-logout"
          >
            <LogOut className="w-3 h-3" />
            {isPending ? "Logging out…" : "Logout"}
          </Button>
        </div>
      </div>
    </header>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-1.5">
      {children}
    </p>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <span className="text-[11px] uppercase tracking-widest text-muted-foreground/60 font-mono whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 border-t border-border/50" />
    </div>
  );
}

function AboutEditor() {
  const { toast } = useToast();

  const { data, isLoading } = useQuery<SiteContent>({
    queryKey: ["/api/site-content/about"],
  });

  const [form, setForm] = useState<Omit<SiteContent, "key" | "updatedAt">>({
    title:         ABOUT_DEFAULTS.title,
    heroP1:        ABOUT_DEFAULTS.heroP1,
    heroP2:        ABOUT_DEFAULTS.heroP2,
    heroP3:        ABOUT_DEFAULTS.heroP3,
    journeyTitle:  ABOUT_DEFAULTS.journeyTitle,
    creativeTitle: ABOUT_DEFAULTS.creativeTitle,
    creativeBody:  ABOUT_DEFAULTS.creativeBody,
    visionTitle:   ABOUT_DEFAULTS.visionTitle,
    visionBody:    ABOUT_DEFAULTS.visionBody,
    missionTitle:  ABOUT_DEFAULTS.missionTitle,
    missionBody:   ABOUT_DEFAULTS.missionBody,
  });

  useEffect(() => {
    if (data) {
      setForm({
        title:         data.title,
        heroP1:        data.heroP1,
        heroP2:        data.heroP2,
        heroP3:        data.heroP3,
        journeyTitle:  data.journeyTitle,
        creativeTitle: data.creativeTitle,
        creativeBody:  data.creativeBody,
        visionTitle:   data.visionTitle,
        visionBody:    data.visionBody,
        missionTitle:  data.missionTitle,
        missionBody:   data.missionBody,
      });
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () => apiRequest("PATCH", "/api/site-content/about", form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/site-content/about"] });
      toast({ title: "About page saved." });
    },
    onError: () => toast({ title: "Save failed.", variant: "destructive" }),
  });

  function field(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
  }

  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 bg-muted rounded-md" />
        ))}
      </div>
    );
  }

  return (
    <div className="border border-border rounded-md p-6 space-y-5" data-testid="form-about-editor">
      {/* Hero */}
      <SectionDivider label="Hero" />

      <div>
        <FieldLabel>Page Title</FieldLabel>
        <Input
          value={form.title}
          onChange={field("title")}
          placeholder="About Vanta Cold"
          data-testid="input-about-title"
        />
      </div>

      <div>
        <FieldLabel>Paragraph 1</FieldLabel>
        <Textarea
          value={form.heroP1}
          onChange={field("heroP1")}
          rows={3}
          className="resize-none"
          data-testid="textarea-about-hero-p1"
        />
      </div>

      <div>
        <FieldLabel>Paragraph 2</FieldLabel>
        <Textarea
          value={form.heroP2}
          onChange={field("heroP2")}
          rows={3}
          className="resize-none"
          data-testid="textarea-about-hero-p2"
        />
      </div>

      <div>
        <FieldLabel>Paragraph 3</FieldLabel>
        <Textarea
          value={form.heroP3}
          onChange={field("heroP3")}
          rows={3}
          className="resize-none"
          data-testid="textarea-about-hero-p3"
        />
      </div>

      {/* Journey */}
      <SectionDivider label="Journey" />

      <div>
        <FieldLabel>Section Heading</FieldLabel>
        <Input
          value={form.journeyTitle}
          onChange={field("journeyTitle")}
          placeholder="The Journey"
          data-testid="input-about-journey-title"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-3">
          <div>
            <FieldLabel>Creative Process — Title</FieldLabel>
            <Input
              value={form.creativeTitle}
              onChange={field("creativeTitle")}
              placeholder="Creative Process"
              data-testid="input-about-creative-title"
            />
          </div>
          <div>
            <FieldLabel>Creative Process — Body</FieldLabel>
            <Textarea
              value={form.creativeBody}
              onChange={field("creativeBody")}
              rows={4}
              className="resize-none"
              data-testid="textarea-about-creative-body"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <FieldLabel>Building the Vision — Title</FieldLabel>
            <Input
              value={form.visionTitle}
              onChange={field("visionTitle")}
              placeholder="Building the Vision"
              data-testid="input-about-vision-title"
            />
          </div>
          <div>
            <FieldLabel>Building the Vision — Body</FieldLabel>
            <Textarea
              value={form.visionBody}
              onChange={field("visionBody")}
              rows={4}
              className="resize-none"
              data-testid="textarea-about-vision-body"
            />
          </div>
        </div>
      </div>

      {/* Mission */}
      <SectionDivider label="Mission" />

      <div>
        <FieldLabel>Mission Title</FieldLabel>
        <Input
          value={form.missionTitle}
          onChange={field("missionTitle")}
          placeholder="Our Mission"
          data-testid="input-about-mission-title"
        />
      </div>

      <div>
        <FieldLabel>Mission Body</FieldLabel>
        <Textarea
          value={form.missionBody}
          onChange={field("missionBody")}
          rows={4}
          className="resize-none"
          data-testid="textarea-about-mission-body"
        />
      </div>

      <div className="flex justify-end pt-2">
        <Button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="gap-2"
          data-testid="button-save-about"
        >
          {save.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {save.isPending ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

export default function Admin() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading, logout } = useAdmin();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/admin/login");
    }
  }, [isAuthenticated, authLoading, navigate]);

  const { data: posts, isLoading: postsLoading } = useQuery<Post[]>({
    queryKey: ["/api/posts"],
    enabled: isAuthenticated,
  });

  const { data: releases, isLoading: releasesLoading } = useQuery<Release[]>({
    queryKey: ["/api/releases"],
    enabled: isAuthenticated,
  });

  const deletePost = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/posts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      toast({ title: "Transmission deleted." });
    },
    onError: () => toast({ title: "Delete failed.", variant: "destructive" }),
  });

  const togglePostFeatured = useMutation({
    mutationFn: ({ id, featured }: { id: string; featured: string }) =>
      apiRequest("PATCH", `/api/posts/${id}`, { featured }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    },
    onError: () => toast({ title: "Update failed.", variant: "destructive" }),
  });

  const deleteRelease = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/releases/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/releases"] });
      toast({ title: "Release deleted." });
    },
    onError: () => toast({ title: "Delete failed.", variant: "destructive" }),
  });

  const toggleReleaseFeatured = useMutation({
    mutationFn: ({ id, featured }: { id: string; featured: string }) =>
      apiRequest("PATCH", `/api/releases/${id}`, { featured }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/releases"] });
    },
    onError: () => toast({ title: "Update failed.", variant: "destructive" }),
  });

  function confirmDelete(label: string, action: () => void) {
    if (window.confirm(`Delete "${label}"? This cannot be undone.`)) {
      action();
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AdminHeader
        onLogout={() => logout.mutate()}
        isPending={logout.isPending}
      />

      <main className="flex-1 max-w-7xl mx-auto px-6 lg:px-8 py-12 w-full space-y-12">

        {/* ── Transmissions ── */}
        <section data-testid="section-admin-posts">
          <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1 font-medium">
                Content
              </p>
              <h2 className="text-2xl font-display font-bold" data-testid="text-admin-posts-heading">
                Transmissions
              </h2>
            </div>
            <Link href="/create" data-testid="link-new-transmission">
              <Button variant="default" size="default" className="gap-2 text-sm">
                <Plus className="w-4 h-4" /> New Transmission
              </Button>
            </Link>
          </div>

          {postsLoading ? (
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted rounded-md" />
              ))}
            </div>
          ) : !posts || posts.length === 0 ? (
            <div className="border border-dashed border-border rounded-md py-12 text-center">
              <p className="text-muted-foreground text-sm" data-testid="text-no-posts-admin">
                No transmissions yet.
              </p>
            </div>
          ) : (
            <div className="border border-border rounded-md divide-y divide-border" data-testid="list-admin-posts">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="flex items-center gap-4 px-4 py-3 flex-wrap"
                  data-testid={`row-post-${post.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <p
                      className="font-medium text-sm truncate"
                      data-testid={`text-post-title-${post.id}`}
                    >
                      {post.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {post.category} ·{" "}
                      {format(new Date(post.createdAt), "MMM d, yyyy")}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {post.featured === "true" && (
                      <Badge variant="secondary" className="text-xs uppercase tracking-wide" data-testid={`badge-featured-post-${post.id}`}>
                        Featured
                      </Badge>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      title={post.featured === "true" ? "Remove featured" : "Set featured"}
                      onClick={() =>
                        togglePostFeatured.mutate({
                          id: post.id,
                          featured: post.featured === "true" ? "false" : "true",
                        })
                      }
                      data-testid={`button-toggle-featured-post-${post.id}`}
                    >
                      {post.featured === "true" ? (
                        <StarOff className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <Star className="w-4 h-4 text-muted-foreground" />
                      )}
                    </Button>

                    <Link href={`/edit/${post.id}`} data-testid={`link-edit-post-${post.id}`}>
                      <Button variant="ghost" size="icon" title="Edit">
                        <Pencil className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </Link>

                    <Button
                      variant="ghost"
                      size="icon"
                      title="Delete"
                      onClick={() =>
                        confirmDelete(post.title, () => deletePost.mutate(post.id))
                      }
                      data-testid={`button-delete-post-${post.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Releases ── */}
        <section data-testid="section-admin-releases">
          <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1 font-medium">
                Discography
              </p>
              <h2 className="text-2xl font-display font-bold" data-testid="text-admin-releases-heading">
                Releases
              </h2>
            </div>
            <Link href="/releases/new" data-testid="link-new-release">
              <Button variant="default" size="default" className="gap-2 text-sm">
                <Plus className="w-4 h-4" /> New Release
              </Button>
            </Link>
          </div>

          {releasesLoading ? (
            <div className="space-y-2 animate-pulse">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 bg-muted rounded-md" />
              ))}
            </div>
          ) : !releases || releases.length === 0 ? (
            <div className="border border-dashed border-border rounded-md py-12 text-center">
              <p className="text-muted-foreground text-sm" data-testid="text-no-releases-admin">
                No releases yet.
              </p>
            </div>
          ) : (
            <div className="border border-border rounded-md divide-y divide-border" data-testid="list-admin-releases">
              {releases.map((release) => (
                <div
                  key={release.id}
                  className="flex items-center gap-4 px-4 py-3 flex-wrap"
                  data-testid={`row-release-${release.id}`}
                >
                  {release.coverImage && (
                    <img
                      src={release.coverImage}
                      alt={release.title}
                      className="w-10 h-10 rounded-sm object-cover shrink-0"
                      data-testid={`img-admin-release-${release.id}`}
                    />
                  )}

                  <div className="flex-1 min-w-0">
                    <p
                      className="font-medium text-sm truncate"
                      data-testid={`text-release-title-admin-${release.id}`}
                    >
                      {release.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                      {release.type} · {release.releaseDate}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {release.featured === "true" && (
                      <Badge variant="secondary" className="text-xs uppercase tracking-wide" data-testid={`badge-featured-release-${release.id}`}>
                        Featured
                      </Badge>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      title={release.featured === "true" ? "Remove featured" : "Set featured"}
                      onClick={() =>
                        toggleReleaseFeatured.mutate({
                          id: release.id,
                          featured: release.featured === "true" ? "false" : "true",
                        })
                      }
                      data-testid={`button-toggle-featured-release-${release.id}`}
                    >
                      {release.featured === "true" ? (
                        <StarOff className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <Star className="w-4 h-4 text-muted-foreground" />
                      )}
                    </Button>

                    <Link href={`/releases/edit/${release.id}`} data-testid={`link-edit-release-${release.id}`}>
                      <Button variant="ghost" size="icon" title="Edit">
                        <Pencil className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </Link>

                    <Button
                      variant="ghost"
                      size="icon"
                      title="Delete"
                      onClick={() =>
                        confirmDelete(release.title, () => deleteRelease.mutate(release.id))
                      }
                      data-testid={`button-delete-release-${release.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── About Page ── */}
        <section data-testid="section-admin-about">
          <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1 font-medium">
                Site Content
              </p>
              <h2 className="text-2xl font-display font-bold" data-testid="text-admin-about-heading">
                About Page
              </h2>
            </div>
            <Link href="/about" target="_blank" data-testid="link-view-about">
              <Button variant="ghost" size="default" className="text-xs">
                View Page
              </Button>
            </Link>
          </div>

          <AboutEditor />
        </section>

      </main>
    </div>
  );
}
