// ─── Stonerism Header ─────────────────────────────────────────────────────────
import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "wouter";
import {
  Menu, X, ArrowLeft,
  Home, Leaf, MapPin, Tag, UtensilsCrossed, Heart, Brain, Calendar, BookOpen,
} from "lucide-react";

// ── Single source of truth for all nav ──────────────────────────────────────
const NAV = [
  { href: "/stonerism",            label: "Home",       Icon: Home            },
  { href: "/stonerism/cannabis",   label: "Cannabis",   Icon: Leaf            },
  { href: "/stonerism/places",     label: "Places",     Icon: MapPin          },
  { href: "/stonerism/brands",     label: "Brands",     Icon: Tag             },
  { href: "/stonerism/munchies",   label: "Munchies",   Icon: UtensilsCrossed },
  { href: "/stonerism/wellness",   label: "Wellness",   Icon: Heart           },
  { href: "/stonerism/inner-life", label: "Inner Life", Icon: Brain           },
  { href: "/stonerism/events",     label: "Events",     Icon: Calendar        },
  { href: "/stonerism/journal",    label: "Journal",    Icon: BookOpen        },
] as const;

/** Returns the NAV label for the current route, or null on the home route. */
function useActiveLabel(location: string): string | null {
  for (const item of NAV) {
    if (item.href === "/stonerism") continue; // home — no label
    if (location === item.href || location.startsWith(item.href + "/")) {
      return item.label;
    }
  }
  return null;
}

/** True when a nav item is the active route. */
function isActive(href: string, location: string) {
  return href === "/stonerism"
    ? location === href
    : location === href || location.startsWith(href + "/");
}

