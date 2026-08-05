// ─── Stonerism Homepage ───────────────────────────────────────────────────────
import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { StonerismLayout } from "@/components/stonerism/layout";
import { StonerismHero } from "@/components/stonerism/hero";
import { StonerismSectionHeader } from "@/components/stonerism/section-header";
import { ArticleCard } from "@/components/stonerism/article-card";
import { EventCard } from "@/components/stonerism/event-card";
import { CategoryChip } from "@/components/stonerism/category-chip";
import { EditorialNotice } from "@/components/stonerism/editorial-notice";
import { MediaPlaceholder } from "@/components/stonerism/media-placeholder";

const btn = (primary = true): React.CSSProperties => ({
  display: "inline-block",
  background: primary ? "var(--stn-moss)" : "transparent",
  color: primary ? "var(--stn-bg)" : "var(--stn-moss)",
  fontSize: 11, fontWeight: 700, letterSpacing: "0.14em",
  textTransform: "uppercase" as const, padding: "12px 24px",
  borderRadius: 4, border: primary ? "none" : "1px solid rgba(117,139,89,0.5)",
  cursor: "pointer", textDecoration: "none", fontFamily: "var(--font-mono)",
});

const CATEGORY_GRID = [
  { href: "/stonerism/cannabis",   label: "Cannabis",   desc: "Strains, education, growers and responsible use.",        section: "cannabis"  },
  { href: "/stonerism/places",     label: "Places",     desc: "Dispensaries, clubs, smoke shops and friendly spaces.",   section: "places"    },
  { href: "/stonerism/munchies",   label: "Munchies",   desc: "Restaurants, cafés, desserts and late-night food.",       section: "munchies"  },
  { href: "/stonerism/wellness",   label: "Wellness",   desc: "Mind, body, movement, recovery and general health.",      section: "wellness"  },
  { href: "/stonerism/inner-life", label: "Inner Life", desc: "Philosophy, meditation, astrology and spiritual exploration.", section: "inner-life" },
  { href: "/stonerism/events",     label: "Events",     desc: "Yoga mornings, hikes, markets, live music and more.",     section: "events"    },
];

const ORIGINAL_SERIES = [
  { title: "Behind The Brand",    desc: "Founder stories and production access.",                      section: "brands"    },
  { title: "Stoner Girls Review", desc: "Personality-led product, place and food reviews.",            section: "journal"   },
  { title: "From Grow To Store",  desc: "Cultivation and retail documentaries.",                       section: "places"    },
  { title: "Munchie Run",         desc: "Food discoveries after a cannabis feature.",                  section: "munchies"  },
  { title: "The Green Guide",     desc: "Evidence-aware wellness products and health equipment.",      section: "wellness"  },
  { title: "Community Spotlight", desc: "Real people, real community.",                               section: "community" },
];

const COMMUNITY_EVENTS = [
  "Yoga mornings", "Hiking meetups", "Beach cleanups", "Community markets",
  "Live music sessions", "Food festivals", "Grow workshops", "Art exhibitions",
  "Wellness retreats",
];

