import { type Post, type InsertPost } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getPosts(): Promise<Post[]>;
  getPost(id: string): Promise<Post | undefined>;
  createPost(post: InsertPost): Promise<Post>;
}

export class MemStorage implements IStorage {
  private posts: Map<string, Post>;

  constructor() {
    this.posts = new Map();
  }

  async getPosts(): Promise<Post[]> {
    return Array.from(this.posts.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getPost(id: string): Promise<Post | undefined> {
    return this.posts.get(id);
  }

  async createPost(insertPost: InsertPost): Promise<Post> {
    const id = randomUUID();
    const post: Post = {
      ...insertPost,
      id,
      createdAt: new Date(),
    };
    this.posts.set(id, post);
    return post;
  }
}

export const storage = new MemStorage();
