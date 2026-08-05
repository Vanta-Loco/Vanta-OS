// ─── Stonerism Article Detail Page ───────────────────────────────────────────
import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { StonerismLayout } from "@/components/stonerism/layout";
import { CategoryChip } from "@/components/stonerism/category-chip";
import { EditorialNotice } from "@/components/stonerism/editorial-notice";
import { MediaPlaceholder } from "@/components/stonerism/media-placeholder";
import { ArticleCard } from "@/components/stonerism/article-card";

function safeMarkdown(body: string): string {
  // Very simple safe Markdown renderer: paragraphs, bold, italic, headings, code
  // No raw HTML is ever inserted — only escaped text nodes are placed
  return body; // rendered below via structured approach
}

function MarkdownBody({ body }: { body: string }) {
  // Safe rendering: split into paragraphs, handle basic formatting
  const lines = body.split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { elements.push(<br key={key++} />); continue; }
    if (trimmed.startsWith("## ")) {
      elements.push(<h2 key={key++} style={{ fontSize: 22, fontWeight: 700, color: "var(--stn-cream)", fontFamily: "var(--font-display)", margin: "32px 0 12px" }}>{trimmed.slice(3)}</h2>);
    } else if (trimmed.startsWith("### ")) {
      elements.push(<h3 key={key++} style={{ fontSize: 17, fontWeight: 700, color: "var(--stn-cream)", fontFamily: "var(--font-display)", margin: "24px 0 8px" }}>{trimmed.slice(4)}</h3>);
    } else if (trimmed.startsWith("> ")) {
      elements.push(
        <blockquote key={key++} style={{ borderLeft: "3px solid var(--stn-moss)", marginLeft: 0, paddingLeft: 20, color: "var(--stn-muted)", fontStyle: "italic", fontSize: 16 }}>
          {trimmed.slice(2)}
        </blockquote>
      );
    } else {
      elements.push(<p key={key++} style={{ fontSize: 15, color: "var(--stn-muted)", lineHeight: 1.85, marginBottom: 16 }}>{trimmed}</p>);
    }
  }
  return <>{elements}</>;
}

