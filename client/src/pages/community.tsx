import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowRight, MessageCircle, MoreHorizontal, Send, ShieldAlert, Trash2 } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { FollowButton } from "@/components/social/FollowButton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getUserToken, useUser } from "@/hooks/use-user";

type Transmission = {
  id: string;
  body: string;
  created_at: string;
  updated_at: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  comment_count: number;
  is_following?: boolean;
};
type SocialComment = {
  id: string;
  transmission_id: string;
  body: string;
  created_at: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
};

function authHeaders(): Record<string, string> {
  const token = getUserToken();
  return token ? { "X-User-Token": token } : {};
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data as T;
}

function ReportButton({ type, targetId }: { type: "transmission" | "comment"; targetId: string }) {
  const [reported, setReported] = useState(false);
  const [busy, setBusy] = useState(false);
  async function report() {
    const reason = window.prompt("Briefly describe the concern. Reports are reviewed privately.");
    if (!reason?.trim()) return;
    setBusy(true);
    try {
      await requestJson("/api/social/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ targetType: type, targetId, reason }),
      });
      setReported(true);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not submit report.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/60 transition-colors hover:text-amber-200 disabled:opacity-40"
      aria-label={`Report ${type}`}
      disabled={busy || reported}
      onClick={report}
    >
      <ShieldAlert className="h-3.5 w-3.5" />
      {reported ? "Reported" : busy ? "Sending…" : "Report"}
    </button>
  );
}

