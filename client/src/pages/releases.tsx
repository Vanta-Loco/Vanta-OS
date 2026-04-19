import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SiSpotify, SiApplemusic, SiSoundcloud, SiYoutube } from "react-icons/si";
import { Play, Square, ChevronDown, ChevronUp, Music, Plus } from "lucide-react";
import { useState, useRef } from "react";
import { Link } from "wouter";
import type { Release } from "@shared/schema";
import { format } from "date-fns";

const typeLabel: Record<string, string> = {
  album: "Album",
  single: "Single",
  ep: "EP",
  mixtape: "Mixtape",
};

function ReleaseCard({ release }: { release: Release }) {
  const [tracklistOpen, setTracklistOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
    <Card className="overflow-hidden" data-testid={`card-release-${release.id}`}>
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-0">
        <div className="relative aspect-square md:aspect-auto overflow-hidden">
          <img
            src={release.coverImage}
            alt={release.title}
            className="w-full h-full object-cover"
            data-testid={`img-release-${release.id}`}
          />
        </div>

        <CardContent className="p-6 md:p-8 flex flex-col gap-5">
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
                {format(new Date(release.releaseDate), "MMMM d, yyyy")}
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
                onClick={() => setTracklistOpen(!tracklistOpen)}
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

  const [activeGenre, setActiveGenre] = useState<string>("All");

  const availableGenres = releases
    ? ["All", ...Array.from(new Set(releases.map((r) => r.genre).filter(Boolean)))]
    : ["All"];

  const filtered = releases
    ? activeGenre === "All"
      ? releases
      : releases.filter((r) => r.genre === activeGenre)
    : [];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-background pt-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16 md:py-24">

          {/* Header row */}
          <div className="flex items-end justify-between mb-10 flex-wrap gap-6">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2 font-medium">
                Discography
              </p>
              <h1
                className="text-4xl md:text-5xl lg:text-6xl font-display font-bold"
                data-testid="text-releases-title"
              >
                Releases
              </h1>
            </div>
            <Link href="/releases/new" data-testid="link-add-release">
              <Button variant="default" size="default" className="gap-2">
                <Plus className="w-4 h-4" /> Add Release
              </Button>
            </Link>
          </div>

          {/* Genre filter pills */}
          {!isLoading && availableGenres.length > 1 && (
            <div className="flex flex-wrap gap-2 mb-10" data-testid="genre-filter-pills">
              {availableGenres.map((genre) => {
                const active = activeGenre === genre;
                return (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => setActiveGenre(genre)}
                    data-testid={`filter-pill-${genre.toLowerCase().replace(/\s+/g, "-")}`}
                    className={[
                      "px-4 py-1.5 text-xs rounded-sm border transition-colors font-medium tracking-wide",
                      active
                        ? "bg-foreground text-background border-foreground"
                        : "bg-transparent text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground",
                    ].join(" ")}
                  >
                    {genre}
                  </button>
                );
              })}
            </div>
          )}

          {isLoading ? (
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="overflow-hidden animate-pulse">
                  <div className="grid grid-cols-1 md:grid-cols-[280px_1fr]">
                    <div className="aspect-square md:aspect-auto bg-muted" />
                    <CardContent className="p-8">
                      <div className="h-4 bg-muted rounded mb-4 w-20" />
                      <div className="h-8 bg-muted rounded mb-3 w-64" />
                      <div className="h-4 bg-muted rounded w-full" />
                    </CardContent>
                  </div>
                </Card>
              ))}
            </div>
          ) : !releases || releases.length === 0 ? (
            <div className="text-center py-32 border border-border rounded-md">
              <Music className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-xl text-muted-foreground mb-6" data-testid="text-no-releases">
                No releases yet.
              </p>
              <Link href="/releases/new" data-testid="link-add-first-release">
                <Button variant="default" size="default" className="gap-2">
                  <Plus className="w-4 h-4" /> Add Your First Release
                </Button>
              </Link>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24 border border-border rounded-md">
              <p className="text-muted-foreground" data-testid="text-no-filtered-releases">
                No releases tagged as <span className="text-foreground font-medium">{activeGenre}</span>.
              </p>
            </div>
          ) : (
            <div className="space-y-6" data-testid="list-releases">
              {filtered.map((release) => (
                <ReleaseCard key={release.id} release={release} />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
