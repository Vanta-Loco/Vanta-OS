import { useEffect, useState } from "react";
import { Camera, Check, Code2, ExternalLink, FileText, Film, Image, Music2, Palette, Pencil, Shirt, Trash2, X } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getUserToken } from "@/hooks/use-user";

export const WORK_TYPES = ["Music", "Photography", "Artwork", "Fashion", "Video", "Writing / Media", "Web / Development", "Design", "Other"] as const;
export type WorkType = typeof WORK_TYPES[number];
export type WorkItem = {
  id: string; title: string; description: string; work_type: WorkType;
  external_url: string | null; thumbnail_url: string | null; room_id: string | null;
  room_name?: string | null; room_slug?: string | null; sort_order: number;
  is_featured: boolean; created_at: string; updated_at: string;
  creator_username?: string | null; creator_display_name?: string | null; creator_is_certified?: boolean;
};
type Room = { id: string; name: string; visibility: string; joined: boolean };
type WorkForm = { title: string; description: string; work_type: WorkType; external_url: string; thumbnail_url: string; room_id: string; is_featured: boolean };

const emptyForm: WorkForm = { title: "", description: "", work_type: "Music", external_url: "", thumbnail_url: "", room_id: "", is_featured: false };
const iconFor = (type: string) => type === "Music" ? Music2 : type === "Photography" ? Camera : type === "Video" ? Film : type === "Fashion" ? Shirt : type === "Writing / Media" ? FileText : type === "Web / Development" ? Code2 : type === "Design" ? Palette : type === "Artwork" ? Image : SparkIcon;
function SparkIcon(props: { className?: string }) { return <Palette {...props} />; }
function authHeaders(): Record<string, string> { const token = getUserToken(); return token ? { "X-User-Token": token } : {}; }
async function responseError(response: Response, fallback: string) {
  const data = await response.json().catch(() => ({}));
  return data.error || fallback;
}

