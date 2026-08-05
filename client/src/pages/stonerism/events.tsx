// ─── Stonerism Events Page ────────────────────────────────────────────────────
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { StonerismLayout } from "@/components/stonerism/layout";
import { StonerismHero } from "@/components/stonerism/hero";
import { StonerismSectionHeader } from "@/components/stonerism/section-header";
import { EventCard } from "@/components/stonerism/event-card";

const EVENT_CATS = [
  "All", "yoga", "hiking", "beach-cleanup", "market",
  "live-music", "food", "grow-workshop", "art-exhibition",
  "wellness-retreat", "talk", "film-screening",
];

const CITIES = ["All", "Johannesburg", "Pretoria", "Cape Town", "Durban"];

export default function EventsPage() {
  const [cat, setCat] = useState("All");
  const [city, setCity] = useState("All");

  const { data: events = [] } = useQuery<any[]>({
    queryKey: ["/api/stonerism/events"],
    queryFn: () => fetch("/api/stonerism/events").then(r => r.json()),
  });

  const filtered = events.filter(e => {
    const catMatch = cat === "All" || e.category === cat;
    const cityMatch = city === "All" || e.city === city;
    return catMatch && cityMatch;
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
    <StonerismLayout title="Events | Stonerism">
      <StonerismHero
        eyebrow="Events"
        headline="Culture should leave something behind."
        subheading="Community gatherings, yoga, hikes, markets, live music and more. Events created by admin only."
        minimal
      />

      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "56px 24px 0" }}>
        {/* Filters */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 10, color: "var(--stn-muted)", alignSelf: "center", fontFamily: "var(--font-mono)", marginRight: 4 }}>CATEGORY</span>
          {EVENT_CATS.map(c => (
            <button key={c} onClick={() => setCat(c)} style={chipStyle(cat === c)}>{c.replace(/-/g, " ")}</button>
          ))}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 48 }}>
          <span style={{ fontSize: 10, color: "var(--stn-muted)", alignSelf: "center", fontFamily: "var(--font-mono)", marginRight: 4 }}>CITY</span>
          {CITIES.map(c => (
            <button key={c} onClick={() => setCity(c)} style={chipStyle(city === c)}>{c}</button>
          ))}
        </div>

        <StonerismSectionHeader
          title={`${filtered.length} event${filtered.length !== 1 ? "s" : ""}`}
          description="Concept events are planned experiences — not yet scheduled. Check back for confirmed dates."
        />

        {filtered.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 24 }}>
            {filtered.map((e: any) => <EventCard key={e.id} event={e} />)}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <p style={{ fontSize: 13, color: "var(--stn-muted)" }}>No events match the selected filters.</p>
          </div>
        )}
      </section>

      {/* Community vision */}
      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "80px 24px" }}>
        <div style={{ background: "var(--stn-panel)", border: "1px solid var(--stn-border)", borderRadius: 8, padding: "40px 36px" }}>
          <StonerismSectionHeader eyebrow="Community" title="Planned experiences" description="These are the community experiences we're building towards." />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {["Yoga mornings", "Hiking meetups", "Beach cleanups", "Community markets", "Live music sessions",
              "Food festivals", "Grow workshops", "Art exhibitions", "Wellness retreats", "Community gardens",
              "Tree planting", "Charity drives", "Open mic nights", "Film nights", "Plant swaps"].map(e => (
              <span key={e} style={{
                fontSize: 11, color: "var(--stn-muted)", border: "1px solid var(--stn-border)",
                borderRadius: 20, padding: "6px 14px", fontFamily: "var(--font-mono)",
                letterSpacing: "0.08em",
              }}>{e}</span>
            ))}
          </div>
        </div>
      </section>
    </StonerismLayout>
  );
}
