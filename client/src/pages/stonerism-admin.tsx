// ─── Stonerism Admin Panel ────────────────────────────────────────────────────
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdmin } from "@/hooks/use-admin";
import { Link, useLocation } from "wouter";
import { AdminLayout, AdminGuard } from "@/components/admin/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getAdminToken } from "@/lib/queryClient";

// Auth-header helper for bare fetch calls in this file
function authFetch(url: string, opts: RequestInit = {}): Promise<Response> {
  const token = getAdminToken();
  return fetch(url, {
    ...opts,
    credentials: "include",
    headers: {
      ...(opts.headers || {}),
      ...(token ? { "X-Admin-Token": token } : {}),
    },
  });
}

type Tab = "content" | "businesses" | "reviews" | "events" | "newsletter";

const TAB_LABELS: { id: Tab; label: string }[] = [
  { id: "content",    label: "Content"     },
  { id: "businesses", label: "Businesses"  },
  { id: "reviews",    label: "Reviews"     },
  { id: "events",     label: "Events"      },
  { id: "newsletter", label: "Newsletter"  },
];

const CONTENT_TYPES = [
  "article", "review", "editorial", "guide", "interview",
  "video", "podcast", "photo-essay", "gallery", "episode",
  "community-spotlight", "documentary",
];

const SECTIONS = ["cannabis", "places", "munchies", "wellness", "inner-life", "events", "journal", "brands", "community"];
const STATUS_OPTIONS = ["draft", "published", "archived"];

// ── Small helper: form label ───────────────────────────────────────────────
function FL({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-muted-foreground uppercase tracking-wide font-mono">{label}</label>
      {children}
    </div>
  );
}