// ─────────────────────────────────────────────────────────────────────────────
export function StonerismHeader() {
  const [location]      = useLocation();
  const [open, setOpen] = useState(false);
  const backdropRef     = useRef<HTMLDivElement>(null);
  const activeLabel     = useActiveLabel(location);

  // ── Close on route change ──────────────────────────────────────────────────
  useEffect(() => { setOpen(false); }, [location]);

  // ── Escape key ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  // ── Body scroll lock ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const close = useCallback(() => setOpen(false), []);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === backdropRef.current) close();
  };

  return (
    <>
      {/* ── Fixed header bar ──────────────────────────────────────────────── */}
      <header
        style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
          background: "rgba(9,11,8,0.94)", backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(117,139,89,0.18)",
          /* prevent any child from creating horizontal overflow */
          overflow: "hidden",
        }}
      >
        <div
          style={{
            maxWidth: 1280, margin: "0 auto",
            /* reduce padding on very narrow screens */
            padding: "0 clamp(10px, 3vw, 20px)",
          }}
        >
          <div
            style={{
              display: "flex", alignItems: "center",
              justifyContent: "space-between",
              height: 60, minWidth: 0, gap: 8,
            }}
          >

            {/* ── Wordmark + mobile current-page label ────────────────────── */}
            <Link href="/stonerism" style={{ minWidth: 0, flexShrink: 0 }}>
              <span style={{ display: "flex", flexDirection: "column", cursor: "pointer" }}>
                <span
                  style={{
                    fontFamily: "var(--font-display)", fontWeight: 800,
                    /* clamp so it shrinks on very narrow screens but stays readable */
                    fontSize: "clamp(13px, 3.5vw, 18px)",
                    letterSpacing: "0.18em", color: "var(--stn-cream)",
                    textTransform: "uppercase", whiteSpace: "nowrap",
                    lineHeight: 1.1,
                  }}
                >
                  STONERISM
                </span>

                {/* Current-page label — only on mobile (hidden lg+), only when not on home */}
                {activeLabel && (
                  <span
                    className="lg:hidden"
                    style={{
                      fontSize: "clamp(9px, 2.2vw, 11px)",
                      fontWeight: 500,
                      letterSpacing: "0.08em",
                      color: "var(--stn-lime)",
                      textTransform: "uppercase",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      maxWidth: "40vw",
                      lineHeight: 1.2,
                      marginTop: 2,
                    }}
                  >
                    {activeLabel}
                  </span>
                )}
              </span>
            </Link>

            {/* ── Desktop nav — only renders at lg (1024px+) ──────────────── */}
            <nav
              aria-label="Stonerism navigation"
              className="hidden lg:flex"
              style={{ alignItems: "center", gap: 2, flexShrink: 1, minWidth: 0 }}
            >
              {NAV.map(({ href, label }) => {
                const active = isActive(href, location);
                return (
                  <Link key={href} href={href}>
                    <span
                      style={{
                        fontSize: 11, fontWeight: 600, letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: active ? "var(--stn-lime)" : "var(--stn-muted)",
                        padding: "6px 9px", borderRadius: 4,
                        cursor: "pointer", transition: "color 0.15s",
                        display: "block", whiteSpace: "nowrap",
                      }}
                    >
                      {label}
                    </span>
                  </Link>
                );
              })}
            </nav>

            {/* ── Right: Back to Vanta (desktop) + hamburger (mobile) ──────── */}
            <div
              style={{
                display: "flex", alignItems: "center", gap: 8,
                flexShrink: 0,
              }}
            >
              {/* Back to Vanta — desktop only */}
              <Link href="/">
                <span
                  className="hidden lg:flex"
                  style={{
                    fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase",
                    color: "var(--stn-moss)", cursor: "pointer",
                    alignItems: "center", gap: 4,
                    border: "1px solid rgba(117,139,89,0.3)", borderRadius: 4,
                    padding: "5px 10px", whiteSpace: "nowrap",
                  }}
                >
                  <ArrowLeft size={10} />
                  Vanta OS
                </span>
              </Link>

              {/* Hamburger — mobile/tablet only (hidden lg+); no inline display to avoid
                  overriding the Tailwind lg:hidden class */}
              <button
                onClick={() => setOpen(o => !o)}
                className="lg:hidden"
                aria-label={open ? "Close menu" : "Open navigation menu"}
                aria-expanded={open}
                aria-controls="stonerism-mobile-nav"
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--stn-cream)", padding: "10px",
                  minWidth: 44, minHeight: 44, borderRadius: 6,
                }}
              >
                {open ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* ── Backdrop ─────────────────────────────────────────────────────────── */}
      {open && (
        <div
          ref={backdropRef}
          onClick={handleBackdropClick}
          aria-hidden="true"
          className="lg:hidden"
          style={{
            position: "fixed", inset: 0, zIndex: 49,
            background: "rgba(0,0,0,0.6)", backdropFilter: "blur(2px)",
          }}
        />
      )}

      {/* ── Mobile/tablet drawer ─────────────────────────────────────────────── */}
      <nav
        id="stonerism-mobile-nav"
        role="dialog"
        aria-modal="true"
        aria-label="Stonerism mobile navigation"
        className="lg:hidden"
        style={{
          position: "fixed",
          top: 0, right: 0, bottom: 0,
          width: "min(300px, 85vw)",
          zIndex: 51,
          background: "rgba(9,11,8,0.98)",
          borderLeft: "1px solid rgba(117,139,89,0.2)",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          overflowX: "hidden",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.24s cubic-bezier(0.32,0,0.67,0)",
          willChange: "transform",
        }}
      >
        {/* Drawer header row */}
        <div
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "0 16px", height: 60,
            borderBottom: "1px solid rgba(117,139,89,0.15)",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-display)", fontWeight: 800,
              fontSize: 16, letterSpacing: "0.18em",
              color: "var(--stn-cream)", textTransform: "uppercase",
            }}
          >
            STONERISM
          </span>
          <button
            onClick={close}
            aria-label="Close navigation menu"
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--stn-cream)", padding: "10px",
              display: "flex", alignItems: "center", justifyContent: "center",
              minWidth: 44, minHeight: 44, borderRadius: 6,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav links */}
        <div style={{ flex: 1, padding: "8px 0" }}>
          {NAV.map(({ href, label, Icon }) => {
            const active = isActive(href, location);
            return (
              <Link key={href} href={href} onClick={close}>
                <span
                  style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "0 20px", minHeight: 52, cursor: "pointer",
                    borderLeft: active
                      ? "2px solid var(--stn-lime)"
                      : "2px solid transparent",
                    background: active ? "rgba(167,199,118,0.06)" : "transparent",
                    transition: "background 0.1s",
                  }}
                >
                  <Icon
                    size={18}
                    style={{ color: active ? "var(--stn-lime)" : "var(--stn-muted)", flexShrink: 0 }}
                  />
                  <span
                    style={{
                      fontSize: 15, fontWeight: 600,
                      color: active ? "var(--stn-cream)" : "var(--stn-muted)",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {label}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>

        {/* Back to Vanta footer */}
        <div
          style={{
            padding: "16px 20px 24px",
            borderTop: "1px solid rgba(117,139,89,0.15)",
            flexShrink: 0,
          }}
        >
          <Link href="/" onClick={close}>
            <span
              style={{
                display: "flex", alignItems: "center", gap: 8,
                cursor: "pointer", padding: "12px 0", minHeight: 44,
              }}
            >
              <ArrowLeft size={14} style={{ color: "var(--stn-moss)" }} />
              <span>
                <span
                  style={{
                    display: "block", fontSize: 12, fontWeight: 700,
                    letterSpacing: "0.12em", textTransform: "uppercase",
                    color: "var(--stn-moss)", fontFamily: "var(--font-mono)",
                  }}
                >
                  Back to Vanta
                </span>
                <span
                  style={{
                    display: "block", fontSize: 10, color: "var(--stn-muted)",
                    fontFamily: "var(--font-mono)", marginTop: 2,
                  }}
                >
                  Part of Vanta OS
                </span>
              </span>
            </span>
          </Link>
        </div>
      </nav>
    </>
  );
}
