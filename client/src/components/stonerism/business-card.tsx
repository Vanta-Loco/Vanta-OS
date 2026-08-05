// ─── Stonerism Business Card ──────────────────────────────────────────────────
import { Link } from "wouter";
import { CategoryChip } from "./category-chip";
import { MediaPlaceholder } from "./media-placeholder";

export interface BusinessCardData {
  slug: string;
  name: string;
  type: string;
  description?: string;
  city?: string;
  province?: string;
  heroImage?: string;
  featureStatus?: string;
  verified?: string;
  websiteUrl?: string;
  instagramUrl?: string;
  legalDisclaimer?: string;
}

interface Props { business: BusinessCardData; }

const STATUS_LABELS: Record<string, string> = {
  "coming-soon": "Coming Soon",
  "featured": "Featured",
  "active": "Active",
  "archived": "Archived",
};

export function BusinessCard({ business }: Props) {
  const statusLabel = STATUS_LABELS[business.featureStatus ?? ""] ?? business.featureStatus ?? "";

  return (
    <Link href={`/stonerism/business/${business.slug}`}>
      <article style={{
        background: "var(--stn-forest)", border: "1px solid var(--stn-border)",
        borderRadius: 8, overflow: "hidden", cursor: "pointer",
        transition: "border-color 0.2s",
      }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--stn-moss)"}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--stn-border)"}
      >
        {/* Image */}
        <div style={{ aspectRatio: "3/2", overflow: "hidden" }}>
          {business.heroImage
            ? <img src={business.heroImage} alt={business.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <MediaPlaceholder aspect="3/2" label={business.type} />
          }
        </div>

        <div style={{ padding: 20 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center", flexWrap: "wrap" }}>
            <CategoryChip label={business.type.replace(/-/g, " ")} section="places" small />
            {statusLabel && (
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase",
                color: business.featureStatus === "coming-soon" ? "var(--stn-orange)" : "var(--stn-moss)",
                fontFamily: "var(--font-mono)",
              }}>
                {statusLabel}
              </span>
            )}
          </div>

          <h3 style={{
            fontSize: 16, fontWeight: 700, color: "var(--stn-cream)",
            fontFamily: "var(--font-display)", marginBottom: 6,
          }}>
            {business.name}
          </h3>

          {(business.city || business.province) && (
            <p style={{ fontSize: 11, color: "var(--stn-muted)", marginBottom: 8, fontFamily: "var(--font-mono)" }}>
              {[business.city, business.province].filter(Boolean).join(", ")}
            </p>
          )}

          {business.description && (
            <p style={{ fontSize: 12, color: "var(--stn-muted)", lineHeight: 1.6 }}>
              {business.description.slice(0, 120)}{business.description.length > 120 ? "…" : ""}
            </p>
          )}

          {business.legalDisclaimer && (
            <p style={{ fontSize: 10, color: "var(--stn-muted)", marginTop: 10, opacity: 0.6, fontStyle: "italic" }}>
              {business.legalDisclaimer}
            </p>
          )}
        </div>
      </article>
    </Link>
  );
}
