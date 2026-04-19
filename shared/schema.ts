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
  images: text("images").array().notNull().default(sql`ARRAY[]::text[]`),
  category: text("category").notNull(),
  readTime: text("read_time").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  featured: text("featured").notNull().default('false'),
});

export const insertPostSchema = createInsertSchema(posts).omit({
  id: true,
  createdAt: true,
}).extend({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  excerpt: z.string().min(1, "Excerpt is required").max(300, "Excerpt too long"),
  content: z.string().min(1, "Content is required"),
  coverImage: z.string().min(1, "Cover image is required"),
  images: z.array(z.string()).default([]),
  category: z.string().min(1, "Category is required"),
  readTime: z.string().default("5 min read"),
  featured: z.string().default('false'),
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
