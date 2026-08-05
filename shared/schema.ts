import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const posts = pgTable("posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  excerpt: text("excerpt").notNull(),
  content: text("content").notNull(),
  coverImage: text("cover_image").notNull(),
  coverImagePosition: text("cover_image_position").notNull().default("50% 50%"),
  images: text("images").array().notNull().default(sql`ARRAY[]::text[]`),
  category: text("category").notNull(),
  readTime: text("read_time").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  featured: text("featured").notNull().default('false'),
  published: text("published").notNull().default('true'),
  musicUrl: text("music_url").notNull().default(""),
});

export const insertPostSchema = createInsertSchema(posts).omit({
  id: true,
  createdAt: true,
}).extend({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  excerpt: z.string().min(1, "Excerpt is required").max(300, "Excerpt too long"),
  content: z.string().min(1, "Content is required"),
  coverImage: z.string().min(1, "Cover image is required"),
  coverImagePosition: z.string().default("50% 50%"),
  images: z.array(z.string()).default([]),
  category: z.string().min(1, "Category is required"),
  readTime: z.string().default("5 min read"),
  featured: z.string().default('false'),
  published: z.string().default('true'),
  musicUrl: z.string().default(""),
});

export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof posts.$inferSelect;

export const GENRE_OPTIONS = [
  "Trap",
  "Alternative Rock",
  "Shoegaze",
  "Punk",
  "Experimental",
  "Soundtrack / Score",
  "Hybrid",
] as const;

export type Genre = typeof GENRE_OPTIONS[number];

