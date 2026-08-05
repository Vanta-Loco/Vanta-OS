// ─── Stonerism Inner Life Page ────────────────────────────────────────────────
import { useQuery } from "@tanstack/react-query";
import { StonerismLayout } from "@/components/stonerism/layout";
import { StonerismHero } from "@/components/stonerism/hero";
import { StonerismSectionHeader } from "@/components/stonerism/section-header";
import { ArticleCard } from "@/components/stonerism/article-card";
import { CategoryChip } from "@/components/stonerism/category-chip";
import { EditorialNotice } from "@/components/stonerism/editorial-notice";

const INNER_SECTIONS = [
  "Philosophy", "Meditation", "Journaling", "Psychology", "Astrology", "Zodiac",
  "Dreams", "African thought", "Buddhism", "Taoism", "Stoicism",
  "Existentialism", "Spiritual traditions", "Creativity",
];

const CONTENT_TYPES = [
  { label: "Evidence-based",    desc: "Draws on peer-reviewed research or established psychological frameworks.",    color: "var(--stn-lime)"   },
  { label: "Philosophical",     desc: "Interpretation and analysis of philosophical ideas — not scientific claim.",  color: "var(--stn-moss)"   },
  { label: "Spiritual",         desc: "Reflects a belief system or spiritual tradition.",                            color: "var(--stn-brown)"  },
  { label: "Astrological",      desc: "Astrological reflection — entertainment and personal exploration, not fact.", color: "var(--stn-orange)" },
];

const SAMPLE_ARTICLES = [
  { slug: "beginners-guide-to-stoicism",      title: "A Beginner's Guide to Stoicism",             excerpt: "The core ideas of Stoic philosophy and why they're still relevant.",     type: "guide"   },
  { slug: "what-taoism-says-about-forcing",   title: "What Taoism Says About Forcing Life",         excerpt: "On wu wei, flow and the wisdom of non-resistance.",                    type: "article" },
  { slug: "journaling-through-change",        title: "Journaling Through Change",                   excerpt: "Practical approaches to reflective writing during transition.",          type: "guide"   },
  { slug: "the-zodiac-as-a-tool-for-reflection", title: "The Zodiac as a Tool for Reflection",     excerpt: "Using astrology not as prophecy, but as a mirror.",                    type: "article" },
  { slug: "dream-journals-and-personal-symbolism", title: "Dream Journals and Personal Symbolism", excerpt: "How recording dreams can surface patterns in your inner life.",          type: "guide"   },
  { slug: "rest-as-resistance",               title: "Rest as Resistance",                           excerpt: "On the radical act of slowing down in a culture of productivity.",     type: "editorial" },
  { slug: "african-philosophies-of-community", title: "African Philosophies of Community",          excerpt: "Ubuntu and other African thought traditions on belonging and care.",   type: "article" },
];

export default function InnerLifePage() {
  const { data: content = [] } = useQuery<any[]>({
    queryKey: ["/api/stonerism/content", "inner-life"],
    queryFn: () => fetch("/api/stonerism/content?section=inner-life").then(r => r.json()),
  });

  return (
    <StonerismLayout title="Inner Life | Stonerism">
      <StonerismHero
        eyebrow="Inner Life"
        headline="Philosophy, mindfulness, spirituality and the inner world."
        subheading="Exploring how to think, feel, and be — without favouring any single belief system."
        minimal
      />

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 24px 0" }}>
        <EditorialNotice
          text="Inner Life content covers philosophy, spiritual traditions, astrology and psychology. Stonerism distinguishes between evidence-based content, philosophical interpretation, spiritual belief and astrological reflection. None of this is presented as scientific fact unless explicitly marked."
          variant="info"
        />
      </div>

      {/* Content type labels */}
      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "56px 24px 0" }}>
        <StonerismSectionHeader eyebrow="Transparency" title="How content is labelled" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 48 }}>
          {CONTENT_TYPES.map(({ label, desc, color }) => (
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

      {/* Topics */}
      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px 0" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 56 }}>
          {INNER_SECTIONS.map(s => <CategoryChip key={s} label={s} section="inner-life" />)}
        </div>
      </section>

      {/* Articles */}
      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px 80px" }}>
        <StonerismSectionHeader eyebrow="Inner Life" title="Perspectives and reflections" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 24 }}>
          {(content.length > 0 ? content : SAMPLE_ARTICLES).map((c: any) => (
            <ArticleCard key={c.slug} article={{ slug: c.slug, type: c.type, title: c.title, excerpt: c.excerpt, heroImage: c.heroImage, section: "inner-life" }} />
          ))}
        </div>
      </section>
    </StonerismLayout>
  );
}
