import { type Post, type InsertPost, posts } from "@shared/schema";
import { db } from "./db";
import { eq, desc, or, ilike, and, sql } from "drizzle-orm";

export interface IStorage {
  getPosts(): Promise<Post[]>;
  getPost(id: string): Promise<Post | undefined>;
  createPost(post: InsertPost): Promise<Post>;
  updatePost(id: string, post: Partial<InsertPost>): Promise<Post | undefined>;
  deletePost(id: string): Promise<boolean>;
  searchPosts(query: string, category?: string): Promise<Post[]>;
}

export class DatabaseStorage implements IStorage {
  async getPosts(): Promise<Post[]> {
    return await db.select().from(posts).orderBy(desc(posts.createdAt));
  }

  async getPost(id: string): Promise<Post | undefined> {
    const [post] = await db.select().from(posts).where(eq(posts.id, id));
    return post || undefined;
  }

  async createPost(insertPost: InsertPost): Promise<Post> {
    const [post] = await db
      .insert(posts)
      .values(insertPost)
      .returning();
    return post;
  }

  async updatePost(id: string, updateData: Partial<InsertPost>): Promise<Post | undefined> {
    const [post] = await db
      .update(posts)
      .set(updateData)
      .where(eq(posts.id, id))
      .returning();
    return post || undefined;
  }

  async deletePost(id: string): Promise<boolean> {
    const result = await db.delete(posts).where(eq(posts.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async searchPosts(query: string, category?: string): Promise<Post[]> {
    const searchPattern = `%${query}%`;
    
    const conditions = [
      ilike(posts.title, searchPattern),
      ilike(posts.excerpt, searchPattern),
      ilike(posts.content, searchPattern),
    ];

    if (category) {
      return await db
        .select()
        .from(posts)
        .where(and(eq(posts.category, category), or(...conditions)))
        .orderBy(desc(posts.createdAt));
    }

    return await db
      .select()
      .from(posts)
      .where(or(...conditions))
      .orderBy(desc(posts.createdAt));
  }
}

export const storage = new DatabaseStorage();