export const releases = pgTable("releases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  type: text("type").notNull(),
  coverImage: text("cover_image").notNull(),
  description: text("description").notNull(),
  releaseDate: text("release_date").notNull(),
  genre: text("genre").notNull().default(""),
  subgenre: text("subgenre").notNull().default(""),
  moodTags: text("mood_tags").array().notNull().default(sql`ARRAY[]::text[]`),
  spotifyUrl: text("spotify_url").notNull().default(""),
  appleMusicUrl: text("apple_music_url").notNull().default(""),
  soundcloudUrl: text("soundcloud_url").notNull().default(""),
  youtubeUrl: text("youtube_url").notNull().default(""),
  audioPreviewUrl: text("audio_preview_url").notNull().default(""),
  audioFileUrl: text("audio_file_url").notNull().default(""),
  previewStartSeconds: integer("preview_start_seconds").notNull().default(0),
  previewDurationSeconds: integer("preview_duration_seconds").notNull().default(30),
  tracklist: text("tracklist").array().notNull().default(sql`ARRAY[]::text[]`),
  featured: text("featured").notNull().default("false"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertReleaseSchema = createInsertSchema(releases).omit({
  id: true,
  createdAt: true,
}).extend({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  type: z.enum(["album", "single", "ep", "mixtape"]),
  coverImage: z.string().min(1, "Cover image URL is required"),
  description: z.string().min(1, "Description is required"),
  releaseDate: z.string().min(1, "Release date is required"),
  genre: z.string().default(""),
  subgenre: z.string().default(""),
  moodTags: z.array(z.string()).default([]),
  spotifyUrl: z.string().default(""),
  appleMusicUrl: z.string().default(""),
  soundcloudUrl: z.string().default(""),
  youtubeUrl: z.string().default(""),
  audioPreviewUrl: z.string().default(""),
  audioFileUrl: z.string().default(""),
  previewStartSeconds: z.coerce.number().int().min(0).default(0),
  previewDurationSeconds: z.coerce.number().int().min(1).default(30),
  tracklist: z.array(z.string()).default([]),
  featured: z.string().default("false"),
});

export type InsertRelease = z.infer<typeof insertReleaseSchema>;
export type Release = typeof releases.$inferSelect;

export const VAULT_ITEM_TYPES = ["audio", "demo", "video", "text", "image"] as const;
export type VaultItemType = typeof VAULT_ITEM_TYPES[number];

export const VAULT_CATEGORIES = ["unreleased", "demos", "fragments"] as const;
export type VaultCategory = typeof VAULT_CATEGORIES[number];

export const vaultItems = pgTable("vault_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  type: text("type").notNull().default("audio"),
  category: text("category").notNull().default(""),
  fileUrl: text("file_url").notNull().default(""),
  compressedUrl: text("compressed_url").notNull().default(""),
  coverImage: text("cover_image").notNull().default(""),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertVaultItemSchema = createInsertSchema(vaultItems).omit({
  id: true,
  createdAt: true,
}).extend({
  title: z.string().min(1, "Title is required"),
  type: z.enum(["audio", "demo", "video", "text", "image"]).default("audio"),
  category: z.string().default(""),
  description: z.string().default(""),
  fileUrl: z.string().default(""),
  compressedUrl: z.string().default(""),
  coverImage: z.string().default(""),
  notes: z.string().default(""),
});

export type InsertVaultItem = z.infer<typeof insertVaultItemSchema>;
export type VaultItem = typeof vaultItems.$inferSelect;

// ── Vanta Media Library (shared across all Vanta apps) ───────────────────────

export const vantaMedia = pgTable("vanta_media", {
  id:           varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  url:          text("url").notNull(),
  type:         text("type").notNull().default("image"),      // image|video|audio|document
  alt:          text("alt").notNull().default(""),
  caption:      text("caption").notNull().default(""),
  credit:       text("credit").notNull().default(""),
  width:        integer("width"),
  height:       integer("height"),
  mimeType:     text("mime_type").notNull().default(""),
  appNamespace: text("app_namespace").notNull().default("vanta"), // stonerism|vanta|etc
  createdAt:    timestamp("created_at").notNull().defaultNow(),
});

export const insertVantaMediaSchema = createInsertSchema(vantaMedia).omit({ id: true, createdAt: true });
export type VantaMedia       = typeof vantaMedia.$inferSelect;
export type InsertVantaMedia = z.infer<typeof insertVantaMediaSchema>;

// ── Stonerism: Categories ─────────────────────────────────────────────────────

export const stonerismCategories = pgTable("stonerism_categories", {
  id:          varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name:        text("name").notNull(),
  slug:        text("slug").notNull(),
  section:     text("section").notNull().default("journal"), // cannabis|places|munchies|wellness|inner-life|events|journal
  description: text("description").notNull().default(""),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

export type StonerismCategory = typeof stonerismCategories.$inferSelect;

// ── Stonerism: Authors ────────────────────────────────────────────────────────

export const stonerismAuthors = pgTable("stonerism_authors", {
  id:        varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name:      text("name").notNull(),
  slug:      text("slug").notNull(),
  bio:       text("bio").notNull().default(""),
  role:      text("role").notNull().default("Writer"), // Writer|Editor|Photographer|Videographer
  avatarUrl: text("avatar_url").notNull().default(""),
  // Future: userId nullable for shared Vanta identity
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type StonerismAuthor = typeof stonerismAuthors.$inferSelect;

// ── Stonerism: Series (first-class episodic content) ─────────────────────────

export const stonerismSeries = pgTable("stonerism_series", {
  id:          varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title:       text("title").notNull(),
  slug:        text("slug").notNull(),
  description: text("description").notNull().default(""),
  heroImage:   text("hero_image").notNull().default(""),
  status:      text("status").notNull().default("active"), // active|completed|hiatus
  createdAt:   timestamp("created_at").notNull().defaultNow(),
  updatedAt:   timestamp("updated_at").notNull().defaultNow(),
});

export type StonerismSeries = typeof stonerismSeries.$inferSelect;

// ── Stonerism: Content (universal — articles, reviews, guides, episodes, etc.) ─

export const STONERISM_CONTENT_TYPES = [
  "article", "review", "editorial", "guide", "interview",
  "video", "podcast", "photo-essay", "gallery", "episode",
  "community-spotlight", "documentary",
] as const;
export type StonerismContentType = typeof STONERISM_CONTENT_TYPES[number];

export const STONERISM_EVIDENCE_LEVELS = [
  "editorial", "expert-reviewed", "doctor-reviewed",
  "sponsored", "product-supplied", "affiliate-disclosure",
] as const;
export type StonerismEvidenceLevel = typeof STONERISM_EVIDENCE_LEVELS[number];

export const stonerismContent = pgTable("stonerism_content", {
  id:              varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type:            text("type").notNull().default("article"),
  title:           text("title").notNull(),
  slug:            text("slug").notNull(),
  subtitle:        text("subtitle").notNull().default(""),
  excerpt:         text("excerpt").notNull().default(""),
  body:            text("body").notNull().default(""),           // Markdown — rendered safely
  heroImage:       text("hero_image").notNull().default(""),
  gallery:         text("gallery").array().notNull().default(sql`ARRAY[]::text[]`),
  videoUrl:        text("video_url").notNull().default(""),
  youtubeUrl:      text("youtube_url").notNull().default(""),
  instagramUrl:    text("instagram_url").notNull().default(""),
  tiktokUrl:       text("tiktok_url").notNull().default(""),
  podcastUrl:      text("podcast_url").notNull().default(""),
  pullQuotes:      text("pull_quotes").array().notNull().default(sql`ARRAY[]::text[]`),
  sources:         text("sources").array().notNull().default(sql`ARRAY[]::text[]`),
  // Authorship
  authorId:        varchar("author_id"),
  editorId:        text("editor_id").notNull().default(""),
  reviewerId:      text("reviewer_id").notNull().default(""),
  photographerId:  text("photographer_id").notNull().default(""),
  videographerId:  text("videographer_id").notNull().default(""),
  // Series
  seriesId:        varchar("series_id"),
  episodeNumber:   integer("episode_number"),
  // Classification
  categoryId:      varchar("category_id"),
  tags:            text("tags").array().notNull().default(sql`ARRAY[]::text[]`),
  section:         text("section").notNull().default("journal"),
  // Publishing
  status:          text("status").notNull().default("draft"), // draft|published|archived
  featured:        text("featured").notNull().default("false"),
  publishedAt:     timestamp("published_at"),
  // Quality signals
  readingTime:     text("reading_time").notNull().default(""),
  evidenceLevel:   text("evidence_level").notNull().default(""),
  disclosure:      text("disclosure").notNull().default(""),
  // SEO
  seoTitle:        text("seo_title").notNull().default(""),
  seoDescription:  text("seo_description").notNull().default(""),
  // Future: userId varchar nullable for shared Vanta accounts
  createdAt:       timestamp("created_at").notNull().defaultNow(),
  updatedAt:       timestamp("updated_at").notNull().defaultNow(),
});

export const insertStonerismContentSchema = createInsertSchema(stonerismContent).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  title:   z.string().min(1, "Title is required").max(300),
  slug:    z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers and hyphens"),
  type:    z.enum(STONERISM_CONTENT_TYPES).default("article"),
  status:  z.enum(["draft", "published", "archived"]).default("draft"),
  section: z.string().default("journal"),
});

export type StonerismContent       = typeof stonerismContent.$inferSelect;
export type InsertStonerismContent  = z.infer<typeof insertStonerismContentSchema>;

// ── Stonerism: Entities (universal — growers, brands, restaurants, studios…) ──

export const STONERISM_ENTITY_TYPES = [
  "grower", "dispensary", "cannabis-club", "brand", "restaurant",
  "coffee-shop", "smoke-shop", "grow-shop", "food-truck", "wellness-clinic",
  "yoga-studio", "gym", "festival", "venue", "market", "retreat",
  "artist", "creator", "community-org",
] as const;
export type StonerismEntityType = typeof STONERISM_ENTITY_TYPES[number];

export const stonerismEntities = pgTable("stonerism_entities", {
  id:              varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name:            text("name").notNull(),
  slug:            text("slug").notNull(),
  type:            text("type").notNull(),
  description:     text("description").notNull().default(""),
  city:            text("city").notNull().default(""),
  province:        text("province").notNull().default(""),
  country:         text("country").notNull().default("South Africa"),
  lat:             text("lat").notNull().default(""),   // future map support
  lng:             text("lng").notNull().default(""),
  address:         text("address").notNull().default(""),   // optional public address
  websiteUrl:      text("website_url").notNull().default(""),
  instagramUrl:    text("instagram_url").notNull().default(""),
  foundedYear:     text("founded_year").notNull().default(""),
  verified:        text("verified").notNull().default("false"),
  featureStatus:   text("feature_status").notNull().default("coming-soon"), // coming-soon|featured|active|archived
  legalDisclaimer: text("legal_disclaimer").notNull().default(""),
  heroImage:       text("hero_image").notNull().default(""),
  gallery:         text("gallery").array().notNull().default(sql`ARRAY[]::text[]`),
  // Future: userId nullable for shared Vanta accounts
  createdAt:       timestamp("created_at").notNull().defaultNow(),
  updatedAt:       timestamp("updated_at").notNull().defaultNow(),
});

export const insertStonerismEntitySchema = createInsertSchema(stonerismEntities).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/),
  type: z.enum(STONERISM_ENTITY_TYPES),
});

export type StonerismEntity       = typeof stonerismEntities.$inferSelect;
export type InsertStonerismEntity  = z.infer<typeof insertStonerismEntitySchema>;

// ── Stonerism: Reviews ────────────────────────────────────────────────────────

export const STONERISM_REVIEW_TYPES = [
  "dispensary", "grower", "brand", "product", "pre-roll",
  "flower", "food", "wellness-product", "event", "experience", "place",
] as const;
export type StonerismReviewType = typeof STONERISM_REVIEW_TYPES[number];

export const stonerismReviews = pgTable("stonerism_reviews", {
  id:               varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId:        varchar("content_id"),   // optional link to a stonerism_content row
  entityId:         varchar("entity_id"),    // optional link to stonerism_entities
  reviewType:       text("review_type").notNull(),
  overallScore:     integer("overall_score"),   // null = not yet reviewed
  summary:          text("summary").notNull().default(""),
  whatWorked:       text("what_worked").notNull().default(""),
  whatCouldImprove: text("what_could_improve").notNull().default(""),
  whoItIsFor:       text("who_it_is_for").notNull().default(""),
  priceNotes:       text("price_notes").notNull().default(""),
  reviewDate:       text("review_date").notNull().default(""),
  disclosure:       text("disclosure").notNull().default(""),
  status:           text("status").notNull().default("draft"),
  createdAt:        timestamp("created_at").notNull().defaultNow(),
  updatedAt:        timestamp("updated_at").notNull().defaultNow(),
});

export const insertStonerismReviewSchema = createInsertSchema(stonerismReviews).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  reviewType: z.enum(STONERISM_REVIEW_TYPES),
});

