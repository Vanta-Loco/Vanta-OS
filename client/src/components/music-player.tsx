import { Music } from "lucide-react";

type Platform = "spotify" | "youtube" | "soundcloud" | "unknown";

function detectPlatform(url: string): Platform {
  if (!url) return "unknown";
  if (url.includes("spotify.com")) return "spotify";
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  if (url.includes("soundcloud.com")) return "soundcloud";
  return "unknown";
}

function toSpotifyEmbed(url: string): string {
  return url
    .replace("https://open.spotify.com/", "https://open.spotify.com/embed/")
    .split("?")[0];
}

function toYouTubeEmbed(url: string): string {
  let id = "";
  const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
  const longMatch = url.match(/[?&]v=([^?&]+)/);
  if (shortMatch) id = shortMatch[1];
  else if (longMatch) id = longMatch[1];
  return id ? `https://www.youtube.com/embed/${id}` : url;
}

function toSoundCloudEmbed(url: string): string {
  return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23111111&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=true`;
}

interface MusicPlayerProps {
  url: string;
}

export function MusicPlayer({ url }: MusicPlayerProps) {
  if (!url) return null;

  const platform = detectPlatform(url);

  if (platform === "unknown") {
    return (
      <div
        className="flex items-center gap-3 p-4 rounded-md border border-border bg-muted/40 text-muted-foreground text-sm"
        data-testid="div-music-player-unknown"
      >
        <Music className="w-4 h-4 shrink-0" />
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-foreground transition-colors truncate"
          data-testid="link-music-external"
        >
          {url}
        </a>
      </div>
    );
  }

  let embedSrc = url;
  let height = "152";

  if (platform === "spotify") {
    embedSrc = toSpotifyEmbed(url);
    height = "152";
  } else if (platform === "youtube") {
    embedSrc = toYouTubeEmbed(url);
    height = "315";
  } else if (platform === "soundcloud") {
    embedSrc = toSoundCloudEmbed(url);
    height = "166";
  }

  return (
    <div
      className="w-full rounded-md overflow-hidden"
      data-testid="div-music-player"
    >
      <iframe
        src={embedSrc}
        width="100%"
        height={height}
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        allowFullScreen
        loading="lazy"
        title="Music player"
        data-testid="iframe-music-player"
        className="border-0"
        style={{ borderRadius: "6px" }}
      />
    </div>
  );
}
