// ─── Stonerism Cannabis Page ──────────────────────────────────────────────────
import { useQuery } from "@tanstack/react-query";
import { StonerismLayout } from "@/components/stonerism/layout";
import { StonerismHero } from "@/components/stonerism/hero";
import { StonerismSectionHeader } from "@/components/stonerism/section-header";
import { ArticleCard } from "@/components/stonerism/article-card";
import { EditorialNotice } from "@/components/stonerism/editorial-notice";
import { CategoryChip } from "@/components/stonerism/category-chip";
import { MediaPlaceholder } from "@/components/stonerism/media-placeholder";

const SAMPLE_CARDS = [
  { slug: "understanding-terpenes",              title: "Understanding Terpenes",                    excerpt: "What terpenes are, why they matter and how they shape your experience.", type: "guide"    },
  { slug: "flower-pre-rolls-and-extracts",       title: "Flower, Pre-Rolls and Extracts",            excerpt: "A practical guide to South African product formats.",                   type: "guide"    },
  { slug: "responsible-cannabis-consumption",    title: "Responsible Consumption",                   excerpt: "Practical principles for safe, informed and enjoyable use.",             type: "guide"    },
  { slug: "south-african-landrace-genetics",     title: "South African Landrace Genetics",           excerpt: "The heritage strains that define South African cannabis culture.",        type: "article"  },
  { slug: "how-to-read-a-product-label",         title: "How to Read a Product Label",               excerpt: "Understanding what's on the package before you purchase.",               type: "guide"    },
  { slug: "combustion-vs-dry-herb-vaporisation", title: "Combustion vs Dry-Herb Vaporisation",       excerpt: "The key differences, harm reduction and what to consider.",              type: "guide"    },
];

const SECTIONS = [
  "Cannabis education", "Strain features", "Responsible use",
  "Grower stories", "Cannabis law and policy", "Product knowledge",
  "Cannabinoids and terpenes",
];

export default function CannabisPage() {
  const { data: content = [] } = useQuery<any[]>({
    queryKey: ["/api/stonerism/content", "cannabis"],
    queryFn: () => fetch("/api/stonerism/content?section=cannabis").then(r => r.json()),
  });

  return (
    <StonerismLayout title="Cannabis | Stonerism">
      <StonerismHero
        eyebrow="Cannabis"
        headline="Education, culture and responsible use."
        subheading="Strains, growers, product knowledge and informed consumption — without medical claims."
        minimal
      />

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "48px 24px 0" }}>
        <EditorialNotice text="Stonerism provides cultural and educational content. It does not provide medical advice or facilitate unlawful cannabis sales." variant="legal" />
      </div>

      {/* Sections navigation */}
      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "56px 24px 0" }}>
        <StonerismSectionHeader eyebrow="In This Section" title="Cannabis" />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 48 }}>
          {SECTIONS.map(s => <CategoryChip key={s} label={s} section="cannabis" />)}
        </div>
      </section>

      {/* Live content or sample cards */}
      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px 80px" }}>
        <StonerismSectionHeader
          eyebrow="Guides + Features"
          title="Cannabis knowledge"
          description="Educational content for informed, responsible engagement with cannabis."
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 24 }}>
          {content.length > 0
            ? content.map((c: any) => (
                <ArticleCard key={c.id} article={{ slug: c.slug, type: c.type, title: c.title, excerpt: c.excerpt, heroImage: c.heroImage, section: "cannabis", readingTime: c.readingTime }} />
              ))
            : SAMPLE_CARDS.map(c => (
                <ArticleCard key={c.slug} article={{ ...c, section: "cannabis" }} />
              ))
          }
        </div>
      </section>

      {/* Law and policy */}
      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px 80px" }}>
        <div style={{
          background: "var(--stn-panel)", border: "1px solid var(--stn-border)",
          borderRadius: 8, padding: "36px 32px",
        }}>
          <StonerismSectionHeader eyebrow="Important" title="Cannabis in South Africa" />
          <p style={{ fontSize: 14, color: "var(--stn-muted)", lineHeight: 1.8, maxWidth: 680 }}>
            Cannabis was partially decriminalised in South Africa following the Constitutional Court's ruling in September 2018. The Dagga Party and related judgments allow for private use and cultivation by adults. Licensing and commercial sales are regulated separately. Laws continue to evolve. Stonerism does not provide legal advice — always verify your rights and obligations in your specific jurisdiction.
          </p>
        </div>
      </section>
    </StonerismLayout>
  );
}
