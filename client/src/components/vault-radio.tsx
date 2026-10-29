import { useState, useRef, useEffect } from "react";
import { useVault } from "@/hooks/use-vault";
import { useQuery } from "@tanstack/react-query";
import type { VaultItem } from "@shared/schema";
import { saveRadioVol, loadRadioVol } from "@/lib/world-state";
import "./vault-radio.css";

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

export function VaultRadio({ chatOpen = false }: { chatOpen?: boolean }) {
  const { isAuthorized, isLoading: authLoading } = useVault();

  const { data: items = [] } = useQuery<VaultItem[]>({
    queryKey: ["/api/vault/items"],
    enabled: isAuthorized,
  });

  const tracks = items.filter(isPlayable);

  const [on, setOn]         = useState(false);
  const [volume, setVolume] = useState(() => loadRadioVol() ?? 0.7);
  const [title, setTitle]   = useState<string>("");
  const [collapsed, setCollapsed] = useState(true);
  const effectivelyCollapsed = collapsed || chatOpen;

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

  useEffect(() => {
    const toggle = () => (on ? turnOff() : turnOn());
    window.addEventListener("vanta:toggleradio", toggle);
    return () => window.removeEventListener("vanta:toggleradio", toggle);
  }, [on, tracks]);

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
      className={`vanta-radio${chatOpen ? " is-chat-open" : ""}${effectivelyCollapsed ? " is-collapsed" : ""}`}
      onMouseDown={stopMouse}
      onMouseMove={stopMouse}
      onMouseUp={stopMouse}
    >
      <div className="vanta-radio__header">
        <span className="vanta-radio__station">◈ VANTA RADIO</span>
        <span className={`vanta-radio__track${on ? " is-live" : ""}`} title={on && title ? title : "Radio off air"}>
          {on && title ? title : "OFF AIR"}
        </span>
        {isAuthorized && (
          <button
            className="vanta-radio__play"
            type="button"
            onClick={on ? turnOff : turnOn}
            disabled={!on && tracks.length === 0}
            aria-label={on ? "Turn radio off" : "Turn radio on"}
            data-testid="button-vault-radio-toggle"
          >{on ? "Ⅱ" : "▶"}</button>
        )}
        <button
          className="vanta-radio__collapse"
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          aria-label={effectivelyCollapsed ? "Expand Vanta Radio controls" : "Collapse Vanta Radio controls"}
          aria-expanded={!effectivelyCollapsed}
        >{effectivelyCollapsed ? "+" : "−"}</button>
      </div>

      {!effectivelyCollapsed && (
        <div className="vanta-radio__body">
          {!isAuthorized ? (
            <div className="vanta-radio__notice">
              <span>VAULT CLEARANCE REQUIRED</span>
              <a href="/vault" data-testid="link-vault-radio-access">REQUEST ACCESS →</a>
            </div>
          ) : tracks.length === 0 ? (
            <div className="vanta-radio__notice">NO AUDIO IN VAULT</div>
          ) : (
            <>
              <div className="vanta-radio__now-playing" data-testid="text-vault-radio-title" title={title}>
                {on && title ? title : "Ready to play"}
              </div>
              <div className="vanta-radio__volume">
                <label htmlFor="vanta-radio-volume">VOL</label>
                <input
                  id="vanta-radio-volume"
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(event) => setVolume(parseFloat(event.target.value))}
                  data-testid="input-vault-radio-volume"
                  aria-label="Radio volume"
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
