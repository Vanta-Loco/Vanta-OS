// ─── Stonerism Layout Shell ────────────────────────────────────────────────────
import type { ReactNode } from "react";
import { StonerismHeader } from "./header";
import { StonerismFooter } from "./footer";

interface Props {
  children: ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

export function StonerismLayout({ children, title, description, className = "" }: Props) {
  return (
    <div
      className={`stonerism-root min-h-screen ${className}`}
      style={{
        // ── Stonerism Design Tokens ─────────────────────────────────
        ["--stn-bg" as string]:      "#090b08",
        ["--stn-forest" as string]:  "#101710",
        ["--stn-panel" as string]:   "#172018",
        ["--stn-cream" as string]:   "#ece8dc",
        ["--stn-muted" as string]:   "#aaa99f",
        ["--stn-moss" as string]:    "#758b59",
        ["--stn-lime" as string]:    "#a7c776",
        ["--stn-brown" as string]:   "#715640",
        ["--stn-orange" as string]:  "#b36a3c",
        ["--stn-border" as string]:  "rgba(117,139,89,0.18)",
        background: "var(--stn-bg)",
        color:      "var(--stn-cream)",
        fontFamily: "var(--font-sans)",
      }}
    >
      {/* CSS-only film grain overlay — pointer-events: none so it never blocks clicks */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed", inset: 0, zIndex: 9999, pointerEvents: "none",
          opacity: 0.028,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px 128px",
        }}
      />

      {title && (
        <title>{title} | Stonerism</title>
      )}

      <StonerismHeader />

      <main className="pt-16">
        {children}
      </main>

      <StonerismFooter />
    </div>
  );
}
