// ─── Stonerism Review Detail Page ────────────────────────────────────────────
import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { StonerismLayout } from "@/components/stonerism/layout";
import { CategoryChip } from "@/components/stonerism/category-chip";
import { RatingBadge } from "@/components/stonerism/rating-badge";
import { ScoreDisplay } from "@/components/stonerism/score-display";
import { EditorialNotice } from "@/components/stonerism/editorial-notice";
import { MediaPlaceholder } from "@/components/stonerism/media-placeholder";

export default function ReviewPage() {
  const [, params] = useRoute("/stonerism/review/:slug");
  const slug = params?.slug ?? "";

  const { data: review, isLoading, isError } = useQuery<any>({
    queryKey: ["/api/stonerism/reviews", slug],
    queryFn: () => fetch(`/api/stonerism/reviews/${slug}`).then(r => {
      if (!r.ok) throw new Error("Not found");
      return r.json();
    }),
    enabled: !!slug,
  });

  if (isLoading) {
    return <StonerismLayout><div style={{ padding: "120px 24px", textAlign: "center" }}><p style={{ color: "var(--stn-muted)" }}>Loading…</p></div></StonerismLayout>;
  }

  if (isError || !review) {
    return (
      <StonerismLayout title="Review Not Found | Stonerism">
        <div style={{ maxWidth: 720, margin: "80px auto", padding: "0 24px", textAlign: "center" }}>
          <p style={{ color: "var(--stn-muted)", fontSize: 14, marginBottom: 16 }}>Review not found or not yet published.</p>
          <Link href="/stonerism/journal"><span style={{ color: "var(--stn-moss)", cursor: "pointer", fontSize: 13 }}>← Back to Journal</span></Link>
        </div>
      </StonerismLayout>
    );
  }

  const scores: { category: string; score?: number | null; notes?: string }[] = review.scores ?? [];

  return (
    <StonerismLayout title={`${review.entityName ?? "Review"} | Stonerism`}>
      {/* Header */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "56px 24px 0" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          <Link href="/stonerism/journal"><span style={{ fontSize: 11, color: "var(--stn-muted)", cursor: "pointer" }}>Journal</span></Link>
          <span style={{ fontSize: 11, color: "var(--stn-border)" }}>/</span>
          <span style={{ fontSize: 11, color: "var(--stn-muted)" }}>Review</span>
        </div>

        <CategoryChip label={`${review.reviewType?.replace(/-/g, " ")} review`} section="journal" />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, marginTop: 20, flexWrap: "wrap" }}>
          <h1 style={{
            fontSize: "clamp(24px,3.5vw,38px)", fontWeight: 800, color: "var(--stn-cream)",
            fontFamily: "var(--font-display)", lineHeight: 1.15, flex: 1,
          }}>
            {review.entityName ?? "Review"}
          </h1>
          <RatingBadge score={review.overallScore} max={10} label="Overall" size="lg" />
        </div>

        {review.reviewDate && (
          <p style={{ fontSize: 11, color: "var(--stn-muted)", fontFamily: "var(--font-mono)", marginTop: 12, marginBottom: 32 }}>
            Reviewed: {review.reviewDate}
          </p>
        )}
      </div>

      {/* Hero */}
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 24px 40px" }}>
        <MediaPlaceholder aspect="16/9" label="Review media" />
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px" }}>
        {/* Score breakdown */}
        {scores.length > 0 && (
          <div style={{ marginBottom: 40 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--stn-moss)", fontFamily: "var(--font-mono)", marginBottom: 20 }}>Score Breakdown</p>
            <ScoreDisplay scores={scores} overall={review.overallScore} />
          </div>
        )}

        {/* Not yet reviewed */}
        {!review.overallScore && (
          <div style={{
            background: "var(--stn-panel)", border: "1px solid var(--stn-border)",
            borderRadius: 6, padding: "20px 24px", marginBottom: 32,
          }}>
            <p style={{ fontSize: 12, color: "var(--stn-muted)" }}>
              This business has not yet been reviewed. Scores will be added after a verified visit.
            </p>
          </div>
        )}

        {/* Summary */}
        {review.summary && (
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--stn-moss)", fontFamily: "var(--font-mono)", marginBottom: 12 }}>Summary</p>
            <p style={{ fontSize: 15, color: "var(--stn-muted)", lineHeight: 1.8 }}>{review.summary}</p>
          </div>
        )}

        {/* What worked */}
        {review.whatWorked && (
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--stn-lime)", fontFamily: "var(--font-mono)", marginBottom: 8 }}>What Worked</p>
            <p style={{ fontSize: 14, color: "var(--stn-muted)", lineHeight: 1.7 }}>{review.whatWorked}</p>
          </div>
        )}

        {/* What could improve */}
        {review.whatCouldImprove && (
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--stn-orange)", fontFamily: "var(--font-mono)", marginBottom: 8 }}>What Could Improve</p>
            <p style={{ fontSize: 14, color: "var(--stn-muted)", lineHeight: 1.7 }}>{review.whatCouldImprove}</p>
          </div>
        )}

        {/* Who it is for */}
        {review.whoItIsFor && (
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--stn-muted)", fontFamily: "var(--font-mono)", marginBottom: 8 }}>Who It's For</p>
            <p style={{ fontSize: 14, color: "var(--stn-muted)", lineHeight: 1.7 }}>{review.whoItIsFor}</p>
          </div>
        )}

        {/* Price notes */}
        {review.priceNotes && (
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--stn-muted)", fontFamily: "var(--font-mono)", marginBottom: 8 }}>Price / Value</p>
            <p style={{ fontSize: 14, color: "var(--stn-muted)", lineHeight: 1.7 }}>{review.priceNotes}</p>
          </div>
        )}

        {/* Disclosures */}
        {review.disclosure && (
          <div style={{ marginBottom: 40 }}>
            <EditorialNotice text={review.disclosure} variant="info" />
          </div>
        )}
      </div>
    </StonerismLayout>
  );
}
