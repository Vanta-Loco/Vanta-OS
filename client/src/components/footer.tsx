import { SiInstagram, SiSpotify, SiSoundcloud, SiYoutube } from "react-icons/si";
import { Button } from "@/components/ui/button";

const socialLinks = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/babyboiloco7/",
    icon: SiInstagram,
    testId: "button-social-instagram",
  },
  {
    label: "Spotify",
    href: "https://open.spotify.com/artist/1a7lNpD5XYTyjopL7cwCux",
    icon: SiSpotify,
    testId: "button-social-spotify",
  },
  {
    label: "SoundCloud",
    href: "https://soundcloud.com/babyboiloco/tracks",
    icon: SiSoundcloud,
    testId: "button-social-soundcloud",
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/channel/UC9OGRErv5O8nx8vwohXDY7A",
    icon: SiYoutube,
    testId: "button-social-youtube",
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div>
            <h3 className="text-2xl font-display font-bold mb-4">VANTA COLD</h3>
            <p className="text-muted-foreground leading-relaxed">
              An independent music label and creative system. Documenting the journey through
              sound, visuals, and transmissions from the studio.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-display font-medium uppercase tracking-wide mb-4">
              Navigate
            </h4>
            <ul className="space-y-3">
              <li>
                <a href="/" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-home">
                  Home
                </a>
              </li>
              <li>
                <a href="/releases" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-releases">
                  Releases
                </a>
              </li>
              <li>
                <a href="/worlds" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-worlds">
                  Worlds
                </a>
              </li>
              <li>
                <a href="/about" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-about">
                  About
                </a>
              </li>
              <li>
                <a href="/enter" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-enter">
                  Enter the System
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-display font-medium uppercase tracking-wide mb-4">
              Follow
            </h4>
            <div className="flex gap-3 flex-wrap">
              {socialLinks.map(({ label, href, icon: Icon, testId }) =>
                href ? (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    data-testid={`link-${testId}`}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full"
                      data-testid={testId}
                      aria-label={label}
                      asChild={false}
                    >
                      <Icon className="w-5 h-5" />
                    </Button>
                  </a>
                ) : null
              )}
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Vanta Cold. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
