// ─── Stonerism Editorial Notice ───────────────────────────────────────────────
interface Props {
  text?: string;
  variant?: "info" | "legal" | "health";
}

const DEFAULTS = {
  legal:  "Stonerism provides cultural and educational content. It does not provide medical advice or facilitate unlawful cannabis sales.",
  health: "This content is editorial in nature. It does not constitute medical advice. Consult a qualified healthcare professional before making health decisions.",
  info:   "Stonerism is an editorial platform. Content reflects the views of its authors and does not imply endorsement.",
};

export function EditorialNotice({ text, variant = "legal" }: Props) {
  const message = text ?? DEFAULTS[variant];
  const colors = {
    legal:  { bg: "rgba(117,139,89,0.07)", border: "rgba(117,139,89,0.22)", icon: "⚖" },
    health: { bg: "rgba(90,138,112,0.07)", border: "rgba(90,138,112,0.22)", icon: "+" },
    info:   { bg: "rgba(170,169,159,0.07)", border: "rgba(170,169,159,0.22)", icon: "i" },
  };
  const c = colors[variant];

  return (
    <div role="note" style={{
      background: c.bg,
      border: `1px solid ${c.border}`,
      borderRadius: 6, padding: "14px 18px",
      display: "flex", gap: 12, alignItems: "flex-start",
    }}>
      <span style={{
        fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)",
        color: "var(--stn-moss)", flexShrink: 0,
        width: 20, height: 20, borderRadius: "50%",
        border: "1px solid var(--stn-moss)", display: "flex",
        alignItems: "center", justifyContent: "center",
      }}>
        {c.icon}
      </span>
      <p style={{ fontSize: 12, color: "var(--stn-muted)", lineHeight: 1.7, margin: 0 }}>
        {message}
      </p>
    </div>
  );
}
