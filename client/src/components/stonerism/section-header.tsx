// ─── Stonerism Section Header ─────────────────────────────────────────────────
interface Props {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function StonerismSectionHeader({ eyebrow, title, description, action }: Props) {
  return (
    <div style={{ marginBottom: 40, display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: 16 }}>
      <div>
        {eyebrow && (
          <p style={{
            fontSize: 10, fontWeight: 700, letterSpacing: "0.25em",
            textTransform: "uppercase", color: "var(--stn-moss)",
            marginBottom: 8, fontFamily: "var(--font-mono)",
          }}>
            {eyebrow}
          </p>
        )}
        <h2 style={{
          fontSize: "clamp(20px, 2.5vw, 28px)", fontWeight: 800,
          fontFamily: "var(--font-display)", color: "var(--stn-cream)",
          letterSpacing: "-0.01em", marginBottom: description ? 8 : 0,
        }}>
          {title}
        </h2>
        {description && (
          <p style={{ fontSize: 14, color: "var(--stn-muted)", maxWidth: 520, lineHeight: 1.6 }}>
            {description}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
