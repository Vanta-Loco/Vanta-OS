// ─── Stonerism Rating Badge ───────────────────────────────────────────────────
interface Props {
  score?: number | null;
  max?: number;
  label?: string;
  size?: "sm" | "md" | "lg";
}

export function RatingBadge({ score, max = 10, label, size = "md" }: Props) {
  const sizes = { sm: { outer: 40, font: 13 }, md: { outer: 56, font: 18 }, lg: { outer: 72, font: 24 } };
  const { outer, font } = sizes[size];

  if (score === null || score === undefined) {
    return (
      <div style={{
        display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 4,
      }}>
        <div style={{
          width: outer, height: outer, borderRadius: "50%",
          border: "2px solid var(--stn-border)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: 9, color: "var(--stn-muted)", fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>
            N/A
          </span>
        </div>
        {label && <span style={{ fontSize: 9, color: "var(--stn-muted)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "var(--font-mono)" }}>{label}</span>}
      </div>
    );
  }

  const pct = Math.min(score / max, 1);
  const hue = pct > 0.7 ? "#a7c776" : pct > 0.4 ? "#b36a3c" : "#715640";

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <div style={{
        width: outer, height: outer, borderRadius: "50%",
        border: `2px solid ${hue}`,
        background: `${hue}18`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column",
      }}>
        <span style={{ fontSize: font, fontWeight: 800, color: hue, lineHeight: 1, fontFamily: "var(--font-display)" }}>{score}</span>
        <span style={{ fontSize: 8, color: "var(--stn-muted)", fontFamily: "var(--font-mono)" }}>/{max}</span>
      </div>
      {label && <span style={{ fontSize: 9, color: "var(--stn-muted)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "var(--font-mono)", textAlign: "center", maxWidth: outer }}>{label}</span>}
    </div>
  );
}
