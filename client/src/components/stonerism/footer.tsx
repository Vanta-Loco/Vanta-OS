// ─── Stonerism Footer ─────────────────────────────────────────────────────────
import { Link } from "wouter";

export function StonerismFooter() {
  return (
    <footer style={{
      borderTop: "1px solid var(--stn-border)",
      background: "var(--stn-forest)",
      padding: "48px 24px 32px",
      marginTop: 80,
    }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 40, marginBottom: 48 }}>
          {/* Brand */}
          <div>
            <p style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15, letterSpacing: "0.18em", color: "var(--stn-cream)", marginBottom: 12 }}>
              STONERISM
            </p>
            <p style={{ fontSize: 12, color: "var(--stn-muted)", lineHeight: 1.7, marginBottom: 16 }}>
              South African cannabis culture, wellness and community. Part of Vanta OS.
            </p>
            <Link href="/">
              <span style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--stn-moss)", cursor: "pointer" }}>
                ← Return to Vanta Cold
              </span>
            </Link>
          </div>

          {/* Sections */}
          <div>
            <p style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--stn-moss)", marginBottom: 16, fontWeight: 700 }}>Sections</p>
            {[
              ["/stonerism/cannabis",   "Cannabis"],
              ["/stonerism/places",     "Places"],
              ["/stonerism/brands",     "Brands"],
              ["/stonerism/munchies",   "Munchies"],
              ["/stonerism/wellness",   "Wellness"],
              ["/stonerism/inner-life", "Inner Life"],
              ["/stonerism/events",     "Events"],
              ["/stonerism/journal",    "Journal"],
            ].map(([href, label]) => (
              <Link key={href} href={href}>
                <span style={{ display: "block", fontSize: 12, color: "var(--stn-muted)", marginBottom: 8, cursor: "pointer" }}
                  onMouseEnter={e => (e.target as HTMLElement).style.color = "var(--stn-cream)"}
                  onMouseLeave={e => (e.target as HTMLElement).style.color = "var(--stn-muted)"}
                >
                  {label}
                </span>
              </Link>
            ))}
          </div>

          {/* Original Series */}
          <div>
            <p style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--stn-moss)", marginBottom: 16, fontWeight: 700 }}>Original Series</p>
            {["Behind The Brand", "Stoner Girls Review", "From Grow To Store", "Munchie Run", "The Green Guide", "Community Spotlight"].map(s => (
              <p key={s} style={{ fontSize: 12, color: "var(--stn-muted)", marginBottom: 8 }}>{s}</p>
            ))}
          </div>

          {/* Legal */}
          <div>
            <p style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--stn-moss)", marginBottom: 16, fontWeight: 700 }}>Legal</p>
            <p style={{ fontSize: 11, color: "var(--stn-muted)", lineHeight: 1.7 }}>
              Stonerism provides cultural and educational content. It does not provide medical advice or facilitate unlawful cannabis sales. You must be 18+ to use this service.
            </p>
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--stn-border)", paddingTop: 24, display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12 }}>
          <p style={{ fontSize: 10, color: "var(--stn-muted)", letterSpacing: "0.08em" }}>
            © {new Date().getFullYear()} Stonerism — Part of Vanta OS
          </p>
          <p style={{ fontSize: 10, color: "var(--stn-muted)", letterSpacing: "0.08em" }}>
            18+ only · For adults in legal jurisdictions
          </p>
        </div>
      </div>
    </footer>
  );
}
