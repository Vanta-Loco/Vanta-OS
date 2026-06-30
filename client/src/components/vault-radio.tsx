import { useState, useRef, useEffect, useCallback } from "react";
import { useVault } from "@/hooks/use-vault";
import { useQuery } from "@tanstack/react-query";
import type { VaultItem } from "@shared/schema";

// ── Style constants matching world.tsx HUD aesthetic ────────────────────────
const BG      = "rgba(5,3,12,0.93)";
const BORDER  = "rgba(168,85,247,0.45)";
const PURPLE  = "#a855f7";
const MUTED   = "#4b5563";
const TEXT    = "#c4b5fd";
const DIM     = "#6b7280";
const MONO    = "'Courier New', monospace";

function fmt(s: number) {
  if (!isFinite(s) || isNaN(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

const btn: React.CSSProperties = {
  background: "none", border: "none", color: TEXT,
  cursor: "pointer", fontFamily: MONO, lineHeight: 1,
  padding: "2px 6px", fontSize: 14,
};

export function VaultRadio() {
  const { isAuthorized, isLoading: authLoading } = useVault();

  const { data: items = [] } = useQuery<VaultItem[]>({
    queryKey: ["/api/vault/items"],
    enabled: isAuthorized,
  });

  const tracks = items.filter(
    (item) => item.type === "audio" && !!(item.compressedUrl || item.fileUrl)
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying]       = useState(false);
  const [currentTime, setCurrentTime]   = useState(0);
  const [duration, setDuration]         = useState(0);
  const [showList, setShowList]         = useState(false);

  const audioRef       = useRef<HTMLAudioElement>(null);
  const isPlayingRef   = useRef(false);       // shadow for use in callbacks
  const continueRef    = useRef(false);       // should autoplay after track change

  // Keep shadow in sync
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  // Clamp index when tracks list shrinks
  useEffect(() => {
    if (tracks.length > 0 && currentIndex >= tracks.length) setCurrentIndex(0);
  }, [tracks.length, currentIndex]);

  // Load new track when index changes
  const track    = tracks[currentIndex];
  const audioUrl = track ? (track.compressedUrl || track.fileUrl) : "";

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audioUrl) { audio.src = ""; return; }

    audio.src = audioUrl;
    audio.load();
    setCurrentTime(0);
    setDuration(0);

    if (continueRef.current) {
      audio.play().catch(() => {});
      // isPlaying stays true — already set
    }
    continueRef.current = false;
  }, [currentIndex, audioUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;
    if (isPlayingRef.current) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }, [audioUrl]);

  const goTo = useCallback((idx: number) => {
    continueRef.current = isPlayingRef.current;
    setCurrentIndex(idx);
  }, []);

  const prev = useCallback(() => {
    if (tracks.length === 0) return;
    goTo((currentIndex - 1 + tracks.length) % tracks.length);
  }, [tracks.length, currentIndex, goTo]);

  const next = useCallback(() => {
    if (tracks.length === 0) return;
    goTo((currentIndex + 1) % tracks.length);
  }, [tracks.length, currentIndex, goTo]);

  const seek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const t = parseFloat(e.target.value);
    audio.currentTime = t;
    setCurrentTime(t);
  }, []);

  // Prevent mouse events from leaking into the world's camera-drag handler
  const stopMouse = (e: React.MouseEvent) => e.stopPropagation();

  if (authLoading) return null;

  return (
    <div
      data-vault-radio=""
      onMouseDown={stopMouse}
      onMouseMove={stopMouse}
      onMouseUp={stopMouse}
      style={{
        position: "fixed", bottom: 16, right: 16, zIndex: 1000,
        width: 252, background: BG,
        border: `1px solid ${BORDER}`, borderRadius: 4,
        fontFamily: MONO, fontSize: 10, color: TEXT,
        letterSpacing: "0.07em", pointerEvents: "auto",
        userSelect: "none",
      }}
    >
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{
        background: "rgba(168,85,247,0.1)", borderBottom: `1px solid ${BORDER}`,
        padding: "5px 10px", display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ color: PURPLE, fontWeight: 700, fontSize: 10, letterSpacing: "0.12em" }}>
          ◈ VANTA RADIO
        </span>
        {isAuthorized && tracks.length > 0 && (
          <button
            style={{ ...btn, fontSize: 9, color: DIM, padding: "0 2px" }}
            onClick={() => setShowList(v => !v)}
            data-testid="button-vault-radio-toggle-list"
          >
            {showList ? "▲ LIST" : "▼ LIST"}
          </button>
        )}
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      {!isAuthorized ? (
        <div style={{ padding: "14px 10px", textAlign: "center" }}>
          <div style={{ color: MUTED, fontSize: 9, letterSpacing: "0.12em", marginBottom: 10 }}>
            VAULT CLEARANCE REQUIRED
          </div>
          <a
            href="/vault"
            style={{ color: PURPLE, fontSize: 9, textDecoration: "underline", letterSpacing: "0.1em" }}
            data-testid="link-vault-radio-access"
          >
            REQUEST ACCESS →
          </a>
        </div>
      ) : tracks.length === 0 ? (
        <div style={{ padding: "14px 10px", color: MUTED, fontSize: 9, textAlign: "center", letterSpacing: "0.1em" }}>
          NO AUDIO IN VAULT
        </div>
      ) : (
        <>
          {/* Hidden audio element */}
          <audio
            ref={audioRef}
            onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
            onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
            onEnded={() => {
              if (tracks.length > 1) {
                continueRef.current = true;
                setCurrentIndex(i => (i + 1) % tracks.length);
              } else {
                setIsPlaying(false);
              }
            }}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />

          {/* Track title */}
          <div
            title={track?.title}
            style={{
              padding: "7px 10px 2px", color: TEXT, fontSize: 10,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}
            data-testid="text-vault-radio-title"
          >
            {track?.title ?? "—"}
          </div>

          {/* Seek bar */}
          <div style={{ padding: "2px 10px 0" }}>
            <input
              type="range"
              min={0}
              max={duration || 1}
              step={0.1}
              value={currentTime}
              onChange={seek}
              data-testid="input-vault-radio-seek"
              style={{ width: "100%", cursor: "pointer", accentColor: PURPLE, display: "block" }}
            />
          </div>

          {/* Time row */}
          <div style={{
            padding: "0 10px 4px", display: "flex", justifyContent: "space-between",
            color: MUTED, fontSize: 9,
          }}>
            <span data-testid="text-vault-radio-current">{fmt(currentTime)}</span>
            <span data-testid="text-vault-radio-duration">{fmt(duration)}</span>
          </div>

          {/* Controls */}
          <div style={{
            padding: "3px 10px 8px", display: "flex",
            alignItems: "center", justifyContent: "center", gap: 4,
          }}>
            <button onClick={prev} style={btn} title="Previous" data-testid="button-vault-radio-prev">⏮</button>
            <button
              onClick={togglePlay}
              style={{ ...btn, color: PURPLE, fontSize: 18, padding: "2px 10px" }}
              title={isPlaying ? "Pause" : "Play"}
              data-testid="button-vault-radio-play"
            >
              {isPlaying ? "⏸" : "▶"}
            </button>
            <button onClick={next} style={btn} title="Next" data-testid="button-vault-radio-next">⏭</button>
          </div>

          {/* Playlist */}
          {showList && (
            <div style={{
              borderTop: `1px solid ${BORDER}`,
              maxHeight: 108, overflowY: "auto",
              padding: "4px 0",
            }}>
              {tracks.map((t, i) => (
                <div
                  key={t.id}
                  onClick={() => goTo(i)}
                  data-testid={`item-vault-radio-track-${t.id}`}
                  title={t.title}
                  style={{
                    padding: "4px 10px", cursor: "pointer", fontSize: 9,
                    color: i === currentIndex ? PURPLE : DIM,
                    background: i === currentIndex ? "rgba(168,85,247,0.08)" : "transparent",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}
                >
                  {i === currentIndex ? (isPlaying ? "▶ " : "— ") : `${i + 1}. `}{t.title}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