export type StonerismReview       = typeof stonerismReviews.$inferSelect;
export type InsertStonerismReview  = z.infer<typeof insertStonerismReviewSchema>;

// ── Stonerism: Review Scores ──────────────────────────────────────────────────

export const stonerismReviewScores = pgTable("stonerism_review_scores", {
  id:       varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reviewId: varchar("review_id").notNull(),
  category: text("category").notNull(),  // e.g. "Packaging", "Draw", "Burn", "Atmosphere"
  score:    integer("score"),             // null = not yet scored
  notes:    text("notes").notNull().default(""),
});

export type StonerismReviewScore = typeof stonerismReviewScores.$inferSelect;

// ── Stonerism: Events ─────────────────────────────────────────────────────────

export const STONERISM_EVENT_CATEGORIES = [
  "yoga", "hiking", "beach-cleanup", "community-cleanup", "market",
  "live-music", "food", "grow-workshop", "art-exhibition", "wellness-retreat",
  "talk", "film-screening", "open-mic", "plant-swap", "community-garden",
] as const;
export type StonerismEventCategory = typeof STONERISM_EVENT_CATEGORIES[number];

export const stonerismEvents = pgTable("stonerism_events", {
  id:             varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title:          text("title").notNull(),
  slug:           text("slug").notNull(),
  category:       text("category").notNull().default(""),
  description:    text("description").notNull().default(""),
  city:           text("city").notNull().default(""),
  province:       text("province").notNull().default(""),
  country:        text("country").notNull().default("South Africa"),
  lat:            text("lat").notNull().default(""),   // future map support
  lng:            text("lng").notNull().default(""),
  venue:          text("venue").notNull().default(""),
  startDate:      text("start_date").notNull().default(""),
  endDate:        text("end_date").notNull().default(""),
  ageRestriction: text("age_restriction").notNull().default("18+"),
  priceLabel:     text("price_label").notNull().default("Free"),
  host:           text("host").notNull().default("Stonerism"),
  status:         text("status").notNull().default("concept"), // concept|scheduled|cancelled|completed
  ticketUrl:      text("ticket_url").notNull().default(""),
  heroImage:      text("hero_image").notNull().default(""),
  createdAt:      timestamp("created_at").notNull().defaultNow(),
  updatedAt:      timestamp("updated_at").notNull().defaultNow(),
});

