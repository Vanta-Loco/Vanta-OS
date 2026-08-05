// ─── Stonerism Review Card ────────────────────────────────────────────────────
import { Link } from "wouter";
import { CategoryChip } from "./category-chip";
import { RatingBadge } from "./rating-badge";
import { MediaPlaceholder } from "./media-placeholder";

export interface ReviewCardData {
  id: string;
  contentSlug?: string;
  entitySlug?: string;
  reviewType: string;
  overallScore?: number | null;
  summary?: string;
  entityName?: string;
  entityHeroImage?: string;
  disclosure?: string;
}

interface Props { review: ReviewCardData; }

export function ReviewCard({ review }: Props) {
  const href = review.contentSlug
    ? `/stonerism/review/${review.contentSlug}`
    : `/stonerism/review/${review.id}`;

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
        <div style={{ aspectRatio: "3/2", overflow: "hidden" }}>
          {review.entityHeroImage
            ? <img src={review.entityHeroImage} alt={review.entityName ?? "Review"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <MediaPlaceholder aspect="3/2" label="Review" />
          }
        </div>

        <div style={{ padding: 20, flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <CategoryChip label={review.reviewType.replace(/-/g, " ")} section="journal" small />
              <h3 style={{
                fontSize: 15, fontWeight: 700, color: "var(--stn-cream)",
                fontFamily: "var(--font-display)", lineHeight: 1.3, marginTop: 8,
              }}>
                {review.entityName ?? "Review"}
              </h3>
            </div>
            <RatingBadge score={review.overallScore} max={10} size="md" />
          </div>

          {review.summary && (
            <p style={{ fontSize: 12, color: "var(--stn-muted)", lineHeight: 1.6, flex: 1 }}>
              {review.summary.slice(0, 120)}{review.summary.length > 120 ? "…" : ""}
            </p>
          )}

          {review.disclosure && (
            <p style={{ fontSize: 10, color: "var(--stn-muted)", fontStyle: "italic", opacity: 0.6 }}>
              {review.disclosure}
            </p>
          )}
        </div>
      </article>
    </Link>
  );
}
