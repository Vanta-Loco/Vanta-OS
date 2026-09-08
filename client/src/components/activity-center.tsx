import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity as ActivityIcon,
  ArrowUpRight,
  BadgeCheck,
  BookOpen,
  CircleDot,
  Gamepad2,
  Image,
  Radio,
  Shield,
  ShoppingBag,
  Terminal,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getUserToken, useUser } from "@/hooks/use-user";

type ActivityActor = {
  username: string;
  display_name: string;
  is_certified: boolean;
} | null;

type ActivityItem = {
  id: string;
  event_type: string;
  title: string;
  body: string | null;
  target_url: string | null;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
  actor: ActivityActor;
};

type ActivityResponse = {
  items: ActivityItem[];
  limit: number;
  offset: number;
  has_more: boolean;
};

type UnreadResponse = { count: number };

const ACTIVITY_QUERY_KEY = ["/api/activity"];
const UNREAD_QUERY_KEY = ["/api/activity/unread-count"];

const EVENT_META: Record<string, { label: string; Icon: typeof ActivityIcon; tone: string }> = {
  room_member_joined: { label: "Room", Icon: Users, tone: "text-amber-200/70" },
  room_post_created: { label: "Room", Icon: Users, tone: "text-amber-200/70" },
  passport_achievement_unlocked: { label: "Passport", Icon: Trophy, tone: "text-violet-200/75" },
  passport_xp_gained: { label: "Passport", Icon: Trophy, tone: "text-violet-200/75" },
  creator_certified: { label: "Creator", Icon: BadgeCheck, tone: "text-purple-200/75" },
  creator_work_added: { label: "Work", Icon: Image, tone: "text-cyan-200/75" },
  marketplace_activity: { label: "Marketplace", Icon: ShoppingBag, tone: "text-emerald-200/75" },
  play_update: { label: "Play", Icon: Gamepad2, tone: "text-orange-200/75" },
  system_notice: { label: "System", Icon: Terminal, tone: "text-slate-200/70" },
};

function authHeaders(): Record<string, string> {
  const token = getUserToken();
  return token ? { "X-User-Token": token } : {};
}

async function activityRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { ...authHeaders(), ...(init?.headers || {}) },
    credentials: "include",
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(response.status === 401 ? "Login required" : "Activity unavailable");
  return payload as T;
}

function relativeTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function eventMeta(eventType: string) {
  return EVENT_META[eventType] || { label: "System", Icon: CircleDot, tone: "text-muted-foreground/70" };
}

