import { type Post, type InsertPost, posts, type Release, type InsertRelease, releases, type VaultItem, type InsertVaultItem, vaultItems, type SiteContent, type UpdateSiteContent, siteContent, ABOUT_DEFAULTS } from "@shared/schema";
import { db } from "./db";
import { eq, desc, or, ilike, and } from "drizzle-orm";

export interface IStorage {
  getPosts(): Promise<Post[]>;
  getAllPosts(): Promise<Post[]>;
  getPost(id: string): Promise<Post | undefined>;
  createPost(post: InsertPost): Promise<Post>;
  updatePost(id: string, post: Partial<InsertPost>): Promise<Post | undefined>;
  deletePost(id: string): Promise<boolean>;
  searchPosts(query: string, category?: string): Promise<Post[]>;

  getReleases(): Promise<Release[]>;
  getRelease(id: string): Promise<Release | undefined>;
  createRelease(release: InsertRelease): Promise<Release>;
  updateRelease(id: string, release: Partial<InsertRelease>): Promise<Release | undefined>;
  deleteRelease(id: string): Promise<boolean>;

  getVaultItems(): Promise<VaultItem[]>;
  createVaultItem(item: InsertVaultItem): Promise<VaultItem>;
  updateVaultItem(id: string, data: Partial<InsertVaultItem>): Promise<VaultItem | undefined>;
  deleteVaultItem(id: string): Promise<boolean>;

  getAboutContent(): Promise<SiteContent>;
  upsertAboutContent(data: UpdateSiteContent): Promise<SiteContent>;
}

export class DatabaseStorage implements IStorage {
  async getPosts(): Promise<Post[]> {
    return await db.select().from(posts).where(eq(posts.published, 'true')).orderBy(desc(posts.createdAt));
  }

  async getAllPosts(): Promise<Post[]> {
    return await db.select().from(posts).orderBy(desc(posts.createdAt));
  }

  async getPost(id: string): Promise<Post | undefined> {
    const [post] = await db.select().from(posts).where(eq(posts.id, id));
    return post || undefined;
  }

  async createPost(insertPost: InsertPost): Promise<Post> {
    const [post] = await db.insert(posts).values(insertPost).returning();
    return post;
  }

  async updatePost(id: string, updateData: Partial<InsertPost>): Promise<Post | undefined> {
    const [post] = await db.update(posts).set(updateData).where(eq(posts.id, id)).returning();
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

    return await db.select().from(posts).where(or(...conditions)).orderBy(desc(posts.createdAt));
  }

  async getReleases(): Promise<Release[]> {
    return await db.select().from(releases).orderBy(desc(releases.createdAt));
  }

  async getRelease(id: string): Promise<Release | undefined> {
    const [release] = await db.select().from(releases).where(eq(releases.id, id));
    return release || undefined;
  }

  async createRelease(insertRelease: InsertRelease): Promise<Release> {
    const [release] = await db.insert(releases).values(insertRelease).returning();
    return release;
  }

  async updateRelease(id: string, updateData: Partial<InsertRelease>): Promise<Release | undefined> {
    const [release] = await db.update(releases).set(updateData).where(eq(releases.id, id)).returning();
    return release || undefined;
  }

  async deleteRelease(id: string): Promise<boolean> {
    const result = await db.delete(releases).where(eq(releases.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getVaultItems(): Promise<VaultItem[]> {
    return await db.select().from(vaultItems).orderBy(desc(vaultItems.createdAt));
  }

  async createVaultItem(item: InsertVaultItem): Promise<VaultItem> {
    const [created] = await db.insert(vaultItems).values(item).returning();
    return created;
  }

  async updateVaultItem(id: string, data: Partial<InsertVaultItem>): Promise<VaultItem | undefined> {
    const [item] = await db.update(vaultItems).set(data).where(eq(vaultItems.id, id)).returning();
    return item || undefined;
  }

  async deleteVaultItem(id: string): Promise<boolean> {
    const result = await db.delete(vaultItems).where(eq(vaultItems.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getAboutContent(): Promise<SiteContent> {
    const [row] = await db.select().from(siteContent).where(eq(siteContent.key, "about"));
    return row ?? ABOUT_DEFAULTS;
  }

  async upsertAboutContent(data: UpdateSiteContent): Promise<SiteContent> {
    const current = await this.getAboutContent();
    const { key: _k, updatedAt: _u, ...currentFields } = current;
    const merged = { ...currentFields, ...data };
    const [row] = await db
      .insert(siteContent)
      .values({ key: "about", ...merged, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: siteContent.key,
        set: { ...merged, updatedAt: new Date() },
      })
      .returning();
    return row;
  }
}

export const storage = new DatabaseStorage();
