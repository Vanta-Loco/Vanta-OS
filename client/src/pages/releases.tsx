import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ReturnToCity } from "@/components/return-to-city";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SiSpotify, SiApplemusic, SiSoundcloud, SiYoutube } from "react-icons/si";
import { Archive, ArrowRight, Play, Square, ChevronDown, ChevronUp, Music, Plus, Radio, Search } from "lucide-react";
import { useMemo, useState, useRef } from "react";
import { Link } from "wouter";
import type { Release } from "@shared/schema";
import { format } from "date-fns";
import releasesEnvironment from "@assets/generated_images/releases_listening_archive_environment.png";
import { GlitchText, SignalGlitch, useVantaSignal } from "@/components/vanta-signal";

const typeLabel: Record<string, string> = {
  album: "Album",
  single: "Single",
  ep: "EP",
  mixtape: "Mixtape",
};

type PublicRoom = {
  id: string;
  name: string;
  category: string;
  owner_user_id: string | null;
};

function releaseDateLabel(date: string) {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? date : format(parsed, "MMMM d, yyyy");
}

function ReleaseCard({ release, featured = false }: { release: Release; featured?: boolean }) {
  const [tracklistOpen, setTracklistOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const triggerSignal = useVantaSignal();

  const streamingLinks = [
    { url: release.spotifyUrl, icon: SiSpotify, label: "Spotify", testId: "button-spotify" },
    { url: release.appleMusicUrl, icon: SiApplemusic, label: "Apple Music", testId: "button-apple" },
    { url: release.soundcloudUrl, icon: SiSoundcloud, label: "SoundCloud", testId: "button-soundcloud" },
    { url: release.youtubeUrl, icon: SiYoutube, label: "YouTube", testId: "button-youtube" },
  ].filter((l) => l.url);

  const generatedClip = release.audioPreviewUrl?.startsWith("/uploads/preview-")
    ? release.audioPreviewUrl
    : null;
  const audioSrc = generatedClip || release.audioFileUrl || release.audioPreviewUrl;
  const useSeek = !generatedClip && !!audioSrc;

  function handlePreview() {
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      return;
    }
    if (!audioSrc) return;
    triggerSignal("subtle");
    const audio = new Audio(audioSrc);
    audioRef.current = audio;
    const durationSec = release.previewDurationSeconds ?? 30;

    const startPlayback = () => {
      audio.play();
      setIsPlaying(true);
      const timer = setTimeout(() => { audio.pause(); setIsPlaying(false); }, durationSec * 1000);
      audio.addEventListener("ended", () => { clearTimeout(timer); setIsPlaying(false); });
    };

    if (useSeek) {
      const startSec = release.previewStartSeconds ?? 0;
      audio.addEventListener("canplay", () => { audio.currentTime = startSec; startPlayback(); }, { once: true });
      audio.load();
    } else {
      startPlayback();
    }
  }

  const tags = release.moodTags ?? [];

  return (
    <Card className={`overflow-hidden border-border/80 bg-card/75 backdrop-blur-sm ${featured ? "border-primary/45 shadow-[0_0_40px_rgba(150,100,220,.1)]" : ""}`} data-testid={`card-release-${release.id}`}>
      <div className={`grid grid-cols-1 gap-0 ${featured ? "md:grid-cols-[390px_1fr]" : "md:grid-cols-[250px_1fr]"}`}>
        <SignalGlitch
          intensity="subtle"
          className={`relative aspect-square md:aspect-auto overflow-hidden ${featured ? "min-h-[390px]" : ""}`}
        >
          <img
            src={release.coverImage}
            alt={release.title}
            className={`w-full h-full object-cover ${featured ? "min-h-[390px]" : ""}`}
            data-testid={`img-release-${release.id}`}
          />
          {featured && (
            <div className="absolute left-4 top-4 border border-primary/50 bg-black/60 px-2.5 py-1 text-[9px] font-mono uppercase tracking-[0.22em] text-primary">
              Latest signal
            </div>
          )}
        </SignalGlitch>

        <CardContent className={`flex flex-col gap-5 ${featured ? "p-6 md:p-10" : "p-5 md:p-7"}`}>
          <div>
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <Badge variant="outline" className="uppercase tracking-wide text-xs font-medium">
                {typeLabel[release.type] ?? release.type}
              </Badge>
              {release.featured === "true" && (
                <Badge variant="secondary" className="uppercase tracking-wide text-xs font-medium">
                  Featured
                </Badge>
              )}
              <span className="text-xs text-muted-foreground" data-testid={`text-release-date-${release.id}`}>
                {releaseDateLabel(release.releaseDate)}
              </span>
            </div>

            <h2
              className="text-2xl md:text-3xl font-display font-bold mb-1"
              data-testid={`text-release-title-${release.id}`}
            >
              {release.title}
            </h2>

            {/* Genre / subgenre row */}
            {(release.genre || release.subgenre) && (
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {release.genre && (
                  <span
                    className="text-xs font-medium uppercase tracking-widest text-muted-foreground"
                    data-testid={`text-release-genre-${release.id}`}
                  >
                    {release.genre}
                  </span>
                )}
                {release.genre && release.subgenre && (
                  <span className="text-muted-foreground/40 text-xs">·</span>
                )}
                {release.subgenre && (
                  <span
                    className="text-xs text-muted-foreground/70"
                    data-testid={`text-release-subgenre-${release.id}`}
                  >
                    {release.subgenre}
                  </span>
                )}
              </div>
            )}

            <p
              className="text-muted-foreground leading-relaxed"
              data-testid={`text-release-description-${release.id}`}
            >
              {release.description}
            </p>

            {/* Mood tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3" data-testid={`tag-list-${release.id}`}>
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 text-xs rounded-sm border border-border text-muted-foreground/60 tracking-wide"
                    data-testid={`tag-${release.id}-${tag}`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {streamingLinks.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {streamingLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid={`${link.testId}-${release.id}`}
                >
                  <Button variant="outline" size="default" className="gap-2">
                    <link.icon className="w-4 h-4" />
                    {link.label}
                  </Button>
                </a>
              ))}
            </div>
          )}

          {audioSrc && (
            <div>
              <Button
                variant={isPlaying ? "default" : "outline"}
                size="default"
                className="gap-2"
                data-testid={`button-preview-${release.id}`}
                onClick={handlePreview}
              >
                {isPlaying ? (
                  <><Square className="w-4 h-4" /> Stop</>
                ) : (
                  <><Play className="w-4 h-4" /> Play Preview</>
                )}
              </Button>
            </div>
          )}

          {release.tracklist.length > 0 && (
            <div>
              <button
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => {
                  const opening = !tracklistOpen;
                  setTracklistOpen(opening);
                  if (opening) triggerSignal("subtle");
                }}
                data-testid={`button-tracklist-${release.id}`}
              >
                <Music className="w-4 h-4" />
                Tracklist ({release.tracklist.length})
                {tracklistOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {tracklistOpen && (
                <ol className="mt-3 space-y-1 pl-1" data-testid={`list-tracklist-${release.id}`}>
                  {release.tracklist.map((track, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-3 text-sm text-muted-foreground"
                      data-testid={`text-track-${release.id}-${i}`}
                    >
                      <span className="text-xs w-5 text-right text-muted-foreground/50">{i + 1}</span>
                      <span>{track}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </CardContent>
      </div>
    </Card>
  );
}

export default function Releases() {
  const { data: releases, isLoading } = useQuery<Release[]>({
    queryKey: ["/api/releases"],
  });

  const { data: musicRoomData } = useQuery<{ rooms: PublicRoom[] }>({
    queryKey: ["/api/rooms?category=Music"],
  });

  const [activeGenre, setActiveGenre] = useState("All");
  const [activeType, setActiveType] = useState("All");
  const [search, setSearch] = useState("");

  const orderedReleases = useMemo(() => {
    return [...(releases ?? [])].sort((a, b) => {
      const dateDiff = new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime();
      if (!Number.isNaN(dateDiff) && dateDiff !== 0) return dateDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [releases]);

  const availableGenres = useMemo(
    () => ["All", ...Array.from(new Set(orderedReleases.map((release) => release.genre).filter(Boolean))).sort()],
    [orderedReleases],
  );
  const availableTypes = useMemo(
    () => ["All", ...Array.from(new Set(orderedReleases.map((release) => release.type).filter(Boolean)))],
    [orderedReleases],
  );

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return orderedReleases.filter((release) => {
      const matchesGenre = activeGenre === "All" || release.genre === activeGenre;
      const matchesType = activeType === "All" || release.type === activeType;
      const matchesSearch =
        !needle ||
        [release.title, release.type, release.genre, release.subgenre, release.description]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(needle));
      return matchesGenre && matchesType && matchesSearch;
    });
  }, [activeGenre, activeType, orderedReleases, search]);

  const featuredRelease = filtered.find((release) => release.featured === "true") ?? filtered[0];
  const catalogReleases = filtered.filter((release) => release.id !== featuredRelease?.id);
  const musicRoom = musicRoomData?.rooms?.find((room) => !room.owner_user_id) ?? null;
  const hasFilters = activeGenre !== "All" || activeType !== "All" || search.trim().length > 0;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07080e] text-foreground">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <img src={releasesEnvironment} alt="" className="absolute inset-0 h-full w-full object-cover object-center opacity-45" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,8,14,.92)_0%,rgba(7,8,14,.55)_28%,rgba(7,8,14,.78)_72%,rgba(7,8,14,.97)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_58%_28%,rgba(190,120,72,.18),transparent_45%)]" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <ReturnToCity />
        <Header />

        <main className="flex-1 pt-20">
          <section className="relative isolate overflow-hidden border-b border-border">
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(6,7,12,.72)_0%,rgba(6,7,12,.5)_42%,rgba(6,7,12,.18)_100%)]" />
            <div className="relative mx-auto max-w-7xl px-6 py-16 lg:px-8 md:py-20">
              <div className="max-w-2xl">
                <div className="mb-6 flex flex-wrap items-center gap-3 text-[10px] font-mono uppercase tracking-[0.28em] text-primary/80">
                  <span className="flex items-center gap-2"><Radio className="h-3.5 w-3.5" /> <GlitchText intensity="subtle">VANTA MUSIC ARCHIVE</GlitchText></span>
                  <span className="text-white/25">/</span>
                  <span className="text-white/50">Catalog / Archive / Signal</span>
                </div>
                <h1 className="font-display text-5xl font-bold tracking-tight text-white md:text-7xl" data-testid="text-releases-title">
                  Vanta Releases<span className="text-primary">.</span>
                </h1>
                <p className="mt-5 max-w-lg text-base leading-relaxed text-white/65 md:text-lg">
                  The physical catalog room where Vanta stores and plays its music.
                </p>
              </div>
              <div className="mt-12 flex flex-col gap-4 border-t border-white/15 pt-5 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.24em] text-white/50">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_10px_rgba(185,120,220,.85)]" />
                  {orderedReleases.length} catalog {orderedReleases.length === 1 ? "entry" : "entries"}
                </div>
                {musicRoom ? (
                  <Link href={`/rooms/${musicRoom.id}`} className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.22em] text-white/65 transition-colors hover:text-primary" data-testid="link-releases-music-room">
                    Enter Music Room <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                ) : (
                  <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/35">Music Room offline</span>
                )}
              </div>
            </div>
          </section>

        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8 md:py-20">
          <div className="mb-10 flex flex-col gap-6 border-b border-border pb-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="mb-2 text-[10px] font-mono uppercase tracking-[0.28em] text-primary/75">Listening station</p>
                <h2 className="font-display text-3xl font-bold md:text-4xl">The catalog<span className="text-primary">.</span></h2>
              </div>
              <div className="flex w-full max-w-xl flex-col gap-3 sm:flex-row">
                <label className="relative block min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search releases..."
                    aria-label="Search releases"
                    className="h-10 w-full border border-border bg-card/60 pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground/45 focus:border-primary/60"
                    data-testid="input-release-search"
                  />
                </label>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Release filters">
              <span className="mr-1 text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground/45">Format</span>
              {availableTypes.map((type) => (
                <Button key={type} type="button" size="sm" variant={activeType === type ? "default" : "outline"} onClick={() => setActiveType(type)} className="font-mono text-[10px] uppercase tracking-widest" data-testid={`filter-release-type-${type.toLowerCase()}`}>
                  {type === "All" ? "All" : typeLabel[type] ?? type}
                </Button>
              ))}
              {availableGenres.length > 1 && (
                <>
                  <span className="ml-2 mr-1 text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground/45">Genre</span>
                  {availableGenres.map((genre) => (
                    <Button key={genre} type="button" size="sm" variant={activeGenre === genre ? "default" : "outline"} onClick={() => setActiveGenre(genre)} className="font-mono text-[10px] uppercase tracking-widest" data-testid={`filter-release-genre-${genre.toLowerCase().replace(/\s+/g, "-")}`}>
                      {genre}
                    </Button>
                  ))}
                </>
              )}
            </div>
          </div>

          {isLoading ? (
            <ReleaseSkeleton />
          ) : !releases || releases.length === 0 ? (
            <div className="border border-dashed border-border px-6 py-32 text-center" data-testid="text-no-releases">
              <Archive className="mx-auto h-9 w-9 text-muted-foreground/35" />
              <p className="mt-6 font-display text-3xl font-semibold">NO RELEASES IN THE ARCHIVE</p>
              <p className="mt-3 text-sm text-muted-foreground">The catalog is empty.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="border border-dashed border-border px-6 py-24 text-center" data-testid="text-no-filtered-releases">
              <Search className="mx-auto h-7 w-7 text-muted-foreground/35" />
              <p className="mt-5 font-display text-3xl font-semibold">NO RELEASES FOUND</p>
              <p className="mt-3 text-sm text-muted-foreground">Try another format, genre, or search term.</p>
            </div>
          ) : (
            <>
              {featuredRelease && (
                <section data-testid="section-featured-release">
                  <div className="mb-6 flex items-end justify-between gap-4">
                    <div>
                      <p className="mb-2 text-[10px] font-mono uppercase tracking-[0.28em] text-muted-foreground/55">Featured listening</p>
                      <h2 className="font-display text-2xl font-semibold">Latest release<span className="text-primary">.</span></h2>
                    </div>
                    {hasFilters && <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/45">{filtered.length} results</span>}
                  </div>
                  <ReleaseCard release={featuredRelease} featured />
                </section>
              )}

              {catalogReleases.length > 0 && (
                <section className="mt-16 border-t border-border pt-10" data-testid="list-releases">
                  <div className="mb-7 flex items-center gap-3">
                    <Archive className="h-4 w-4 text-primary/70" />
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-muted-foreground/55">Catalog drawers</p>
                      <h2 className="font-display text-2xl font-semibold">Archive<span className="text-primary">.</span></h2>
                    </div>
                  </div>
                  <div className="space-y-6">
                    {catalogReleases.map((release) => <ReleaseCard key={release.id} release={release} />)}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}

function ReleaseSkeleton() {
  return (
    <div className="space-y-10 animate-pulse">
      <div className="min-h-[420px] border border-border bg-card/40" />
      <div className="space-y-6">
        {[1, 2].map((item) => <div key={item} className="grid min-h-[260px] grid-cols-1 border border-border bg-card/40 md:grid-cols-[250px_1fr]" />)}
      </div>
    </div>
  );
}