export const insertStonerismEventSchema = createInsertSchema(stonerismEvents).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  title:  z.string().min(1, "Title is required"),
  slug:   z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/),
  status: z.enum(["concept", "scheduled", "cancelled", "completed"]).default("concept"),
});

export type StonerismEvent       = typeof stonerismEvents.$inferSelect;
export type InsertStonerismEvent  = z.infer<typeof insertStonerismEventSchema>;

// ── Stonerism: Newsletter Subscribers ────────────────────────────────────────

export const stonerismNewsletterSubscribers = pgTable("stonerism_newsletter_subscribers", {
  id:              varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email:           text("email").notNull(),
  city:            text("city").notNull().default(""),
  consent:         text("consent").notNull().default("false"),
  subscribedAt:    timestamp("subscribed_at").notNull().defaultNow(),
  unsubscribedAt:  timestamp("unsubscribed_at"),
});

export type StonerismNewsletterSubscriber = typeof stonerismNewsletterSubscribers.$inferSelect;

// ── Site Content (editable pages) ────────────────────────────────────────────

export const siteContent = pgTable("site_content", {
  key:            varchar("key").primaryKey(),
  title:          text("title").notNull().default(""),
  heroP1:         text("hero_p1").notNull().default(""),
  heroP2:         text("hero_p2").notNull().default(""),
  heroP3:         text("hero_p3").notNull().default(""),
  heroImageUrl:   text("hero_image_url").notNull().default(""),
  journeyTitle:   text("journey_title").notNull().default(""),
  creativeTitle:  text("creative_title").notNull().default(""),
  creativeBody:   text("creative_body").notNull().default(""),
  studioImageUrl: text("studio_image_url").notNull().default(""),
  visionTitle:    text("vision_title").notNull().default(""),
  visionBody:     text("vision_body").notNull().default(""),
  cityImageUrl:   text("city_image_url").notNull().default(""),
  missionTitle:   text("mission_title").notNull().default(""),
  missionBody:    text("mission_body").notNull().default(""),
  updatedAt:      timestamp("updated_at").notNull().defaultNow(),
});

