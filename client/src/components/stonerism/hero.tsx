// ─── Stonerism Hero ───────────────────────────────────────────────────────────
import type { ReactNode } from "react";
import { MediaPlaceholder } from "./media-placeholder";

interface Props {
  eyebrow?: string;
  headline: string;
  subheading?: string;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  image?: string;
  imageAlt?: string;
  minimal?: boolean;
}

export function StonerismHero({
  eyebrow, headline, subheading,
  primaryAction, secondaryAction,
  image, imageAlt, minimal,
}: Props) {
  return (
    <section style={{
      position: "relative",
      background: minimal
        ? "var(--stn-forest)"
        : "linear-gradient(135deg, #090b08 0%, #101710 60%, #0f1a0d 100%)",
      borderBottom: "1px solid var(--stn-border)",
      overflow: "hidden",
    }}>
      {/* Subtle background texture */}
      {!minimal && (
        <div aria-hidden style={{
          position: "absolute", inset: 0, opacity: 0.04,
          backgroundImage: "repeating-linear-gradient(0deg, var(--stn-moss) 0px, transparent 1px, transparent 80px)",
          backgroundSize: "100% 80px",
        }} />
      )}

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "80px 24px" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: image ? "1fr 1fr" : "1fr",
          gap: 64, alignItems: "center",
        }}>
          {/* Text */}
          <div>
            {eyebrow && (
              <p style={{
                fontSize: 10, fontWeight: 700, letterSpacing: "0.25em",
                textTransform: "uppercase", color: "var(--stn-moss)",
                marginBottom: 20, fontFamily: "var(--font-mono)",
              }}>
                {eyebrow}
              </p>
            )}
            <h1 style={{
              fontSize: "clamp(28px, 4vw, 52px)", fontWeight: 800, lineHeight: 1.1,
              fontFamily: "var(--font-display)", color: "var(--stn-cream)",
              marginBottom: subheading ? 20 : 0, letterSpacing: "-0.01em",
            }}>
              {headline}
            </h1>
            {subheading && (
              <p style={{
                fontSize: 16, color: "var(--stn-muted)", lineHeight: 1.7,
                maxWidth: 520, marginBottom: 32,
              }}>
                {subheading}
              </p>
            )}
            {(primaryAction || secondaryAction) && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {primaryAction}
                {secondaryAction}
              </div>
            )}
          </div>

          {/* Image panel */}
          {image && (
            <div style={{ borderRadius: 8, overflow: "hidden", aspectRatio: "4/3" }}>
              <img src={image} alt={imageAlt ?? headline} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          )}
          {!image && !minimal && (
            <div className="hidden md:block">
              <MediaPlaceholder aspect="4/3" label="Editorial image" subtle />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
