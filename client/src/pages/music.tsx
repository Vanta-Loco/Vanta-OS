import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SiSpotify, SiApplemusic, SiSoundcloud, SiYoutube } from "react-icons/si";
import { Music2, Play, Pause } from "lucide-react";
import { useState } from "react";

const streamingPlatforms = [
  {
    name: "Spotify",
    icon: SiSpotify,
    url: "https://open.spotify.com/artist/your-artist-id",
    color: "hover:text-[#1DB954]",
  },
  {
    name: "Apple Music",
    icon: SiApplemusic,
    url: "https://music.apple.com/artist/your-artist-id",
    color: "hover:text-[#FA243C]",
  },
  {
    name: "SoundCloud",
    icon: SiSoundcloud,
    url: "https://soundcloud.com/your-profile",
    color: "hover:text-[#FF5500]",
  },
  {
    name: "YouTube",
    icon: SiYoutube,
    url: "https://youtube.com/@your-channel",
    color: "hover:text-[#FF0000]",
  },
];

const audioSnippets = [
  {
    id: 1,
    title: "Late Night Vibes",
    description: "A smooth atmospheric beat perfect for late night sessions",
    duration: "2:34",
    audioUrl: "", // Add actual audio URL
  },
  {
    id: 2,
    title: "Urban Dreams",
    description: "Hip-hop inspired instrumental with city soundscapes",
    duration: "3:12",
    audioUrl: "",
  },
  {
    id: 3,
    title: "Studio Session 01",
    description: "Raw recording from our first studio session",
    duration: "1:47",
    audioUrl: "",
  },
];

export default function Music() {
  const [playingId, setPlayingId] = useState<number | null>(null);

  const togglePlay = (id: number) => {
    setPlayingId(playingId === id ? null : id);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-background pt-20">
        <section className="py-24 bg-background">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
                <Music2 className="w-8 h-8 text-primary" />
              </div>
              <h1
                className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6 leading-tight"
                data-testid="text-music-title"
              >
                Music & Snippets
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto" data-testid="text-music-subtitle">
                Listen to our latest tracks, unreleased snippets, and follow us on your favorite streaming platform.
              </p>
            </div>

            <div className="mb-24">
              <h2 className="text-3xl font-display font-bold mb-8 text-center">
                Stream Our Music
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                {streamingPlatforms.map((platform) => (
                  <a
                    key={platform.name}
                    href={platform.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid={`link-${platform.name.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Card className="hover-elevate active-elevate-2 transition-all cursor-pointer h-full">
                      <CardContent className="flex flex-col items-center justify-center p-8 gap-4">
                        <platform.icon className={`w-12 h-12 transition-colors ${platform.color}`} />
                        <span className="font-medium text-sm">{platform.name}</span>
                      </CardContent>
                    </Card>
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-3xl font-display font-bold mb-8 text-center">
                Audio Snippets
              </h2>
              <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
                Get a preview of what we're working on. These are raw snippets and works in progress from the studio.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                {audioSnippets.map((snippet) => (
                  <Card key={snippet.id} data-testid={`card-snippet-${snippet.id}`}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span data-testid={`text-snippet-title-${snippet.id}`}>{snippet.title}</span>
                        <span className="text-sm font-normal text-muted-foreground" data-testid={`text-snippet-duration-${snippet.id}`}>
                          {snippet.duration}
                        </span>
                      </CardTitle>
                      <CardDescription data-testid={`text-snippet-description-${snippet.id}`}>
                        {snippet.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button
                        onClick={() => togglePlay(snippet.id)}
                        className="w-full"
                        variant="outline"
                        data-testid={`button-play-${snippet.id}`}
                      >
                        {playingId === snippet.id ? (
                          <>
                            <Pause className="w-4 h-4 mr-2" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Play Preview
                          </>
                        )}
                      </Button>
                      {snippet.audioUrl === "" && (
                        <p className="text-xs text-muted-foreground mt-2 text-center">
                          Audio file coming soon
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div className="mt-24 text-center">
              <Card className="max-w-2xl mx-auto bg-card/50">
                <CardHeader>
                  <CardTitle className="text-2xl">Want to hear more?</CardTitle>
                  <CardDescription>
                    Follow Vanta Cold on your favorite streaming platform to stay updated with our latest releases and exclusive drops.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