// ── Content tab ────────────────────────────────────────────────────────────
function ContentTab() {
  const qc = useQueryClient();
  const [typeFilter, setTypeFilter] = useState("all");
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");

  const { data: content = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/stonerism/content"],
    queryFn: () => authFetch("/api/admin/stonerism/content").then(r => r.json()),
  });

  const filtered = content.filter((c: any) => typeFilter === "all" || c.type === typeFilter);

  const save = useMutation({
    mutationFn: (data: any) => {
      const method = editing?.id ? "PATCH" : "POST";
      const url = editing?.id ? `/api/admin/stonerism/content/${editing.id}` : "/api/admin/stonerism/content";
      return authFetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json());
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/stonerism/content"] }); setEditing(null); setMsg("Saved."); setTimeout(() => setMsg(""), 2000); },
    onError: () => setMsg("Error saving."),
  });

  const del = useMutation({
    mutationFn: (id: string) => authFetch(`/api/admin/stonerism/content/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/stonerism/content"] }),
  });

  const publish = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      authFetch(`/api/admin/stonerism/content/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, publishedAt: status === "published" ? new Date().toISOString() : null }),
      }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/stonerism/content"] }),
  });

  const openNew = () => {
    setEditing({});
    setForm({ type: "article", section: "journal", status: "draft", title: "", slug: "", excerpt: "", body: "" });
  };

  const openEdit = (c: any) => {
    setEditing(c);
    setForm({ type: c.type ?? "article", section: c.section ?? "journal", status: c.status ?? "draft", title: c.title ?? "", slug: c.slug ?? "", subtitle: c.subtitle ?? "", excerpt: c.excerpt ?? "", body: c.body ?? "", heroImage: c.heroImage ?? "", disclosure: c.disclosure ?? "", evidenceLevel: c.evidenceLevel ?? "", seoTitle: c.seoTitle ?? "", seoDescription: c.seoDescription ?? "" });
  };

  return (
    <div>
      {msg && <p className="text-sm text-green-500 mb-4">{msg}</p>}

      <div className="flex gap-3 mb-6 flex-wrap items-center">
        <Button onClick={openNew} size="sm">+ New Content</Button>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="text-xs bg-card border border-border rounded px-2 py-1">
          <option value="all">All types</option>
          {CONTENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <span className="text-xs text-muted-foreground">{filtered.length} items</span>
      </div>

      {/* Edit form */}
      {editing && (
        <div className="bg-card border border-border rounded-lg p-6 mb-6 grid gap-4">
          <h3 className="font-semibold">{editing.id ? "Edit Content" : "New Content"}</h3>
          <div className="grid grid-cols-2 gap-4">
            <FL label="Type">
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="text-sm bg-background border border-border rounded px-2 py-1 text-foreground">
                {CONTENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </FL>
            <FL label="Section">
              <select value={form.section} onChange={e => setForm(f => ({ ...f, section: e.target.value }))} className="text-sm bg-background border border-border rounded px-2 py-1 text-foreground">
                {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </FL>
            <FL label="Status">
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="text-sm bg-background border border-border rounded px-2 py-1 text-foreground">
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </FL>
            <FL label="Evidence Level">
              <Input value={form.evidenceLevel ?? ""} onChange={e => setForm(f => ({ ...f, evidenceLevel: e.target.value }))} placeholder="editorial|expert-reviewed|doctor-reviewed" />
            </FL>
          </div>
          <FL label="Title"><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></FL>
          <FL label="Slug"><Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") }))} placeholder="url-slug" /></FL>
          <FL label="Subtitle"><Input value={form.subtitle ?? ""} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} /></FL>
          <FL label="Excerpt"><Textarea value={form.excerpt} onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))} rows={2} /></FL>
          <FL label="Body (Markdown)"><Textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} rows={10} className="font-mono text-xs" /></FL>
          <FL label="Hero Image URL"><Input value={form.heroImage ?? ""} onChange={e => setForm(f => ({ ...f, heroImage: e.target.value }))} placeholder="https://... or /uploads/..." /></FL>
          <FL label="Disclosure"><Input value={form.disclosure ?? ""} onChange={e => setForm(f => ({ ...f, disclosure: e.target.value }))} /></FL>
          <FL label="SEO Title"><Input value={form.seoTitle ?? ""} onChange={e => setForm(f => ({ ...f, seoTitle: e.target.value }))} /></FL>
          <FL label="SEO Description"><Input value={form.seoDescription ?? ""} onChange={e => setForm(f => ({ ...f, seoDescription: e.target.value }))} /></FL>

          <div className="flex gap-3">
            <Button onClick={() => save.mutate(form)} disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Content list */}
      <div className="flex flex-col gap-2">
        {filtered.map((c: any) => (
          <div key={c.id} className="flex items-center justify-between gap-4 p-4 bg-card border border-border rounded-lg">
            <div className="flex-1 min-w-0">
              <div className="flex gap-2 items-center flex-wrap">
                <span className="text-xs font-mono text-muted-foreground uppercase">{c.type}</span>
                <span className={`text-xs font-mono ${c.status === "published" ? "text-green-500" : c.status === "archived" ? "text-muted-foreground" : "text-yellow-500"}`}>{c.status}</span>
                {c.featured === "true" && <span className="text-xs font-mono text-yellow-400">★ featured</span>}
              </div>
              <p className="text-sm font-medium mt-1 truncate">{c.title}</p>
              <p className="text-xs text-muted-foreground font-mono">{c.slug}</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {c.status === "draft" && (
                <Button size="sm" variant="outline" onClick={() => publish.mutate({ id: c.id, status: "published" })}>Publish</Button>
              )}
              {c.status === "published" && (
                <Button size="sm" variant="outline" onClick={() => publish.mutate({ id: c.id, status: "draft" })}>Unpublish</Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>Edit</Button>
              <Button size="sm" variant="destructive" onClick={() => { if (confirm("Delete?")) del.mutate(c.id); }}>Delete</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Businesses tab ─────────────────────────────────────────────────────────
function BusinessesTab() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  const { data: entities = [] } = useQuery<any[]>({
    queryKey: ["/api/stonerism/businesses"],
    queryFn: () => authFetch("/api/stonerism/businesses").then(r => r.json()),
  });

  const save = useMutation({
    mutationFn: (data: any) => {
      const method = editing?.id ? "PATCH" : "POST";
      const url = editing?.id ? `/api/admin/stonerism/businesses/${editing.id}` : "/api/admin/stonerism/businesses";
      return authFetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json());
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/stonerism/businesses"] }); setEditing(null); },
  });

  const del = useMutation({
    mutationFn: (id: string) => authFetch(`/api/admin/stonerism/businesses/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/stonerism/businesses"] }),
  });

  const ENTITY_TYPES = ["grower","dispensary","cannabis-club","brand","restaurant","coffee-shop","smoke-shop","grow-shop","food-truck","wellness-clinic","yoga-studio","gym","festival","venue","market","retreat","artist","creator","community-org"];
  const FEATURE_STATUS = ["coming-soon","featured","active","archived"];

  const openEdit = (e: any) => { setEditing(e); setForm({ name: e.name, slug: e.slug, type: e.type, description: e.description ?? "", city: e.city ?? "", province: e.province ?? "", country: e.country ?? "South Africa", websiteUrl: e.websiteUrl ?? "", instagramUrl: e.instagramUrl ?? "", foundedYear: e.foundedYear ?? "", featureStatus: e.featureStatus ?? "coming-soon", legalDisclaimer: e.legalDisclaimer ?? "", heroImage: e.heroImage ?? "" }); };

  return (
    <div>
      <div className="flex gap-3 mb-6">
        <Button onClick={() => { setEditing({}); setForm({ type: "brand", featureStatus: "coming-soon", country: "South Africa" }); }} size="sm">+ New Business</Button>
      </div>

      {editing && (
        <div className="bg-card border border-border rounded-lg p-6 mb-6 grid gap-4">
          <h3 className="font-semibold">{editing.id ? "Edit Business" : "New Business"}</h3>
          <div className="grid grid-cols-2 gap-4">
            <FL label="Type">
              <select value={form.type ?? "brand"} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="text-sm bg-background border border-border rounded px-2 py-1 text-foreground">
                {ENTITY_TYPES.map(t => <option key={t} value={t}>{t.replace(/-/g," ")}</option>)}
              </select>
            </FL>
            <FL label="Feature Status">
              <select value={form.featureStatus ?? "coming-soon"} onChange={e => setForm(f => ({ ...f, featureStatus: e.target.value }))} className="text-sm bg-background border border-border rounded px-2 py-1 text-foreground">
                {FEATURE_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </FL>
          </div>
          <FL label="Name"><Input value={form.name ?? ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></FL>
          <FL label="Slug"><Input value={form.slug ?? ""} onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"") }))} /></FL>
          <FL label="Description"><Textarea value={form.description ?? ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} /></FL>
          <div className="grid grid-cols-3 gap-4">
            <FL label="City"><Input value={form.city ?? ""} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} /></FL>
            <FL label="Province"><Input value={form.province ?? ""} onChange={e => setForm(f => ({ ...f, province: e.target.value }))} /></FL>
            <FL label="Country"><Input value={form.country ?? "South Africa"} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} /></FL>
          </div>
          <FL label="Website URL"><Input value={form.websiteUrl ?? ""} onChange={e => setForm(f => ({ ...f, websiteUrl: e.target.value }))} /></FL>
          <FL label="Instagram URL"><Input value={form.instagramUrl ?? ""} onChange={e => setForm(f => ({ ...f, instagramUrl: e.target.value }))} /></FL>
          <FL label="Legal Disclaimer"><Textarea value={form.legalDisclaimer ?? ""} onChange={e => setForm(f => ({ ...f, legalDisclaimer: e.target.value }))} rows={2} /></FL>
          <FL label="Hero Image URL"><Input value={form.heroImage ?? ""} onChange={e => setForm(f => ({ ...f, heroImage: e.target.value }))} /></FL>
          <div className="flex gap-3">
            <Button onClick={() => save.mutate(form)} disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {entities.map((e: any) => (
          <div key={e.id} className="flex items-center justify-between gap-4 p-4 bg-card border border-border rounded-lg">
            <div className="flex-1 min-w-0">
              <div className="flex gap-2 items-center">
                <span className="text-xs font-mono text-muted-foreground uppercase">{e.type}</span>
                <span className="text-xs font-mono text-orange-400">{e.featureStatus}</span>
              </div>
              <p className="text-sm font-medium mt-1">{e.name}</p>
              <p className="text-xs text-muted-foreground">{[e.city, e.province].filter(Boolean).join(", ")}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => openEdit(e)}>Edit</Button>
              <Button size="sm" variant="destructive" onClick={() => { if (confirm("Delete?")) del.mutate(e.id); }}>Delete</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Events tab ─────────────────────────────────────────────────────────────
function EventsTab() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  const { data: events = [] } = useQuery<any[]>({
    queryKey: ["/api/stonerism/events"],
    queryFn: () => authFetch("/api/stonerism/events").then(r => r.json()),
  });

  const save = useMutation({
    mutationFn: (data: any) => {
      const method = editing?.id ? "PATCH" : "POST";
      const url = editing?.id ? `/api/admin/stonerism/events/${editing.id}` : "/api/admin/stonerism/events";
      return authFetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json());
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/stonerism/events"] }); setEditing(null); },
  });

  const del = useMutation({
    mutationFn: (id: string) => authFetch(`/api/admin/stonerism/events/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/stonerism/events"] }),
  });

  const EVENT_STATUSES = ["concept","scheduled","cancelled","completed"];

  const openEdit = (e: any) => { setEditing(e); setForm({ title: e.title, slug: e.slug, category: e.category ?? "", description: e.description ?? "", city: e.city ?? "", venue: e.venue ?? "", startDate: e.startDate ?? "", ageRestriction: e.ageRestriction ?? "18+", priceLabel: e.priceLabel ?? "Free", host: e.host ?? "Stonerism", status: e.status ?? "concept", ticketUrl: e.ticketUrl ?? "" }); };

  return (
    <div>
      <div className="flex gap-3 mb-6">
        <Button onClick={() => { setEditing({}); setForm({ status: "concept", ageRestriction: "18+", priceLabel: "Free", host: "Stonerism", country: "South Africa" }); }} size="sm">+ New Event</Button>
      </div>

      {editing && (
        <div className="bg-card border border-border rounded-lg p-6 mb-6 grid gap-4">
          <h3 className="font-semibold">{editing.id ? "Edit Event" : "New Event"}</h3>
          <FL label="Status">
            <select value={form.status ?? "concept"} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="text-sm bg-background border border-border rounded px-2 py-1 text-foreground">
              {EVENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </FL>
          <FL label="Title"><Input value={form.title ?? ""} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></FL>
          <FL label="Slug"><Input value={form.slug ?? ""} onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"") }))} /></FL>
          <FL label="Category"><Input value={form.category ?? ""} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="yoga|hiking|market|live-music|…" /></FL>
          <FL label="Description"><Textarea value={form.description ?? ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></FL>
          <div className="grid grid-cols-2 gap-4">
            <FL label="City"><Input value={form.city ?? ""} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} /></FL>
            <FL label="Venue"><Input value={form.venue ?? ""} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))} /></FL>
            <FL label="Start Date"><Input value={form.startDate ?? ""} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} placeholder="2026-09-15" /></FL>
            <FL label="Price"><Input value={form.priceLabel ?? "Free"} onChange={e => setForm(f => ({ ...f, priceLabel: e.target.value }))} /></FL>
            <FL label="Age Restriction"><Input value={form.ageRestriction ?? "18+"} onChange={e => setForm(f => ({ ...f, ageRestriction: e.target.value }))} /></FL>
            <FL label="Host"><Input value={form.host ?? "Stonerism"} onChange={e => setForm(f => ({ ...f, host: e.target.value }))} /></FL>
          </div>
          <FL label="Ticket URL"><Input value={form.ticketUrl ?? ""} onChange={e => setForm(f => ({ ...f, ticketUrl: e.target.value }))} /></FL>
          <div className="flex gap-3">
            <Button onClick={() => save.mutate(form)} disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {events.map((e: any) => (
          <div key={e.id} className="flex items-center justify-between gap-4 p-4 bg-card border border-border rounded-lg">
            <div className="flex-1 min-w-0">
              <div className="flex gap-2 items-center">
                <span className="text-xs font-mono text-muted-foreground">{e.category || "—"}</span>
                <span className="text-xs font-mono text-orange-400">{e.status}</span>
              </div>
              <p className="text-sm font-medium mt-1">{e.title}</p>
              <p className="text-xs text-muted-foreground">{e.city || "Location TBC"} {e.startDate ? `· ${e.startDate}` : ""}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => openEdit(e)}>Edit</Button>
              <Button size="sm" variant="destructive" onClick={() => { if (confirm("Delete?")) del.mutate(e.id); }}>Delete</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Newsletter tab ─────────────────────────────────────────────────────────
function NewsletterTab() {
  const { data: subs = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/stonerism/newsletter"],
    queryFn: () => authFetch("/api/admin/stonerism/newsletter").then(r => r.json()),
  });

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-6">{subs.length} subscriber{subs.length !== 1 ? "s" : ""}</p>
      <div className="flex flex-col gap-2">
        {subs.map((s: any) => (
          <div key={s.id} className="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
            <div>
              <p className="text-sm font-mono">{s.email}</p>
              <p className="text-xs text-muted-foreground">{s.city || "—"} · {s.subscribedAt ? new Date(s.subscribedAt).toLocaleDateString() : ""}</p>
            </div>
            <span className={`text-xs font-mono ${s.unsubscribedAt ? "text-muted-foreground" : "text-green-500"}`}>
              {s.unsubscribedAt ? "Unsubscribed" : "Active"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function StonerismAdmin() {
  const [tab, setTab] = useState<Tab>("content");

  return (
    <AdminGuard>
      <AdminLayout
        title="Stonerism"
        action={
          <Link href="/stonerism">
            <Button variant="outline" size="sm" className="text-xs">View Stonerism ↗</Button>
          </Link>
        }
      >
        {/* Tabs */}
        <div className="flex gap-1 border-b border-border mb-8 flex-wrap">
          {TAB_LABELS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "content"    && <ContentTab />}
        {tab === "businesses" && <BusinessesTab />}
        {tab === "reviews"    && <div className="text-sm text-muted-foreground">Review management coming soon. Use the API directly.</div>}
        {tab === "events"     && <EventsTab />}
        {tab === "newsletter" && <NewsletterTab />}
      </AdminLayout>
    </AdminGuard>
  );
}
