import { useQuery, useMutation } from "@tanstack/react-query";
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

  // Prefer the generated preview clip (plays from 0:00, no seeking needed).
  // Fall back to seeking within the full source file if no clip exists yet.
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
      const timer = setTimeout(() => {
        audio.pause();
        setIsPlaying(false);
      }, durationSec * 1000);
      audio.addEventListener("ended", () => {
        clearTimeout(timer);
        setIsPlaying(false);
      });
    };

    if (useSeek) {
      const startSec = release.previewStartSeconds ?? 0;
      audio.addEventListener("canplay", () => {
        audio.currentTime = startSec;
        startPlayback();
      }, { once: true });
      audio.load();
    } else {
      startPlayback();
    }
  }

  return (
    <Card
      className="overflow-hidden"
      data-testid={`card-release-${release.id}`}
    >
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
              className="text-2xl md:text-3xl font-display font-bold mb-3"
              data-testid={`text-release-title-${release.id}`}
            >
              {release.title}
            </h2>

            <p
              className="text-muted-foreground leading-relaxed"
              data-testid={`text-release-description-${release.id}`}
            >
              {release.description}
            </p>
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
                <ol
                  className="mt-3 space-y-1 pl-1"
                  data-testid={`list-tracklist-${release.id}`}
                >
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

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-background pt-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16 md:py-24">
          <div className="flex items-end justify-between mb-12 flex-wrap gap-6">
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
          ) : (
            <div className="space-y-6" data-testid="list-releases">
              {releases.map((release) => (
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
