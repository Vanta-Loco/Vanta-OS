// ─── Stonerism Brands Page ────────────────────────────────────────────────────
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { StonerismLayout } from "@/components/stonerism/layout";
import { StonerismHero } from "@/components/stonerism/hero";
import { StonerismSectionHeader } from "@/components/stonerism/section-header";
import { BusinessCard } from "@/components/stonerism/business-card";
import { CategoryChip } from "@/components/stonerism/category-chip";
import { EditorialNotice } from "@/components/stonerism/editorial-notice";

const BRAND_TYPES = [
  "All", "brand", "pre-rolls", "flower", "edibles", "accessories",
  "rolling papers", "glass", "grow-shop", "wellness", "food-truck",
];

export default function BrandsPage() {
  const [activeType, setActiveType] = useState("All");

  const { data: entities = [] } = useQuery<any[]>({
    queryKey: ["/api/stonerism/businesses"],
    queryFn: () => fetch("/api/stonerism/businesses").then(r => r.json()),
  });

  const brands = entities.filter(e =>
    ["brand", "grower"].includes(e.type) &&
    (activeType === "All" || e.type === activeType)
  );

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: "6px 14px", borderRadius: 20,
    fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
    textTransform: "uppercase", fontFamily: "var(--font-mono)",
    cursor: "pointer", border: "1px solid",
    borderColor: active ? "var(--stn-lime)" : "var(--stn-border)",
    background: active ? "rgba(167,199,118,0.12)" : "transparent",
    color: active ? "var(--stn-lime)" : "var(--stn-muted)",
    transition: "all 0.15s",
  });

  return (
    <StonerismLayout title="Brands | Stonerism">
      <StonerismHero
        eyebrow="Brands"
        headline="South African cannabis brands worth knowing."
        subheading="Pre-rolls, flower, accessories, wellness and more — no invented claims, no fake ratings."
        minimal
      />

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 24px 0" }}>
        <EditorialNotice text="Brand profiles are editorial and do not imply any endorsement, licensing status or verified claims. No pricing, THC percentages or strain names are fabricated." variant="legal" />
      </div>

      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "56px 24px 80px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 48 }}>
          {BRAND_TYPES.map(t => (
            <button key={t} onClick={() => setActiveType(t)} style={chipStyle(activeType === t)}>
              {t.replace(/-/g, " ")}
            </button>
          ))}
        </div>

        <StonerismSectionHeader
          eyebrow="Profiles"
          title="Brand directory"
          description="Profiles are coming soon. Check back for features on South African cannabis brands."
        />

        {brands.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 24 }}>
            {brands.map((e: any) => <BusinessCard key={e.id} business={e} />)}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 24 }}>
            {/* Stank Bank placeholder always shown */}
            <div style={{
              background: "var(--stn-panel)", border: "1px solid var(--stn-border)",
              borderRadius: 8, padding: "28px 24px",
            }}>
              <CategoryChip label="Brand" section="brands" small />
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--stn-cream)", fontFamily: "var(--font-display)", margin: "12px 0 8px" }}>
                Stank Bank
              </h3>
              <p style={{ fontSize: 12, color: "var(--stn-muted)", lineHeight: 1.6, marginBottom: 12 }}>
                Premium South African pre-roll brand with a dedicated rolling and packaging vault in the East Rand. Gauteng.
              </p>
              <p style={{ fontSize: 9, color: "var(--stn-orange)", fontFamily: "var(--font-mono)", letterSpacing: "0.14em", textTransform: "uppercase" }}>
                Coming Soon
              </p>
            </div>
          </div>
        )}
      </section>
    </StonerismLayout>
  );
}