export const updateSiteContentSchema = z.object({
  title:          z.string().optional(),
  heroP1:         z.string().optional(),
  heroP2:         z.string().optional(),
  heroP3:         z.string().optional(),
  heroImageUrl:   z.string().optional(),
  journeyTitle:   z.string().optional(),
  creativeTitle:  z.string().optional(),
  creativeBody:   z.string().optional(),
  studioImageUrl: z.string().optional(),
  visionTitle:    z.string().optional(),
  visionBody:     z.string().optional(),
  cityImageUrl:   z.string().optional(),
  missionTitle:   z.string().optional(),
  missionBody:    z.string().optional(),
});

export type SiteContent = typeof siteContent.$inferSelect;
export type UpdateSiteContent = z.infer<typeof updateSiteContentSchema>;

export const ABOUT_DEFAULTS: SiteContent = {
  key:            "about",
  title:          "About Vanta Cold",
  heroP1:         "Vanta Cold is more than a music label—it's a journey documented through sound, visuals, and stories. Born from a passion for authentic creativity and raw expression, we're building something genuine from the ground up.",
  heroP2:         "This blog serves as a window into the creative process. From late night studio sessions to lifestyle moments that inspire the music, every post captures a piece of the journey. It's about transparency, connection, and sharing the real story behind the music.",
  heroP3:         "We believe in the power of storytelling through multiple mediums—combining music production with photography, videography, and written narratives to create a complete artistic vision.",
  heroImageUrl:   "",
  journeyTitle:   "The Journey",
  creativeTitle:  "Creative Process",
  creativeBody:   "Every track starts with an idea, a feeling, or a moment of inspiration. Through countless hours in the studio, experimenting with sounds, beats, and melodies, these ideas transform into the music that defines Vanta Cold.",
  studioImageUrl: "",
  visionTitle:    "Building the Vision",
  visionBody:     "From navigating the music industry to building a brand identity, every step is a learning experience. This platform documents not just the successes, but the challenges, setbacks, and lessons learned along the way.",
  cityImageUrl:   "",
  missionTitle:   "Our Mission",
  missionBody:    "To create music that resonates, tell stories that inspire, and build a community around authentic artistic expression. Vanta Cold represents the journey of turning passion into reality, one post, one track, one moment at a time.",
  updatedAt:      new Date(0),
};
