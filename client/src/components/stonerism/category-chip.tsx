// ─── Stonerism Category Chip ──────────────────────────────────────────────────

const SECTION_COLORS: Record<string, string> = {
  cannabis:   "#758b59",
  places:     "#715640",
  munchies:   "#b36a3c",
  wellness:   "#5a8a70",
  "inner-life": "#7a6aaa",
  events:     "#4a7a8a",
  journal:    "#aaa99f",
  brands:     "#a7c776",
  community:  "#758b59",
  series:     "#b36a3c",
};

interface Props {
  label: string;
  section?: string;
  variant?: "section" | "series" | "type";
  small?: boolean;
}

export function CategoryChip({ label, section, variant, small }: Props) {
  const key = variant === "series" ? "series" : (section ?? "journal");
  const color = SECTION_COLORS[key] ?? "#aaa99f";

  return (
    <span style={{
      display: "inline-block",
      fontSize: small ? 9 : 10,
      fontWeight: 700,
      letterSpacing: "0.16em",
      textTransform: "uppercase",
      fontFamily: "var(--font-mono)",
      color,
      background: `${color}18`,
      border: `1px solid ${color}40`,
      borderRadius: 3,
      padding: small ? "2px 6px" : "3px 8px",
      lineHeight: 1.6,
    }}>
      {label}
    </span>
  );
}