export function WorkCard({ item, manage = false, onEdit, onDelete }: { item: WorkItem; manage?: boolean; onEdit?: () => void; onDelete?: () => void }) {
  const Icon = iconFor(item.work_type);
  return (
    <article className={`group overflow-hidden rounded-2xl border bg-card/40 transition-colors ${item.is_featured ? "border-primary/60 shadow-[0_0_30px_rgba(150,100,220,.12)]" : "border-border hover:border-primary/40"}`}>
      <div className={`relative aspect-[16/9] overflow-hidden ${item.thumbnail_url ? "bg-muted" : "bg-[radial-gradient(circle_at_70%_25%,rgba(140,92,190,.38),transparent_38%),linear-gradient(135deg,hsl(var(--muted)),hsl(var(--background)))]"}`}>
        {item.thumbnail_url ? <img src={item.thumbnail_url} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center"><Icon className="h-12 w-12 text-primary/40" /></div>}
        {item.is_featured && <span className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full border border-primary/60 bg-background/90 px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest text-primary"><Check className="h-3 w-3" /> Featured</span>}
      </div>
      <div className="p-5">
        <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60"><Icon className="h-3.5 w-3.5 text-primary/75" />{item.work_type}</div>
        <h3 className="mt-3 font-display text-2xl font-semibold">{item.title}</h3>
        {item.creator_username && <Link href={`/creators/${item.creator_username}`} className="mt-2 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary"><span>@{item.creator_username}</span>{item.creator_is_certified && <span className="rounded-full border border-primary/50 px-2 py-0.5 text-[9px] font-mono uppercase tracking-widest text-primary">Certified</span>}</Link>}
        {item.description && <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{item.description}</p>}
        <div className="mt-5 flex flex-wrap items-center gap-3 text-xs">
          {item.room_id && item.room_name && <Link href={`/rooms/${item.room_id}`} className="text-primary/80 hover:text-primary">Room · {item.room_name}</Link>}
          {item.external_url && <a href={item.external_url} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1.5 text-foreground hover:text-primary">View Work <ExternalLink className="h-3.5 w-3.5" /></a>}
        </div>
        {manage && <div className="mt-5 flex gap-2 border-t border-border pt-4"><Button size="sm" variant="outline" onClick={onEdit} className="gap-2"><Pencil className="h-3.5 w-3.5" /> Edit</Button><Button size="sm" variant="ghost" onClick={onDelete} className="gap-2 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /> Delete</Button></div>}
      </div>
    </article>
  );
}

function WorkForm({ initial, rooms, saving, onSave, onCancel }: { initial?: WorkItem; rooms: Room[]; saving: boolean; onSave: (form: WorkForm) => void; onCancel: () => void }) {
  const [form, setForm] = useState<WorkForm>(initial ? { title: initial.title, description: initial.description || "", work_type: initial.work_type, external_url: initial.external_url || "", thumbnail_url: initial.thumbnail_url || "", room_id: initial.room_id || "", is_featured: initial.is_featured } : emptyForm);
  const set = (key: keyof WorkForm, value: string | boolean) => setForm(current => ({ ...current, [key]: value }));
  return <div className="rounded-2xl border border-primary/40 bg-card/50 p-6 md:p-8">
    <div className="mb-7 flex items-start justify-between border-b border-border pb-5"><div><p className="text-[10px] font-mono uppercase tracking-[.25em] text-primary/75">Creator archive</p><h3 className="mt-2 font-display text-2xl font-semibold">{initial ? "Edit Work" : "Add Work"}</h3></div><button onClick={onCancel} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button></div>
    <div className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2"><label className="text-xs text-muted-foreground">Title <span className="text-primary">*</span><Input className="mt-2" value={form.title} onChange={e => set("title", e.target.value)} placeholder="The name of the work" maxLength={200} /></label><label className="text-xs text-muted-foreground">Work type <select className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground" value={form.work_type} onChange={e => set("work_type", e.target.value as WorkType)}>{WORK_TYPES.map(type => <option key={type}>{type}</option>)}</select></label></div>
      <label className="block text-xs text-muted-foreground">Description<Textarea className="mt-2 min-h-24 resize-y" value={form.description} onChange={e => set("description", e.target.value)} placeholder="A note from the archive…" maxLength={5000} /></label>
      <div className="grid gap-5 sm:grid-cols-2"><label className="text-xs text-muted-foreground">External URL<Input className="mt-2" type="url" value={form.external_url} onChange={e => set("external_url", e.target.value)} placeholder="https://…" /></label><label className="text-xs text-muted-foreground">Thumbnail URL<Input className="mt-2" type="url" value={form.thumbnail_url} onChange={e => set("thumbnail_url", e.target.value)} placeholder="https://…" /></label></div>
      <label className="block text-xs text-muted-foreground">Room association<select className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground" value={form.room_id} onChange={e => set("room_id", e.target.value)}><option value="">No Room association</option>{rooms.filter(room => room.visibility === "public" && room.joined).map(room => <option key={room.id} value={room.id}>{room.name}</option>)}</select></label>
      <label className="flex cursor-pointer items-center gap-3 text-sm text-muted-foreground"><input type="checkbox" checked={form.is_featured} onChange={e => set("is_featured", e.target.checked)} className="h-4 w-4 accent-primary" /> Mark as Featured <span className="text-xs text-muted-foreground/50">(maximum 3)</span></label>
    </div>
    <div className="mt-7 flex justify-end gap-3 border-t border-border pt-5"><Button variant="ghost" onClick={onCancel}>Cancel</Button><Button disabled={!form.title.trim() || saving} onClick={() => onSave(form)}>{saving ? "Saving…" : initial ? "Save changes" : "Add Work"}</Button></div>
  </div>;
}

export function CreatorWorkManager() {
  const [items, setItems] = useState<WorkItem[]>([]); const [rooms, setRooms] = useState<Room[]>([]); const [loading, setLoading] = useState(true); const [formOpen, setFormOpen] = useState(false); const [editing, setEditing] = useState<WorkItem>(); const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const load = async () => { const [workResponse, roomResponse] = await Promise.all([fetch("/api/creator/work", { headers: authHeaders() }), fetch("/api/rooms", { headers: authHeaders() })]); if (!workResponse.ok) throw new Error(await responseError(workResponse, "Could not load Creator Work")); const work = await workResponse.json(); const roomData = roomResponse.ok ? await roomResponse.json() : { rooms: [] }; setItems(work); setRooms(roomData.rooms || []); };
  useEffect(() => { load().catch(e => setError(e.message)).finally(() => setLoading(false)); }, []);
  async function save(form: WorkForm) { setSaving(true); setError(""); try { const response = await fetch(editing ? `/api/creator/work/${editing.id}` : "/api/creator/work", { method: editing ? "PATCH" : "POST", headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify({ ...form, room_id: form.room_id || null, external_url: form.external_url || null, thumbnail_url: form.thumbnail_url || null }) }); if (!response.ok) throw new Error(await responseError(response, "Could not save Work")); const saved = await response.json(); setItems(current => editing ? current.map(item => item.id === saved.id ? saved : item) : [saved, ...current]); setFormOpen(false); setEditing(undefined); } catch (e: any) { setError(e.message); } finally { setSaving(false); } }
  async function remove(item: WorkItem) { if (!window.confirm(`Delete “${item.title}” from your archive?`)) return; setError(""); const response = await fetch(`/api/creator/work/${item.id}`, { method: "DELETE", headers: authHeaders() }); if (!response.ok) { setError(await responseError(response, "Could not delete Work")); return; } setItems(current => current.filter(entry => entry.id !== item.id)); }
  return <section className="mt-10 border-t border-border pt-10">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-mono uppercase tracking-[.25em] text-primary/70">Portfolio archive</p><h2 className="mt-2 font-display text-3xl font-semibold">Work<span className="text-primary">.</span></h2><p className="mt-2 text-sm text-muted-foreground">The pieces that represent your Vanta identity.</p></div>{!formOpen && <Button onClick={() => { setEditing(undefined); setFormOpen(true); }} className="gap-2"><Palette className="h-4 w-4" /> Add Work</Button>}</div>
    {error && <div className="mb-5 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
    {formOpen && <WorkForm initial={editing} rooms={rooms} saving={saving} onSave={save} onCancel={() => { setFormOpen(false); setEditing(undefined); }} />}
    {!formOpen && (loading ? <p className="py-10 text-sm text-muted-foreground">Loading your archive…</p> : items.length ? <div className="grid gap-5 md:grid-cols-2">{items.map(item => <WorkCard key={item.id} item={item} manage onEdit={() => { setEditing(item); setFormOpen(true); }} onDelete={() => remove(item)} />)}</div> : <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center"><p className="font-display text-2xl">Start your archive<span className="text-primary">.</span></p><p className="mt-2 text-sm text-muted-foreground">Add the work that says what you make.</p></div>)}
  </section>;
}