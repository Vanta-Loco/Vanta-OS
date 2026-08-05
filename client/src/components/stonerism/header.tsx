// ─── Stonerism Header ─────────────────────────────────────────────────────────
import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, ArrowLeft, Home, Leaf, MapPin, Tag, UtensilsCrossed, Heart, Brain, Calendar, BookOpen } from "lucide-react";

const NAV = [
  { href: "/stonerism",            label: "Home",       Icon: Home           },
  { href: "/stonerism/cannabis",   label: "Cannabis",   Icon: Leaf           },
  { href: "/stonerism/places",     label: "Places",     Icon: MapPin         },
  { href: "/stonerism/brands",     label: "Brands",     Icon: Tag            },
  { href: "/stonerism/munchies",   label: "Munchies",   Icon: UtensilsCrossed },
  { href: "/stonerism/wellness",   label: "Wellness",   Icon: Heart          },
  { href: "/stonerism/inner-life", label: "Inner Life", Icon: Brain          },
  { href: "/stonerism/events",     label: "Events",     Icon: Calendar       },
  { href: "/stonerism/journal",    label: "Journal",    Icon: BookOpen       },
];

export function StonerismHeader() {
  const [location]              = useLocation();
  const [open, setOpen]         = useState(false);
  const backdropRef             = useRef<HTMLDivElement>(null);

  // ── Close on route change ────────────────────────────────────────
  useEffect(() => { setOpen(false); }, [location]);

  // ── Escape key ───────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  // ── Body scroll lock ─────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  const close = useCallback(() => setOpen(false), []);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === backdropRef.current) close();
  };

  return (
    <>
      {/* ── Fixed header bar ──────────────────────────────────────── */}
      <header
        style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
          background: "rgba(9,11,8,0.94)", backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(117,139,89,0.18)",
        }}
      >
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>

            {/* Wordmark */}
            <Link href="/stonerism">
              <span style={{
                fontFamily: "var(--font-display)", fontWeight: 800,
                fontSize: "clamp(14px, 3vw, 18px)",
                letterSpacing: "0.18em", color: "var(--stn-cream)",
                cursor: "pointer", textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}>
                STONERISM
              </span>
            </Link>

            {/* Desktop nav */}
            <nav
              aria-label="Stonerism navigation"
              style={{ display: "flex", alignItems: "center", gap: 2 }}
              className="hidden md:flex"
            >
              {NAV.map(({ href, label }) => {
                const active = location === href || (href !== "/stonerism" && location.startsWith(href));
                return (
                  <Link key={href} href={href}>
                    <span
                      style={{
                        fontSize: 11, fontWeight: 600, letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: active ? "var(--stn-lime)" : "var(--stn-muted)",
                        padding: "6px 9px", borderRadius: 4,
                        cursor: "pointer", transition: "color 0.15s",
                        display: "block",
                      }}
                    >
                      {label}
                    </span>
                  </Link>
                );
              })}
            </nav>

            {/* Right: Back to Vanta (desktop) + hamburger (mobile) */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Link href="/">
                <span
                  className="hidden md:flex"
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

              {/* Mobile hamburger — hidden on md+ via class, no conflicting inline display */}
              <button
                onClick={() => setOpen(o => !o)}
                className="md:hidden"
                aria-label={open ? "Close menu" : "Open navigation menu"}
                aria-expanded={open}
                aria-controls="stonerism-mobile-nav"
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--stn-cream)", padding: "10px",
                  alignItems: "center", justifyContent: "center",
                  minWidth: 44, minHeight: 44, borderRadius: 6,
                }}
              >
                {open ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Mobile drawer backdrop ───────────────────────────────── */}
      {open && (
        <div
          ref={backdropRef}
          onClick={handleBackdropClick}
          style={{
            position: "fixed", inset: 0, zIndex: 49,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(2px)",
          }}
          aria-hidden="true"
          className="md:hidden"
        />
      )}

      {/* ── Mobile drawer panel ──────────────────────────────────── */}
      <nav
        id="stonerism-mobile-nav"
        role="dialog"
        aria-modal="true"
        aria-label="Stonerism mobile navigation"
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
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.24s cubic-bezier(0.32,0,0.67,0)",
          willChange: "transform",
        }}
        className="md:hidden"
      >
        {/* Drawer header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 16px", height: 60,
          borderBottom: "1px solid rgba(117,139,89,0.15)",
          flexShrink: 0,
        }}>
          <span style={{
            fontFamily: "var(--font-display)", fontWeight: 800,
            fontSize: 16, letterSpacing: "0.18em",
            color: "var(--stn-cream)", textTransform: "uppercase",
          }}>
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
            const active = location === href || (href !== "/stonerism" && location.startsWith(href));
            return (
              <Link key={href} href={href} onClick={close}>
                <span
                  style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "0 20px",
                    minHeight: 52,
                    cursor: "pointer",
                    borderLeft: active
                      ? "2px solid var(--stn-lime)"
                      : "2px solid transparent",
                    background: active ? "rgba(167,199,118,0.06)" : "transparent",
                    transition: "background 0.1s",
                  }}
                >
                  <Icon
                    size={18}
                    style={{
                      color: active ? "var(--stn-lime)" : "var(--stn-muted)",
                      flexShrink: 0,
                    }}
                  />
                  <span style={{
                    fontSize: 15, fontWeight: 600,
                    color: active ? "var(--stn-cream)" : "var(--stn-muted)",
                    letterSpacing: "0.04em",
                  }}>
                    {label}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>

        {/* Back to Vanta */}
        <div style={{
          padding: "16px 20px 24px",
          borderTop: "1px solid rgba(117,139,89,0.15)",
          flexShrink: 0,
        }}>
          <Link href="/" onClick={close}>
            <span
              style={{
                display: "flex", alignItems: "center", gap: 8,
                cursor: "pointer",
                padding: "12px 0",
                minHeight: 44,
              }}
            >
              <ArrowLeft size={14} style={{ color: "var(--stn-moss)" }} />
              <span>
                <span style={{
                  display: "block", fontSize: 12, fontWeight: 700, letterSpacing: "0.12em",
                  textTransform: "uppercase", color: "var(--stn-moss)",
                  fontFamily: "var(--font-mono)",
                }}>
                  Back to Vanta
                </span>
                <span style={{ display: "block", fontSize: 10, color: "var(--stn-muted)", fontFamily: "var(--font-mono)", marginTop: 2 }}>
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