function CommentList({ transmissionId, onCountChanged }: { transmissionId: string; onCountChanged: (delta: number) => void }) {
  const { user, isAuthenticated } = useUser();
  const [body, setBody] = useState("");
  const queryClient = useQueryClient();
  const queryKey = ["/api/social/transmissions", transmissionId, "comments"];
  const { data, isLoading, error } = useQuery<{ comments: SocialComment[] }>({
    queryKey,
    queryFn: () => requestJson(`/api/social/transmissions/${transmissionId}/comments`),
  });
  const createComment = useMutation({
    mutationFn: () => requestJson<{ comment: SocialComment }>(`/api/social/transmissions/${transmissionId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ body }),
    }),
    onSuccess: () => {
      setBody("");
      queryClient.invalidateQueries({ queryKey });
      onCountChanged(1);
    },
  });
  const removeComment = useMutation({
    mutationFn: (commentId: string) => fetch(`/api/social/comments/${commentId}`, {
      method: "DELETE",
      headers: authHeaders(),
    }).then(async response => {
      if (!response.ok) throw new Error("Could not remove comment");
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      onCountChanged(-1);
    },
  });

  return (
    <div className="mt-5 border-t border-border/70 pt-5">
      <div className="space-y-4">
        {isLoading && <p className="text-xs text-muted-foreground">Loading replies…</p>}
        {error && <p className="text-xs text-destructive">Replies could not be loaded.</p>}
        {(data?.comments ?? []).map(comment => (
          <article key={comment.id} className="flex gap-3">
            <Link href={`/profile/${comment.username}`} className="shrink-0">
              <Avatar name={comment.display_name || comment.username} src={comment.avatar_url} small />
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <Link href={`/profile/${comment.username}`} className="text-sm font-medium hover:text-primary">
                  {comment.display_name || comment.username}
                </Link>
                <span className="text-[10px] font-mono text-muted-foreground/50">@{comment.username}</span>
                <time className="text-[10px] text-muted-foreground/45">{new Date(comment.created_at).toLocaleString()}</time>
              </div>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">{comment.body}</p>
              <div className="mt-2 flex items-center gap-4">
                {isAuthenticated && user?.username !== comment.username && <ReportButton type="comment" targetId={comment.id} />}
                {isAuthenticated && user?.username === comment.username && (
                  <button type="button" className="text-[10px] text-muted-foreground/50 hover:text-destructive" onClick={() => removeComment.mutate(comment.id)}>Remove</button>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
      {isAuthenticated ? (
        <form className="mt-5 flex items-end gap-3" onSubmit={event => { event.preventDefault(); if (body.trim()) createComment.mutate(); }}>
          <Textarea value={body} onChange={event => setBody(event.target.value)} placeholder="Add to the conversation…" maxLength={1500} rows={2} className="min-h-0 resize-y" />
          <Button type="submit" size="icon" aria-label="Send comment" disabled={!body.trim() || createComment.isPending}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      ) : (
        <p className="mt-4 text-xs text-muted-foreground"><Link href="/login" className="text-primary hover:underline">Sign in</Link> to comment.</p>
      )}
      {createComment.error && <p className="mt-2 text-xs text-destructive">{createComment.error.message}</p>}
    </div>
  );
}

function Avatar({ name, src, small = false }: { name: string; src?: string | null; small?: boolean }) {
  const size = small ? "h-8 w-8" : "h-11 w-11";
  return src
    ? <img src={src} alt="" className={`${size} rounded-full border border-border object-cover`} />
    : <span className={`${size} inline-flex shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 font-mono text-sm text-primary`}>{name.slice(0, 1).toUpperCase()}</span>;
}

function TransmissionCard({ item, onChanged }: { item: Transmission; onChanged: () => void }) {
  const { user, isAuthenticated } = useUser();
  const own = user?.username === item.username;
  const [openComments, setOpenComments] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.body);
  const [commentCount, setCommentCount] = useState(item.comment_count);
  const queryClient = useQueryClient();
  const update = useMutation({
    mutationFn: () => requestJson(`/api/social/transmissions/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ body: draft }),
    }),
    onSuccess: () => {
      setEditing(false);
      onChanged();
    },
  });
  const remove = useMutation({
    mutationFn: () => requestJson(`/api/social/transmissions/${item.id}`, { method: "DELETE", headers: authHeaders() }),
    onSuccess: () => onChanged(),
  });

  async function report() {
    const reason = window.prompt("Briefly describe the concern. Reports are reviewed privately.");
    if (!reason?.trim()) return;
    try {
      await requestJson("/api/social/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ targetType: "transmission", targetId: item.id, reason }),
      });
      window.alert("Report submitted for review.");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not submit report.");
    }
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-border/80 bg-card/55 shadow-[0_18px_50px_rgba(0,0,0,.18)] backdrop-blur">
      <div className="p-5 sm:p-7">
        <div className="flex items-start gap-3">
          <Link href={`/profile/${item.username}`} className="shrink-0">
            <Avatar name={item.display_name || item.username} src={item.avatar_url} />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Link href={`/profile/${item.username}`} className="font-medium hover:text-primary">{item.display_name || item.username}</Link>
              <span className="text-xs font-mono text-muted-foreground/55">@{item.username}</span>
              <time className="text-[10px] text-muted-foreground/45">{new Date(item.created_at).toLocaleString()}</time>
            </div>
            <p className="mt-0.5 text-[9px] font-mono uppercase tracking-[.22em] text-primary/60">Member Transmission</p>
          </div>
          {isAuthenticated && !own && <FollowButton username={item.username} initialFollowing={item.is_following} />}
          {own && (
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" aria-label="Edit Transmission" onClick={() => { setDraft(item.body); setEditing(value => !value); }}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" aria-label="Remove Transmission" onClick={() => {
                if (window.confirm("Remove this Transmission from the community feed?")) remove.mutate();
              }}>
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          )}
        </div>

        {editing ? (
          <div className="mt-5 space-y-3">
            <Textarea value={draft} maxLength={3000} rows={4} onChange={event => setDraft(event.target.value)} />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              <Button size="sm" disabled={!draft.trim() || update.isPending} onClick={() => update.mutate()}>{update.isPending ? "Saving…" : "Save"}</Button>
            </div>
          </div>
        ) : (
          <p className="mt-5 whitespace-pre-wrap break-words text-sm leading-7 text-foreground/85 sm:text-base">{item.body}</p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-border/60 pt-4">
          <button type="button" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary" aria-expanded={openComments} onClick={() => setOpenComments(value => !value)}>
            <MessageCircle className="h-4 w-4" /> {commentCount} {commentCount === 1 ? "comment" : "comments"}
          </button>
          {isAuthenticated && !own && <button type="button" onClick={report} className="inline-flex items-center gap-2 text-xs text-muted-foreground/60 hover:text-amber-200"><ShieldAlert className="h-3.5 w-3.5" /> Report</button>}
          <Link href={`/profile/${item.username}`} className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground/65 hover:text-primary">View profile <ArrowRight className="h-3.5 w-3.5" /></Link>
        </div>

        {openComments && <CommentList transmissionId={item.id} onCountChanged={delta => {
          setCommentCount(value => Math.max(0, value + delta));
          queryClient.invalidateQueries({ queryKey: ["/api/social/feed"] });
        }} />}
        {update.error && <p className="mt-3 text-xs text-destructive">{update.error.message}</p>}
        {remove.error && <p className="mt-3 text-xs text-destructive">{remove.error.message}</p>}
      </div>
    </article>
  );
}

