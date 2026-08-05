import { storage } from "./storage";
import { db, pool } from "./db";
import type { InsertPost } from "@shared/schema";
import {
  stonerismCategories, stonerismAuthors, stonerismSeries,
  stonerismContent, stonerismEntities, stonerismEvents,
} from "@shared/schema";
import { sql } from "drizzle-orm";

const seedPosts: InsertPost[] = [
  {
    title: "Welcome to Vanta Cold",
    excerpt: "The beginning of a journey documenting music creation, lifestyle moments, and everything in between.",
    content: `This is the start of something special. Vanta Cold isn't just a music label—it's a platform for authentic storytelling through sound, visuals, and words.

Over the coming weeks and months, this space will transform into a comprehensive documentation of the creative process. From studio sessions to lifestyle photography, from production techniques to personal reflections on the music industry.

Every post here represents a piece of the puzzle, a chapter in the story of building something meaningful from the ground up. Whether you're a fellow artist, music enthusiast, or just curious about the journey, welcome aboard.

Let's create something unforgettable together.`,
    coverImage: "/attached_assets/generated_images/Music_studio_lifestyle_hero_cf7ae2f2.png",
    coverImagePosition: "50% 50%",
    images: [
      "/attached_assets/generated_images/Recording_session_behind_scenes_04ce1f60.png",
      "/attached_assets/generated_images/Artist_portrait_lifestyle_photo_4eb94ae9.png"
    ],
    category: "Music Production",
    readTime: "3 min read",
    featured: "true",
    published: "true",
    musicUrl: "",
  },
  {
    title: "Late Night Sessions",
    excerpt: "There's something magical about creating music when the world is asleep. The studio becomes a sanctuary.",
    content: `3 AM. The city outside is quiet. Inside the studio, creativity flows without boundaries.

These late-night sessions are where the magic happens. No distractions, no interruptions—just pure focus on the craft. The synthesizers hum, the monitors glow, and ideas transform into tracks.

Some of the best music comes from these moments. When you're tired, your conscious mind steps back and lets intuition take the wheel. That's when you discover sounds you didn't know you were searching for.

The coffee helps. The ambient lighting sets the mood. But ultimately, it's about being present with the music, letting each sound guide the next decision.

These are the moments that define Vanta Cold.`,
    coverImage: "/attached_assets/generated_images/Recording_session_behind_scenes_04ce1f60.png",
    coverImagePosition: "50% 50%",
    images: [],
    category: "Behind the Scenes",
    readTime: "4 min read",
    featured: "false",
    published: "true",
    musicUrl: "",
  },
  {
    title: "Building a Vision",
    excerpt: "Creating a music label from scratch requires more than talent—it demands vision, persistence, and authenticity.",
    content: `Every successful label starts with a vision. For Vanta Cold, that vision is clear: create genuine music that resonates, tell authentic stories, and build a community around creative expression.

The journey hasn't been easy. From learning production techniques to understanding the business side of music, every step has been a lesson. But that's what makes it worthwhile.

This blog exists to document not just the successes, but the challenges too. The late nights debugging DAW crashes. The frustration of a mix that won't sit right. The excitement when a track finally clicks.

It's all part of the process. And sharing that process openly creates connection. That's what Vanta Cold is about—real stories, real music, real journey.

Looking ahead, there's so much more to build. More music to create, more stories to tell, more moments to capture. And you're invited to be part of it all.`,
    coverImage: "/attached_assets/generated_images/Urban_night_cityscape_mood_2c3c2c61.png",
    coverImagePosition: "50% 50%",
    images: [],
    category: "Creative Process",
    readTime: "5 min read",
    featured: "false",
    published: "true",
    musicUrl: "",
  }
];

export async function seedDatabase() {
  const existingPosts = await storage.getAllPosts();
  
  if (existingPosts.length > 0) {
    console.log(`Database already has ${existingPosts.length} posts, skipping seed`);
  } else {
    console.log("Seeding database with sample posts...");
    for (const post of seedPosts) {
      await storage.createPost(post);
    }
    console.log(`✓ Seeded ${seedPosts.length} posts successfully`);
  }

  await seedStonerism();
}

