import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { PostCard } from "@/components/post-card";
import { SkeletonPostCard } from "@/components/skeleton-post-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Post, Release } from "@shared/schema";
import heroImage from "@assets/generated_images/Music_studio_lifestyle_hero_cf7ae2f2.png";
import cityImage from "@assets/generated_images/Urban_night_cityscape_mood_2c3c2c61.png";
import { SiSpotify, SiApplemusic, SiSoundcloud, SiYoutube } from "react-icons/si";
import { ArrowRight, Globe, Lock, Music, Plus } from "lucide-react";

const worlds = [
  {
    id: "vanta-cold",
    name: "Vanta Cold",
    tagline: "The Label",
    description: "The creative headquarters. Music, visuals, and the architecture of the sound.",
    status: "Active",
    href: "/worlds",
  },
  {
    id: "vanta-os",
    name: "Vanta OS",
    tagline: "The System",
    description: "An evolving interface for navigating the Vanta universe. Access restricted.",
    status: "In Development",
    href: "/enter",
  },
  {
    id: "fractured-godhead",
    name: "Fractured Godhead",
    tagline: "The Mythology",
    description: "A conceptual universe built through sound, story, and visual language.",
    status: "In Development",
    href: "/worlds",
  },
  {
    id: "solo-mission",
    name: "Solo Mission",
    tagline: "The Solo Project",
    description: "Independent transmissions from the artist. Personal, direct, unfiltered.",
    status: "Active",
    href: "/worlds",
  },
  {
    id: "mobbrats",
    name: "Mobbrats",
    tagline: "The Collective",
    description: "A crew-based project living at the intersection of street culture and music.",
    status: "Coming Soon",
    href: "/worlds",
  },
];

const statusColor: Record<string, string> = {
  "Active": "bg-primary/20 text-primary border-primary/30",
  "In Development": "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  "Coming Soon": "bg-muted/40 text-muted-foreground border-border",
};

