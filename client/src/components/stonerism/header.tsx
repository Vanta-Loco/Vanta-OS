// ─── Stonerism Header ─────────────────────────────────────────────────────────
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, ArrowLeft } from "lucide-react";

const NAV = [
  { href: "/stonerism",             label: "Home"        },
  { href: "/stonerism/cannabis",    label: "Cannabis"    },
  { href: "/stonerism/places",      label: "Places"      },
  { href: "/stonerism/brands",      label: "Brands"      },
  { href: "/stonerism/munchies",    label: "Munchies"    },
  { href: "/stonerism/wellness",    label: "Wellness"    },
  { href: "/stonerism/inner-life",  label: "Inner Life"  },
  { href: "/stonerism/events",      label: "Events"      },
  { href: "/stonerism/journal",     label: "Journal"     },
];

export function StonerismHeader() {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <header
        style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
          background: "rgba(9,11,8,0.92)", backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(117,139,89,0.18)",
        }}
      >
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>

            {/* Wordmark */}
            <Link href="/stonerism">
              <span style={{
                fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 18,
                letterSpacing: "0.18em", color: "var(--stn-cream)",
                cursor: "pointer", textTransform: "uppercase",
              }}>
                STONERISM
              </span>
            </Link>

            {/* Desktop nav */}
            <nav style={{ display: "flex", alignItems: "center", gap: 4 }} className="hidden md:flex">
              {NAV.map(({ href, label }) => {
                const active = location === href;
                return (
                  <Link key={href} href={href}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: active ? "var(--stn-lime)" : "var(--stn-muted)",
                      padding: "6px 10px", borderRadius: 4,
                      cursor: "pointer", transition: "color 0.15s",
                      display: "block",
                    }}
                    onMouseEnter={e => { if (!active) (e.target as HTMLElement).style.color = "var(--stn-cream)"; }}
                    onMouseLeave={e => { if (!active) (e.target as HTMLElement).style.color = "var(--stn-muted)"; }}
                    >
                      {label}
                    </span>
                  </Link>
                );
              })}
            </nav>

            {/* Right side */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Link href="/">
                <span style={{
                  fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase",
                  color: "var(--stn-moss)", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 4,
                  border: "1px solid rgba(117,139,89,0.3)", borderRadius: 4,
                  padding: "4px 10px",
                }}
                className="hidden md:flex"
                >
                  <ArrowLeft size={10} />
                  Vanta OS
                </span>
              </Link>

              {/* Mobile hamburger */}
              <button
                onClick={() => setOpen(o => !o)}
                className="md:hidden"
                aria-label={open ? "Close menu" : "Open menu"}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--stn-cream)", padding: 4,
                }}
              >
                {open ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 49,
            background: "rgba(9,11,8,0.98)",
            paddingTop: 80, paddingLeft: 24, paddingRight: 24,
            display: "flex", flexDirection: "column", gap: 4,
          }}
          className="md:hidden"
        >
          {NAV.map(({ href, label }) => (
            <Link key={href} href={href}>
              <span
                onClick={() => setOpen(false)}
                style={{
                  display: "block", padding: "14px 0",
                  fontSize: 14, fontWeight: 600, letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: location === href ? "var(--stn-lime)" : "var(--stn-cream)",
                  borderBottom: "1px solid rgba(117,139,89,0.1)",
                  cursor: "pointer",
                }}
              >
                {label}
              </span>
            </Link>
          ))}
          <Link href="/" onClick={() => setOpen(false)}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              marginTop: 24, fontSize: 11, letterSpacing: "0.14em",
              textTransform: "uppercase", color: "var(--stn-moss)",
              cursor: "pointer",
            }}>
              <ArrowLeft size={12} />
              Part of Vanta OS — return to Vanta Cold
            </span>
          </Link>
        </div>
      )}
    </>
  );
}
