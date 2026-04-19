import { useState, useEffect } from "react";

export const STARTUP_SESSION_KEY = "vc-boot";

export function StartupScreen({ onComplete }: { onComplete: () => void }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => setExiting(true), 2300);
    const doneTimer = setTimeout(() => {
      sessionStorage.setItem(STARTUP_SESSION_KEY, "1");
      onComplete();
    }, 2800);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, [onComplete]);

  return (
    <div
      className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center select-none"
      style={{ opacity: exiting ? 0 : 1, transition: "opacity 500ms ease" }}
      data-testid="startup-screen"
    >
      <style>{`
        @keyframes boot-fade-up {
          from { opacity: 0; transform: translateY(5px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes boot-title {
          from { opacity: 0; transform: scale(0.97); letter-spacing: 0.06em; }
          to   { opacity: 1; transform: scale(1);    letter-spacing: 0.12em; }
        }
        @keyframes boot-bar {
          from { width: 0%; }
          to   { width: 100%; }
        }
        @keyframes boot-scan {
          0%   { transform: translateY(-8px); opacity: 0; }
          8%   { opacity: 1; }
          92%  { opacity: 1; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
      `}</style>

      {/* Ambient radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,_hsl(var(--primary)/0.07)_0%,_transparent_62%)] pointer-events-none" />

      {/* Single slow scan line */}
      <div
        className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/10 to-transparent pointer-events-none"
        style={{ animation: "boot-scan 2.8s linear forwards" }}
      />

      {/* Content block */}
      <div className="relative z-10 flex flex-col items-center text-center">

        {/* Philosophical top line */}
        <p
          className="text-[9px] uppercase tracking-[0.6em] text-muted-foreground/30 font-mono mb-10"
          style={{ animation: "boot-fade-up 0.6s ease both", animationDelay: "0.2s" }}
          data-testid="startup-top-line"
        >
          As&nbsp;Above&nbsp;/&nbsp;So&nbsp;Below
        </p>

        {/* Main identity */}
        <h1
          className="text-5xl md:text-6xl font-display font-bold tracking-[0.12em] text-foreground"
          style={{ animation: "boot-title 0.8s ease both", animationDelay: "0.5s" }}
          data-testid="startup-title"
        >
          VANTA COLD
        </h1>

        {/* Progress bar */}
        <div className="mt-10 w-36 h-px bg-border/20 relative overflow-hidden rounded-full">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-muted-foreground/25 to-muted-foreground/55 rounded-full"
            style={{
              width: "0%",
              animation: "boot-bar 1.7s cubic-bezier(0.4, 0, 0.6, 1) both",
              animationDelay: "0.9s",
            }}
            data-testid="startup-progress"
          />
        </div>

        {/* System action line */}
        <p
          className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground/25 font-mono mt-4"
          style={{ animation: "boot-fade-up 0.5s ease both", animationDelay: "1.1s" }}
          data-testid="startup-status"
        >
          booting&nbsp;interface
        </p>
      </div>
    </div>
  );
}
