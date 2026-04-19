import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { useVault } from "@/hooks/use-vault";
import { useAdmin } from "@/hooks/use-admin";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  LockKeyhole, ArrowLeft, Play, Pause, Trash2, Plus,
  Mic2, FileText, Film, ImageIcon, Music2, LogOut, Loader2, RefreshCw,
} from "lucide-react";
import type { VaultItem } from "@shared/schema";
import { format } from "date-fns";

const TYPE_META: Record<string, { label: string; Icon: React.ElementType }> = {
  audio:  { label: "Audio",  Icon: Music2   },
  demo:   { label: "Demo",   Icon: Mic2     },
  video:  { label: "Video",  Icon: Film     },
  text:   { label: "Text",   Icon: FileText },
  image:  { label: "Image",  Icon: ImageIcon},
};

type PlayerState = "idle" | "loading" | "playing" | "paused";

function VaultAudioPlayer({ item, isAdmin }: { item: VaultItem; isAdmin: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [playerState, setPlayerState] = useState<PlayerState>("idle");
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [srcLoaded, setSrcLoaded] = useState(false);

  // Use compressed URL when available, fall back to raw file
  const playbackSrc = item.compressedUrl || item.fileUrl;

  function formatTime(sec: number) {
    if (!isFinite(sec) || sec <= 0) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration) setProgress(audio.currentTime / audio.duration);
    };
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onCanPlay = () => {
      setPlayerState((s) => s === "loading" ? "playing" : s);
    };
    const onEnded = () => {
      setPlayerState("idle");
      setProgress(0);
      setCurrentTime(0);
    };
    const onPause = () => setPlayerState("paused");
    const onPlay  = () => setPlayerState("playing");

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("play", onPlay);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("play", onPlay);
    };
  }, []);

  const recompressMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/vault/items/${item.id}/recompress`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/vault/items"] }),
  });

  function handleToggle() {
    const audio = audioRef.current;
    if (!audio || !playbackSrc) return;

    if (playerState === "idle") {
      if (!srcLoaded) {
        audio.src = playbackSrc;
        audio.load();
        setSrcLoaded(true);
      }
      setPlayerState("loading");
      audio.play().catch(() => setPlayerState("idle"));
    } else if (playerState === "playing") {
      audio.pause();
    } else if (playerState === "paused" || playerState === "loading") {
      audio.play().catch(() => setPlayerState("idle"));
    }
  }

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current;
    if (!audio || playerState === "idle" || !audio.duration) return;
    const rect = barRef.current!.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * audio.duration;
  }

  const isCompressed = !!item.compressedUrl;

  return (
    <div className="space-y-2">
      <audio ref={audioRef} preload="none" />
      <div className="flex items-center gap-3">
        <Button
          size="icon"
          variant={playerState === "playing" ? "default" : "outline"}
          onClick={handleToggle}
          disabled={!playbackSrc}
          data-testid={`button-play-${item.id}`}
        >
          {playerState === "loading"
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : playerState === "playing"
              ? <Pause className="w-4 h-4" />
              : <Play className="w-4 h-4" />
          }
        </Button>

        <div
          ref={barRef}
          className="flex-1 h-1 bg-muted rounded-full cursor-pointer relative"
          onClick={handleSeek}
          data-testid={`seekbar-${item.id}`}
        >
          <div
            className="absolute inset-y-0 left-0 bg-foreground/50 rounded-full transition-none"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        <span
          className="text-xs font-mono text-muted-foreground/50 tabular-nums whitespace-nowrap"
          data-testid={`time-${item.id}`}
        >
          {formatTime(currentTime)}{duration > 0 ? ` / ${formatTime(duration)}` : ""}
        </span>
      </div>

      {isAdmin && (
        <div className="flex items-center gap-2 pt-0.5">
          <span className={`text-xs font-mono ${isCompressed ? "text-green-500/70" : "text-muted-foreground/40"}`}>
            {isCompressed ? "MP3 ready" : "no compressed version"}
          </span>
          {!isCompressed && (
            <Button
              size="sm"
              variant="ghost"
              className="h-5 px-2 text-xs gap-1"
              onClick={() => recompressMutation.mutate()}
              disabled={recompressMutation.isPending}
              data-testid={`button-recompress-${item.id}`}
            >
              <RefreshCw className={`w-3 h-3 ${recompressMutation.isPending ? "animate-spin" : ""}`} />
              compress now
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function VaultItemCard({
  item,
  canDelete,
  onDelete,
}: {
  item: VaultItem;
  canDelete: boolean;
  onDelete: (id: string) => void;
}) {
  const isAudio = item.type === "audio" || item.type === "demo";
  const meta = TYPE_META[item.type] ?? TYPE_META.audio;

  return (
    <div
      className="group border border-border rounded-md overflow-hidden bg-card hover-elevate transition-all"
      data-testid={`card-vault-item-${item.id}`}
    >
      {item.coverImage && (
        <div className="aspect-video overflow-hidden bg-muted">
          <img
            src={item.coverImage}
            alt={item.title}
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
            data-testid={`img-vault-${item.id}`}
          />
        </div>
      )}

      <div className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs uppercase tracking-wide font-mono gap-1.5">
              <meta.Icon className="w-3 h-3" />
              {meta.label}
            </Badge>
            <span className="text-xs text-muted-foreground/50 font-mono">
              {format(new Date(item.createdAt), "MMM yyyy")}
            </span>
          </div>

          {canDelete && (
            <button
              onClick={() => onDelete(item.id)}
              className="opacity-0 group-hover:opacity-100 text-muted-foreground/50 hover:text-destructive transition-all"
              data-testid={`button-delete-vault-${item.id}`}
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        <div>
          <h3
            className="font-display font-bold text-lg leading-tight"
            data-testid={`text-vault-title-${item.id}`}
          >
            {item.title}
          </h3>
          {item.description && (
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed" data-testid={`text-vault-desc-${item.id}`}>
              {item.description}
            </p>
          )}
          {item.notes && (
            <p className="text-xs text-muted-foreground/50 italic mt-2" data-testid={`text-vault-notes-${item.id}`}>
              {item.notes}
            </p>
          )}
        </div>

        {isAudio && (item.fileUrl || item.compressedUrl) && (
          <VaultAudioPlayer item={item} isAdmin={canDelete} />
        )}
      </div>
    </div>
  );
}

function VaultAddForm({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", type: "audio", fileUrl: "", coverImage: "", notes: "",
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => apiRequest("POST", "/api/vault/items", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vault/items"] });
      setForm({ title: "", description: "", type: "audio", fileUrl: "", coverImage: "", notes: "" });
      setOpen(false);
      onAdded();
    },
  });

  if (!open) {
    return (
      <Button
        variant="outline"
        size="default"
        className="gap-2 font-mono text-xs"
        onClick={() => setOpen(true)}
        data-testid="button-add-vault-item"
      >
        <Plus className="w-4 h-4" /> Add Item
      </Button>
    );
  }

  return (
    <div className="border border-border rounded-md p-5 space-y-3 bg-card" data-testid="form-vault-add">
      <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">New Vault Item</p>
      <Input
        placeholder="Title *"
        value={form.title}
        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
        data-testid="input-vault-title"
      />
      <Input
        placeholder="Description"
        value={form.description}
        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
        data-testid="input-vault-description"
      />
      <select
        value={form.type}
        onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
        className="w-full h-9 border border-border rounded-md px-3 text-sm bg-background text-foreground"
        data-testid="select-vault-type"
      >
        <option value="audio">Audio</option>
        <option value="demo">Demo</option>
        <option value="video">Video</option>
        <option value="text">Text</option>
        <option value="image">Image</option>
      </select>
      <Input
        placeholder="File URL (audio, video, image…)"
        value={form.fileUrl}
        onChange={e => setForm(f => ({ ...f, fileUrl: e.target.value }))}
        data-testid="input-vault-fileurl"
      />
      <Input
        placeholder="Cover Image URL (optional)"
        value={form.coverImage}
        onChange={e => setForm(f => ({ ...f, coverImage: e.target.value }))}
        data-testid="input-vault-coverimage"
      />
      <Input
        placeholder="Internal notes (optional)"
        value={form.notes}
        onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
        data-testid="input-vault-notes"
      />
      <div className="flex gap-2">
        <Button
          size="default"
          className="gap-2 font-mono text-xs"
          disabled={!form.title.trim() || createMutation.isPending}
          onClick={() => createMutation.mutate(form)}
          data-testid="button-submit-vault-item"
        >
          {createMutation.isPending ? "Adding…" : "Add to Vault"}
        </Button>
        <Button
          variant="ghost"
          size="default"
          onClick={() => setOpen(false)}
          data-testid="button-cancel-vault-add"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

function VaultLocked() {
  const { verify } = useVault();
  const [code, setCode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    try {
      await verify.mutateAsync(code.trim());
    } catch {
      setErrorMsg("Signal rejected. Code unrecognised.");
      setCode("");
    }
  }

  return (
    <div
      className="min-h-screen bg-background flex flex-col items-center justify-center px-6 relative overflow-hidden"
      data-testid="vault-locked-screen"
    >
      {/* Atmospheric background gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,_hsl(var(--primary)/0.06)_0%,_transparent_65%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_80%,_hsl(var(--primary)/0.03)_0%,_transparent_50%)] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md text-center space-y-10">

        {/* Icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border border-border/60 bg-background/60 backdrop-blur-sm">
          <LockKeyhole className="w-7 h-7 text-muted-foreground/70" />
        </div>

        {/* Title block */}
        <div className="space-y-3">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/50 font-mono">
            Vanta OS · Restricted Channel
          </p>
          <h1
            className="text-5xl md:text-6xl font-display font-bold tracking-[0.12em]"
            data-testid="text-vault-title"
          >
            VAULT
          </h1>
          <div className="w-12 h-px bg-border mx-auto" />
          <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
            This channel contains transmissions that never reached the surface —
            raw sessions, unfinished demos, and fragments that didn't circulate.
            Or weren't meant to.
          </p>
          <p className="text-xs text-muted-foreground/50 font-mono">
            You already know if you're supposed to be here.
          </p>
        </div>

        {/* Access code form */}
        <form onSubmit={handleSubmit} className="space-y-3" data-testid="form-vault-access">
          <div className="relative">
            <Input
              type="password"
              placeholder="Enter access code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="text-center font-mono tracking-widest bg-background/60 border-border/60"
              autoComplete="off"
              data-testid="input-vault-code"
            />
          </div>
          {errorMsg && (
            <p className="text-xs text-destructive font-mono" data-testid="text-vault-error">
              {errorMsg}
            </p>
          )}
          <Button
            type="submit"
            variant="default"
            className="w-full font-mono tracking-wide"
            disabled={!code.trim() || verify.isPending}
            data-testid="button-vault-enter"
          >
            {verify.isPending ? "Verifying signal…" : "Transmit Code"}
          </Button>
        </form>

        {/* Secondary options */}
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground/50">
          <a
            href="mailto:vantacold@proton.me?subject=Vault+Access+Request"
            className="hover:text-muted-foreground transition-colors font-mono"
            data-testid="link-request-access"
          >
            Request access
          </a>
          <span className="text-border">·</span>
          <Link
            href="/"
            className="hover:text-muted-foreground transition-colors font-mono flex items-center gap-1"
            data-testid="link-return-surface"
          >
            <ArrowLeft className="w-3 h-3" /> Return to surface
          </Link>
        </div>
      </div>
    </div>
  );
}

function VaultUnlocked() {
  const { logout } = useVault();
  const { isAuthenticated: isAdmin } = useAdmin();

  const { data: items, isLoading } = useQuery<VaultItem[]>({
    queryKey: ["/api/vault/items"],
    queryFn: async () => {
      const res = await fetch("/api/vault/items");
      if (!res.ok) throw new Error("Failed to fetch vault items");
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/vault/items/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/vault/items"] }),
  });

  return (
    <div className="min-h-screen bg-background" data-testid="vault-unlocked-screen">

      {/* Vault header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between h-16 gap-4">
          <div className="flex items-center gap-3">
            <LockKeyhole className="w-4 h-4 text-muted-foreground/60" />
            <span className="font-display font-bold tracking-tight">VANTA COLD</span>
            <span className="text-border">·</span>
            <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-mono">Vault</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/" data-testid="link-vault-to-site">
              <Button variant="ghost" size="default" className="text-xs font-mono">
                ← Surface
              </Button>
            </Link>
            <Button
              variant="outline"
              size="default"
              className="gap-2 text-xs font-mono"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              data-testid="button-vault-logout"
            >
              <LogOut className="w-3 h-3" />
              Exit Vault
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12">

        {/* Heading */}
        <div className="flex items-end justify-between mb-10 flex-wrap gap-6">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/50 font-mono mb-2">
              Restricted Access · Vanta OS
            </p>
            <h1
              className="text-4xl md:text-5xl font-display font-bold tracking-wide"
              data-testid="text-vault-unlocked-title"
            >
              VAULT
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              Unreleased sessions, raw demos, and transmissions that never surfaced.
            </p>
          </div>
          {isAdmin && <VaultAddForm onAdded={() => {}} />}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="vault-loading">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border border-border rounded-md p-5 space-y-3 animate-pulse">
                <div className="aspect-video bg-muted rounded" />
                <div className="h-4 bg-muted rounded w-1/3" />
                <div className="h-5 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-full" />
              </div>
            ))}
          </div>
        ) : items && items.length > 0 ? (
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            data-testid="vault-items-grid"
          >
            {items.map((item) => (
              <VaultItemCard
                key={item.id}
                item={item}
                canDelete={isAdmin}
                onDelete={(id) => deleteMutation.mutate(id)}
              />
            ))}
          </div>
        ) : (
          <div
            className="text-center py-28 border border-dashed border-border rounded-md"
            data-testid="vault-empty-state"
          >
            <LockKeyhole className="w-10 h-10 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground/50 font-mono text-sm">
              {isAdmin ? "No vault items yet. Add the first one above." : "Transmission log empty."}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default function Vault() {
  const { isAuthorized, isLoading } = useVault();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" data-testid="vault-loading-state">
        <div className="flex flex-col items-center gap-4">
          <LockKeyhole className="w-8 h-8 text-muted-foreground/40 animate-pulse" />
          <p className="text-xs font-mono text-muted-foreground/40 uppercase tracking-widest">
            Authenticating signal…
          </p>
        </div>
      </div>
    );
  }

  return isAuthorized ? <VaultUnlocked /> : <VaultLocked />;
}
