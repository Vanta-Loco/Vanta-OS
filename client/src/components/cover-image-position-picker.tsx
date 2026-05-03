const PRESETS: Array<{ label: string; x: number; y: number }> = [
  { label: "Top Left",     x: 0,   y: 0   },
  { label: "Top",          x: 50,  y: 0   },
  { label: "Top Right",    x: 100, y: 0   },
  { label: "Left",         x: 0,   y: 50  },
  { label: "Center",       x: 50,  y: 50  },
  { label: "Right",        x: 100, y: 50  },
  { label: "Bottom Left",  x: 0,   y: 100 },
  { label: "Bottom",       x: 50,  y: 100 },
  { label: "Bottom Right", x: 100, y: 100 },
];

function toPos(x: number, y: number) {
  return `${x}% ${y}%`;
}

function fromPos(pos: string): [number, number] {
  const m = pos.match(/^(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/);
  if (m) return [Math.round(Number(m[1])), Math.round(Number(m[2]))];
  return [50, 50];
}

interface CoverImagePositionPickerProps {
  value: string;
  onChange: (val: string) => void;
}

export function CoverImagePositionPicker({ value, onChange }: CoverImagePositionPickerProps) {
  const [x, y] = fromPos(value);

  return (
    <div className="space-y-3 pt-3 border-t border-border">
      <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
        Image Position
      </p>
      <div className="flex items-start gap-6">
        <div
          className="grid grid-cols-3 gap-1 shrink-0"
          style={{ width: 76 }}
          data-testid="position-grid"
        >
          {PRESETS.map((p) => {
            const active = x === p.x && y === p.y;
            return (
              <button
                key={p.label}
                type="button"
                title={p.label}
                onClick={() => onChange(toPos(p.x, p.y))}
                data-testid={`position-preset-${p.label.toLowerCase().replace(/\s+/g, "-")}`}
                className={[
                  "w-6 h-6 rounded-sm transition-colors border",
                  active
                    ? "bg-foreground border-foreground"
                    : "bg-muted border-border hover:bg-muted-foreground/20",
                ].join(" ")}
              />
            );
          })}
        </div>

        <div className="flex-1 space-y-3 min-w-0">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-muted-foreground/70 w-14 shrink-0">
              X&nbsp;{x}%
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={x}
              onChange={(e) => onChange(toPos(Number(e.target.value), y))}
              className="flex-1 h-1 accent-foreground cursor-pointer"
              data-testid="slider-position-x"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-muted-foreground/70 w-14 shrink-0">
              Y&nbsp;{y}%
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={y}
              onChange={(e) => onChange(toPos(x, Number(e.target.value)))}
              className="flex-1 h-1 accent-foreground cursor-pointer"
              data-testid="slider-position-y"
            />
          </div>
          <p className="text-[11px] font-mono text-muted-foreground/40 truncate">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}
