import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const MARKETPLACE_CATEGORIES = [
  "Beats", "Recording", "Mixing & Mastering", "Artwork", "Photography",
  "Video", "Styling", "Modeling", "Songwriting", "Fashion Design",
  "Web / Development", "Other",
];
const priceTypes = [
  { value: "fixed", label: "Fixed price" },
  { value: "negotiable", label: "Negotiable" },
  { value: "contact", label: "Contact for price" },
];
const deliveryModes = [
  { value: "remote", label: "Remote" },
  { value: "in_person", label: "In-person" },
  { value: "both", label: "Remote + in-person" },
];

export type MarketplaceRoom = { id: string; name: string; slug: string; joined?: boolean; visibility?: string };
export type ListingFormValue = {
  title: string; description: string; category: string; price_type: string;
  price_amount: string; delivery_mode: string; city: string; room_id: string;
};

type Props = {
  initial?: Partial<ListingFormValue>;
  rooms?: MarketplaceRoom[];
  submitLabel: string;
  onSubmit: (value: ListingFormValue) => Promise<void>;
  onCancel?: () => void;
};

export function MarketplaceForm({ initial, rooms = [], submitLabel, onSubmit, onCancel }: Props) {
  const [value, setValue] = useState<ListingFormValue>({
    title: initial?.title || "", description: initial?.description || "",
    category: initial?.category || MARKETPLACE_CATEGORIES[0], price_type: initial?.price_type || "contact",
    price_amount: initial?.price_amount || "", delivery_mode: initial?.delivery_mode || "remote",
    city: initial?.city || "", room_id: initial?.room_id || "",
  });
  const [saving, setSaving] = useState(false);
  const set = (key: keyof ListingFormValue, next: string) => setValue(current => ({ ...current, [key]: next }));
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try { await onSubmit(value); } finally { setSaving(false); }
  }
  return (
    <form onSubmit={submit} className="border border-border rounded-xl p-5 sm:p-6 bg-card/70 space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="text-xs text-muted-foreground sm:col-span-2">Title
          <Input required minLength={3} maxLength={120} className="mt-2" value={value.title} onChange={e => set("title", e.target.value)} placeholder="What are you offering?" />
        </label>
        <label className="text-xs text-muted-foreground sm:col-span-2">Description
          <Textarea required maxLength={3000} className="mt-2 min-h-28" value={value.description} onChange={e => set("description", e.target.value)} placeholder="Describe the work, sound or skill…" />
        </label>
        <label className="text-xs text-muted-foreground">Category
          <select className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground" value={value.category} onChange={e => set("category", e.target.value)}>
            {MARKETPLACE_CATEGORIES.map(category => <option key={category}>{category}</option>)}
          </select>
        </label>
        <label className="text-xs text-muted-foreground">Delivery
          <select className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground" value={value.delivery_mode} onChange={e => set("delivery_mode", e.target.value)}>
            {deliveryModes.map(mode => <option key={mode.value} value={mode.value}>{mode.label}</option>)}
          </select>
        </label>
        <label className="text-xs text-muted-foreground">Price type
          <select className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground" value={value.price_type} onChange={e => set("price_type", e.target.value)}>
            {priceTypes.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
          </select>
        </label>
        {value.price_type !== "contact" && <label className="text-xs text-muted-foreground">Starting price (ZAR)
          <Input required={value.price_type === "fixed"} type="number" min="0.01" step="0.01" className="mt-2" value={value.price_amount} onChange={e => set("price_amount", e.target.value)} placeholder="850.00" />
        </label>}
        <label className="text-xs text-muted-foreground">City <span className="text-muted-foreground/50">(optional)</span>
          <Input className="mt-2" maxLength={100} value={value.city} onChange={e => set("city", e.target.value)} placeholder="Johannesburg" />
        </label>
        <label className="text-xs text-muted-foreground sm:col-span-2">Room association <span className="text-muted-foreground/50">(optional)</span>
          <select className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground" value={value.room_id} onChange={e => set("room_id", e.target.value)}>
            <option value="">No Room association</option>
            {rooms.map(room => <option key={room.id} value={room.id}>{room.name}</option>)}
          </select>
          {!rooms.length && <span className="block mt-2 text-[11px] text-muted-foreground/60">Join a public Room to connect a listing to it.</span>}
        </label>
      </div>
      <div className="flex justify-end gap-3">
        {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
        <Button type="submit" disabled={saving}>{saving ? "Saving…" : submitLabel}</Button>
      </div>
    </form>
  );
}