async function seedStonerism() {
  // ── Create tables — exact match with drizzle schema in shared/schema.ts ──
  // Drop + recreate on first run (tables are empty — guard above prevents re-run)
  await pool.query(`
    DROP TABLE IF EXISTS stonerism_newsletter_subscribers CASCADE;
    DROP TABLE IF EXISTS stonerism_review_scores CASCADE;
    DROP TABLE IF EXISTS stonerism_reviews CASCADE;
    DROP TABLE IF EXISTS stonerism_events CASCADE;
    DROP TABLE IF EXISTS stonerism_content CASCADE;
    DROP TABLE IF EXISTS stonerism_entities CASCADE;
    DROP TABLE IF EXISTS stonerism_series CASCADE;
    DROP TABLE IF EXISTS stonerism_authors CASCADE;
    DROP TABLE IF EXISTS stonerism_categories CASCADE;
    DROP TABLE IF EXISTS vanta_media CASCADE;

    CREATE TABLE vanta_media (
      id           VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      url          TEXT NOT NULL DEFAULT '',
      type         TEXT NOT NULL DEFAULT 'image',
      alt          TEXT NOT NULL DEFAULT '',
      caption      TEXT NOT NULL DEFAULT '',
      credit       TEXT NOT NULL DEFAULT '',
      width        INTEGER,
      height       INTEGER,
      mime_type    TEXT NOT NULL DEFAULT '',
      app_namespace TEXT NOT NULL DEFAULT 'vanta',
      created_at   TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE stonerism_categories (
      id          VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      name        TEXT NOT NULL,
      slug        TEXT NOT NULL,
      section     TEXT NOT NULL DEFAULT 'journal',
      description TEXT NOT NULL DEFAULT '',
      created_at  TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE stonerism_authors (
      id         VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      name       TEXT NOT NULL,
      slug       TEXT NOT NULL,
      bio        TEXT NOT NULL DEFAULT '',
      role       TEXT NOT NULL DEFAULT 'Writer',
      avatar_url TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE stonerism_series (
      id          VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      title       TEXT NOT NULL,
      slug        TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      hero_image  TEXT NOT NULL DEFAULT '',
      status      TEXT NOT NULL DEFAULT 'active',
      created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE stonerism_content (
      id               VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      type             TEXT NOT NULL DEFAULT 'article',
      title            TEXT NOT NULL,
      slug             TEXT NOT NULL,
      subtitle         TEXT NOT NULL DEFAULT '',
      excerpt          TEXT NOT NULL DEFAULT '',
      body             TEXT NOT NULL DEFAULT '',
      hero_image       TEXT NOT NULL DEFAULT '',
      gallery          TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      video_url        TEXT NOT NULL DEFAULT '',
      youtube_url      TEXT NOT NULL DEFAULT '',
      instagram_url    TEXT NOT NULL DEFAULT '',
      tiktok_url       TEXT NOT NULL DEFAULT '',
      podcast_url      TEXT NOT NULL DEFAULT '',
      pull_quotes      TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      sources          TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      author_id        VARCHAR,
      editor_id        TEXT NOT NULL DEFAULT '',
      reviewer_id      TEXT NOT NULL DEFAULT '',
      photographer_id  TEXT NOT NULL DEFAULT '',
      videographer_id  TEXT NOT NULL DEFAULT '',
      series_id        VARCHAR,
      episode_number   INTEGER,
      category_id      VARCHAR,
      tags             TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      section          TEXT NOT NULL DEFAULT 'journal',
      status           TEXT NOT NULL DEFAULT 'draft',
      featured         TEXT NOT NULL DEFAULT 'false',
      published_at     TIMESTAMP,
      reading_time     TEXT NOT NULL DEFAULT '',
      evidence_level   TEXT NOT NULL DEFAULT '',
      disclosure       TEXT NOT NULL DEFAULT '',
      seo_title        TEXT NOT NULL DEFAULT '',
      seo_description  TEXT NOT NULL DEFAULT '',
      created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE stonerism_entities (
      id               VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      name             TEXT NOT NULL,
      slug             TEXT NOT NULL,
      type             TEXT NOT NULL,
      description      TEXT NOT NULL DEFAULT '',
      city             TEXT NOT NULL DEFAULT '',
      province         TEXT NOT NULL DEFAULT '',
      country          TEXT NOT NULL DEFAULT 'South Africa',
      lat              TEXT NOT NULL DEFAULT '',
      lng              TEXT NOT NULL DEFAULT '',
      address          TEXT NOT NULL DEFAULT '',
      website_url      TEXT NOT NULL DEFAULT '',
      instagram_url    TEXT NOT NULL DEFAULT '',
      founded_year     TEXT NOT NULL DEFAULT '',
      verified         TEXT NOT NULL DEFAULT 'false',
      feature_status   TEXT NOT NULL DEFAULT 'coming-soon',
      legal_disclaimer TEXT NOT NULL DEFAULT '',
      hero_image       TEXT NOT NULL DEFAULT '',
      gallery          TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE stonerism_reviews (
      id                VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      content_id        VARCHAR,
      entity_id         VARCHAR,
      review_type       TEXT NOT NULL,
      overall_score     INTEGER,
      summary           TEXT NOT NULL DEFAULT '',
      what_worked       TEXT NOT NULL DEFAULT '',
      what_could_improve TEXT NOT NULL DEFAULT '',
      who_it_is_for     TEXT NOT NULL DEFAULT '',
      price_notes       TEXT NOT NULL DEFAULT '',
      review_date       TEXT NOT NULL DEFAULT '',
      disclosure        TEXT NOT NULL DEFAULT '',
      status            TEXT NOT NULL DEFAULT 'draft',
      created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE stonerism_review_scores (
      id        VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      review_id VARCHAR NOT NULL,
      category  TEXT NOT NULL,
      score     INTEGER,
      notes     TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE stonerism_events (
      id              VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      title           TEXT NOT NULL,
      slug            TEXT NOT NULL,
      category        TEXT NOT NULL DEFAULT '',
      description     TEXT NOT NULL DEFAULT '',
      city            TEXT NOT NULL DEFAULT '',
      province        TEXT NOT NULL DEFAULT '',
      country         TEXT NOT NULL DEFAULT 'South Africa',
      lat             TEXT NOT NULL DEFAULT '',
      lng             TEXT NOT NULL DEFAULT '',
      venue           TEXT NOT NULL DEFAULT '',
      start_date      TEXT NOT NULL DEFAULT '',
      end_date        TEXT NOT NULL DEFAULT '',
      age_restriction TEXT NOT NULL DEFAULT '18+',
      price_label     TEXT NOT NULL DEFAULT 'Free',
      host            TEXT NOT NULL DEFAULT 'Stonerism',
      status          TEXT NOT NULL DEFAULT 'concept',
      ticket_url      TEXT NOT NULL DEFAULT '',
      hero_image      TEXT NOT NULL DEFAULT '',
      created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE stonerism_newsletter_subscribers (
      id             VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      email          TEXT NOT NULL,
      city           TEXT NOT NULL DEFAULT '',
      consent        TEXT NOT NULL DEFAULT 'false',
      subscribed_at  TIMESTAMP NOT NULL DEFAULT NOW(),
      unsubscribed_at TIMESTAMP
    );
  `);
  console.log("✓ Stonerism tables created");

  // ── Guard: skip seed data if categories already exist ─────────────
  const existing = await db.select().from(stonerismCategories).limit(1);
  if (existing.length > 0) {
    console.log("Stonerism already seeded, skipping");
    return;
  }

  console.log("Seeding Stonerism data…");

  // ── Categories ──────────────────────────────────────────────────
  const catRows = await db.insert(stonerismCategories).values([
    { name: "Cannabis",     slug: "cannabis",   section: "cannabis",   description: "Strains, education, growers and responsible use." },
    { name: "Places",       slug: "places",     section: "places",     description: "Dispensaries, clubs, smoke shops and cannabis-friendly spaces." },
    { name: "Brands",       slug: "brands",     section: "brands",     description: "Premium South African cannabis brands." },
    { name: "Munchies",     slug: "munchies",   section: "munchies",   description: "Restaurants, cafés, desserts, late-night food and recipes." },
    { name: "Wellness",     slug: "wellness",   section: "wellness",   description: "Mind, body, movement, recovery and general health." },
    { name: "Inner Life",   slug: "inner-life", section: "inner-life", description: "Philosophy, meditation, astrology and spiritual exploration." },
    { name: "Events",       slug: "events",     section: "events",     description: "Community gatherings, markets, yoga and live sessions." },
    { name: "Journal",      slug: "journal",    section: "journal",    description: "Stories, guides, interviews and editorials." },
    { name: "Community",    slug: "community",  section: "journal",    description: "Community spotlights and action." },
  ]).returning();

  const catMap = Object.fromEntries(catRows.map(c => [c.slug, c.id]));

  // ── Authors ──────────────────────────────────────────────────────
  const [author] = await db.insert(stonerismAuthors).values([
    { name: "Stonerism Editorial", slug: "stonerism-editorial", role: "Editor", bio: "The Stonerism editorial team." },
  ]).returning();

  // ── Series ────────────────────────────────────────────────────────
  const seriesRows = await db.insert(stonerismSeries).values([
    { title: "Behind The Brand",    slug: "behind-the-brand",    description: "Founder stories and production access.", status: "active" },
    { title: "Stoner Girls Review", slug: "stoner-girls-review", description: "Personality-led product, place and food reviews.", status: "active" },
    { title: "From Grow To Store",  slug: "from-grow-to-store",  description: "Cultivation and retail documentaries.", status: "active" },
    { title: "Munchie Run",         slug: "munchie-run",         description: "Food discoveries after a cannabis feature.", status: "active" },
    { title: "The Green Guide",     slug: "the-green-guide",     description: "Evidence-aware wellness products and health equipment.", status: "active" },
    { title: "Community Spotlight", slug: "community-spotlight", description: "Real people, real community.", status: "active" },
  ]).returning();

  const seriesMap = Object.fromEntries(seriesRows.map(s => [s.slug, s.id]));

  // ── Content (draft articles) ─────────────────────────────────────
  await db.insert(stonerismContent).values([
    {
      type: "article", title: "Inside the Vault: The Craft Behind Premium Pre-Rolls",
      slug: "inside-the-vault-premium-pre-rolls", subtitle: "A look at the people, process, packaging and culture behind an independent premium pre-roll brand.",
      excerpt: "A look at the people, process, packaging and culture behind an independent premium pre-roll brand.",
      body: "Coming soon — this feature is in production.",
      section: "brands", categoryId: catMap["brands"], authorId: author.id,
      status: "draft", featured: "true", seriesId: seriesMap["behind-the-brand"], episodeNumber: 1,
      disclosure: "Coming soon — Stank Bank",
      seoTitle: "Inside the Vault: Premium Pre-Rolls | Stonerism",
      seoDescription: "A behind-the-scenes look at South African premium pre-roll craft.",
    },
    {
      type: "article", title: "From Grow to Store",
      slug: "from-grow-to-store", subtitle: "Exploring cultivation, genetics, store design and the customer experience behind South African cannabis businesses.",
      excerpt: "Exploring cultivation, genetics, store design and the customer experience behind South African cannabis businesses.",
      body: "Coming soon — this feature is in production.",
      section: "places", categoryId: catMap["places"], authorId: author.id,
      status: "draft", featured: "true", seriesId: seriesMap["from-grow-to-store"], episodeNumber: 1,
      disclosure: "Coming soon — Culture",
      seoTitle: "From Grow to Store | Stonerism",
    },
    {
      type: "guide", title: "Understanding Terpenes",
      slug: "understanding-terpenes", subtitle: "What terpenes are, why they matter and how they shape your experience.",
      excerpt: "What terpenes are, why they matter and how they shape your experience.",
      body: "Coming soon.",
      section: "cannabis", categoryId: catMap["cannabis"], authorId: author.id, status: "draft",
      seoTitle: "Understanding Terpenes | Stonerism",
    },
    {
      type: "guide", title: "Responsible Cannabis Consumption",
      slug: "responsible-cannabis-consumption", subtitle: "Practical principles for safe, informed and enjoyable use.",
      excerpt: "Practical principles for safe, informed and enjoyable use.",
      body: "Coming soon.",
      section: "cannabis", categoryId: catMap["cannabis"], authorId: author.id, status: "draft",
      evidenceLevel: "editorial",
      seoTitle: "Responsible Cannabis Consumption | Stonerism",
    },
    {
      type: "article", title: "Food Worth Leaving the Couch For",
      slug: "food-worth-leaving-the-couch-for", subtitle: "The best late-night, comfort and indulgent food in South Africa.",
      excerpt: "The best late-night, comfort and indulgent food in South Africa.",
      body: "Coming soon.",
      section: "munchies", categoryId: catMap["munchies"], authorId: author.id, status: "draft",
      seriesId: seriesMap["munchie-run"],
      seoTitle: "Food Worth Leaving the Couch For | Stonerism",
    },
    {
      type: "guide", title: "Beginner Yoga for Stiff Bodies",
      slug: "beginner-yoga-for-stiff-bodies", subtitle: "A gentle, practical starting point for total beginners.",
      excerpt: "A gentle, practical starting point for total beginners.",
      body: "Coming soon.",
      section: "wellness", categoryId: catMap["wellness"], authorId: author.id, status: "draft",
      evidenceLevel: "editorial",
      seoTitle: "Beginner Yoga for Stiff Bodies | Stonerism",
    },
    {
      type: "article", title: "The Zodiac as a Tool for Reflection",
      slug: "the-zodiac-as-a-tool-for-reflection", subtitle: "Using astrology not as prophecy, but as a framework for self-examination.",
      excerpt: "Using astrology not as prophecy, but as a framework for self-examination.",
      body: "Coming soon.",
      section: "inner-life", categoryId: catMap["inner-life"], authorId: author.id, status: "draft",
      disclosure: "Astrological entertainment and reflection — not scientific fact.",
      seoTitle: "The Zodiac as a Tool for Reflection | Stonerism",
    },
    {
      type: "editorial", title: "Culture Should Leave Something Behind",
      slug: "culture-should-leave-something-behind", subtitle: "On building community, taking care of spaces and showing up beyond consumption.",
      excerpt: "On building community, taking care of spaces and showing up beyond consumption.",
      body: "Coming soon.",
      section: "journal", categoryId: catMap["community"], authorId: author.id, status: "draft",
      seoTitle: "Culture Should Leave Something Behind | Stonerism",
    },
  ]);

  // ── Entities (Stank Bank + Culture) ──────────────────────────────
  await db.insert(stonerismEntities).values([
    {
      name: "Stank Bank", slug: "stank-bank", type: "brand",
      description: "Premium South African pre-roll brand with a dedicated rolling and packaging vault in the East Rand.",
      city: "East Rand", province: "Gauteng", country: "South Africa",
      featureStatus: "coming-soon", verified: "false",
      legalDisclaimer: "Stank Bank is a premium pre-roll brand. This profile is editorial only and does not constitute endorsement of any specific product or claim.",
    },
    {
      name: "Culture", slug: "culture", type: "dispensary",
      description: "South African grower and dispensary chain with multiple locations across Gauteng.",
      city: "Johannesburg", province: "Gauteng", country: "South Africa",
      featureStatus: "coming-soon", verified: "false",
      legalDisclaimer: "Culture is a grower and dispensary chain. Information is editorial only. Verify licensing and legal status directly with the business.",
    },
  ]);

  // ── Events (concept placeholders) ────────────────────────────────
  await db.insert(stonerismEvents).values([
    { title: "Stonerism Yoga Morning",    slug: "stonerism-yoga-morning",    category: "yoga",             description: "A slow, grounding morning yoga session for all levels.", city: "Johannesburg", province: "Gauteng", status: "concept", host: "Stonerism", ageRestriction: "18+", priceLabel: "Free" },
    { title: "Jozi Nature Walk",           slug: "jozi-nature-walk",           category: "hiking",           description: "A community hike through Johannesburg's green spaces.",     city: "Johannesburg", province: "Gauteng", status: "concept", host: "Stonerism", ageRestriction: "18+", priceLabel: "Free" },
    { title: "Community Market",           slug: "community-market",           category: "market",           description: "Local vendors, food and community in one space.",            city: "Johannesburg", province: "Gauteng", status: "concept", host: "Stonerism", ageRestriction: "All ages", priceLabel: "Free" },
    { title: "Live Sessions",              slug: "live-sessions",              category: "live-music",       description: "An intimate live music gathering curated by Stonerism.",     city: "Johannesburg", province: "Gauteng", status: "concept", host: "Stonerism", ageRestriction: "18+", priceLabel: "TBC" },
    { title: "Art + Plant Exhibition",     slug: "art-plant-exhibition",       category: "art-exhibition",   description: "An exhibition celebrating botanical art and South African creative culture.", city: "Johannesburg", province: "Gauteng", status: "concept", host: "Stonerism", ageRestriction: "All ages", priceLabel: "TBC" },
    { title: "Wellness Weekend",           slug: "wellness-weekend",           category: "wellness-retreat", description: "A two-day wellness retreat with movement, breathwork and community.", city: "Johannesburg", province: "Gauteng", status: "concept", host: "Stonerism", ageRestriction: "18+", priceLabel: "TBC" },
  ]);

  console.log("✓ Stonerism data seeded successfully");
}
