import { useState } from "react";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { GENRE_OPTIONS } from "@shared/schema";

interface GenrePillSelectorProps {
  value: string;
  onChange: (v: string) => void;
}

export function GenrePillSelector({ value, onChange }: GenrePillSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2" data-testid="genre-pill-selector">
      {GENRE_OPTIONS.map((genre) => {
        const selected = value === genre;
        return (
          <button
            key={genre}
            type="button"
            onClick={() => onChange(selected ? "" : genre)}
            data-testid={`genre-pill-${genre.toLowerCase().replace(/\s+/g, "-")}`}
            className={[
              "px-3 py-1.5 text-xs rounded-sm border transition-colors font-medium tracking-wide",
              selected
                ? "bg-foreground text-background border-foreground"
                : "bg-transparent text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground",
            ].join(" ")}
          >
            {genre}
          </button>
        );
      })}
    </div>
  );
}

interface TagInputProps {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  testId?: string;
}

export function TagInput({
  value,
  onChange,
  placeholder = "moody, nocturnal, distorted…",
  testId = "input-tags",
}: TagInputProps) {
  const [raw, setRaw] = useState("");

  function commit(text: string) {
    const incoming = text
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0 && !value.includes(t));
    if (incoming.length) onChange([...value, ...incoming]);
    setRaw("");
  }

  function removeTag(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  return (
    <div className="space-y-2">
      <Input
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            if (raw.trim()) commit(raw);
          }
          if (e.key === "Backspace" && raw === "" && value.length > 0) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => {
          if (raw.trim()) commit(raw);
        }}
        placeholder={placeholder}
        data-testid={testId}
      />
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5" data-testid="tag-pill-list">
          {value.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-sm bg-muted text-muted-foreground border border-border"
              data-testid={`tag-pill-${tag}`}
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="hover:text-foreground transition-colors"
                aria-label={`Remove ${tag}`}
                data-testid={`button-remove-tag-${tag}`}
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
