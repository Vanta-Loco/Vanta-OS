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
  LockKeyhole, ArrowLeft, Play, Pause, Trash2, Plus, Pencil,
  Mic2, FileText, Film, ImageIcon, Music2, LogOut, Loader2, RefreshCw,
  Upload, CheckCircle2, X, AlertCircle,
} from "lucide-react";
import type { VaultItem } from "@shared/schema";
import { VAULT_CATEGORIES } from "@shared/schema";
import { format } from "date-fns";

const CATEGORY_LABEL: Record<string, string> = {
  unreleased: "Unreleased",
  demos: "Demos",
  fragments: "Fragments",
};

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
  canEdit,
  onDelete,
  onSaved,
}: {
  item: VaultItem;
  canDelete: boolean;
  canEdit: boolean;
  onDelete: (id: string) => void;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const isAudio = item.type === "audio" || item.type === "demo";
  const meta = TYPE_META[item.type] ?? TYPE_META.audio;
  const categoryLabel = item.category ? CATEGORY_LABEL[item.category] : null;

  if (editing) {
    return (
      <VaultEditForm
        item={item}
        onSaved={() => { setEditing(false); onSaved(); }}
        onCancel={() => setEditing(false)}
      />
    );
  }

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
            {categoryLabel && (
              <span
                className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 font-mono"
                data-testid={`text-vault-category-${item.id}`}
              >
                {categoryLabel}
              </span>
            )}
            <span className="text-xs text-muted-foreground/40 font-mono">
              {format(new Date(item.createdAt), "MMM yyyy")}
            </span>
          </div>

          {(canEdit || canDelete) && (
            <div className="flex items-center gap-2 invisible group-hover:visible">
              {canEdit && (
                <button
                  onClick={() => setEditing(true)}
                  className="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                  data-testid={`button-edit-vault-${item.id}`}
                  title="Edit"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => onDelete(item.id)}
                  className="text-muted-foreground/40 hover:text-destructive transition-colors"
                  data-testid={`button-delete-vault-${item.id}`}
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
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

// ── File upload field ─────────────────────────────────────────────────────────
type UploadState = "idle" | "uploading" | "done" | "error";

function FileUploadField({
  label,
  accept,
  value,
  onChange,
  previewType = "generic",
  testId,
}: {
  label: string;
  accept: string;
  value: string;
  onChange: (url: string) => void;
  previewType?: "image" | "generic";
  testId: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadState, setUploadState] = useState<UploadState>(value ? "done" : "idle");
  const [fileName, setFileName] = useState("");
  const [pasteMode, setPasteMode] = useState(false);

  async function handleFile(file: File) {
    setFileName(file.name);
    setUploadState("uploading");
    const body = new FormData();
    body.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body, credentials: "include" });
      if (!res.ok) throw new Error("upload failed");
      const { url } = await res.json();
      onChange(url);
      setUploadState("done");
    } catch {
      setUploadState("error");
    }
  }

  function clearFile() {
    setUploadState("idle");
    setFileName("");
    onChange("");
    if (inputRef.current) inputRef.current.value = "";
  }

  if (pasteMode) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-muted-foreground/60">{label}</span>
          <button
            type="button"
            className="text-xs font-mono text-muted-foreground/40 hover:text-muted-foreground transition-colors"
            onClick={() => setPasteMode(false)}
          >
            ← use file picker
          </button>
        </div>
        <Input
          placeholder={`${label} URL`}
          value={value}
          onChange={e => onChange(e.target.value)}
          data-testid={`${testId}-url`}
        />
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-muted-foreground/60">{label}</span>
        <button
          type="button"
          className="text-xs font-mono text-muted-foreground/40 hover:text-muted-foreground transition-colors"
          onClick={() => setPasteMode(true)}
        >
          paste URL instead
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        data-testid={`${testId}-input`}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />

      {uploadState === "idle" && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full border border-border border-dashed rounded-md py-4 flex flex-col items-center gap-1.5 text-muted-foreground/40 font-mono text-xs hover-elevate transition-colors cursor-pointer"
          data-testid={`${testId}-picker`}
        >
          <Upload className="w-4 h-4" />
          Click to upload {label.toLowerCase()}
        </button>
      )}

      {uploadState === "uploading" && (
        <div className="flex items-center gap-3 border border-border rounded-md px-4 py-3 text-xs font-mono text-muted-foreground/60">
          <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
          <span className="truncate">Uploading {fileName}…</span>
        </div>
      )}

      {uploadState === "done" && value && (
        <div className="space-y-2">
          {previewType === "image" && (
            <div className="relative w-28 aspect-square overflow-hidden rounded-md bg-muted">
              <img src={value} alt="preview" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground/60">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500/70 flex-shrink-0" />
            <span className="truncate flex-1">{fileName || value.split("/").pop()}</span>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="text-muted-foreground/40 hover:text-muted-foreground transition-colors flex-shrink-0"
              data-testid={`${testId}-replace`}
              title="Replace file"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={clearFile}
              className="text-muted-foreground/40 hover:text-destructive transition-colors flex-shrink-0"
              data-testid={`${testId}-clear`}
              title="Remove"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {uploadState === "error" && (
        <div className="flex items-center gap-2 text-xs font-mono text-destructive">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          Upload failed —
          <button type="button" onClick={() => { setUploadState("idle"); setFileName(""); }} className="underline">
            try again
          </button>
        </div>
      )}
    </div>
  );
}

// ── Edit form ─────────────────────────────────────────────────────────────────
function VaultEditForm({
  item,
  onSaved,
  onCancel,
}: {
  item: VaultItem;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    title: item.title,
    description: item.description,
    type: item.type,
    category: item.category,
    fileUrl: item.fileUrl,
    coverImage: item.coverImage,
    notes: item.notes,
  });

  const updateMutation = useMutation({
    mutationFn: (data: typeof form) => apiRequest("PATCH", `/api/vault/items/${item.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vault/items"] });
      onSaved();
    },
  });

  const canSubmit = form.title.trim() && !updateMutation.isPending;

  return (
    <div className="border border-border rounded-md p-5 space-y-4 bg-card" data-testid={`form-vault-edit-${item.id}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Edit Vault Item</p>
        <button
          type="button"
          onClick={onCancel}
          className="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
          data-testid={`button-cancel-vault-edit-${item.id}`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <Input
        placeholder="Title *"
        value={form.title}
        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
        data-testid={`input-vault-edit-title-${item.id}`}
      />
      <Input
        placeholder="Description"
        value={form.description}
        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
        data-testid={`input-vault-edit-description-${item.id}`}
      />

      <div className="grid grid-cols-2 gap-3">
        <select
          value={form.type}
          onChange={e => setForm(f => ({ ...f, type: e.target.value, fileUrl: "" }))}
          className="w-full h-9 border border-border rounded-md px-3 text-sm bg-background text-foreground"
          data-testid={`select-vault-edit-type-${item.id}`}
        >
          <option value="audio">Audio</option>
          <option value="demo">Demo</option>
          <option value="video">Video</option>
          <option value="text">Text</option>
          <option value="image">Image</option>
        </select>

        <select
          value={form.category}
          onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
          className="w-full h-9 border border-border rounded-md px-3 text-sm bg-background text-foreground"
          data-testid={`select-vault-edit-category-${item.id}`}
        >
          <option value="">No category</option>
          {VAULT_CATEGORIES.map(c => (
            <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
          ))}
        </select>
      </div>

      <FileUploadField
        key={`edit-file-${item.id}-${form.type}`}
        label="File"
        accept={FILE_ACCEPT[form.type] ?? "*"}
        value={form.fileUrl}
        onChange={url => setForm(f => ({ ...f, fileUrl: url }))}
        previewType={form.type === "image" ? "image" : "generic"}
        testId={`vault-edit-file-${item.id}`}
      />

      <FileUploadField
        label="Cover Image (optional)"
        accept="image/*"
        value={form.coverImage}
        onChange={url => setForm(f => ({ ...f, coverImage: url }))}
        previewType="image"
        testId={`vault-edit-cover-${item.id}`}
      />

      <Input
        placeholder="Internal notes (optional)"
        value={form.notes}
        onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
        data-testid={`input-vault-edit-notes-${item.id}`}
      />

      <div className="flex gap-2">
        <Button
          size="default"
          className="gap-2 font-mono text-xs"
          disabled={!canSubmit}
          onClick={() => updateMutation.mutate(form)}
          data-testid={`button-submit-vault-edit-${item.id}`}
        >
          {updateMutation.isPending ? "Saving…" : "Save Changes"}
        </Button>
        <Button
          variant="ghost"
          size="default"
          onClick={onCancel}
          data-testid={`button-cancel-vault-edit-bottom-${item.id}`}
        >
          Cancel
        </Button>
      </div>

      {updateMutation.isError && (
        <p className="text-xs font-mono text-destructive" data-testid={`text-vault-edit-error-${item.id}`}>
          Failed to save. Please try again.
        </p>
      )}
    </div>
  );
}

// ── Add form ──────────────────────────────────────────────────────────────────
const FILE_ACCEPT: Record<string, string> = {
  audio: "audio/wav,audio/mpeg,audio/mp3,audio/x-wav,audio/m4a,audio/mp4,audio/*",
  demo:  "audio/wav,audio/mpeg,audio/mp3,audio/x-wav,audio/m4a,audio/mp4,audio/*",
  video: "video/*",
  image: "image/*",
  text:  ".txt,.pdf,.md",
};

function VaultAddForm({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", type: "audio", category: "", fileUrl: "", coverImage: "", notes: "",
  });

  function resetForm() {
    setForm({ title: "", description: "", type: "audio", category: "", fileUrl: "", coverImage: "", notes: "" });
  }

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => apiRequest("POST", "/api/vault/items", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vault/items"] });
      resetForm();
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

  const canSubmit = form.title.trim() && !createMutation.isPending;

  return (
    <div className="border border-border rounded-md p-5 space-y-4 bg-card" data-testid="form-vault-add">
      <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">New Vault Item</p>

      {/* Title + description */}
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

      {/* Type + Category */}
      <div className="grid grid-cols-2 gap-3">
        <select
          value={form.type}
          onChange={e => setForm(f => ({ ...f, type: e.target.value, fileUrl: "" }))}
          className="w-full h-9 border border-border rounded-md px-3 text-sm bg-background text-foreground"
          data-testid="select-vault-type"
        >
          <option value="audio">Audio</option>
          <option value="demo">Demo</option>
          <option value="video">Video</option>
          <option value="text">Text</option>
          <option value="image">Image</option>
        </select>

        <select
          value={form.category}
          onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
          className="w-full h-9 border border-border rounded-md px-3 text-sm bg-background text-foreground"
          data-testid="select-vault-category"
        >
          <option value="">No category</option>
          {VAULT_CATEGORIES.map(c => (
            <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
          ))}
        </select>
      </div>

      {/* Main file upload */}
      <FileUploadField
        key={`file-${form.type}`}
        label="File"
        accept={FILE_ACCEPT[form.type] ?? "*"}
        value={form.fileUrl}
        onChange={url => setForm(f => ({ ...f, fileUrl: url }))}
        previewType={form.type === "image" ? "image" : "generic"}
        testId="vault-file"
      />

      {/* Cover image upload (always optional) */}
      <FileUploadField
        label="Cover Image (optional)"
        accept="image/*"
        value={form.coverImage}
        onChange={url => setForm(f => ({ ...f, coverImage: url }))}
        previewType="image"
        testId="vault-cover"
      />

      {/* Notes */}
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
          disabled={!canSubmit}
          onClick={() => createMutation.mutate(form)}
          data-testid="button-submit-vault-item"
        >
          {createMutation.isPending ? "Adding…" : "Add to Vault"}
        </Button>
        <Button
          variant="ghost"
          size="default"
          onClick={() => { resetForm(); setOpen(false); }}
          data-testid="button-cancel-vault-add"
        >
          Cancel
        </Button>
      </div>

      {createMutation.isError && (
        <p className="text-xs font-mono text-destructive" data-testid="text-vault-form-error">
          Failed to add item. Please try again.
        </p>
      )}
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
      setErrorMsg("Transmission rejected. Code unrecognised.");
      setCode("");
    }
  }

  return (
    <div
      className="min-h-screen bg-background flex flex-col items-center justify-center px-6 relative overflow-hidden"
      data-testid="vault-locked-screen"
    >
      {/* CSS keyframes for scan line + icon breathe */}
      <style>{`
        @keyframes vault-scan {
          0%   { transform: translateY(-20px); opacity: 0; }
          8%   { opacity: 1; }
          92%  { opacity: 1; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
        @keyframes vault-breathe {
          0%, 100% { box-shadow: 0 0 0px 0px hsl(var(--primary) / 0); }
          50%       { box-shadow: 0 0 28px 6px hsl(var(--primary) / 0.10); }
        }
        @keyframes vault-cursor {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
      `}</style>

      {/* Deep layered background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,_hsl(var(--primary)/0.09)_0%,_transparent_58%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,_hsl(var(--primary)/0.05)_0%,_transparent_55%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_15%_85%,_hsl(var(--primary)/0.04)_0%,_transparent_45%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_75%,_hsl(var(--primary)/0.03)_0%,_transparent_40%)] pointer-events-none" />

      {/* Slow-moving scan line */}
      <div
        className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/10 to-transparent pointer-events-none z-0"
        style={{ animation: "vault-scan 16s linear infinite" }}
      />

      {/* Corner bracket marks */}
      <div className="absolute top-8 left-8 w-5 h-5 border-t border-l border-border/25 pointer-events-none" />
      <div className="absolute top-8 right-8 w-5 h-5 border-t border-r border-border/25 pointer-events-none" />
      <div className="absolute bottom-8 left-8 w-5 h-5 border-b border-l border-border/25 pointer-events-none" />
      <div className="absolute bottom-8 right-8 w-5 h-5 border-b border-r border-border/25 pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm text-center space-y-12">

        {/* Lock icon with breathing glow */}
        <div
          className="inline-flex items-center justify-center w-[72px] h-[72px] rounded-full border border-border/40 bg-background/50 backdrop-blur-sm mx-auto"
          style={{ animation: "vault-breathe 5s ease-in-out infinite" }}
        >
          <LockKeyhole className="w-7 h-7 text-muted-foreground/50" />
        </div>

        {/* Title block */}
        <div className="space-y-4">
          <p className="text-[9px] uppercase tracking-[0.4em] text-muted-foreground/35 font-mono">
            Vanta&nbsp;OS&nbsp;&nbsp;·&nbsp;&nbsp;Restricted&nbsp;Channel
          </p>
          <h1
            className="text-6xl md:text-7xl font-display font-bold tracking-[0.14em]"
            data-testid="text-vault-title"
          >
            VAULT
          </h1>
          {/* Gradient rule — fades out at both ends */}
          <div className="w-16 h-px bg-gradient-to-r from-transparent via-border to-transparent mx-auto" />
          <p className="text-sm text-muted-foreground/70 leading-[1.8] max-w-xs mx-auto">
            Transmissions that never reached the surface. Raw sessions.
            Unfinished signals. Fragments not meant to circulate —
            or maybe they were.
          </p>
          <p className="text-[11px] text-muted-foreground/35 font-mono tracking-[0.15em] uppercase pt-1">
            clearance&nbsp;required
          </p>
        </div>

        {/* Access code form */}
        <form onSubmit={handleSubmit} className="space-y-3" data-testid="form-vault-access">
          <Input
            type="password"
            placeholder="— access key —"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="text-center font-mono tracking-[0.25em] bg-background/40 border-border/50 placeholder:text-muted-foreground/25 placeholder:tracking-[0.2em]"
            autoComplete="off"
            data-testid="input-vault-code"
          />
          {errorMsg && (
            <p className="text-xs text-destructive/80 font-mono tracking-wide" data-testid="text-vault-error">
              {errorMsg}
            </p>
          )}
          <Button
            type="submit"
            variant="default"
            className="w-full font-mono tracking-[0.12em] uppercase text-xs"
            disabled={!code.trim() || verify.isPending}
            data-testid="button-vault-enter"
          >
            {verify.isPending ? "Verifying…" : "Transmit Code"}
          </Button>
        </form>

        {/* Secondary options */}
        <div className="flex items-center justify-center gap-5 text-[11px] text-muted-foreground/35 font-mono tracking-wide">
          <a
            href="mailto:vantacold@proton.me?subject=Vault+Access+Request"
            className="hover:text-muted-foreground/70 transition-colors"
            data-testid="link-request-access"
          >
            Request access
          </a>
          <span className="text-border/50">·</span>
          <Link
            href="/"
            className="hover:text-muted-foreground/70 transition-colors flex items-center gap-1.5"
            data-testid="link-return-surface"
          >
            <ArrowLeft className="w-3 h-3" />
            Return to surface
          </Link>
        </div>

      </div>
    </div>
  );
}

function VaultUnlocked() {
  const { logout } = useVault();
  const { isAuthenticated: isAdmin } = useAdmin();
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const { data: items, isLoading } = useQuery<VaultItem[]>({
    queryKey: ["/api/vault/items"],
    queryFn: async () => {
      const res = await fetch("/api/vault/items");
      if (!res.ok) throw new Error("Failed to fetch vault items");
      return res.json();
    },
    // Poll every 3 s while any audio/demo item is still awaiting compression.
    // Returns false (no polling) once all compressed URLs are populated.
    refetchInterval: (query) => {
      const data = query.state.data as VaultItem[] | undefined;
      if (!data) return false;
      const hasPending = data.some(
        (item) =>
          (item.type === "audio" || item.type === "demo") &&
          item.fileUrl?.startsWith("/uploads/") &&
          !item.compressedUrl,
      );
      return hasPending ? 3000 : false;
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
        <div className="flex items-end justify-between mb-8 flex-wrap gap-6">
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

        {/* Category filter row */}
        <div
          className="flex items-center gap-1 mb-10 flex-wrap"
          data-testid="vault-category-filter"
        >
          {(["all", ...VAULT_CATEGORIES] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`text-[10px] uppercase tracking-[0.25em] font-mono px-3 py-1.5 rounded-sm transition-colors ${
                categoryFilter === cat
                  ? "text-foreground bg-muted"
                  : "text-muted-foreground/40 hover:text-muted-foreground/70"
              }`}
              data-testid={`filter-vault-${cat}`}
            >
              {cat === "all" ? "All" : CATEGORY_LABEL[cat]}
            </button>
          ))}
        </div>

        {/* Content */}
        {(() => {
          const filteredItems = !items
            ? []
            : categoryFilter === "all"
              ? items
              : items.filter(i => i.category === categoryFilter);

          if (isLoading) {
            return (
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
            );
          }

          if (filteredItems.length > 0) {
            return (
              <div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                data-testid="vault-items-grid"
              >
                {filteredItems.map((item) => (
                  <VaultItemCard
                    key={item.id}
                    item={item}
                    canDelete={isAdmin}
                    canEdit={isAdmin}
                    onDelete={(id) => deleteMutation.mutate(id)}
                    onSaved={() => queryClient.invalidateQueries({ queryKey: ["/api/vault/items"] })}
                  />
                ))}
              </div>
            );
          }

          return (
            <div
              className="text-center py-28 border border-dashed border-border rounded-md"
              data-testid="vault-empty-state"
            >
              <LockKeyhole className="w-10 h-10 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground/50 font-mono text-sm">
                {categoryFilter !== "all"
                  ? `No ${CATEGORY_LABEL[categoryFilter]?.toLowerCase() ?? categoryFilter} items yet.`
                  : isAdmin
                    ? "No vault items yet. Add the first one above."
                    : "Transmission log empty."}
              </p>
            </div>
          );
        })()}
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
