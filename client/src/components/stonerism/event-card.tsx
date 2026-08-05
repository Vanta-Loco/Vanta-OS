// ─── Stonerism Event Card ─────────────────────────────────────────────────────
import { CategoryChip } from "./category-chip";
import { MediaPlaceholder } from "./media-placeholder";

export interface EventCardData {
  id?: string;
  slug: string;
  title: string;
  category?: string;
  description?: string;
  city?: string;
  venue?: string;
  startDate?: string;
  ageRestriction?: string;
  priceLabel?: string;
  host?: string;
  status?: string;
  ticketUrl?: string;
  heroImage?: string;
}

interface Props { event: EventCardData; }

const STATUS_STYLE: Record<string, { color: string; label: string }> = {
  concept:   { color: "var(--stn-orange)", label: "Concept" },
  scheduled: { color: "var(--stn-lime)",   label: "Scheduled" },
  cancelled: { color: "var(--stn-brown)",  label: "Cancelled" },
  completed: { color: "var(--stn-muted)",  label: "Completed" },
};

export function EventCard({ event }: Props) {
  const s = STATUS_STYLE[event.status ?? "concept"] ?? STATUS_STYLE.concept;

  return (
    <article style={{
      background: "var(--stn-forest)", border: "1px solid var(--stn-border)",
      borderRadius: 8, overflow: "hidden",
      display: "flex", flexDirection: "column",
    }}>
      {/* Image */}
      <div style={{ aspectRatio: "16/9", overflow: "hidden" }}>
        {event.heroImage
          ? <img src={event.heroImage} alt={event.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <MediaPlaceholder aspect="16/9" label={event.category} />
        }
      </div>

      <div style={{ padding: 20, flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          {event.category && <CategoryChip label={event.category.replace(/-/g, " ")} section="events" small />}
          <span style={{ fontSize: 9, fontWeight: 700, color: s.color, fontFamily: "var(--font-mono)", letterSpacing: "0.14em", textTransform: "uppercase" }}>
            {s.label}
          </span>
        </div>

        <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--stn-cream)", fontFamily: "var(--font-display)", lineHeight: 1.3 }}>
          {event.title}
        </h3>

        {event.description && (
          <p style={{ fontSize: 12, color: "var(--stn-muted)", lineHeight: 1.6, flex: 1 }}>
            {event.description}
          </p>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 4 }}>
          {event.city && (
            <span style={{ fontSize: 10, color: "var(--stn-muted)", fontFamily: "var(--font-mono)" }}>📍 {event.city}</span>
          )}
          {event.priceLabel && (
            <span style={{ fontSize: 10, color: "var(--stn-moss)", fontFamily: "var(--font-mono)" }}>{event.priceLabel}</span>
          )}
          {event.ageRestriction && (
            <span style={{ fontSize: 10, color: "var(--stn-muted)", fontFamily: "var(--font-mono)" }}>{event.ageRestriction}</span>
          )}
        </div>

        {event.ticketUrl && (
          <a
            href={event.ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{
              display: "inline-block", marginTop: 8,
              fontSize: 10, fontWeight: 700, letterSpacing: "0.14em",
              textTransform: "uppercase", color: "var(--stn-lime)",
              textDecoration: "none",
            }}
          >
            RSVP / Tickets →
          </a>
        )}
      </div>
    </article>
  );
}
