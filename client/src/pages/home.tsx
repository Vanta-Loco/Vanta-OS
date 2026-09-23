import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Post, Release } from "@shared/schema";
import heroImage from "@assets/generated_images/Music_studio_lifestyle_hero_cf7ae2f2.png";
import cityImage from "@assets/generated_images/Urban_night_cityscape_mood_2c3c2c61.png";
import { SiSpotify, SiApplemusic, SiSoundcloud, SiYoutube } from "react-icons/si";
import { Archive, ArrowRight, Globe, Lock, Music, Plus, Radio, Search } from "lucide-react";
import { format } from "date-fns";
import transmissionEnvironment from "@assets/generated_images/transmission_editorial_broadcast_environment.png";
import { getImageLayout } from "@/components/image-layout-picker";
import { AtmosphericOverlay, ParallaxLayer, VantaDepth } from "@/components/vanta-depth";

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

type PublicRoom = {
  id: string;
  name: string;
  category: string;
  owner_user_id: string | null;
};

export default function Home() {
  const { data: posts, isLoading } = useQuery<Post[]>({
    queryKey: ["/api/posts"],
  });

  const { data: mediaRoomData } = useQuery<{ rooms: PublicRoom[] }>({
    queryKey: ["/api/rooms?category=Media"],
  });

  const { data: releases, isLoading: releasesLoading } = useQuery<Release[]>({
    queryKey: ["/api/releases"],
  });

  const featuredRelease =
    releases?.find((r) => r.featured === "true") ?? releases?.[0] ?? null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <VantaDepth className="relative flex h-[85vh] min-h-[600px] items-end overflow-hidden vanta-hero-depth">
        <ParallaxLayer depth={-34} className="pointer-events-none absolute inset-[-4%] z-0">
          <img src={heroImage} alt="Vanta Cold Studio" className="vanta-hero-image h-full w-full object-cover" />
        </ParallaxLayer>
        <ParallaxLayer depth={-14} className="pointer-events-none absolute inset-[-5%] z-[1]">
          <AtmosphericOverlay className="absolute inset-0" />
        </ParallaxLayer>
        <div className="hero-gradient-overlay absolute inset-0 z-[2]" />
        <ParallaxLayer depth={8} className="relative z-10 w-full">
          <div className="mx-auto max-w-7xl px-6 pb-16 lg:px-8 md:pb-24">
            <div className="max-w-4xl">
              <h1
                className="text-5xl font-display font-bold leading-tight text-foreground md:text-6xl lg:text-7xl"
                data-testid="text-hero-title"
              >
                Vanta Cold
              </h1>
              <p
                className="mt-4 mb-6 font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground/50"
                data-testid="text-hero-system-label"
              >
                Vanta&nbsp;OS&nbsp;—&nbsp;a digital interface for music, fashion, and worldbuilding.
              </p>
              <h2
                className="mb-4 text-2xl font-display font-semibold leading-snug text-foreground md:text-3xl"
                data-testid="text-hero-section-title"
              >
                The Music Journey
              </h2>
              <p className="mb-8 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl" data-testid="text-hero-subtitle">
                Documenting the creative process, lifestyle moments, and the path
                of building Vanta Cold from the ground up.
              </p>
            </div>
          </div>
        </ParallaxLayer>
      </VantaDepth>

      <TransmissionFeed
        posts={posts ?? []}
        isLoading={isLoading}
        mediaRoom={mediaRoomData?.rooms?.find((room) => !room.owner_user_id) ?? null}
      />

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

function TransmissionFeed({
  posts,
  isLoading,
  mediaRoom,
}: {
  posts: Post[];
  isLoading: boolean;
  mediaRoom: PublicRoom | null;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(posts.map((post) => post.category).filter(Boolean))).sort()],
    [posts],
  );
  const hasFilters = search.trim().length > 0 || category !== "All";
  const filteredPosts = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return posts.filter((post) => {
      const matchesCategory = category === "All" || post.category === category;
      const matchesSearch =
        !needle ||
        [post.title, post.category, post.excerpt, post.content]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(needle));
      return matchesCategory && matchesSearch;
    });
  }, [category, posts, search]);

  const featuredPost = filteredPosts.find((post) => post.featured === "true") ?? filteredPosts[0];
  const latestPosts = filteredPosts.filter((post) => post.id !== featuredPost?.id).slice(0, 4);
  const archivePosts = filteredPosts.filter(
    (post) => post.id !== featuredPost?.id && !latestPosts.some((latest) => latest.id === post.id),
  );
  const featuredLayout = getImageLayout(featuredPost?.imageLayout);

  return (
    <main className="flex-1 bg-background" data-testid="section-transmission">
      <section className="relative isolate overflow-hidden border-y border-border">
        <img
          src={transmissionEnvironment}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-center opacity-70"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(6,7,12,.97)_0%,rgba(6,7,12,.82)_38%,rgba(6,7,12,.5)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_28%,rgba(150,78,84,.18),transparent_32%),linear-gradient(180deg,rgba(7,8,14,.15),rgba(7,8,14,.8))]" />

        <div className="relative mx-auto max-w-7xl px-6 py-16 lg:px-8 md:py-24">
          <div className="max-w-2xl">
            <div className="mb-6 flex flex-wrap items-center gap-3 text-[10px] font-mono uppercase tracking-[0.28em] text-primary/80">
              <span className="flex items-center gap-2"><Radio className="h-3.5 w-3.5" /> Vanta Editorial Network</span>
              <span className="text-white/25">/</span>
              <span className="text-white/50">Signal / Archive</span>
            </div>
            <h2 className="font-display text-5xl font-bold tracking-tight text-white md:text-7xl">
              Transmission<span className="text-primary">.</span>
            </h2>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-white/65 md:text-lg">
              Culture received. Signal transmitted.
            </p>
          </div>

          <div className="mt-12 flex flex-col gap-4 border-t border-white/15 pt-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.24em] text-white/50">
              <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_10px_rgba(185,120,220,.85)]" />
              {posts.length} published {posts.length === 1 ? "signal" : "signals"}
            </div>
            {mediaRoom ? (
              <Link
                href={`/rooms/${mediaRoom.id}`}
                className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.22em] text-white/65 transition-colors hover:text-primary"
                data-testid="link-transmission-media-room"
              >
                Enter Media Room <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/35">Media Room offline</span>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8 md:py-20">
        <div className="mb-10 flex flex-col gap-6 border-b border-border pb-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-2 text-[10px] font-mono uppercase tracking-[0.28em] text-primary/75">Editorial desk</p>
              <h3 className="font-display text-3xl font-bold md:text-4xl" data-testid="text-featured-heading">Latest signal<span className="text-primary">.</span></h3>
            </div>
            <label className="relative block w-full max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search transmissions..."
                aria-label="Search transmissions"
                className="h-10 w-full border border-border bg-card/60 pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground/45 focus:border-primary/60"
                data-testid="input-transmission-search"
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Transmission categories">
            {categories.map((item) => (
              <Button
                key={item}
                type="button"
                size="sm"
                variant={category === item ? "default" : "outline"}
                onClick={() => setCategory(item)}
                className="font-mono text-[10px] uppercase tracking-widest"
                data-testid={`button-transmission-category-${item.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {item}
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <TransmissionSkeleton />
        ) : filteredPosts.length === 0 ? (
          <div className="border border-dashed border-border px-6 py-24 text-center" data-testid="text-no-posts">
            <Radio className="mx-auto h-7 w-7 text-muted-foreground/35" />
            <p className="mt-5 font-display text-3xl font-semibold">{posts.length ? "NO MATCHING SIGNAL" : "NO SIGNAL"}</p>
            <p className="mt-3 text-sm text-muted-foreground">
              {posts.length ? "Try another category or search term." : "Nothing has been transmitted yet."}
            </p>
          </div>
        ) : (
          <>
            {featuredPost && (
              <Link href={`/post/${featuredPost.id}`} data-testid={`link-featured-transmission-${featuredPost.id}`}>
                <article className="group relative isolate overflow-hidden border border-border bg-card/40 transition-colors hover:border-primary/50">
                  <div className={`relative overflow-hidden ${featuredLayout.value === "original" ? "max-h-[70vh]" : featuredLayout.className}`}>
                    <img
                      src={featuredPost.coverImage}
                      alt={featuredPost.title}
                      className={`w-full ${featuredLayout.value === "original" ? "h-auto max-h-[70vh] object-contain" : "h-full object-cover"} transition-transform duration-700 group-hover:scale-[1.02]`}
                      style={{ objectPosition: featuredPost.coverImagePosition || "50% 50%" }}
                      data-testid={`img-featured-transmission-${featuredPost.id}`}
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,6,12,.96)_0%,rgba(5,6,12,.75)_45%,rgba(5,6,12,.15)_100%)]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/10" />
                  <div className="absolute inset-0 flex flex-col justify-end p-6 md:max-w-2xl md:p-10">
                    <div className="mb-4 flex flex-wrap items-center gap-3 text-[10px] font-mono uppercase tracking-[0.2em] text-white/60">
                      <Badge variant="outline" className="border-primary/50 bg-primary/10 text-primary">{featuredPost.category}</Badge>
                      <span>{format(new Date(featuredPost.createdAt), "MMM d, yyyy")}</span>
                      <span>{featuredPost.readTime}</span>
                    </div>
                    <h4 className="font-display text-3xl font-bold leading-tight text-white md:text-5xl">{featuredPost.title}</h4>
                    <p className="mt-4 line-clamp-3 max-w-xl text-sm leading-relaxed text-white/65 md:text-base">{featuredPost.excerpt}</p>
                    <span className="mt-7 inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.25em] text-primary transition-transform group-hover:translate-x-1">
                      Read Transmission <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                  </div>
                </article>
              </Link>
            )}

            {latestPosts.length > 0 && (
              <section className="mt-16">
                <div className="mb-7 flex items-end justify-between gap-4">
                  <div>
                    <p className="mb-2 text-[10px] font-mono uppercase tracking-[0.28em] text-muted-foreground/55">Live desk</p>
                    <h3 className="font-display text-2xl font-semibold" data-testid="text-latest-heading">Latest Transmissions<span className="text-primary">.</span></h3>
                  </div>
                  {hasFilters && <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/45">{filteredPosts.length} results</span>}
                </div>
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                  {latestPosts.map((post) => <TransmissionCard key={post.id} post={post} />)}
                </div>
              </section>
            )}

            {archivePosts.length > 0 && (
              <section className="mt-16 border-t border-border pt-10">
                <div className="mb-7 flex items-center gap-3">
                  <Archive className="h-4 w-4 text-primary/70" />
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-muted-foreground/55">Tape library</p>
                    <h3 className="font-display text-2xl font-semibold">Archive<span className="text-primary">.</span></h3>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {archivePosts.map((post) => <ArchiveTransmission key={post.id} post={post} />)}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function TransmissionCard({ post }: { post: Post }) {
  const layout = getImageLayout(post.imageLayout);

  return (
    <Link href={`/post/${post.id}`} data-testid={`link-transmission-${post.id}`}>
      <article className="group h-full overflow-hidden border border-border bg-card/45 transition-colors hover:border-primary/50">
        <div className={`relative overflow-hidden bg-muted ${layout.value === "original" ? "max-h-[70vh]" : layout.className}`}>
          <img
            src={post.coverImage}
            alt={post.title}
            className={`w-full ${layout.value === "original" ? "h-auto max-h-[70vh] object-contain" : "h-full object-cover"} transition-transform duration-500 group-hover:scale-105`}
            style={{ objectPosition: post.coverImagePosition || "50% 50%" }}
            data-testid={`img-transmission-${post.id}`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <Badge variant="outline" className="absolute left-3 top-3 border-white/25 bg-black/35 text-[9px] uppercase tracking-widest text-white/80">{post.category}</Badge>
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between gap-3 text-[9px] font-mono uppercase tracking-widest text-muted-foreground/55">
            <span>{format(new Date(post.createdAt), "MMM d, yyyy")}</span>
            <span>{post.readTime}</span>
          </div>
          <h4 className="mt-3 line-clamp-2 font-display text-xl font-semibold leading-tight">{post.title}</h4>
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{post.excerpt}</p>
          <span className="mt-4 inline-flex items-center gap-2 text-[9px] font-mono uppercase tracking-widest text-primary/75 group-hover:text-primary">Read <ArrowRight className="h-3 w-3" /></span>
        </div>
      </article>
    </Link>
  );
}

function ArchiveTransmission({ post }: { post: Post }) {
  const layout = getImageLayout(post.imageLayout);

  return (
    <Link href={`/post/${post.id}`} data-testid={`link-archive-transmission-${post.id}`}>
      <article className="group flex min-h-32 gap-4 border border-border bg-card/30 p-3 transition-colors hover:border-primary/50 sm:p-4">
        <div className={`relative w-32 shrink-0 overflow-hidden bg-muted sm:w-44 ${layout.value === "original" ? "" : layout.className}`}>
          <img
            src={post.coverImage}
            alt={post.title}
            className={`w-full ${layout.value === "original" ? "h-auto max-h-[70vh] object-contain" : "h-full object-cover"} grayscale-[.35] transition-all duration-500 group-hover:scale-105 group-hover:grayscale-0`}
            style={{ objectPosition: post.coverImagePosition || "50% 50%" }}
          />
          <span className="absolute bottom-2 left-2 bg-black/70 px-1.5 py-1 text-[8px] font-mono uppercase tracking-widest text-white/70">Archive</span>
        </div>
        <div className="min-w-0 py-1">
          <div className="flex flex-wrap items-center gap-3 text-[9px] font-mono uppercase tracking-widest text-muted-foreground/55">
            <span>{post.category}</span>
            <span>{format(new Date(post.createdAt), "MMM d, yyyy")}</span>
          </div>
          <h4 className="mt-2 line-clamp-2 font-display text-lg font-semibold leading-tight">{post.title}</h4>
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{post.excerpt}</p>
        </div>
      </article>
    </Link>
  );
}

function TransmissionSkeleton() {
  return (
    <div className="space-y-10 animate-pulse">
      <div className="min-h-[430px] border border-border bg-card/40 md:min-h-[520px]" />
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-80 border border-border bg-card/40" />)}
      </div>
    </div>
  );
}