export default function Home() {
  const { data: posts, isLoading } = useQuery<Post[]>({
    queryKey: ["/api/posts"],
  });

  const { data: releases, isLoading: releasesLoading } = useQuery<Release[]>({
    queryKey: ["/api/releases"],
  });

  const featuredPost = posts?.find((p) => p.featured === "true");
  const regularPosts = posts?.filter((p) => p.featured !== "true") || [];

  const featuredRelease =
    releases?.find((r) => r.featured === "true") ?? releases?.[0] ?? null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* ── HERO — unchanged ── */}
      <section className="relative h-[85vh] min-h-[600px] flex items-end overflow-hidden">
        <img
          src={heroImage}
          alt="Vanta Cold Studio"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 hero-gradient-overlay" />
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 pb-16 md:pb-24 z-10">
          <div className="max-w-4xl">
            <h1
              className="text-5xl md:text-6xl lg:text-7xl font-display font-bold text-foreground mb-6 leading-tight"
              data-testid="text-hero-title"
            >
              The Music Journey
            </h1>
            <p
              className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl leading-relaxed"
              data-testid="text-hero-subtitle"
            >
              Documenting the creative process, lifestyle moments, and the path
              of building Vanta Cold from the ground up.
            </p>
          </div>
        </div>
      </section>

      {/* ── TRANSMISSIONS / POSTS — unchanged ── */}
      <main className="flex-1 bg-background">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16 md:py-24">
          {featuredPost && (
            <section className="mb-16">
              <h2
                className="text-3xl md:text-4xl font-display font-bold mb-8"
                data-testid="text-featured-heading"
              >
                Featured
              </h2>
              <PostCard post={featuredPost} featured />
            </section>
          )}

          <section>
            <h2
              className="text-3xl md:text-4xl font-display font-bold mb-8"
              data-testid="text-latest-heading"
            >
              {featuredPost ? "Latest Transmissions" : "All Transmissions"}
            </h2>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <SkeletonPostCard key={i} />
                ))}
              </div>
            ) : regularPosts.length === 0 ? (
              <div className="text-center py-24">
                <p className="text-xl text-muted-foreground" data-testid="text-no-posts">
                  No posts yet. Start creating your music journey.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {regularPosts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* ── FEATURED RELEASE — dynamic ── */}
      <section className="bg-card border-t border-border py-20" data-testid="section-featured-release">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between mb-10 flex-wrap gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1 font-medium">Latest Release</p>
              <h2 className="text-3xl md:text-4xl font-display font-bold" data-testid="text-release-section-heading">
                New Music
              </h2>
            </div>
            <Link href="/releases" data-testid="link-view-all-releases">
              <Button variant="outline" className="gap-2">
                View All Releases <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          {releasesLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center animate-pulse">
              <div className="aspect-square max-w-md w-full bg-muted rounded-md" />
              <div className="space-y-4">
                <div className="h-5 bg-muted rounded w-16" />
                <div className="h-9 bg-muted rounded w-64" />
                <div className="h-4 bg-muted rounded w-full" />
                <div className="h-4 bg-muted rounded w-4/5" />
                <div className="flex gap-3">
                  <div className="h-10 bg-muted rounded w-28" />
                  <div className="h-10 bg-muted rounded w-32" />
                </div>
              </div>
            </div>
          ) : featuredRelease ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="relative aspect-square max-w-md w-full overflow-hidden rounded-md">
                <img
                  src={featuredRelease.coverImage}
                  alt={featuredRelease.title}
                  className="w-full h-full object-cover"
                  data-testid="img-featured-release"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
              </div>

              <div className="space-y-6">
                <div>
                  <Badge variant="outline" className="mb-3 uppercase tracking-wide text-xs font-medium">
                    {featuredRelease.type}
                  </Badge>
                  <h3
                    className="text-2xl md:text-3xl font-display font-bold mb-3"
                    data-testid="text-release-title"
                  >
                    {featuredRelease.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed" data-testid="text-release-description">
                    {featuredRelease.description}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {featuredRelease.spotifyUrl && (
                    <a href={featuredRelease.spotifyUrl} target="_blank" rel="noopener noreferrer" data-testid="button-release-spotify">
                      <Button variant="default" size="default" className="gap-2">
                        <SiSpotify className="w-4 h-4" /> Spotify
                      </Button>
                    </a>
                  )}
                  {featuredRelease.appleMusicUrl && (
                    <a href={featuredRelease.appleMusicUrl} target="_blank" rel="noopener noreferrer" data-testid="button-release-apple">
                      <Button variant="outline" size="default" className="gap-2">
                        <SiApplemusic className="w-4 h-4" /> Apple Music
                      </Button>
                    </a>
                  )}
                  {featuredRelease.soundcloudUrl && (
                    <a href={featuredRelease.soundcloudUrl} target="_blank" rel="noopener noreferrer" data-testid="button-release-soundcloud">
                      <Button variant="outline" size="default" className="gap-2">
                        <SiSoundcloud className="w-4 h-4" /> SoundCloud
                      </Button>
                    </a>
                  )}
                  {featuredRelease.youtubeUrl && (
                    <a href={featuredRelease.youtubeUrl} target="_blank" rel="noopener noreferrer" data-testid="button-release-youtube">
                      <Button variant="outline" size="default" className="gap-2">
                        <SiYoutube className="w-4 h-4" /> YouTube
                      </Button>
                    </a>
                  )}
                  <Link href={`/releases`} data-testid="link-release-detail">
                    <Button variant="ghost" size="default" className="gap-2">
                      Full Details <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-md" data-testid="div-no-releases">
              <Music className="w-10 h-10 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4" data-testid="text-no-releases">
                No releases yet.
              </p>
              <Link href="/releases/new" data-testid="link-add-release-empty">
                <Button variant="outline" className="gap-2">
                  <Plus className="w-4 h-4" /> Add First Release
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── WORLDS PREVIEW — new portal section ── */}
      <section className="bg-background border-t border-border py-20" data-testid="section-worlds">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between mb-10 flex-wrap gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1 font-medium">Projects & Universes</p>
              <h2 className="text-3xl md:text-4xl font-display font-bold" data-testid="text-worlds-section-heading">
                Worlds
              </h2>
            </div>
            <Link href="/worlds" data-testid="link-view-all-worlds">
              <Button variant="outline" className="gap-2">
                Explore All <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {worlds.map((world) => (
              <Link key={world.id} href={world.href} data-testid={`link-world-${world.id}`}>
                <Card className="hover-elevate active-elevate-2 cursor-pointer h-full transition-all duration-300">
                  <CardContent className="p-6 flex flex-col gap-3 h-full">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium mb-1">
                          {world.tagline}
                        </p>
                        <h3 className="text-xl font-display font-bold" data-testid={`text-world-name-${world.id}`}>
                          {world.name}
                        </h3>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded-md border font-medium whitespace-nowrap ${statusColor[world.status]}`}
                        data-testid={`badge-world-status-${world.id}`}
                      >
                        {world.status}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed flex-1" data-testid={`text-world-description-${world.id}`}>
                      {world.description}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-auto">
                      <Globe className="w-3 h-3" />
                      <span>Explore</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── ENTER THE SYSTEM — CTA banner ── */}
      <section
        className="relative bg-card border-t border-border py-20 overflow-hidden"
        data-testid="section-enter-system"
      >
        <img
          src={cityImage}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover opacity-10"
        />
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 text-center z-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full border border-border mb-6">
            <Lock className="w-5 h-5 text-muted-foreground" />
          </div>
          <h2
            className="text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-4"
            data-testid="text-enter-heading"
          >
            Vanta OS
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8" data-testid="text-enter-description">
            A private system is being built. Access is restricted. Request entry or enter your invite code.
          </p>
          <Link href="/enter" data-testid="link-enter-system">
            <Button size="default" variant="outline" className="gap-2 backdrop-blur-sm">
              Enter the System <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
