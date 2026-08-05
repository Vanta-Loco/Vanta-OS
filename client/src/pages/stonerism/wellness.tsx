// ─── Stonerism Wellness Page ──────────────────────────────────────────────────
import { useQuery } from "@tanstack/react-query";
import { StonerismLayout } from "@/components/stonerism/layout";
import { StonerismHero } from "@/components/stonerism/hero";
import { StonerismSectionHeader } from "@/components/stonerism/section-header";
import { ArticleCard } from "@/components/stonerism/article-card";
import { CategoryChip } from "@/components/stonerism/category-chip";
import { EditorialNotice } from "@/components/stonerism/editorial-notice";

const WELLNESS_SECTIONS = [
  "Movement", "Sleep", "Nutrition", "Recovery", "Breathwork",
  "Yoga", "Hiking", "Cold plunges", "Saunas", "Meditation",
  "General health", "Doctor-supported wellness", "Supplement reviews", "Equipment reviews",
];

const EVIDENCE_LABELS = [
  { label: "Editorial",          color: "var(--stn-muted)",   desc: "Editorial team opinion and research." },
  { label: "Expert Reviewed",    color: "var(--stn-moss)",    desc: "Reviewed by a relevant subject expert." },
  { label: "Doctor Reviewed",    color: "var(--stn-lime)",    desc: "Reviewed by a qualified medical professional." },
  { label: "Sponsored",          color: "var(--stn-orange)",  desc: "Commercial relationship with sponsor disclosed." },
  { label: "Product Supplied",   color: "var(--stn-brown)",   desc: "Product provided for review at no charge." },
  { label: "Affiliate",          color: "var(--stn-muted)",   desc: "May earn commission on linked purchases." },
];

const SAMPLE_ARTICLES = [
  { slug: "beginner-yoga-for-stiff-bodies",     title: "Beginner Yoga for Stiff Bodies",         excerpt: "A gentle, practical starting point for total beginners.",                  type: "guide", evidenceLevel: "editorial" },
  { slug: "walking-as-a-daily-reset",           title: "Walking as a Daily Reset",               excerpt: "Why a daily walk might be the simplest health intervention available.",   type: "guide" },
  { slug: "building-a-better-sleep-routine",    title: "Building a Better Sleep Routine",        excerpt: "Practical adjustments for deeper, more consistent sleep.",                 type: "guide" },
  { slug: "hydration-and-recovery",             title: "Hydration and Recovery",                 excerpt: "What the research actually says about water intake and exercise.",         type: "guide" },
  { slug: "understanding-supplement-labels",    title: "Understanding Supplement Labels",        excerpt: "How to read claims and identify quality markers.",                         type: "guide" },
  { slug: "when-to-speak-to-a-healthcare-professional", title: "When to Speak to a Healthcare Professional", excerpt: "Signs that warrant medical consultation rather than self-management.", type: "guide" },
  { slug: "smoking-lungs-and-harm-reduction",   title: "Smoking, Lungs and Harm Reduction",     excerpt: "Practical harm reduction strategies — without unsupported claims.",         type: "guide", evidenceLevel: "editorial" },
];

export default function WellnessPage() {
  const { data: content = [] } = useQuery<any[]>({
    queryKey: ["/api/stonerism/content", "wellness"],
    queryFn: () => fetch("/api/stonerism/content?section=wellness").then(r => r.json()),
  });

  return (
    <StonerismLayout title="Wellness | Stonerism">
      <StonerismHero
        eyebrow="Wellness"
        headline="Take care of the body carrying you."
        subheading="Movement, sleep, nutrition, recovery and general health — without unsupported claims."
        minimal
      />

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 24px 0" }}>
        <EditorialNotice text="Wellness content is editorial. It does not constitute medical advice. Consult a qualified healthcare professional before making health decisions. Supplement and product reviews include evidence levels and disclosures." variant="health" />
      </div>

      {/* Evidence levels legend */}
      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "56px 24px 0" }}>
        <StonerismSectionHeader eyebrow="Transparency" title="Content labels" description="Every wellness piece carries a label indicating its evidence basis." />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 56 }}>
          {EVIDENCE_LABELS.map(({ label, color, desc }) => (
            <div key={label} style={{
              background: "var(--stn-forest)", border: `1px solid ${color}30`,
              borderRadius: 6, padding: "16px",
            }}>
              <span style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>{label}</span>
              <p style={{ fontSize: 11, color: "var(--stn-muted)", marginTop: 6, lineHeight: 1.5 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sections */}
      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px 0" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 56 }}>
          {WELLNESS_SECTIONS.map(s => <CategoryChip key={s} label={s} section="wellness" />)}
        </div>
      </section>

      {/* Articles */}
      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px 80px" }}>
        <StonerismSectionHeader eyebrow="Wellness" title="Guides and topics" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 24 }}>
          {(content.length > 0 ? content : SAMPLE_ARTICLES).map((c: any) => (
            <ArticleCard key={c.slug} article={{ slug: c.slug, type: c.type, title: c.title, excerpt: c.excerpt, heroImage: c.heroImage, section: "wellness" }} />
          ))}
        </div>
      </section>
    </StonerismLayout>
  );
}
