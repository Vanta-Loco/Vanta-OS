import { Label } from "@/components/ui/label";

export const IMAGE_LAYOUTS = [
  { value: "original", label: "Original", ratio: "Natural ratio", className: "aspect-auto" },
  { value: "square", label: "Square", ratio: "1:1", className: "aspect-square" },
  { value: "portrait", label: "Portrait", ratio: "4:5", className: "aspect-[4/5]" },
  { value: "landscape", label: "Landscape", ratio: "16:9", className: "aspect-video" },
  { value: "wide", label: "Wide", ratio: "1.91:1", className: "aspect-[1.91/1]" },
  { value: "story", label: "Story", ratio: "9:16", className: "aspect-[9/16]" },
] as const;

export type ImageLayout = typeof IMAGE_LAYOUTS[number]["value"];

export function getImageLayout(value?: string) {
  return IMAGE_LAYOUTS.find(layout => layout.value === value) || IMAGE_LAYOUTS[0];
}

export function ImageLayoutPicker({ value, onChange, preview }: { value: string; onChange: (value: ImageLayout) => void; preview?: string }) {
  const selected = getImageLayout(value);
  return (
    <div className="space-y-3">
      <div>
        <Label>Image presentation</Label>
        <p className="text-xs text-muted-foreground mt-1">Choose how the cover appears without uploading another image.</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {IMAGE_LAYOUTS.map(layout => (
          <button
            key={layout.value}
            type="button"
            onClick={() => onChange(layout.value)}
            className={`text-left rounded-md border p-2.5 transition-colors ${selected.value === layout.value ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}`}
            aria-pressed={selected.value === layout.value}
          >
            <span className="block text-sm font-medium">{layout.label}</span>
            <span className="block text-[11px] text-muted-foreground mt-0.5">{layout.ratio}</span>
          </button>
        ))}
      </div>
      {preview && (
        <div className="rounded-md border border-border bg-muted/30 p-3">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Live preview · {selected.label} · {selected.ratio}</p>
          <div className={`relative w-full max-w-sm mx-auto overflow-hidden rounded ${selected.className} ${selected.value === "original" ? "max-h-64" : ""}`}>
            <img src={preview} alt="Selected format preview" className={`w-full h-full ${selected.value === "original" ? "object-contain" : "object-cover"}`} />
          </div>
        </div>
      )}
    </div>
  );
}