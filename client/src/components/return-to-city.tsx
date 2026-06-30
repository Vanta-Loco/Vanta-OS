import { Link } from "wouter";

/**
 * Fixed-position "← VANTA CITY" link — drop into any page that can be reached
 * from /world so the user can jump straight back to their saved position.
 * pointer-events intentionally left on (it's a real link).
 */
export function ReturnToCity() {
  return (
    <Link
      href="/world"
      data-testid="link-return-to-city"
      style={{
        position: "fixed",
        top: 14,
        right: 16,
        zIndex: 1000,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 12px",
        background: "rgba(5,3,12,0.82)",
        border: "1px solid rgba(168,85,247,0.38)",
        borderRadius: 4,
        fontFamily: "'Courier New', monospace",
        fontSize: 10,
        letterSpacing: "0.12em",
        color: "#a855f7",
        textDecoration: "none",
        backdropFilter: "blur(6px)",
        transition: "border-color 0.15s, color 0.15s",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(168,85,247,0.7)";
        (e.currentTarget as HTMLAnchorElement).style.color = "#c084fc";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(168,85,247,0.38)";
        (e.currentTarget as HTMLAnchorElement).style.color = "#a855f7";
      }}
    >
      ← VANTA CITY
    </Link>
  );
}
