import { Link } from "wouter";
import {
  LockKeyhole, Disc3, Globe, ShieldAlert, ArrowRight, ArrowLeft,
} from "lucide-react";

const DESTINATIONS = [
  {
    href: "/releases",
    icon: Disc3,
    label: "Releases",
    descriptor: "Full discography — albums, singles, EPs",
    restricted: false,
  },
  {
    href: "/worlds",
    icon: Globe,
    label: "Worlds",
    descriptor: "Project universes and creative contexts",
    restricted: false,
  },
] as const;

export default function Enter() {
  return (
    <div
      className="min-h-screen bg-background flex flex-col items-center justify-center px-6 relative overflow-hidden"
      data-testid="enter-page"
    >
      <style>{`
        @keyframes enter-scan {
          0%   { transform: translateY(-12px); opacity: 0; }
          8%   { opacity: 1; }
          92%  { opacity: 1; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
      `}</style>

      {/* Ambient glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,_hsl(var(--primary)/0.06)_0%,_transparent_62%)] pointer-events-none" />

      {/* Slow scan line */}
      <div
        className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/8 to-transparent pointer-events-none"
        style={{ animation: "enter-scan 20s linear infinite" }}
      />

      {/* Corner bracket marks */}
      <div className="absolute top-8 left-8 w-5 h-5 border-t border-l border-border/20 pointer-events-none" />
      <div className="absolute top-8 right-8 w-5 h-5 border-t border-r border-border/20 pointer-events-none" />
      <div className="absolute bottom-8 left-8 w-5 h-5 border-b border-l border-border/20 pointer-events-none" />
      <div className="absolute bottom-8 right-8 w-5 h-5 border-b border-r border-border/20 pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full border border-border/40 bg-background/60 mb-7">
            <LockKeyhole className="w-5 h-5 text-muted-foreground/50" />
          </div>

          <h1
            className="text-4xl md:text-5xl font-display font-bold tracking-[0.12em]"
            data-testid="text-enter-title"
          >
            VANTA OS
          </h1>
          <p className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground/40 font-mono mt-3">
            System Interface
          </p>
        </div>

        {/* Separator */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-border/60 to-transparent mb-8" />

        {/* Primary destination — Vault */}
        <Link
          href="/vault"
          data-testid="link-enter-vault"
        >
          <div className="group border border-border/60 rounded-md p-4 mb-2 hover-elevate transition-all cursor-pointer">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <LockKeyhole className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
                <span
                  className="text-sm font-mono uppercase tracking-[0.22em] text-foreground"
                  data-testid="text-enter-vault-label"
                >
                  Vault
                </span>
                <span className="text-[9px] uppercase tracking-[0.25em] text-muted-foreground/35 font-mono">
                  restricted
                </span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/70 transition-colors flex-shrink-0" />
            </div>
            <p className="text-[11px] text-muted-foreground/35 font-mono mt-2 pl-[26px] leading-relaxed">
              Unreleased sessions, raw demos, and transmissions that never surfaced.
            </p>
          </div>
        </Link>

        {/* Secondary destinations */}
        <div className="space-y-px">
          {DESTINATIONS.map(({ href, icon: Icon, label, descriptor }) => (
            <Link
              key={href}
              href={href}
              data-testid={`link-enter-${label.toLowerCase()}`}
            >
              <div className="group flex items-center justify-between gap-3 py-3.5 px-4 rounded-md hover-elevate transition-all cursor-pointer">
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
                  <div className="min-w-0">
                    <span
                      className="text-sm font-mono uppercase tracking-[0.2em] text-muted-foreground/70 group-hover:text-foreground transition-colors"
                      data-testid={`text-enter-${label.toLowerCase()}-label`}
                    >
                      {label}
                    </span>
                    <p className="text-[10px] text-muted-foreground/30 font-mono mt-0.5 truncate">
                      {descriptor}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-3 h-3 text-muted-foreground/20 group-hover:text-muted-foreground/50 transition-colors flex-shrink-0" />
              </div>
            </Link>
          ))}
        </div>

        {/* Separator */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-border/40 to-transparent mt-8 mb-6" />

        {/* Footer links */}
        <div className="flex items-center justify-between px-1">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground/35 hover:text-muted-foreground/70 transition-colors font-mono"
            data-testid="link-back-home"
          >
            <ArrowLeft className="w-3 h-3" />
            Surface
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/admin/login"
              className="flex items-center gap-1.5 text-[11px] text-muted-foreground/25 hover:text-muted-foreground/55 transition-colors font-mono"
              data-testid="link-admin-access"
            >
              <ShieldAlert className="w-3 h-3" />
              Admin
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
