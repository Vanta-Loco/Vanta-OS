// ─── Enter Vanta Screen ───────────────────────────────────────────────────────
// Atmospheric cinematic entry screen with CSS rain, fog, CRT scanlines,
// and Vault radio. Optimized — no Three.js.
import { useState, useEffect, useRef, useCallback } from "react";
import { Volume2, VolumeX, ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface EnterVantaProps {
  onEnter: () => void;   // called when user clicks Enter Vanta
}

interface VaultItem {
  id: string;
  title: string;
  fileUrl: string;
  compressedUrl: string;
  type: string;
}

const SKIP_KEY = "vanta-skip-os-boot";

export function EnterVanta({ onEnter }: EnterVantaProps) {
  const [muted, setMuted] = useState(true); // Start muted (autoplay)
  const [volume, setVolume] = useState(0.35);
  const [trackIdx, setTrackIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [exiting, setExiting] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Fetch vault audio tracks (vault may be locked — handle 401/errors gracefully)
  const { data: vaultItems = [] } = useQuery<VaultItem[]>({
    queryKey: ["/api/vault/items"],
    queryFn: async () => {
      const r = await fetch("/api/vault/items");
      if (!r.ok) return [];
      const data = await r.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const audioTracks = vaultItems.filter(
    v => (v.type === "audio" || v.type === "demo") &&
    (v.compressedUrl || v.fileUrl)
  );

  const currentTrack = audioTracks[trackIdx];

  // Setup audio
  useEffect(() => {
    if (!currentTrack) return;
    const url = currentTrack.compressedUrl || currentTrack.fileUrl;
    if (!url) return;

    const audio = new Audio(url);
    audio.loop = false;
    audio.volume = muted ? 0 : volume;
    audioRef.current = audio;

    // Try playing (may be blocked by browser)
    audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));

    audio.addEventListener("ended", () => {
      setTrackIdx(i => (i + 1) % Math.max(audioTracks.length, 1));
    });

    return () => {
      audio.pause();
      audio.src = "";
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id, audioTracks.length]);

  // Sync volume/mute
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = muted ? 0 : volume;
  }, [muted, volume]);

  const handlePlay = () => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      audioRef.current.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      audioRef.current.pause();
      setPlaying(false);
    }
    setMuted(false);
  };

  const handleEnter = useCallback(() => {
    setExiting(true);
    setTimeout(onEnter, 600);
  }, [onEnter]);

  return (
    <div
      className="fixed inset-0 z-[9997] overflow-hidden"
      style={{ opacity: exiting ? 0 : 1, transition: "opacity 600ms ease" }}
    >
      <style>{`
        /* ── Rain drops ──────────────────────────────────────────── */
        @keyframes rain-fall {
          from { transform: translateY(-60px); opacity: 0.7; }
          to   { transform: translateY(110vh);  opacity: 0; }
        }
        .rain-drop {
          position: absolute;
          width: 1px;
          background: linear-gradient(to bottom, transparent, rgba(80,180,80,0.35), transparent);
          border-radius: 1px;
          animation: rain-fall linear infinite;
        }
        /* ── Fog / haze ─────────────────────────────────────────── */
        @keyframes fog-drift {
          0%   { transform: translateX(-5%) scaleX(1.1); opacity: 0.18; }
          50%  { transform: translateX(3%)  scaleX(1.0); opacity: 0.28; }
          100% { transform: translateX(-5%) scaleX(1.1); opacity: 0.18; }
        }
        /* ── Apt lights flicker ──────────────────────────────────── */
        @keyframes apt-flicker {
          0%,100% { opacity: 0.6; }
          30%     { opacity: 0.3; }
          60%     { opacity: 0.85; }
        }
        @keyframes apt-glow {
          0%,100% { opacity: 0.25; }
          50%     { opacity: 0.55; }
        }
        /* ── Content fade ───────────────────────────────────────── */
        @keyframes ev-fadein {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ev-press {
          0%,100% { opacity: 0.5; }
          50%     { opacity: 0.9; }
        }
        @keyframes grain-shift {
          0%,100% { transform: translate(0,0); }
          25%  { transform: translate(-2px, 1px); }
          75%  { transform: translate(2px, -1px); }
        }
      `}</style>

      {/* ── Night sky / city backdrop ── */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, #030806 0%, #050f08 35%, #040d07 65%, #020703 100%)",
        }}
      />

      {/* ── City silhouette ── */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: "45%",
          background: "linear-gradient(to top, #010503 0%, #020804 60%, transparent 100%)",
          clipPath: `polygon(
            0% 100%, 0% 70%, 4% 70%, 4% 55%, 6% 55%, 6% 70%,
            10% 70%, 10% 42%, 12% 42%, 12% 70%,
            15% 70%, 15% 60%, 16% 60%, 16% 70%,
            19% 70%, 19% 38%, 21% 38%, 21% 48%, 23% 48%, 23% 38%, 25% 38%, 25% 70%,
            28% 70%, 28% 50%, 30% 50%, 30% 70%,
            33% 70%, 33% 32%, 35% 32%, 35% 70%,
            38% 70%, 38% 55%, 39% 55%, 39% 70%,
            42% 70%, 42% 44%, 44% 44%, 44% 36%, 46% 36%, 46% 44%, 48% 44%, 48% 70%,
            52% 70%, 52% 58%, 54% 58%, 54% 70%,
            57% 70%, 57% 40%, 59% 40%, 59% 70%,
            62% 70%, 62% 52%, 64% 52%, 64% 70%,
            67% 70%, 67% 35%, 69% 35%, 69% 70%,
            72% 70%, 72% 60%, 74% 60%, 74% 70%,
            77% 70%, 77% 45%, 79% 45%, 79% 70%,
            82% 70%, 82% 38%, 84% 38%, 84% 70%,
            87% 70%, 87% 62%, 89% 62%, 89% 70%,
            92% 70%, 92% 48%, 94% 48%, 94% 70%,
            97% 70%, 97% 55%, 100% 55%, 100% 100%
          )`,
        }}
      />

      {/* ── Apartment windows ── */}
      {!prefersReducedMotion && [
        { left: "12%", bottom: "46%", delay: "0s", dur: "3.1s" },
        { left: "20%", bottom: "43%", delay: "0.8s", dur: "4.2s" },
        { left: "34%", bottom: "38%", delay: "1.5s", dur: "2.8s" },
        { left: "45%", bottom: "47%", delay: "0.2s", dur: "5s" },
        { left: "57%", bottom: "44%", delay: "1.1s", dur: "3.5s" },
        { left: "68%", bottom: "39%", delay: "0.5s", dur: "4.8s" },
        { left: "78%", bottom: "50%", delay: "1.8s", dur: "2.5s" },
        { left: "21%", bottom: "35%", delay: "0.9s", dur: "6s" },
        { left: "60%", bottom: "36%", delay: "0.3s", dur: "3.8s" },
      ].map((w, i) => (
        <div key={i} style={{
          position: "absolute", left: w.left, bottom: w.bottom,
          width: 3, height: 4,
          background: "rgba(200,170,80,0.7)",
          boxShadow: "0 0 6px 2px rgba(200,170,60,0.25)",
          animation: `apt-flicker ${w.dur} ${w.delay} ease-in-out infinite`,
        }} />
      ))}

      {/* ── Fog layers ── */}
      {!prefersReducedMotion && [
        { bottom: "15%", opacity: 0.22, blur: 8, delay: "0s" },
        { bottom: "25%", opacity: 0.12, blur: 12, delay: "2s" },
      ].map((f, i) => (
        <div key={i} style={{
          position: "absolute", left: "-10%", right: "-10%",
          bottom: f.bottom, height: "80px",
          background: "rgba(30,80,30,0.3)",
          filter: `blur(${f.blur}px)`,
          animation: `fog-drift ${7 + i * 3}s ${f.delay} ease-in-out infinite`,
          pointerEvents: "none",
        }} />
      ))}

      {/* ── Rain ── */}
      {!prefersReducedMotion && Array.from({ length: 35 }, (_, i) => {
        const left = Math.random() * 100;
        const height = 25 + Math.random() * 40;
        const duration = 0.6 + Math.random() * 0.8;
        const delay = Math.random() * 3;
        return (
          <div
            key={i}
            className="rain-drop"
            style={{
              left: `${left}%`,
              height: `${height}px`,
              animationDuration: `${duration}s`,
              animationDelay: `${delay}s`,
            }}
          />
        );
      })}

      {/* ── CRT scanlines ── */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.12) 3px, rgba(0,0,0,0.12) 4px)",
          zIndex: 5,
        }}
      />

      {/* ── Film grain ── */}
      {!prefersReducedMotion && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,
            opacity: 0.3,
            zIndex: 6,
            animation: "grain-shift 0.4s steps(2) infinite",
          }}
        />
      )}

      {/* ── Centered content ── */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ zIndex: 10 }}
      >
        {/* Logo */}
        <div
          className="text-center mb-10"
          style={{ animation: "ev-fadein 1s 0.3s ease both", opacity: 0, animationFillMode: "forwards" }}
        >
          <p style={{
            fontFamily: "monospace",
            fontSize: 10,
            letterSpacing: "0.4em",
            color: "rgba(80,200,80,0.4)",
            marginBottom: 16,
            textTransform: "uppercase",
          }}>
            A CULTURE OPERATING SYSTEM
          </p>
          <h1 style={{
            fontSize: "clamp(42px, 8vw, 72px)",
            fontWeight: 800,
            letterSpacing: "0.18em",
            color: "#e8f0e8",
            lineHeight: 1,
            textShadow: "0 0 40px rgba(80,200,80,0.15), 0 0 80px rgba(40,120,40,0.1)",
          }}>
            VANTA
          </h1>
        </div>

        {/* Enter button */}
        <div
          style={{ animation: "ev-fadein 0.9s 0.8s ease both", opacity: 0, animationFillMode: "forwards" }}
        >
          <button
            onClick={handleEnter}
            style={{
              fontFamily: "monospace",
              fontSize: 13,
              letterSpacing: "0.35em",
              color: "#5aff5a",
              border: "1px solid rgba(80,200,80,0.35)",
              background: "rgba(0,0,0,0.6)",
              padding: "14px 36px",
              cursor: "pointer",
              backdropFilter: "blur(4px)",
              transition: "border-color 0.2s, color 0.2s, box-shadow 0.2s",
              textTransform: "uppercase",
              minWidth: 200,
              minHeight: 48,
            }}
            onMouseEnter={e => {
              (e.target as HTMLButtonElement).style.borderColor = "rgba(80,200,80,0.8)";
              (e.target as HTMLButtonElement).style.boxShadow = "0 0 20px rgba(80,200,80,0.15)";
            }}
            onMouseLeave={e => {
              (e.target as HTMLButtonElement).style.borderColor = "rgba(80,200,80,0.35)";
              (e.target as HTMLButtonElement).style.boxShadow = "none";
            }}
            aria-label="Enter Vanta"
          >
            [ ENTER VANTA ]
          </button>
        </div>

        {/* Version */}
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 10,
            letterSpacing: "0.3em",
            color: "rgba(80,180,80,0.3)",
            marginTop: 24,
            animation: "ev-fadein 0.8s 1.2s ease both",
            opacity: 0,
            animationFillMode: "forwards",
          }}
        >
          ALPHA VERSION 0.1
        </div>

        {/* Scroll hint */}
        <div
          style={{
            position: "absolute",
            bottom: 80,
            animation: "ev-press 2s ease-in-out infinite",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
          }}
        >
          <ChevronDown size={14} style={{ color: "rgba(80,200,80,0.3)" }} />
        </div>
      </div>

      {/* ── Vanta Radio HUD ── */}
      <div
        style={{
          position: "absolute",
          bottom: 20,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          zIndex: 20,
          padding: "0 16px",
          animation: "ev-fadein 0.8s 1.5s ease both",
          opacity: 0,
          animationFillMode: "forwards",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "rgba(0,0,0,0.75)",
            border: "1px solid rgba(80,200,80,0.2)",
            borderRadius: 4,
            padding: "8px 16px",
            backdropFilter: "blur(6px)",
            maxWidth: 420,
            width: "100%",
          }}
        >
          {/* Radio label */}
          <span style={{
            fontFamily: "monospace", fontSize: 9, letterSpacing: "0.25em",
            color: "rgba(80,200,80,0.5)", textTransform: "uppercase", whiteSpace: "nowrap",
          }}>
            VANTA RADIO
          </span>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontFamily: "monospace", fontSize: 11,
              color: currentTrack ? "rgba(200,230,200,0.8)" : "rgba(100,150,100,0.4)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {currentTrack ? currentTrack.title : "NO SIGNAL"}
            </p>
          </div>

          {/* Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {currentTrack && (
              <button
                onClick={handlePlay}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "rgba(80,200,80,0.7)", padding: 4, minWidth: 28, minHeight: 28,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
                aria-label={playing ? "Pause" : "Play"}
              >
                {playing ? "⏸" : "▶"}
              </button>
            )}

            <button
              onClick={() => { setMuted(m => !m); if (!playing && audioRef.current) { audioRef.current.play().then(() => setPlaying(true)).catch(() => {}); } }}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: muted ? "rgba(100,120,100,0.4)" : "rgba(80,200,80,0.7)",
                padding: 4, minWidth: 28, minHeight: 28,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>

            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={e => {
                const v = parseFloat(e.target.value);
                setVolume(v);
                setMuted(v === 0);
              }}
              style={{ width: 60, accentColor: "#5aff5a", cursor: "pointer" }}
              aria-label="Volume"
            />
          </div>
        </div>
      </div>

      {/* ── Skip startup preference ── */}
      <div style={{
        position: "absolute", top: 16, right: 16, zIndex: 20,
        animation: "ev-fadein 0.6s 2s ease both", opacity: 0, animationFillMode: "forwards",
      }}>
        <label style={{
          display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
          fontFamily: "monospace", fontSize: 10, letterSpacing: "0.15em",
          color: "rgba(80,180,80,0.4)",
        }}>
          <input
            type="checkbox"
            defaultChecked={!!localStorage.getItem(SKIP_KEY)}
            onChange={e => {
              if (e.target.checked) localStorage.setItem(SKIP_KEY, "1");
              else localStorage.removeItem(SKIP_KEY);
            }}
            style={{ accentColor: "#5aff5a", cursor: "pointer" }}
          />
          Skip startup next time
        </label>
      </div>
    </div>
  );
}