function safeTargetUrl(value: string | null): string | null {
  if (!value) return null;
  if (value.startsWith("/") || /^https?:\/\//i.test(value)) return value;
  return null;
}

function ActivityItemRow({
  item,
  onSelect,
  onOpenTarget,
}: {
  item: ActivityItem;
  onSelect: (item: ActivityItem) => void;
  onOpenTarget: (item: ActivityItem) => void;
}) {
  const { label, Icon, tone } = eventMeta(item.event_type);
  const targetUrl = safeTargetUrl(item.target_url);

  return (
    <article className={`border-b border-border/55 px-4 py-4 last:border-b-0 ${item.is_read ? "bg-transparent" : "bg-purple-500/[0.045]"}`}>
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-border/70 bg-background/60 ${tone}`} aria-hidden="true">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <button
          type="button"
          onClick={() => onSelect(item)}
          className="min-w-0 flex-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-purple-300/50"
          aria-label={item.is_read ? item.title : `Mark ${item.title} as read`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                {!item.is_read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-purple-300" aria-label="Unread" />}
                <span className={`text-[9px] font-mono uppercase tracking-[0.2em] ${tone}`}>{label}</span>
              </div>
              <h3 className="mt-1 break-words text-sm font-medium leading-snug text-foreground">{item.title}</h3>
            </div>
            <time
              dateTime={item.created_at}
              title={new Date(item.created_at).toLocaleString()}
              className="shrink-0 pt-0.5 text-[10px] font-mono text-muted-foreground/45"
            >
              {relativeTime(item.created_at)}
            </time>
          </div>
          {item.actor && (
            <p className="mt-2 flex flex-wrap items-center gap-1 text-[11px] font-mono text-muted-foreground/70">
              <span>{item.actor.display_name || `@${item.actor.username}`}</span>
              <span className="text-muted-foreground/35">·</span>
              <span>@{item.actor.username}</span>
              {item.actor.is_certified && <BadgeCheck className="h-3 w-3 text-purple-300/75" aria-label="Certified Creator" />}
            </p>
          )}
          {item.body && <p className="mt-2 break-words text-xs leading-relaxed text-muted-foreground">{item.body}</p>}
        </button>
      </div>
      {targetUrl && (
        <div className="ml-11 mt-3">
          {targetUrl.startsWith("/") ? (
            <Link href={targetUrl} onClick={() => onOpenTarget(item)}>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-purple-200/70 hover:text-purple-100">
                Open record <ArrowUpRight className="h-3 w-3" />
              </span>
            </Link>
          ) : (
            <a href={targetUrl} target="_blank" rel="noreferrer" onClick={() => onOpenTarget(item)} className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-purple-200/70 hover:text-purple-100">
              Open record <ArrowUpRight className="h-3 w-3" />
            </a>
          )}
        </div>
      )}
    </article>
  );
}

export function ActivityCenter() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useUser();
  const [open, setOpen] = useState(false);

  const unreadQuery = useQuery<UnreadResponse>({
    queryKey: UNREAD_QUERY_KEY,
    queryFn: () => activityRequest<UnreadResponse>("/api/activity/unread-count"),
    enabled: isAuthenticated,
    staleTime: 0,
  });

  const activityQuery = useQuery<ActivityResponse>({
    queryKey: ACTIVITY_QUERY_KEY,
    queryFn: () => activityRequest<ActivityResponse>("/api/activity"),
    enabled: isAuthenticated && open,
    staleTime: 0,
  });

  useEffect(() => {
    if (!isAuthenticated) setOpen(false);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!open || !isAuthenticated) return;
    void Promise.all([unreadQuery.refetch(), activityQuery.refetch()]);
  }, [open, isAuthenticated]);

  const unreadCount = unreadQuery.data?.count || 0;

  const markReadMutation = useMutation({
    mutationFn: (id: string) =>
      activityRequest<{ id: string; is_read: boolean }>(`/api/activity/${id}/read`, { method: "PATCH" }),
    onSuccess: (_result, id) => {
      queryClient.setQueryData<ActivityResponse>(ACTIVITY_QUERY_KEY, previous =>
        previous
          ? { ...previous, items: previous.items.map(item => item.id === id ? { ...item, is_read: true } : item) }
          : previous,
      );
      queryClient.setQueryData<UnreadResponse>(UNREAD_QUERY_KEY, previous => ({
        count: Math.max(0, (previous?.count || 0) - 1),
      }));
      void Promise.all([unreadQuery.refetch(), activityQuery.refetch()]);
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => activityRequest<{ updated_count: number }>("/api/activity/read-all", { method: "POST" }),
    onSuccess: () => {
      queryClient.setQueryData<ActivityResponse>(ACTIVITY_QUERY_KEY, previous =>
        previous ? { ...previous, items: previous.items.map(item => ({ ...item, is_read: true })) } : previous,
      );
      queryClient.setQueryData<UnreadResponse>(UNREAD_QUERY_KEY, { count: 0 });
      void Promise.all([unreadQuery.refetch(), activityQuery.refetch()]);
    },
  });

  const hasUnreadItems = useMemo(
    () => Boolean(activityQuery.data?.items.some(item => !item.is_read)),
    [activityQuery.data],
  );

  const markOneIfUnread = (item: ActivityItem) => {
    if (!item.is_read && !markReadMutation.isPending) markReadMutation.mutate(item.id);
  };

  const openTarget = (item: ActivityItem) => {
    markOneIfUnread(item);
  };

  if (!isAuthenticated) return null;

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label={unreadCount > 0 ? `Open Activity, ${unreadCount} unread` : "Open Activity"}
        title="Activity Center"
        className={`relative gap-1.5 px-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70 hover:text-foreground ${open ? "bg-muted text-foreground" : ""}`}
        data-testid="button-activity-center"
      >
        <ActivityIcon className="h-3.5 w-3.5" />
        <span className="hidden lg:inline">Activity</span>
        {unreadCount > 0 && (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-purple-400/20 px-1 text-[9px] text-purple-100" data-testid="activity-unread-count">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex h-full w-full flex-col gap-0 border-l border-border/80 bg-background p-0 sm:max-w-md">
          <SheetHeader className="border-b border-border/70 px-5 pb-5 pt-6 pr-14 text-left">
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-purple-300/75" />
              <SheetTitle className="font-display text-lg tracking-tight">ACTIVITY CENTER</SheetTitle>
            </div>
            <SheetDescription className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/55">
              Account signals / Vanta OS
            </SheetDescription>
            <div className="mt-5 flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/55">
                {unreadCount > 0 ? `${unreadCount} unread` : "All clear"}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={!hasUnreadItems || markAllReadMutation.isPending}
                onClick={() => markAllReadMutation.mutate()}
                className="h-7 px-2 text-[9px] font-mono uppercase tracking-widest text-muted-foreground/70"
                data-testid="button-mark-all-activity-read"
              >
                {markAllReadMutation.isPending ? "Updating…" : "Mark all read"}
              </Button>
            </div>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {activityQuery.isLoading && (
              <div className="px-5 py-16 text-center" data-testid="activity-loading">
                <Terminal className="mx-auto h-5 w-5 animate-pulse text-purple-300/65" />
                <p className="mt-4 text-[10px] font-mono uppercase tracking-[0.22em] text-purple-200/70">Loading Activity…</p>
              </div>
            )}

            {!activityQuery.isLoading && activityQuery.isError && (
              <div className="px-5 py-16 text-center" data-testid="activity-error">
                <Shield className="mx-auto h-5 w-5 text-red-200/55" />
                <p className="mt-4 text-sm text-muted-foreground">Activity is temporarily unavailable.</p>
                <Button type="button" variant="outline" size="sm" onClick={() => activityQuery.refetch()} className="mt-5 font-mono text-[10px] uppercase tracking-widest">Try again</Button>
              </div>
            )}

            {!activityQuery.isLoading && !activityQuery.isError && activityQuery.data?.items.length === 0 && (
              <div className="px-5 py-20 text-center" data-testid="activity-empty">
                <CircleDot className="mx-auto h-7 w-7 text-muted-foreground/25" />
                <p className="mt-5 text-[10px] font-mono uppercase tracking-[0.24em] text-muted-foreground/65">No Activity Yet</p>
                <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground/70">Updates connected to your Vanta account will appear here.</p>
              </div>
            )}

            {!activityQuery.isLoading && !activityQuery.isError && activityQuery.data?.items.map(item => (
              <ActivityItemRow
                key={item.id}
                item={item}
                onSelect={markOneIfUnread}
                onOpenTarget={openTarget}
              />
            ))}
          </div>

          <div className="flex items-center gap-2 border-t border-border/70 px-5 py-4 text-[9px] font-mono uppercase tracking-[0.16em] text-muted-foreground/40">
            <ActivityIcon className="h-3 w-3" />
            <span>Private Member activity</span>
            <span className="ml-auto">Live on open</span>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}