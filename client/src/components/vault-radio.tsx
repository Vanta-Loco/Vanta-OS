import { useState, useRef, useEffect } from "react";
import { useVault } from "@/hooks/use-vault";
import { useQuery } from "@tanstack/react-query";
import type { VaultItem } from "@shared/schema";
import { saveRadioVol, loadRadioVol } from "@/lib/world-state";

const BG     = "rgba(5,3,12,0.93)";
const BORDER = "rgba(168,85,247,0.45)";
const PURPLE = "#a855f7";
const MUTED  = "#4b5563";
const TEXT   = "#c4b5fd";
const MONO   = "'Courier New', monospace";

const AUDIO_EXT = /\.(mp3|wav|m4a|aac|ogg|flac)(\?.*)?$/i;

function isPlayable(item: VaultItem) {
  const url = item.compressedUrl || item.fileUrl;
  if (!url) return false;
  return item.type?.toLowerCase() === "audio" || AUDIO_EXT.test(url);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Build a shuffled queue, optionally avoiding the same first track as avoidId
function buildQueue(tracks: VaultItem[], avoidId?: string): VaultItem[] {
  let q = shuffle(tracks);
  if (avoidId && q.length > 1 && q[0].id === avoidId) {
    const swapIdx = 1 + Math.floor(Math.random() * (q.length - 1));
    [q[0], q[swapIdx]] = [q[swapIdx], q[0]];
  }
  return q;
}

export function VaultRadio() {
  const { isAuthorized, isLoading: authLoading } = useVault();

  const { data: items = [] } = useQuery<VaultItem[]>({
    queryKey: ["/api/vault/items"],
    enabled: isAuthorized,
  });

  const tracks = items.filter(isPlayable);

  const [on, setOn]         = useState(false);
  const [volume, setVolume] = useState(() => loadRadioVol() ?? 0.7);
  const [title, setTitle]   = useState<string>("");

  const audioRef    = useRef<HTMLAudioElement | null>(null);
  const tracksRef   = useRef<VaultItem[]>([]);
  const queueRef    = useRef<VaultItem[]>([]);
  const qPosRef     = useRef(0);

  // Keep tracksRef in sync
  useEffect(() => {
    tracksRef.current = tracks;
    console.log("[Vanta Radio] playable tracks:", tracks.map(t => ({
      title: t.title, type: t.type, url: t.compressedUrl || t.fileUrl,
    })));
  }, [tracks]);

  // Sync volume + persist to sessionStorage for world-state restore
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
    saveRadioVol(volume);
  }, [volume]);

  function playAt(qIdx: number) {
    const q = queueRef.current;
    if (!q.length) return;
    const t = q[qIdx];
    if (!t) return;
    const url = t.compressedUrl || t.fileUrl;
    if (!url) { advanceQueue(); return; }

    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = volume;
    }

    const audio = audioRef.current;
    qPosRef.current = qIdx;
    setTitle(t.title);
    audio.src = url;
    audio.load();
    audio.play().catch(() => {});

    audio.onended = () => advanceQueue();
  }

  function advanceQueue() {
    const nextPos = qPosRef.current + 1;
    if (nextPos >= queueRef.current.length) {
      // Queue exhausted — reshuffle avoiding repeat of last track
      const lastId = queueRef.current[qPosRef.current]?.id;
      queueRef.current = buildQueue(tracksRef.current, lastId);
      qPosRef.current = 0;
    } else {
      qPosRef.current = nextPos;
    }
    playAt(qPosRef.current);
  }

  function turnOn() {
    if (!tracks.length) return;
    queueRef.current = buildQueue(tracks);
    qPosRef.current = 0;
    setOn(true);
    playAt(0);
  }

  function turnOff() {
    setOn(false);
    setTitle("");
    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.pause();
      audioRef.current.src = "";
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.onended = null;
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

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
        width: 220, background: BG,
        border: `1px solid ${BORDER}`, borderRadius: 4,
        fontFamily: MONO, fontSize: 10, color: TEXT,
        letterSpacing: "0.07em", pointerEvents: "auto",
        userSelect: "none",
      }}
    >
      {/* Header */}
      <div style={{
        background: "rgba(168,85,247,0.1)",
        borderBottom: `1px solid ${BORDER}`,
        padding: "5px 10px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ color: PURPLE, fontWeight: 700, fontSize: 10, letterSpacing: "0.12em" }}>
          ◈ VANTA RADIO
        </span>
        <span style={{ fontSize: 8, letterSpacing: "0.14em", color: on ? "#4ade80" : MUTED }}>
          {on ? "● LIVE" : "○ OFF AIR"}
        </span>
      </div>

      {/* Body */}
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
        <div style={{ padding: "10px 10px 12px" }}>
          {/* Track title */}
          <div
            title={title}
            data-testid="text-vault-radio-title"
            style={{
              fontSize: 9, color: on ? TEXT : MUTED,
              overflow: "hidden", textOverflow: "ellipsis",
              whiteSpace: "nowrap", marginBottom: 10,
              minHeight: 12, letterSpacing: "0.08em",
              fontStyle: on ? "normal" : "italic",
            }}
          >
            {on && title ? title : "—"}
          </div>

          {/* ON / OFF button */}
          <button
            onClick={on ? turnOff : turnOn}
            data-testid="button-vault-radio-toggle"
            style={{
              width: "100%",
              background: on ? "rgba(168,85,247,0.18)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${on ? PURPLE : BORDER}`,
              color: on ? PURPLE : MUTED,
              fontFamily: MONO, fontSize: 10,
              letterSpacing: "0.14em", fontWeight: 700,
              padding: "6px 0", borderRadius: 3,
              cursor: "pointer", marginBottom: 10,
              transition: "all 0.15s ease",
            }}
          >
            {on ? "RADIO OFF" : "RADIO ON"}
          </button>

          {/* Volume slider */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: MUTED, fontSize: 8, letterSpacing: "0.1em", whiteSpace: "nowrap" }}>VOL</span>
            <input
              type="range" min={0} max={1} step={0.01} value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              data-testid="input-vault-radio-volume"
              style={{ flex: 1, accentColor: PURPLE, cursor: "pointer" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