export default function ArticlePage() {
  const [, params] = useRoute("/stonerism/article/:slug");
  const slug = params?.slug ?? "";

  const { data: article, isLoading, isError } = useQuery<any>({
    queryKey: ["/api/stonerism/content", slug],
    queryFn: () => fetch(`/api/stonerism/articles/${slug}`).then(r => {
      if (!r.ok) throw new Error("Not found");
      return r.json();
    }),
    enabled: !!slug,
  });

  const { data: related = [] } = useQuery<any[]>({
    queryKey: ["/api/stonerism/content", article?.section],
    queryFn: () => fetch(`/api/stonerism/content?section=${article?.section}`).then(r => r.json()),
    enabled: !!article?.section,
  });

  if (isLoading) {
    return (
      <StonerismLayout>
        <div style={{ maxWidth: 800, margin: "80px auto", padding: "0 24px", textAlign: "center" }}>
          <p style={{ color: "var(--stn-muted)", fontSize: 14 }}>Loading…</p>
        </div>
      </StonerismLayout>
    );
  }

  if (isError || !article) {
    return (
      <StonerismLayout title="Not Found | Stonerism">
        <div style={{ maxWidth: 800, margin: "80px auto", padding: "0 24px", textAlign: "center" }}>
          <p style={{ color: "var(--stn-muted)", fontSize: 14 }}>Article not found or not yet published.</p>
          <Link href="/stonerism/journal">
            <span style={{ color: "var(--stn-moss)", cursor: "pointer", fontSize: 13 }}>← Back to Journal</span>
          </Link>
        </div>
      </StonerismLayout>
    );
  }

  const relatedExcluding = related.filter((r: any) => r.slug !== slug).slice(0, 3);

  return (
    <StonerismLayout title={`${article.seoTitle || article.title} | Stonerism`}>
      {/* Hero */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "56px 24px 0" }}>
        {/* Breadcrumb */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 24, flexWrap: "wrap" }}>
          <Link href="/stonerism"><span style={{ fontSize: 11, color: "var(--stn-muted)", cursor: "pointer" }}>Stonerism</span></Link>
          <span style={{ fontSize: 11, color: "var(--stn-border)" }}>/</span>
          {article.section && <Link href={`/stonerism/${article.section}`}><span style={{ fontSize: 11, color: "var(--stn-muted)", cursor: "pointer", textTransform: "capitalize" }}>{article.section.replace(/-/g, " ")}</span></Link>}
          <span style={{ fontSize: 11, color: "var(--stn-border)" }}>/</span>
          <span style={{ fontSize: 11, color: "var(--stn-muted)" }}>{article.title.slice(0, 40)}{article.title.length > 40 ? "…" : ""}</span>
        </div>

        {/* Type + section */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {article.type && <CategoryChip label={article.type} section={article.section} />}
          {article.evidenceLevel && <CategoryChip label={article.evidenceLevel.replace(/-/g, " ")} section="wellness" small />}
        </div>

        <h1 style={{
          fontSize: "clamp(26px,4vw,42px)", fontWeight: 800, color: "var(--stn-cream)",
          fontFamily: "var(--font-display)", lineHeight: 1.15, marginBottom: article.subtitle ? 16 : 28,
          letterSpacing: "-0.01em",
        }}>
          {article.title}
        </h1>

        {article.subtitle && (
          <p style={{ fontSize: 18, color: "var(--stn-muted)", lineHeight: 1.6, marginBottom: 28 }}>
            {article.subtitle}
          </p>
        )}

        {/* Meta row */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 20, marginBottom: 40, paddingBottom: 24, borderBottom: "1px solid var(--stn-border)" }}>
          {article.readingTime && <span style={{ fontSize: 11, color: "var(--stn-moss)", fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>{article.readingTime}</span>}
          {article.publishedAt && <span style={{ fontSize: 11, color: "var(--stn-muted)", fontFamily: "var(--font-mono)" }}>{new Date(article.publishedAt).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}</span>}
          {article.reviewerId && <span style={{ fontSize: 11, color: "var(--stn-muted)", fontFamily: "var(--font-mono)" }}>Reviewed by: {article.reviewerId}</span>}
        </div>
      </div>

      {/* Hero image */}
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 24px 40px" }}>
        {article.heroImage
          ? <img src={article.heroImage} alt={article.title} style={{ width: "100%", borderRadius: 8, aspectRatio: "16/9", objectFit: "cover" }} />
          : <MediaPlaceholder aspect="16/9" label="Hero image" />
        }
      </div>

      {/* Body */}
      <article style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px" }}>
        {/* Pull quotes */}
        {article.pullQuotes?.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            {article.pullQuotes.map((q: string, i: number) => (
              <blockquote key={i} style={{
                fontSize: 20, fontStyle: "italic", color: "var(--stn-cream)",
                borderLeft: "3px solid var(--stn-moss)", paddingLeft: 24, margin: "24px 0",
                lineHeight: 1.5,
              }}>
                "{q}"
              </blockquote>
            ))}
          </div>
        )}

        {/* Body text */}
        {article.body && <MarkdownBody body={article.body} />}

        {/* Sources */}
        {article.sources?.length > 0 && (
          <div style={{ marginTop: 40, paddingTop: 24, borderTop: "1px solid var(--stn-border)" }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "var(--stn-moss)", textTransform: "uppercase", fontFamily: "var(--font-mono)", marginBottom: 12 }}>Sources</p>
            {article.sources.map((s: string, i: number) => (
              <p key={i} style={{ fontSize: 12, color: "var(--stn-muted)", marginBottom: 6 }}>{s}</p>
            ))}
          </div>
        )}

        {/* Disclosures */}
        {article.disclosure && (
          <div style={{ marginTop: 32 }}>
            <EditorialNotice text={article.disclosure} variant="info" />
          </div>
        )}

        {/* Tags */}
        {article.tags?.length > 0 && (
          <div style={{ marginTop: 32, display: "flex", flexWrap: "wrap", gap: 8 }}>
            {article.tags.map((t: string) => <CategoryChip key={t} label={t} section={article.section} small />)}
          </div>
        )}
      </article>

      {/* Related stories */}
      {relatedExcluding.length > 0 && (
        <section style={{ maxWidth: 1280, margin: "64px auto 0", padding: "0 24px 80px" }}>
          <div style={{ borderTop: "1px solid var(--stn-border)", paddingTop: 40, marginBottom: 32 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--stn-moss)", fontFamily: "var(--font-mono)", marginBottom: 4 }}>Related Stories</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 24 }}>
            {relatedExcluding.map((r: any) => (
              <ArticleCard key={r.id} article={{ slug: r.slug, type: r.type, title: r.title, excerpt: r.excerpt, heroImage: r.heroImage, section: r.section }} />
            ))}
          </div>
        </section>
      )}
    </StonerismLayout>
  );
}
