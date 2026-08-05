// ─── VANTA OS — ENTER THE SYSTEM ────────────────────────────────────────────
// Interactive gateway screen. Design language sourced directly from
// /enter page (enter.tsx) — same lock icon, scan line, corner brackets,
// ambient glow, and monospace identity system.
import { useState, useEffect, useCallback } from "react";
import { LockKeyhole } from "lucide-react";

interface VantaOSIntroProps {
  onEnter: () => void; // called when user activates ENTER THE SYSTEM
}

export function VantaOSIntro({ onEnter }: VantaOSIntroProps) {
  const [visible, setVisible] = useState(false);   // fade in
  const [exiting, setExiting] = useState(false);   // fade out
  const [activated, setActivated] = useState(false);

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Fade in shortly after mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), prefersReducedMotion ? 0 : 80);
    return () => clearTimeout(t);
  }, [prefersReducedMotion]);

  const handleEnter = useCallback(() => {
    if (activated) return;
    setActivated(true);
    setExiting(true);
    const t = setTimeout(() => onEnter(), prefersReducedMotion ? 0 : 500);
    return () => clearTimeout(t);
  }, [activated, onEnter, prefersReducedMotion]);

  // Any key press activates
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") return; // don't trigger on Escape
      handleEnter();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleEnter]);

  return (
    <div
      className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center select-none overflow-hidden"
      style={{
        opacity: exiting ? 0 : visible ? 1 : 0,
        transition: prefersReducedMotion
          ? "none"
          : exiting
          ? "opacity 500ms ease"
          : "opacity 600ms ease",
      }}
      data-testid="vanta-os-intro"
      onClick={handleEnter}
      role="button"
      tabIndex={0}
      aria-label="Enter the Vanta OS system"
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") handleEnter(); }}
    >
      <style>{`
        @keyframes intro-scan {
          0%   { transform: translateY(-12px); opacity: 0; }
          8%   { opacity: 1; }
          92%  { opacity: 1; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
        @keyframes intro-fade-up {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes intro-title {
          from { opacity: 0; transform: scale(0.97); letter-spacing: 0.06em; }
          to   { opacity: 1; transform: scale(1);    letter-spacing: 0.12em; }
        }
        @keyframes intro-pulse {
          0%, 100% { opacity: 0.45; }
          50%       { opacity: 1; }
        }
        @keyframes intro-blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
      `}</style>

      {/* Ambient radial glow — matches enter.tsx */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 35%, hsl(var(--primary)/0.06) 0%, transparent 62%)",
        }}
      />

      {/* Slow scan line — matches enter.tsx */}
      {!prefersReducedMotion && (
        <div
          className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/8 to-transparent pointer-events-none"
          style={{ animation: "intro-scan 20s linear infinite" }}
        />
      )}

      {/* Corner bracket marks — matches enter.tsx */}
      <div className="absolute top-8 left-8 w-5 h-5 border-t border-l border-border/20 pointer-events-none" />
      <div className="absolute top-8 right-8 w-5 h-5 border-t border-r border-border/20 pointer-events-none" />
      <div className="absolute bottom-8 left-8 w-5 h-5 border-b border-l border-border/20 pointer-events-none" />
      <div className="absolute bottom-8 right-8 w-5 h-5 border-b border-r border-border/20 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6">

        {/* Lock icon in circle — matches enter.tsx */}
        <div
          className="inline-flex items-center justify-center w-12 h-12 rounded-full border border-border/40 bg-background/60 mb-8"
          style={{
            animation: prefersReducedMotion
              ? "none"
              : "intro-fade-up 0.6s ease both",
            animationDelay: "0.2s",
          }}
        >
          <LockKeyhole className="w-5 h-5 text-muted-foreground/50" />
        </div>

        {/* VANTA OS — matches enter.tsx h1 exactly */}
        <h1
          className="text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-[0.12em] text-foreground"
          style={{
            animation: prefersReducedMotion
              ? "none"
              : "intro-title 0.8s ease both",
            animationDelay: "0.45s",
          }}
          data-testid="intro-title"
        >
          VANTA OS
        </h1>

        {/* System line — matches enter.tsx subtitle */}
        <p
          className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground/40 font-mono mt-3"
          style={{
            animation: prefersReducedMotion
              ? "none"
              : "intro-fade-up 0.55s ease both",
            animationDelay: "0.75s",
          }}
          data-testid="intro-subtitle"
        >
          System Interface
        </p>

        {/* Divider */}
        <div
          className="w-36 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent mt-10 mb-10"
          style={{
            animation: prefersReducedMotion
              ? "none"
              : "intro-fade-up 0.5s ease both",
            animationDelay: "1.0s",
          }}
        />

        {/* ENTER THE SYSTEM — the interactive CTA */}
        <button
          type="button"
          onClick={e => { e.stopPropagation(); handleEnter(); }}
          className="group relative flex flex-col items-center gap-3 focus:outline-none"
          style={{
            animation: prefersReducedMotion
              ? "none"
              : "intro-fade-up 0.55s ease both",
            animationDelay: "1.25s",
          }}
          data-testid="intro-enter-btn"
          aria-label="Enter the system"
        >
          <span
            className="text-xs uppercase tracking-[0.55em] font-mono text-foreground/70 group-hover:text-foreground transition-colors duration-300"
            style={{
              animation: prefersReducedMotion
                ? "none"
                : "intro-pulse 3s ease-in-out infinite",
              animationDelay: "1.5s",
            }}
          >
            Enter&nbsp;the&nbsp;System
          </span>
          {/* Underline accent */}
          <span className="block h-px w-0 group-hover:w-full bg-foreground/30 transition-all duration-500" />
        </button>

        {/* Blinking cursor prompt */}
        <p
          className="text-[9px] uppercase tracking-[0.4em] text-muted-foreground/25 font-mono mt-8"
          style={{
            animation: prefersReducedMotion
              ? "none"
              : "intro-fade-up 0.5s ease both",
            animationDelay: "1.6s",
          }}
        >
          <span
            style={{
              display: "inline-block",
              animation: prefersReducedMotion ? "none" : "intro-blink 1.2s step-start infinite",
            }}
          >
            ▮
          </span>
          {" "}click or press any key
        </p>
      </div>
    </div>
  );
}
