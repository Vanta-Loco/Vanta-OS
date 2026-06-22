import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer } from "drizzle-orm/pg-core";
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
