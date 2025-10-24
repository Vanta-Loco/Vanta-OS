import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp } from "drizzle-orm/pg-core";
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
