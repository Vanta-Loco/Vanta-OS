// ─── Stonerism Score Display ──────────────────────────────────────────────────
interface ScoreRow { category: string; score?: number | null; notes?: string; }
interface Props { scores: ScoreRow[]; max?: number; overall?: number | null; }

export function ScoreDisplay({ scores, max = 10, overall }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {overall !== undefined && overall !== null && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 18px", background: "var(--stn-panel)",
          border: "1px solid var(--stn-moss)", borderRadius: 6, marginBottom: 8,
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--stn-cream)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "var(--font-mono)" }}>
            Overall Score
          </span>
          <span style={{ fontSize: 22, fontWeight: 800, color: "var(--stn-lime)", fontFamily: "var(--font-display)" }}>
            {overall}<span style={{ fontSize: 12, color: "var(--stn-muted)", fontWeight: 400 }}>/{max}</span>
          </span>
        </div>
      )}
      {scores.map(({ category, score }) => {
        const pct = score != null ? Math.min(score / max, 1) : 0;
        const barColor = score == null ? "var(--stn-border)" : pct > 0.7 ? "var(--stn-moss)" : pct > 0.4 ? "var(--stn-orange)" : "var(--stn-brown)";
        return (
          <div key={category}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: "var(--stn-cream)", fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>
                {category}
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: barColor, fontFamily: "var(--font-mono)" }}>
                {score != null ? `${score}/${max}` : "—"}
              </span>
            </div>
            <div style={{ height: 3, background: "var(--stn-border)", borderRadius: 2, overflow: "hidden" }}>
              {score != null && (
                <div style={{ width: `${pct * 100}%`, height: "100%", background: barColor, borderRadius: 2, transition: "width 0.6s ease" }} />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
