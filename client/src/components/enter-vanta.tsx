// ─── Enter Vanta Screen ───────────────────────────────────────────────────────
// Atmospheric cinematic entry screen with CSS rain, fog, CRT scanlines,
// and Vault radio. Optimized — no Three.js.
import { useState, useEffect, useRef, useCallback } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import cityBackdrop from "@assets/generated_images/Urban_night_cityscape_mood_2c3c2c61.png";

interface EnterVantaProps {
  onEnter: () => void;   // called when user clicks Enter Vanta
}

interface RadioTrack {
  id: string;
  title: string;
  fileUrl: string;
  compressedUrl: string;
}

const SKIP_KEY = "vanta-skip-os-boot";
const RAIN_AMBIENCE_URL = "/audio/vanta-rain-ambience.mp3";

export function EnterVanta({ onEnter }: EnterVantaProps) {
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.35);
  const [playing, setPlaying] = useState(false);
  const [radioState, setRadioState] = useState<"tuning" | "playing" | "no-signal">("tuning");
  const [exiting, setExiting] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rainAudioRef = useRef<HTMLAudioElement | null>(null);
  const rainLoadAttemptedRef = useRef(false);
  const rainAudibleRef = useRef(false);
  const rainVolumeRef = useRef(volume);
  const rainMutedRef = useRef(muted);
  const rainFadeRef = useRef<number | null>(null);
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // The startup screen receives only the designated public radio track, not the
  // full restricted Vault catalog.
  const { data: currentTrack = null, isLoading: trackLoading } = useQuery<RadioTrack | null>({
    queryKey: ["/api/vault/radio"],
    queryFn: async () => {
      const response = await fetch("/api/vault/radio");
      if (response.status === 404 || response.status === 401) return null;
      if (!response.ok) throw new Error("Unable to tune Vanta Radio");
      return response.json();
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  // A real recording can be added later at /audio/vanta-rain-ambience.mp3.
  // Missing ambience is intentionally silent and does not log an error.
  const ensureRainAudio = useCallback(() => {
    if (typeof window === "undefined" || rainLoadAttemptedRef.current) {
      return rainAudioRef.current;
    }

    rainLoadAttemptedRef.current = true;
    const rainAudio = new Audio(RAIN_AMBIENCE_URL);
    rainAudio.preload = "auto";
    rainAudio.loop = true;
    rainAudio.volume = 0;

    const handleMissingRain = () => {
      if (rainAudioRef.current !== rainAudio) return;
      rainAudio.pause();
      rainAudio.removeAttribute("src");
      rainAudioRef.current = null;
    };
    rainAudio.addEventListener("error", handleMissingRain, { once: true });
    rainAudio.addEventListener("canplay", () => {
      if (rainAudioRef.current !== rainAudio || !rainAudibleRef.current || rainMutedRef.current) return;
      void rainAudio.play().catch(() => {});
    }, { once: true });

    rainAudioRef.current = rainAudio;
    rainAudio.load();
    return rainAudio;
  }, []);

  const fadeRain = useCallback((audible: boolean) => {
    const rainAudio = rainAudioRef.current;
    if (!rainAudio) return;

    if (rainFadeRef.current !== null) cancelAnimationFrame(rainFadeRef.current);
    const startVolume = rainAudio.volume;
    const targetVolume = rainMutedRef.current
      ? 0
      : (audible ? 0.14 : 0.002) * rainVolumeRef.current;
    const startedAt = performance.now();

    const step = (now: number) => {
      const progress = Math.max(0, Math.min(1, (now - startedAt) / 450));
      rainAudio.volume = startVolume + (targetVolume - startVolume) * progress;
      if (progress < 1) {
        rainFadeRef.current = requestAnimationFrame(step);
      } else if (targetVolume === 0) {
        rainAudio.pause();
        rainFadeRef.current = null;
      } else {
        rainFadeRef.current = null;
      }
    };
    rainFadeRef.current = requestAnimationFrame(step);

    if (audible && !rainMutedRef.current) {
      void rainAudio.play().catch(() => {});
    }
  }, []);

  const setRainAudible = useCallback((audible: boolean) => {
    rainAudibleRef.current = audible;
    ensureRainAudio();
    fadeRain(audible);
  }, [ensureRainAudio, fadeRain]);

  // Setup the designated radio track. Autoplay may be blocked until the
  // user's Enter Vanta click, so that gesture retries playback below.
  useEffect(() => {
    const url = currentTrack?.compressedUrl || currentTrack?.fileUrl;
    if (!url) {
      if (!trackLoading) {
        setPlaying(false);
        setRadioState("no-signal");
        setRainAudible(true);
      }
      return;
    }

    const audio = new Audio(url);
    audio.preload = "auto";
    audio.loop = false;
    audio.volume = muted ? 0 : volume;
    audio.muted = muted;
    audioRef.current = audio;

    const handleEnded = () => {
      setPlaying(false);
      setRadioState("no-signal");
      setRainAudible(true);
    };
    const handleError = () => {
      setPlaying(false);
      setRadioState("no-signal");
      setRainAudible(true);
    };
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    audio.play()
      .then(() => {
        setPlaying(true);
        setRadioState("playing");
        setRainAudible(false);
      })
      .catch(() => {
        // A browser gesture is required in some preview environments.
        setRadioState("no-signal");
        setRainAudible(true);
      });

    return () => {
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.pause();
      audio.src = "";
      if (audioRef.current === audio) audioRef.current = null;
    };
  }, [currentTrack?.id, currentTrack?.compressedUrl, currentTrack?.fileUrl, trackLoading, setRainAudible]);

  // Sync volume/mute
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = muted ? 0 : volume;
      audioRef.current.muted = muted;
    }
    rainVolumeRef.current = volume;
    rainMutedRef.current = muted;
    fadeRain(rainAudibleRef.current);
  }, [muted, volume, fadeRain]);

  // Stop generated ambience and music when the startup overlay exits.
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
      if (rainFadeRef.current !== null) {
        cancelAnimationFrame(rainFadeRef.current);
        rainFadeRef.current = null;
      }
      if (rainAudioRef.current) {
        rainAudioRef.current.pause();
        rainAudioRef.current.removeAttribute("src");
        rainAudioRef.current = null;
      }
    };
  }, []);

  const handlePlay = () => {
    const audio = audioRef.current;
    if (!audio) {
      setRadioState("no-signal");
      setRainAudible(true);
      return;
    }

    if (audio.paused) {
      setMuted(false);
      audio.muted = false;
      audio.play()
        .then(() => {
          setPlaying(true);
          setRadioState("playing");
          setRainAudible(false);
        })
        .catch(() => {
          setRadioState("no-signal");
          setRainAudible(true);
        });
    } else {
      audio.pause();
      setPlaying(false);
      setRainAudible(true);
    }
  };

  const handleMuteToggle = () => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    if (!nextMuted && audioRef.current?.paused) {
      handlePlay();
    }
  };

  const activateRadio = () => {
    if (radioState === "no-signal") return;
    if (!audioRef.current) {
      setRainAudible(true);
      return;
    }
    setMuted(false);
    audioRef.current.muted = false;
    audioRef.current.play()
      .then(() => {
        setPlaying(true);
        setRadioState("playing");
        setRainAudible(false);
      })
      .catch(() => {
        setRadioState("no-signal");
        setRainAudible(true);
      });
  };

  const handleEnter = useCallback(() => {
    activateRadio();
    setExiting(true);
    setTimeout(onEnter, 600);
  }, [onEnter]);

  return (
    <div
      className="fixed inset-0 z-[9997] overflow-hidden select-none"
      data-testid="enter-vanta-screen"
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
        @keyframes water-shimmer {
          0%,100% { opacity: 0.2; transform: scaleX(1); }
          50% { opacity: 0.36; transform: scaleX(1.04); }
        }
        @keyframes system-flicker {
          0%, 92%, 100% { opacity: 0.62; }
          94% { opacity: 0.38; }
          96% { opacity: 0.72; }
        }
      `}</style>

      {/* ── Night sky / city backdrop ── */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(1,8,4,0.56), rgba(2,18,10,0.48) 42%, rgba(1,7,4,0.82)), url(${cityBackdrop})`,
          backgroundSize: "cover",
          backgroundPosition: "center bottom",
          filter: "saturate(0.58) hue-rotate(58deg) brightness(0.52) contrast(1.22)",
        }}
      />

      {/* ── Near skyline haze ── */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: "48%",
          opacity: 0.56,
          background: "linear-gradient(to top, #010503 0%, rgba(2,12,6,0.92) 24%, rgba(2,8,4,0.3) 75%, transparent 100%)",
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

      {/* ── Wet reflective foreground ── */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{
          height: "22%",
          background: "linear-gradient(to bottom, rgba(20,100,52,0.06), rgba(0,3,2,0.92) 75%), repeating-linear-gradient(175deg, transparent 0, transparent 7px, rgba(107,229,141,0.035) 8px, transparent 10px)",
          filter: "blur(0.3px)",
          animation: prefersReducedMotion ? undefined : "water-shimmer 7s ease-in-out infinite",
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
      {!prefersReducedMotion && Array.from({ length: 72 }, (_, i) => {
        const left = Math.random() * 100;
        const height = 18 + Math.random() * (i % 4 === 0 ? 58 : 35);
        const duration = 0.55 + Math.random() * 1.15;
        const delay = Math.random() * 3.5;
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

      {/* ── System labels ── */}
      <div
        className="absolute left-6 top-8 sm:left-10 sm:top-12 z-10 font-mono text-[8px] leading-[1.65] tracking-[0.28em] text-emerald-200/55"
        style={{ animation: prefersReducedMotion ? undefined : "system-flicker 8s ease-in-out infinite" }}
      >
        MUSIC<br />ART<br />PEOPLE<br />WORLDS
      </div>
      <div className="absolute left-6 bottom-24 sm:left-10 sm:bottom-28 z-10 font-mono text-[8px] leading-[1.65] tracking-[0.28em] text-emerald-200/50">
        SOUNDS<br />FOR A<br />COLDER<br />TOMORROW
      </div>
      <div className="absolute right-6 top-8 sm:right-10 sm:top-12 z-10 text-right font-mono text-[8px] leading-[1.65] tracking-[0.28em] text-emerald-200/55">
        ARCHIVE<br />RADIO<br />PASSPORT<br />SYSTEM
      </div>
      <div className="absolute right-6 bottom-24 sm:right-10 sm:bottom-28 z-10 text-right font-mono text-[8px] leading-[1.65] tracking-[0.28em] text-emerald-200/50">
        SAME<br />PEOPLE<br />DIFFERENT<br />FREQUENCIES
      </div>
      <div className="absolute right-6 top-3 sm:right-10 sm:top-5 z-10 font-mono text-[7px] tracking-[0.25em] text-emerald-200/45">
        VANTA COLD OS&nbsp;&nbsp;v0.1
      </div>
      <div className="absolute left-6 bottom-6 sm:left-10 sm:bottom-8 z-10 font-mono text-[7px] leading-[1.5] tracking-[0.2em] text-emerald-200/45">
        ◎&nbsp;&nbsp;GLOBAL CULTURE<br />&nbsp;&nbsp;&nbsp;&nbsp;NETWORK
      </div>
      <div className="absolute right-6 bottom-6 sm:right-10 sm:bottom-8 z-10 text-right font-mono text-[7px] leading-[1.5] tracking-[0.2em] text-emerald-200/45">
        BUILT FROM<br />THE GROUND UP
      </div>

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
            letterSpacing: "0.42em",
            color: "rgba(126,255,155,0.68)",
            marginBottom: 18,
            textTransform: "uppercase",
          }}>
            A CULTURE OPERATING SYSTEM
          </p>
          <h1 style={{
            fontSize: "clamp(42px, 8vw, 78px)",
            fontWeight: 800,
            letterSpacing: "0.16em",
            color: "#f1fff2",
            lineHeight: 1,
            textShadow: "0 0 12px rgba(175,255,190,0.65), 0 0 42px rgba(64,220,108,0.4), 0 0 88px rgba(20,150,60,0.25)",
          }}>
            VANTA COLD
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
               color: "#d9ffe0",
               border: "1px solid rgba(104,255,143,0.72)",
               background: "rgba(3,19,10,0.72)",
              padding: "14px 36px",
              cursor: "pointer",
               backdropFilter: "blur(8px)",
              transition: "border-color 0.2s, color 0.2s, box-shadow 0.2s",
              textTransform: "uppercase",
               minWidth: 218,
              minHeight: 48,
               boxShadow: "0 0 18px rgba(68,220,104,0.18), inset 0 0 20px rgba(68,220,104,0.06)",
            }}
            onMouseEnter={e => {
               (e.target as HTMLButtonElement).style.borderColor = "rgba(160,255,175,1)";
               (e.target as HTMLButtonElement).style.boxShadow = "0 0 28px rgba(86,240,120,0.3), inset 0 0 20px rgba(86,240,120,0.12)";
            }}
            onMouseLeave={e => {
               (e.target as HTMLButtonElement).style.borderColor = "rgba(104,255,143,0.72)";
               (e.target as HTMLButtonElement).style.boxShadow = "0 0 18px rgba(68,220,104,0.18), inset 0 0 20px rgba(68,220,104,0.06)";
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
             maxWidth: 440,
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
               color: radioState === "no-signal" ? "rgba(149,203,157,0.52)" : "rgba(200,245,210,0.88)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
               {trackLoading
                 ? "TUNING VANTA RADIO…"
                 : radioState === "no-signal"
                   ? "NO SIGNAL — ACCESS VAULT FOR MORE MUSIC"
                   : `NOW PLAYING: ${currentTrack?.title || "DEGAUSSER"}`}
            </p>
          </div>

          {/* Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
             {currentTrack && radioState !== "no-signal" && (
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
               onClick={handleMuteToggle}
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
               style={{ width: 60, accentColor: "#7dff9a", cursor: "pointer" }}
              aria-label="Volume"
            />
          </div>
        </div>
      </div>

      {/* ── Skip startup preference ── */}
      <div style={{
        position: "absolute", top: 16, left: "50%", zIndex: 20,
        transform: "translateX(-50%)",
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
