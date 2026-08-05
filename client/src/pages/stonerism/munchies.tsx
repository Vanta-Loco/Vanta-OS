// ─── Stonerism Munchies Page ──────────────────────────────────────────────────
import { useQuery } from "@tanstack/react-query";
import { StonerismLayout } from "@/components/stonerism/layout";
import { StonerismHero } from "@/components/stonerism/hero";
import { StonerismSectionHeader } from "@/components/stonerism/section-header";
import { ArticleCard } from "@/components/stonerism/article-card";
import { CategoryChip } from "@/components/stonerism/category-chip";

const FOOD_CATEGORIES = [
  "Burgers", "Pizza", "Chicken", "Kota", "Braai",
  "Desserts", "Coffee", "Breakfast", "Healthy eats", "Late-night", "Recipes",
];

const SAMPLE_ARTICLES = [
  { slug: "best-late-night-food-jozi",     title: "Best Late-Night Food in Jozi",              excerpt: "The spots worth staying up for across Johannesburg.",          type: "article" },
  { slug: "search-for-perfect-smash-burger", title: "The Search for the Perfect Smash Burger", excerpt: "We tried them all so you don't have to.",                      type: "review"  },
  { slug: "desserts-worth-crossing-town",  title: "Desserts Worth Crossing Town For",           excerpt: "The sweet spots that justify the drive.",                     type: "article" },
  { slug: "healthy-munchies-that-still-hit", title: "Healthy Munchies That Still Hit",          excerpt: "Nutritious options that don't compromise on satisfaction.",   type: "guide"   },
  { slug: "coffee-shops-for-slow-mornings", title: "Coffee Shops Made for Slow Mornings",      excerpt: "Spaces built for lingering — great coffee, great atmosphere.", type: "article" },
];

const SCORECARD_CATEGORIES = [
  "Taste", "Portion", "Value", "Atmosphere", "Late-night factor", "Munchie satisfaction",
];

export default function MunchiesPage() {
  const { data: content = [] } = useQuery<any[]>({
    queryKey: ["/api/stonerism/content", "munchies"],
    queryFn: () => fetch("/api/stonerism/content?section=munchies").then(r => r.json()),
  });

  return (
    <StonerismLayout title="Munchies | Stonerism">
      <StonerismHero
        eyebrow="Munchies"
        headline="Food worth leaving the couch for."
        subheading="Restaurants, cafés, desserts, late-night discoveries and recipes."
        minimal
      />

      {/* Food categories */}
      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "56px 24px 0" }}>
        <StonerismSectionHeader eyebrow="Browse" title="Food categories" />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 56 }}>
          {FOOD_CATEGORIES.map(c => <CategoryChip key={c} label={c} section="munchies" />)}
        </div>
      </section>

      {/* Scorecard explainer */}
      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px 0" }}>
        <div style={{
          background: "var(--stn-panel)", border: "1px solid var(--stn-border)",
          borderRadius: 8, padding: "32px",
        }}>
          <StonerismSectionHeader eyebrow="How We Score" title="Munchie scorecard" description="Every food review uses the same consistent scoring categories." />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {SCORECARD_CATEGORIES.map(c => (
              <div key={c} style={{
                background: "var(--stn-forest)", border: "1px solid var(--stn-border)",
                borderRadius: 4, padding: "10px 16px",
                fontSize: 11, color: "var(--stn-cream)", fontFamily: "var(--font-mono)", letterSpacing: "0.08em",
              }}>
                {c}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Articles */}
      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "56px 24px 80px" }}>
        <StonerismSectionHeader eyebrow="Food Stories" title="Latest from Munchies" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 24 }}>
          {(content.length > 0 ? content : SAMPLE_ARTICLES).map((c: any) => (
            <ArticleCard key={c.slug} article={{ slug: c.slug, type: c.type, title: c.title, excerpt: c.excerpt, heroImage: c.heroImage, section: "munchies" }} />
          ))}
        </div>
      </section>
    </StonerismLayout>
  );
}
