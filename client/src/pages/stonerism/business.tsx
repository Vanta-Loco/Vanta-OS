// ─── Stonerism Business Profile Page ─────────────────────────────────────────
import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { StonerismLayout } from "@/components/stonerism/layout";
import { CategoryChip } from "@/components/stonerism/category-chip";
import { EditorialNotice } from "@/components/stonerism/editorial-notice";
import { MediaPlaceholder } from "@/components/stonerism/media-placeholder";

export default function BusinessPage() {
  const [, params] = useRoute("/stonerism/business/:slug");
  const slug = params?.slug ?? "";

  const { data: entity, isLoading, isError } = useQuery<any>({
    queryKey: ["/api/stonerism/businesses", slug],
    queryFn: () => fetch(`/api/stonerism/businesses/${slug}`).then(r => {
      if (!r.ok) throw new Error("Not found");
      return r.json();
    }),
    enabled: !!slug,
  });

  if (isLoading) {
    return <StonerismLayout><div style={{ padding: "120px 24px", textAlign: "center" }}><p style={{ color: "var(--stn-muted)" }}>Loading…</p></div></StonerismLayout>;
  }

  if (isError || !entity) {
    return (
      <StonerismLayout title="Not Found | Stonerism">
        <div style={{ maxWidth: 720, margin: "80px auto", padding: "0 24px", textAlign: "center" }}>
          <p style={{ color: "var(--stn-muted)", fontSize: 14, marginBottom: 16 }}>Business profile not found.</p>
          <Link href="/stonerism/places"><span style={{ color: "var(--stn-moss)", cursor: "pointer", fontSize: 13 }}>← Back to Places</span></Link>
        </div>
      </StonerismLayout>
    );
  }

  const isComingSoon = entity.featureStatus === "coming-soon";
  const location = [entity.city, entity.province, entity.country].filter(Boolean).join(", ");

  return (
    <StonerismLayout title={`${entity.name} | Stonerism`}>
      {/* Hero */}
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ aspectRatio: "21/9", overflow: "hidden" }}>
          {entity.heroImage
            ? <img src={entity.heroImage} alt={entity.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <MediaPlaceholder aspect="21/9" label={entity.name} />
          }
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px 0" }}>
        {/* Breadcrumb */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 24, flexWrap: "wrap" }}>
          <Link href="/stonerism"><span style={{ fontSize: 11, color: "var(--stn-muted)", cursor: "pointer" }}>Stonerism</span></Link>
          <span style={{ fontSize: 11, color: "var(--stn-border)" }}>/</span>
          <Link href="/stonerism/places"><span style={{ fontSize: 11, color: "var(--stn-muted)", cursor: "pointer" }}>Places</span></Link>
          <span style={{ fontSize: 11, color: "var(--stn-border)" }}>/</span>
          <span style={{ fontSize: 11, color: "var(--stn-muted)" }}>{entity.name}</span>
        </div>

        {/* Header */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
          <CategoryChip label={entity.type?.replace(/-/g, " ")} section="places" />
          {isComingSoon && (
            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--stn-orange)", fontFamily: "var(--font-mono)", letterSpacing: "0.14em", textTransform: "uppercase", alignSelf: "center" }}>
              Coming Soon
            </span>
          )}
          {entity.verified === "true" && (
            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--stn-lime)", fontFamily: "var(--font-mono)", letterSpacing: "0.14em", textTransform: "uppercase", alignSelf: "center" }}>
              ✓ Verified
            </span>
          )}
        </div>

        <h1 style={{
          fontSize: "clamp(28px,4vw,44px)", fontWeight: 800, color: "var(--stn-cream)",
          fontFamily: "var(--font-display)", lineHeight: 1.1, marginBottom: 12,
        }}>
          {entity.name}
        </h1>

        {location && (
          <p style={{ fontSize: 13, color: "var(--stn-muted)", fontFamily: "var(--font-mono)", marginBottom: 24 }}>
            📍 {location}
          </p>
        )}

        {/* Description */}
        {entity.description && (
          <p style={{ fontSize: 15, color: "var(--stn-muted)", lineHeight: 1.8, marginBottom: 32, maxWidth: 680 }}>
            {entity.description}
          </p>
        )}

        {/* Legal disclaimer */}
        {entity.legalDisclaimer && (
          <div style={{ marginBottom: 32 }}>
            <EditorialNotice text={entity.legalDisclaimer} variant="legal" />
          </div>
        )}

        {/* Details grid */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 16, background: "var(--stn-panel)", border: "1px solid var(--stn-border)",
          borderRadius: 8, padding: "28px", marginBottom: 40,
        }}>
          {entity.foundedYear && (
            <div>
              <p style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--stn-moss)", fontFamily: "var(--font-mono)", marginBottom: 4 }}>Founded</p>
              <p style={{ fontSize: 14, color: "var(--stn-cream)" }}>{entity.foundedYear}</p>
            </div>
          )}
          {entity.province && (
            <div>
              <p style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--stn-moss)", fontFamily: "var(--font-mono)", marginBottom: 4 }}>Province</p>
              <p style={{ fontSize: 14, color: "var(--stn-cream)" }}>{entity.province}</p>
            </div>
          )}
          {entity.country && (
            <div>
              <p style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--stn-moss)", fontFamily: "var(--font-mono)", marginBottom: 4 }}>Country</p>
              <p style={{ fontSize: 14, color: "var(--stn-cream)" }}>{entity.country}</p>
            </div>
          )}
        </div>

        {/* External links — no purchasing, no ordering */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 40 }}>
          {entity.websiteUrl && (
            <a href={entity.websiteUrl} target="_blank" rel="noopener noreferrer" style={{
              fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
              color: "var(--stn-moss)", border: "1px solid rgba(117,139,89,0.4)", borderRadius: 4,
              padding: "10px 18px", textDecoration: "none", fontFamily: "var(--font-mono)",
            }}>
              Official Website ↗
            </a>
          )}
          {entity.instagramUrl && (
            <a href={entity.instagramUrl} target="_blank" rel="noopener noreferrer" style={{
              fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
              color: "var(--stn-muted)", border: "1px solid var(--stn-border)", borderRadius: 4,
              padding: "10px 18px", textDecoration: "none", fontFamily: "var(--font-mono)",
            }}>
              Instagram ↗
            </a>
          )}
          {entity.address && (
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(entity.address)}`}
              target="_blank" rel="noopener noreferrer"
              style={{
                fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
                color: "var(--stn-muted)", border: "1px solid var(--stn-border)", borderRadius: 4,
                padding: "10px 18px", textDecoration: "none", fontFamily: "var(--font-mono)",
              }}
            >
              Get Directions ↗
            </a>
          )}
        </div>

        <p style={{ fontSize: 10, color: "var(--stn-muted)", opacity: 0.6, fontStyle: "italic", marginBottom: 80 }}>
          Stonerism does not facilitate purchases, deliveries or orders. External links open the business's own channels.
        </p>
      </div>
    </StonerismLayout>
  );
}
