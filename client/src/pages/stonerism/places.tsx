// ─── Stonerism Places Page ────────────────────────────────────────────────────
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { StonerismLayout } from "@/components/stonerism/layout";
import { StonerismHero } from "@/components/stonerism/hero";
import { StonerismSectionHeader } from "@/components/stonerism/section-header";
import { BusinessCard } from "@/components/stonerism/business-card";
import { CategoryChip } from "@/components/stonerism/category-chip";
import { EditorialNotice } from "@/components/stonerism/editorial-notice";

const CITIES = ["All", "Johannesburg", "Pretoria", "Cape Town", "Durban", "Other"];
const TYPES = [
  "All", "grower", "dispensary", "cannabis-club", "smoke-shop",
  "grow-shop", "wellness-clinic", "brand", "restaurant",
];

export default function PlacesPage() {
  const [city, setCity] = useState("All");
  const [type, setType] = useState("All");

  const { data: entities = [] } = useQuery<any[]>({
    queryKey: ["/api/stonerism/businesses"],
    queryFn: () => fetch("/api/stonerism/businesses").then(r => r.json()),
  });

  const filtered = entities.filter(e => {
    const cityMatch = city === "All" || e.city === city || (city === "Other" && !["Johannesburg", "Pretoria", "Cape Town", "Durban"].includes(e.city));
    const typeMatch = type === "All" || e.type === type;
    return cityMatch && typeMatch;
  });

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: "6px 14px", borderRadius: 20,
    fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
    textTransform: "uppercase", fontFamily: "var(--font-mono)",
    cursor: "pointer", border: "1px solid",
    borderColor: active ? "var(--stn-moss)" : "var(--stn-border)",
    background: active ? "rgba(117,139,89,0.15)" : "transparent",
    color: active ? "var(--stn-moss)" : "var(--stn-muted)",
    transition: "all 0.15s",
  });

  return (
    <StonerismLayout title="Places | Stonerism">
      <StonerismHero eyebrow="Places" headline="Dispensaries, clubs, grow shops and cannabis-friendly spaces." minimal />

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 24px 0" }}>
        <EditorialNotice text="Business profiles are editorial only. Stonerism does not verify licensing or make any claims about the legal status of any listed business. Always verify directly with the business." variant="legal" />
      </div>

      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "56px 24px 0" }}>
        {/* City filter */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 10, color: "var(--stn-muted)", alignSelf: "center", fontFamily: "var(--font-mono)", marginRight: 4 }}>CITY</span>
          {CITIES.map(c => (
            <button key={c} onClick={() => setCity(c)} style={chipStyle(city === c)}>{c}</button>
          ))}
        </div>
        {/* Type filter */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 48 }}>
          <span style={{ fontSize: 10, color: "var(--stn-muted)", alignSelf: "center", fontFamily: "var(--font-mono)", marginRight: 4 }}>TYPE</span>
          {TYPES.map(t => (
            <button key={t} onClick={() => setType(t)} style={chipStyle(type === t)}>{t.replace(/-/g, " ")}</button>
          ))}
        </div>

        <StonerismSectionHeader
          title={`${filtered.length === 0 ? "No" : filtered.length} place${filtered.length !== 1 ? "s" : ""}`}
          description="Profiles are editorial. No purchasing, delivery or ordering through Stonerism."
        />

        {filtered.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 24 }}>
            {filtered.map((e: any) => <BusinessCard key={e.id} business={e} />)}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <p style={{ fontSize: 13, color: "var(--stn-muted)" }}>More places coming soon.</p>
          </div>
        )}
      </section>
    </StonerismLayout>
  );
}
