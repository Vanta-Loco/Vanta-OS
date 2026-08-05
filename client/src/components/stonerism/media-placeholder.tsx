// ─── Stonerism Media Placeholder ──────────────────────────────────────────────
interface Props {
  aspect?: string;
  label?: string;
  subtle?: boolean;
  height?: number;
}

export function MediaPlaceholder({ aspect = "16/9", label, subtle, height }: Props) {
  return (
    <div style={{
      aspectRatio: height ? undefined : aspect,
      height: height ?? undefined,
      background: subtle
        ? "linear-gradient(135deg, rgba(23,32,24,0.6) 0%, rgba(16,23,16,0.8) 100%)"
        : "linear-gradient(135deg, var(--stn-forest) 0%, var(--stn-panel) 100%)",
      border: "1px solid var(--stn-border)",
      borderRadius: 6,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 8,
    }}>
      {/* Botanical cross-hatch pattern */}
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden>
        <rect x="1" y="1" width="38" height="38" rx="3" stroke="var(--stn-moss)" strokeWidth="0.5" strokeOpacity="0.4" />
        <path d="M20 4 Q24 12 20 20 Q16 28 20 36" stroke="var(--stn-moss)" strokeWidth="0.8" strokeOpacity="0.5" fill="none" />
        <path d="M4 20 Q12 24 20 20 Q28 16 36 20" stroke="var(--stn-moss)" strokeWidth="0.8" strokeOpacity="0.5" fill="none" />
        <circle cx="20" cy="20" r="3" fill="var(--stn-moss)" fillOpacity="0.3" />
      </svg>
      {label && (
        <p style={{
          fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase",
          color: "var(--stn-moss)", fontFamily: "var(--font-mono)", opacity: 0.7,
        }}>
          {label}
        </p>
      )}
    </div>
  );
}