export default function Community() {
  const { user, isAuthenticated } = useUser();
  const [scope, setScope] = useState<"all" | "following">("all");
  const [body, setBody] = useState("");
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery<{ transmissions: Transmission[] }>({
    queryKey: ["/api/social/feed", scope],
    queryFn: () => requestJson(`/api/social/feed?scope=${scope}`, { headers: authHeaders() }),
    enabled: scope === "all" || isAuthenticated,
  });
  const create = useMutation({
    mutationFn: () => requestJson("/api/social/transmissions", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ body }),
    }),
    onSuccess: () => {
      setBody("");
      queryClient.invalidateQueries({ queryKey: ["/api/social/feed"] });
    },
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="relative isolate min-h-[75vh] overflow-hidden pt-24">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_0%,rgba(119,81,155,.18),transparent_48%),linear-gradient(180deg,rgba(9,8,13,.3),transparent_80%)]" />
        <section className="mx-auto max-w-4xl px-5 pb-20 sm:px-8">
          <div className="mb-9 border-b border-border/70 pb-8">
            <p className="text-[10px] font-mono uppercase tracking-[.32em] text-primary/75">The Creative Underground · Vanta OS</p>
            <div className="mt-3 flex flex-wrap items-end justify-between gap-5">
              <div>
                <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-6xl">Community Transmissions<span className="text-primary">.</span></h1>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">Notes, signals, and work from Members across the Vanta network.</p>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-[.2em] text-muted-foreground/45">Member feed · public posts</span>
            </div>
          </div>

          {isAuthenticated ? (
            <form className="mb-8 rounded-2xl border border-primary/30 bg-card/55 p-5 sm:p-6" onSubmit={event => { event.preventDefault(); if (body.trim()) create.mutate(); }}>
              <label htmlFor="community-transmission" className="mb-3 block text-[10px] font-mono uppercase tracking-[.24em] text-primary/70">Send a Transmission as @{user?.username}</label>
              <Textarea id="community-transmission" value={body} onChange={event => setBody(event.target.value)} maxLength={3000} rows={4} placeholder="What are you working on, thinking through, or putting into the world?" className="resize-y border-border/80 bg-background/70" />
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-[10px] text-muted-foreground/50">{body.length}/3000 · Plain text</span>
                <Button type="submit" disabled={!body.trim() || create.isPending} className="gap-2">{create.isPending ? "Publishing…" : "Publish"} <Send className="h-3.5 w-3.5" /></Button>
              </div>
              {create.error && <p className="mt-3 text-xs text-destructive">{create.error.message}</p>}
            </form>
          ) : (
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card/40 p-5">
              <div><p className="font-medium">Your identity is already part of Vanta.</p><p className="mt-1 text-xs text-muted-foreground">Sign in with your existing Member account to publish, follow, and comment.</p></div>
              <Link href="/login"><Button variant="outline">Sign in</Button></Link>
            </div>
          )}

          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex rounded-full border border-border bg-card/30 p-1">
              <button type="button" aria-pressed={scope === "all"} onClick={() => setScope("all")} className={`rounded-full px-4 py-2 text-[10px] font-mono uppercase tracking-widest transition-colors ${scope === "all" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>Everyone</button>
              <button type="button" aria-pressed={scope === "following"} onClick={() => isAuthenticated ? setScope("following") : window.location.assign("/login")} className={`rounded-full px-4 py-2 text-[10px] font-mono uppercase tracking-widest transition-colors ${scope === "following" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>Following</button>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/45">{data?.transmissions.length ?? 0} signals</span>
          </div>

          <div className="space-y-5">
            {isLoading && <div className="animate-pulse rounded-2xl border border-border p-8 text-sm text-muted-foreground">Listening for transmissions…</div>}
            {error && <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/5 p-5 text-sm text-destructive">The community feed could not be loaded.</div>}
            {!isLoading && !error && data?.transmissions.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center">
                <p className="font-display text-2xl">No transmissions yet<span className="text-primary">.</span></p>
                <p className="mt-2 text-sm text-muted-foreground">{scope === "following" ? "Follow a Member to see their posts here." : "Start the conversation with the first signal."}</p>
              </div>
            )}
            {data?.transmissions.map(item => (
              <TransmissionCard
                key={item.id}
                item={item}
                onChanged={() => queryClient.invalidateQueries({ queryKey: ["/api/social/feed"] })}
              />
            ))}
          </div>
          <div className="mt-10 border-t border-border/60 pt-5 text-center">
            <p className="text-[10px] font-mono uppercase tracking-[.2em] text-muted-foreground/45">The Creative Underground is the public culture · Vanta OS connects the platform</p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
