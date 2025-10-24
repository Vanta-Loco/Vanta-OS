import { SiInstagram, SiSpotify, SiSoundcloud, SiYoutube } from "react-icons/si";
import { Button } from "@/components/ui/button";

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div>
            <h3 className="text-2xl font-display font-bold mb-4">VANTA COLD</h3>
            <p className="text-muted-foreground leading-relaxed">
              A music label documenting the journey through lifestyle photography,
              behind-the-scenes content, and creative storytelling.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-display font-medium uppercase tracking-wide mb-4">
              Quick Links
            </h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="/"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="link-footer-home"
                >
                  Home
                </a>
              </li>
              <li>
                <a
                  href="/about"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="link-footer-about"
                >
                  About
                </a>
              </li>
              <li>
                <a
                  href="/create"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="link-footer-create"
                >
                  Create Post
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-display font-medium uppercase tracking-wide mb-4">
              Follow
            </h4>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                data-testid="button-social-instagram"
              >
                <SiInstagram className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                data-testid="button-social-spotify"
              >
                <SiSpotify className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                data-testid="button-social-soundcloud"
              >
                <SiSoundcloud className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                data-testid="button-social-youtube"
              >
                <SiYoutube className="w-5 h-5" />
              </Button>
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
