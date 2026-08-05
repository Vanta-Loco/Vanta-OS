// ─── Vanta OS Boot Sequence ───────────────────────────────────────────────────
// PS2 / early-BIOS inspired dark terminal startup.
// Press any key, click, or touch to advance. Auto-advances after 7s.
import { useState, useEffect, useCallback, useRef } from "react";

interface VantaOSBootProps {
  onComplete: () => void;
}

const MODULES = [
  { label: "VAULT", dots: "........", status: "ONLINE" },
  { label: "WORLD", dots: "........", status: "ALPHA" },
  { label: "BLACK INDEX", dots: "..", status: "ONLINE" },
  { label: "PROFILES", dots: ".....", status: "ONLINE" },
  { label: "STONERISM", dots: "....", status: "ONLINE" },
  { label: "NETWORK", dots: "......", status: "CONNECTED" },
];

const LINE_DELAY = 320; // ms between each module line
const PRESS_DELAY = LINE_DELAY * MODULES.length + 900; // when "PRESS ANY KEY" appears
const AUTO_TIMEOUT = 7500; // auto-advance if user doesn't interact

export function VantaOSBoot({ onComplete }: VantaOSBootProps) {
  const [visibleModules, setVisibleModules] = useState(0);
  const [showReady, setShowReady] = useState(false);
  const [showPress, setShowPress] = useState(false);
  const [exiting, setExiting] = useState(false);
  const prefersReducedMotion = useRef(
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ).current;

  const advance = useCallback(() => {
    if (exiting) return;
    setExiting(true);
    setTimeout(onComplete, 400);
  }, [exiting, onComplete]);

  useEffect(() => {
    // Reduced motion: skip instantly
    if (prefersReducedMotion) { advance(); return; }

    const timers: ReturnType<typeof setTimeout>[] = [];

    // Animate module lines in
    for (let i = 0; i < MODULES.length; i++) {
      timers.push(setTimeout(() => setVisibleModules(i + 1), 500 + i * LINE_DELAY));
    }
    timers.push(setTimeout(() => setShowReady(true), 500 + MODULES.length * LINE_DELAY + 200));
    timers.push(setTimeout(() => setShowPress(true), PRESS_DELAY));
    timers.push(setTimeout(advance, AUTO_TIMEOUT));

    return () => timers.forEach(clearTimeout);
  }, [advance, prefersReducedMotion]);

  // Any interaction advances
  useEffect(() => {
    if (!showPress) return;
    const handler = () => advance();
    window.addEventListener("keydown", handler);
    window.addEventListener("click", handler);
    window.addEventListener("touchstart", handler, { passive: true });
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("click", handler);
      window.removeEventListener("touchstart", handler);
    };
  }, [showPress, advance]);

  return (
    <div
      className="fixed inset-0 z-[9998] flex flex-col items-center justify-center select-none cursor-pointer"
      style={{
        background: "#090c07",
        opacity: exiting ? 0 : 1,
        transition: "opacity 400ms ease",
      }}
      aria-label="Vanta OS boot sequence — press any key to continue"
    >
      <style>{`
        @keyframes vos-scanline {
          0%   { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        @keyframes vos-cursor {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        @keyframes vos-fadein {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes vos-pressflicker {
          0%,100% { opacity: 0.8; }
          50% { opacity: 0.3; }
        }
      `}</style>

      {/* CRT scanlines overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.18) 2px, rgba(0,0,0,0.18) 4px)",
          zIndex: 2,
        }}
      />

      {/* Moving scan line */}
      <div
        className="pointer-events-none absolute left-0 right-0"
        style={{
          height: 2,
          background: "linear-gradient(transparent, rgba(80,255,80,0.07), transparent)",
          animation: "vos-scanline 5s linear infinite",
          zIndex: 3,
        }}
      />

      {/* Soft green screen glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 50% 45%, rgba(40,100,30,0.07) 0%, transparent 65%)",
          zIndex: 1,
        }}
      />

      {/* Terminal content */}
      <div
        className="relative z-10 w-full max-w-md px-6"
        style={{ fontFamily: "monospace", color: "#5aff5a" }}
      >
        {/* OS Header */}
        <div style={{ marginBottom: 28, animation: "vos-fadein 0.4s ease both" }}>
          <p style={{ fontSize: 11, letterSpacing: "0.3em", color: "#3db83d", marginBottom: 4 }}>
            VANTA SYSTEMS INC.
          </p>
          <p style={{ fontSize: 26, fontWeight: 700, letterSpacing: "0.22em", color: "#6eff6e", lineHeight: 1 }}>
            VANTA OS
          </p>
          <p style={{ fontSize: 10, letterSpacing: "0.18em", color: "#3a8a3a", marginTop: 6 }}>
            VERSION 0.1-ALPHA
          </p>
        </div>

        <div style={{ height: 1, background: "#1e4a1e", marginBottom: 20 }} />

        {/* Initializing */}
        <p style={{ fontSize: 11, letterSpacing: "0.25em", color: "#3a8a3a", marginBottom: 18, animation: "vos-fadein 0.5s 0.2s ease both", opacity: 0, animationFillMode: "forwards" }}>
          INITIALIZING SYSTEM
        </p>

        <p style={{ fontSize: 11, letterSpacing: "0.25em", color: "#3a8a3a", marginBottom: 14, animation: "vos-fadein 0.5s 0.35s ease both", opacity: 0, animationFillMode: "forwards" }}>
          LOADING MODULES
        </p>

        {/* Module lines */}
        <div style={{ marginBottom: 20, display: "flex", flexDirection: "column", gap: 6 }}>
          {MODULES.map((mod, i) => (
            <div
              key={mod.label}
              style={{
                display: "flex",
                gap: 4,
                fontSize: 12,
                letterSpacing: "0.12em",
                opacity: i < visibleModules ? 1 : 0,
                transition: "opacity 0.2s ease",
              }}
            >
              <span style={{ color: "#4acc4a", minWidth: 110 }}>{mod.label}</span>
              <span style={{ color: "#2a6a2a" }}>{mod.dots}</span>
              <span style={{
                color: mod.status === "ALPHA" ? "#ccaa44" :
                       mod.status === "CONNECTED" ? "#44ccaa" : "#5aff5a",
              }}>
                {mod.status}
              </span>
            </div>
          ))}
        </div>

        {/* System Ready */}
        {showReady && (
          <div style={{ animation: "vos-fadein 0.4s ease both" }}>
            <div style={{ height: 1, background: "#1e4a1e", marginBottom: 16 }} />
            <p style={{ fontSize: 13, letterSpacing: "0.25em", color: "#6eff6e", marginBottom: 20 }}>
              SYSTEM READY
            </p>
          </div>
        )}

        {/* Press any key */}
        {showPress && (
          <p style={{
            fontSize: 11, letterSpacing: "0.22em", color: "#3db83d",
            animation: "vos-pressflicker 1.2s ease-in-out infinite",
          }}>
            PRESS ANY KEY
          </p>
        )}

        {!showPress && showReady && (
          <p style={{ fontSize: 11, letterSpacing: "0.2em", color: "#1e4a1e" }}>
            <span style={{ animation: "vos-cursor 1s step-end infinite", display: "inline-block" }}>█</span>
          </p>
        )}
      </div>
    </div>
  );
}
