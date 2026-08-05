// ─── Stonerism Article Card ───────────────────────────────────────────────────
import { Link } from "wouter";
import { CategoryChip } from "./category-chip";
import { MediaPlaceholder } from "./media-placeholder";

export interface ArticleCardData {
  slug: string;
  type?: string;
  title: string;
  excerpt?: string;
  heroImage?: string;
  section?: string;
  readingTime?: string;
  publishedAt?: string | null;
  featured?: string;
  seriesTitle?: string;
}

interface Props {
  article: ArticleCardData;
  large?: boolean;
  horizontal?: boolean;
}

export function ArticleCard({ article, large, horizontal }: Props) {
  const href = `/stonerism/article/${article.slug}`;
  const label = article.type ? article.type.replace(/-/g, " ") : "Article";

  if (horizontal) {
    return (
      <Link href={href}>
        <div style={{
          display: "flex", gap: 16, cursor: "pointer",
          padding: "16px 0", borderBottom: "1px solid var(--stn-border)",
        }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = "0.8"}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = "1"}
        >
          <div style={{ width: 80, flexShrink: 0, borderRadius: 4, overflow: "hidden" }}>
            {article.heroImage
              ? <img src={article.heroImage} alt={article.title} style={{ width: "100%", aspectRatio: "1", objectFit: "cover" }} />
              : <MediaPlaceholder aspect="1" height={80} />
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <CategoryChip label={label} section={article.section} small />
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--stn-cream)", lineHeight: 1.4, marginTop: 4 }}>
              {article.title}
            </p>
            {article.readingTime && (
              <p style={{ fontSize: 10, color: "var(--stn-muted)", marginTop: 4, fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>
                {article.readingTime}
              </p>
            )}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={href}>
      <article style={{
        background: "var(--stn-forest)", border: "1px solid var(--stn-border)",
        borderRadius: 8, overflow: "hidden", cursor: "pointer",
        transition: "border-color 0.2s",
        display: "flex", flexDirection: "column",
      }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--stn-moss)"}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--stn-border)"}
      >
        {/* Image */}
        <div style={{ aspectRatio: large ? "16/9" : "3/2", overflow: "hidden" }}>
          {article.heroImage
            ? <img src={article.heroImage} alt={article.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <MediaPlaceholder aspect={large ? "16/9" : "3/2"} label={label} />
          }
        </div>

        {/* Body */}
        <div style={{ padding: large ? 28 : 20, flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <CategoryChip label={label} section={article.section} small />
            {article.seriesTitle && (
              <CategoryChip label={article.seriesTitle} variant="series" small />
            )}
          </div>
          <h3 style={{
            fontSize: large ? 22 : 15, fontWeight: 700, lineHeight: 1.3,
            fontFamily: "var(--font-display)", color: "var(--stn-cream)",
          }}>
            {article.title}
          </h3>
          {article.excerpt && (
            <p style={{ fontSize: 13, color: "var(--stn-muted)", lineHeight: 1.6, flex: 1 }}>
              {article.excerpt}
            </p>
          )}
          {(article.readingTime || article.publishedAt) && (
            <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
              {article.readingTime && (
                <span style={{ fontSize: 10, color: "var(--stn-moss)", fontFamily: "var(--font-mono)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  {article.readingTime}
                </span>
              )}
            </div>
          )}
        </div>
      </article>
    </Link>
  );
}