export default function StonerismHome() {
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [consent, setConsent] = useState(false);
  const [subMsg, setSubMsg] = useState("");

  const { data: content = [] } = useQuery<any[]>({
    queryKey: ["/api/stonerism/content"],
    queryFn: () => fetch("/api/stonerism/content").then(r => r.json()),
  });

  const { data: events = [] } = useQuery<any[]>({
    queryKey: ["/api/stonerism/events"],
    queryFn: () => fetch("/api/stonerism/events").then(r => r.json()),
  });

  const subscribe = useMutation({
    mutationFn: (data: { email: string; city: string; consent: boolean }) =>
      fetch("/api/stonerism/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(r => r.json()),
    onSuccess: (data) => {
      if (data.error === "Already subscribed") { setSubMsg("You're already subscribed."); return; }
      if (data.success) { setSubMsg("You're in. Welcome to the circle."); setEmail(""); setCity(""); setConsent(false); }
    },
    onError: () => setSubMsg("Something went wrong. Please try again."),
  });

  const latestContent = content.slice(0, 6);
  const featuredStank = content.find(c => c.disclosure?.includes("Stank Bank"));
  const featuredCulture = content.find(c => c.disclosure?.includes("Culture"));
  const upcomingEvents = events.slice(0, 4);

  return (
    <StonerismLayout title="South African Cannabis Culture and Wellness">
      {/* Hero */}
      <StonerismHero
        eyebrow="Vanta OS / Stonerism"
        headline="South African cannabis culture, wellness and community."
        subheading="Discover growers, brands, places, food, ideas and experiences shaping a more conscious culture."
        primaryAction={<Link href="/stonerism/journal"><span style={btn(true)}>Explore Stonerism</span></Link>}
        secondaryAction={<Link href="/stonerism/journal"><span style={btn(false)}>Latest Stories</span></Link>}
      />

      {/* Discover */}
      {content.length > 0 && (
        <section style={{ maxWidth: 1280, margin: "0 auto", padding: "80px 24px 0" }}>
          <StonerismSectionHeader eyebrow="Discover" title="What's new" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 24 }}>
            {content.slice(0, 3).map((c: any) => (
              <ArticleCard key={c.id} article={{ slug: c.slug, type: c.type, title: c.title, excerpt: c.excerpt, heroImage: c.heroImage, section: c.section, readingTime: c.readingTime }} />
            ))}
          </div>
        </section>
      )}

      {/* Featured: Stank Bank */}
      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "80px 24px 0" }}>
        <StonerismSectionHeader eyebrow="Behind The Brand" title="Featured Story" />
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40,
          background: "var(--stn-panel)", border: "1px solid var(--stn-border)",
          borderRadius: 10, overflow: "hidden",
        }}
        className="grid-cols-1 md:grid-cols-2"
        >
          <div style={{ padding: "40px 40px" }}>
            <CategoryChip label="Behind the Brand" section="brands" />
            <h2 style={{ fontSize: "clamp(22px,2.5vw,32px)", fontWeight: 800, color: "var(--stn-cream)", fontFamily: "var(--font-display)", margin: "16px 0 12px", lineHeight: 1.2 }}>
              Inside the Vault: The Craft Behind South African Premium Pre-Rolls
            </h2>
            <p style={{ fontSize: 14, color: "var(--stn-muted)", lineHeight: 1.7, marginBottom: 20 }}>
              A look at the people, process, packaging and culture behind an independent premium pre-roll brand.
            </p>
            <p style={{ fontSize: 10, color: "var(--stn-orange)", fontFamily: "var(--font-mono)", letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 24 }}>
              Coming soon — Stank Bank
            </p>
            <Link href={featuredStank ? `/stonerism/article/${featuredStank.slug}` : "/stonerism/brands"}>
              <span style={{ ...btn(false), fontSize: 10 }}>Read More →</span>
            </Link>
          </div>
          <MediaPlaceholder aspect="auto" label="Stank Bank — Coming Soon" />
        </div>
      </section>

      {/* Featured: Culture */}
      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "48px 24px 0" }}>
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40,
          background: "var(--stn-panel)", border: "1px solid var(--stn-border)",
          borderRadius: 10, overflow: "hidden",
        }}>
          <MediaPlaceholder aspect="auto" label="Culture — Coming Soon" />
          <div style={{ padding: "40px 40px" }}>
            <CategoryChip label="Grower + Dispensary" section="places" />
            <h2 style={{ fontSize: "clamp(22px,2.5vw,32px)", fontWeight: 800, color: "var(--stn-cream)", fontFamily: "var(--font-display)", margin: "16px 0 12px", lineHeight: 1.2 }}>
              From Grow to Store
            </h2>
            <p style={{ fontSize: 14, color: "var(--stn-muted)", lineHeight: 1.7, marginBottom: 20 }}>
              Exploring cultivation, genetics, store design and the customer experience behind South African cannabis businesses.
            </p>
            <p style={{ fontSize: 10, color: "var(--stn-orange)", fontFamily: "var(--font-mono)", letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 24 }}>
              Coming soon — Culture
            </p>
            <Link href={featuredCulture ? `/stonerism/article/${featuredCulture.slug}` : "/stonerism/places"}>
              <span style={{ ...btn(false), fontSize: 10 }}>Read More →</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Category grid */}
      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "80px 24px 0" }}>
        <StonerismSectionHeader eyebrow="Explore" title="Stonerism" description="Find everything across our sections." />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
          {CATEGORY_GRID.map(({ href, label, desc, section }) => (
            <Link key={href} href={href}>
              <div style={{
                background: "var(--stn-forest)", border: "1px solid var(--stn-border)",
                borderRadius: 8, padding: "28px 24px", cursor: "pointer",
                transition: "border-color 0.2s",
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--stn-moss)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--stn-border)"}
              >
                <CategoryChip label={label} section={section} />
                <p style={{ fontSize: 12, color: "var(--stn-muted)", marginTop: 12, lineHeight: 1.6 }}>{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Original Series */}
      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "80px 24px 0" }}>
        <StonerismSectionHeader eyebrow="Original Series" title="Recurring shows" description="Episodic storytelling from inside South African cannabis culture." />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
          {ORIGINAL_SERIES.map(({ title, desc, section }) => (
            <div key={title} style={{
              background: "var(--stn-panel)", border: "1px solid var(--stn-border)",
              borderRadius: 8, padding: "24px",
            }}>
              <CategoryChip label="Series" variant="series" small />
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--stn-cream)", fontFamily: "var(--font-display)", margin: "10px 0 8px" }}>{title}</h3>
              <p style={{ fontSize: 12, color: "var(--stn-muted)", lineHeight: 1.6 }}>{desc}</p>
              <p style={{ fontSize: 9, color: "var(--stn-orange)", marginTop: 12, fontFamily: "var(--font-mono)", letterSpacing: "0.12em", textTransform: "uppercase" }}>Coming Soon</p>
            </div>
          ))}
        </div>
      </section>

      {/* Community */}
      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "80px 24px 0" }}>
        <StonerismSectionHeader
          eyebrow="Community"
          title="Culture should leave something behind."
          description="Real-world gatherings and experiences shaped by the Stonerism community."
          action={<Link href="/stonerism/events"><span style={{ ...btn(false), fontSize: 10 }}>View Upcoming Events</span></Link>}
        />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 40 }}>
          {COMMUNITY_EVENTS.map(e => <CategoryChip key={e} label={e} section="events" />)}
        </div>
        {upcomingEvents.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 24 }}>
            {upcomingEvents.map((ev: any) => <EventCard key={ev.id} event={ev} />)}
          </div>
        )}
      </section>

      {/* Latest Journal */}
      {latestContent.length > 0 && (
        <section style={{ maxWidth: 1280, margin: "0 auto", padding: "80px 24px 0" }}>
          <StonerismSectionHeader
            eyebrow="Journal"
            title="Latest stories"
            action={<Link href="/stonerism/journal"><span style={{ ...btn(false), fontSize: 10 }}>View All →</span></Link>}
          />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 24 }}>
            {latestContent.map((c: any) => (
              <ArticleCard key={c.id} article={{ slug: c.slug, type: c.type, title: c.title, excerpt: c.excerpt, heroImage: c.heroImage, section: c.section, readingTime: c.readingTime }} />
            ))}
          </div>
        </section>
      )}

      {/* Newsletter */}
      <section style={{ maxWidth: 1280, margin: "80px auto 0", padding: "0 24px" }}>
        <div style={{
          background: "var(--stn-panel)", border: "1px solid var(--stn-border)",
          borderRadius: 10, padding: "56px 48px",
        }}>
          <div style={{ maxWidth: 560 }}>
            <p style={{ fontSize: 10, color: "var(--stn-moss)", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "var(--font-mono)", marginBottom: 16 }}>Newsletter</p>
            <h2 style={{ fontSize: "clamp(24px,3vw,36px)", fontWeight: 800, color: "var(--stn-cream)", fontFamily: "var(--font-display)", marginBottom: 12, lineHeight: 1.2 }}>
              Join the circle.
            </h2>
            <p style={{ fontSize: 14, color: "var(--stn-muted)", lineHeight: 1.7, marginBottom: 32 }}>
              New stories, reviews, gatherings and guides from Stonerism.
            </p>

            {subMsg ? (
              <p style={{ fontSize: 14, color: "var(--stn-lime)", fontFamily: "var(--font-mono)" }}>{subMsg}</p>
            ) : (
              <form
                onSubmit={e => {
                  e.preventDefault();
                  if (!consent) { setSubMsg("Please check the consent box to subscribe."); return; }
                  subscribe.mutate({ email, city, consent });
                }}
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                <input
                  type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="Email address"
                  style={{
                    background: "var(--stn-forest)", border: "1px solid var(--stn-border)",
                    color: "var(--stn-cream)", borderRadius: 4, padding: "12px 16px",
                    fontSize: 13, outline: "none", width: "100%",
                  }}
                />
                <input
                  type="text" value={city} onChange={e => setCity(e.target.value)}
                  placeholder="City (optional)"
                  style={{
                    background: "var(--stn-forest)", border: "1px solid var(--stn-border)",
                    color: "var(--stn-cream)", borderRadius: 4, padding: "12px 16px",
                    fontSize: 13, outline: "none", width: "100%",
                  }}
                />
                <label style={{ display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer" }}>
                  <input
                    type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}
                    style={{ marginTop: 2, flexShrink: 0 }}
                  />
                  <span style={{ fontSize: 12, color: "var(--stn-muted)", lineHeight: 1.6 }}>
                    I consent to receiving Stonerism newsletters. I am 18 or older and in a legal jurisdiction. I can unsubscribe at any time.
                  </span>
                </label>
                <button
                  type="submit"
                  disabled={subscribe.isPending}
                  style={{ ...btn(true) as any, alignSelf: "flex-start", opacity: subscribe.isPending ? 0.6 : 1 }}
                >
                  {subscribe.isPending ? "Subscribing…" : "Subscribe"}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Legal */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 24px" }}>
        <EditorialNotice variant="legal" />
      </div>
    </StonerismLayout>
  );
}
