// ─── Stonerism Journal Page ───────────────────────────────────────────────────
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { StonerismLayout } from "@/components/stonerism/layout";
import { StonerismHero } from "@/components/stonerism/hero";
import { StonerismSectionHeader } from "@/components/stonerism/section-header";
import { ArticleCard } from "@/components/stonerism/article-card";
import { CategoryChip } from "@/components/stonerism/category-chip";

const TOPICS = [
  "Cannabis", "Wellness", "Inner Life", "Munchies", "Places",
  "Brands", "Community", "Events", "Culture", "Harm Reduction",
];

export default function JournalPage() {
  const [search, setSearch] = useState("");
  const [section, setSection] = useState("all");

  const { data: content = [] } = useQuery<any[]>({
    queryKey: ["/api/stonerism/content"],
    queryFn: () => fetch("/api/stonerism/content").then(r => r.json()),
  });

  const filtered = content.filter((c: any) => {
    const matchesSection = section === "all" || c.section === section;
    const matchesSearch  = !search.trim() ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      (c.excerpt ?? "").toLowerCase().includes(search.toLowerCase());
    return matchesSection && matchesSearch;
  });

  const featured    = filtered.find((c: any) => c.featured === "true") ?? filtered[0];
  const rest        = filtered.filter((c: any) => c !== featured);
  const editorPicks = filtered.filter((c: any) => c.type === "editorial").slice(0, 3);

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: "6px 14px", borderRadius: 20,
    fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
    fontFamily: "var(--font-mono)", cursor: "pointer", border: "1px solid",
    borderColor: active ? "var(--stn-moss)" : "var(--stn-border)",
    background:  active ? "rgba(117,139,89,0.15)" : "transparent",
    color: active ? "var(--stn-moss)" : "var(--stn-muted)",
    transition: "all 0.15s",
  });

  return (
    <StonerismLayout title="Journal | Stonerism">
      <StonerismHero eyebrow="Journal" headline="Stories, guides, interviews and editorials." minimal />

      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "56px 24px 0" }}>
        {/* Search */}
        <div style={{ marginBottom: 24 }}>
          <input
            type="search" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search stories…"
            style={{
              background: "var(--stn-forest)", border: "1px solid var(--stn-border)",
              color: "var(--stn-cream)", borderRadius: 6, padding: "12px 18px",
              fontSize: 13, outline: "none", width: "100%", maxWidth: 480,
            }}
          />
        </div>

        {/* Section filter */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 48 }}>
          {[["all","All"],["cannabis","Cannabis"],["places","Places"],["munchies","Munchies"],["wellness","Wellness"],["inner-life","Inner Life"],["events","Events"]].map(([v, l]) => (
            <button key={v} onClick={() => setSection(v)} style={chipStyle(section === v)}>{l}</button>
          ))}
        </div>

        {/* Featured */}
        {featured && !search && (
          <div style={{ marginBottom: 56 }}>
            <StonerismSectionHeader eyebrow="Featured" title="Editor's pick" />
            <ArticleCard article={{ slug: featured.slug, type: featured.type, title: featured.title, excerpt: featured.excerpt, heroImage: featured.heroImage, section: featured.section, readingTime: featured.readingTime }} large />
          </div>
        )}

        {/* Latest */}
        <StonerismSectionHeader eyebrow="Latest" title={search ? `Results for "${search}"` : "All stories"} />
        {filtered.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 24 }}>
            {(search ? filtered : rest).map((c: any) => (
              <ArticleCard key={c.id} article={{ slug: c.slug, type: c.type, title: c.title, excerpt: c.excerpt, heroImage: c.heroImage, section: c.section, readingTime: c.readingTime }} />
            ))}
          </div>
        ) : (
          <p style={{ color: "var(--stn-muted)", fontSize: 14, padding: "40px 0" }}>
            {content.length === 0 ? "Content coming soon." : "No results found."}
          </p>
        )}

        {/* Popular topics */}
        <div style={{ marginTop: 64, marginBottom: 48 }}>
          <StonerismSectionHeader eyebrow="Popular Topics" title="Browse by topic" />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {TOPICS.map(t => <CategoryChip key={t} label={t} section={t.toLowerCase().replace(/\s+/g,"-")} />)}
          </div>
        </div>

        {/* Editor's picks */}
        {editorPicks.length > 0 && (
          <div style={{ marginBottom: 80 }}>
            <StonerismSectionHeader eyebrow="Editor's Picks" title="Selected editorials" />
            <div style={{ display: "flex", flexDirection: "column" }}>
              {editorPicks.map((c: any) => (
                <ArticleCard key={c.id} article={{ slug: c.slug, type: c.type, title: c.title, excerpt: c.excerpt, section: c.section }} horizontal />
              ))}
            </div>
          </div>
        )}
      </section>
    </StonerismLayout>
  );
}
