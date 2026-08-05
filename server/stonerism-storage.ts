// ─── Stonerism Storage Layer ──────────────────────────────────────────────────
import { db } from "./db";
import { eq, desc, ilike, or, and, sql } from "drizzle-orm";
import {
  stonerismContent, type StonerismContent, type InsertStonerismContent,
  stonerismEntities, type StonerismEntity, type InsertStonerismEntity,
  stonerismReviews, type StonerismReview, type InsertStonerismReview,
  stonerismReviewScores, type StonerismReviewScore,
  stonerismEvents, type StonerismEvent, type InsertStonerismEvent,
  stonerismCategories, type StonerismCategory,
  stonerismAuthors, type StonerismAuthor,
  stonerismSeries, type StonerismSeries,
  stonerismNewsletterSubscribers, type StonerismNewsletterSubscriber,
} from "@shared/schema";

// ── Content ───────────────────────────────────────────────────────────────────

export async function getPublishedContent(section?: string): Promise<StonerismContent[]> {
  const base = db.select().from(stonerismContent).where(
    section
      ? and(eq(stonerismContent.status, "published"), eq(stonerismContent.section, section))
      : eq(stonerismContent.status, "published")
  );
  return base.orderBy(desc(stonerismContent.publishedAt));
}

export async function getAllContent(): Promise<StonerismContent[]> {
  return db.select().from(stonerismContent).orderBy(desc(stonerismContent.createdAt));
}

export async function getContentBySlug(slug: string): Promise<StonerismContent | undefined> {
  const [row] = await db.select().from(stonerismContent).where(eq(stonerismContent.slug, slug));
  return row;
}

export async function getContentById(id: string): Promise<StonerismContent | undefined> {
  const [row] = await db.select().from(stonerismContent).where(eq(stonerismContent.id, id));
  return row;
}

export async function getFeaturedContent(): Promise<StonerismContent[]> {
  return db.select().from(stonerismContent)
    .where(and(eq(stonerismContent.status, "published"), eq(stonerismContent.featured, "true")))
    .orderBy(desc(stonerismContent.publishedAt))
    .limit(6);
}

export async function createContent(data: InsertStonerismContent): Promise<StonerismContent> {
  const [row] = await db.insert(stonerismContent).values(data).returning();
  return row;
}

export async function updateContent(id: string, data: Partial<InsertStonerismContent>): Promise<StonerismContent | undefined> {
  const [row] = await db.update(stonerismContent)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(stonerismContent.id, id))
    .returning();
  return row;
}

export async function deleteContent(id: string): Promise<boolean> {
  const r = await db.delete(stonerismContent).where(eq(stonerismContent.id, id));
  return (r.rowCount ?? 0) > 0;
}

// ── Entities ──────────────────────────────────────────────────────────────────

export async function getEntities(type?: string, city?: string): Promise<StonerismEntity[]> {
  const conditions = [];
  if (type) conditions.push(eq(stonerismEntities.type, type));
  if (city) conditions.push(eq(stonerismEntities.city, city));
  return db.select().from(stonerismEntities)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(stonerismEntities.createdAt));
}

export async function getEntityBySlug(slug: string): Promise<StonerismEntity | undefined> {
  const [row] = await db.select().from(stonerismEntities).where(eq(stonerismEntities.slug, slug));
  return row;
}

export async function createEntity(data: InsertStonerismEntity): Promise<StonerismEntity> {
  const [row] = await db.insert(stonerismEntities).values(data).returning();
  return row;
}

export async function updateEntity(id: string, data: Partial<InsertStonerismEntity>): Promise<StonerismEntity | undefined> {
  const [row] = await db.update(stonerismEntities)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(stonerismEntities.id, id))
    .returning();
  return row;
}

export async function deleteEntity(id: string): Promise<boolean> {
  const r = await db.delete(stonerismEntities).where(eq(stonerismEntities.id, id));
  return (r.rowCount ?? 0) > 0;
}

// ── Reviews ───────────────────────────────────────────────────────────────────

export async function getReviews(): Promise<StonerismReview[]> {
  return db.select().from(stonerismReviews).orderBy(desc(stonerismReviews.createdAt));
}

export async function getReviewById(id: string): Promise<StonerismReview | undefined> {
  const [row] = await db.select().from(stonerismReviews).where(eq(stonerismReviews.id, id));
  return row;
}

export async function getReviewByContentId(contentId: string): Promise<StonerismReview | undefined> {
  const [row] = await db.select().from(stonerismReviews).where(eq(stonerismReviews.contentId, contentId));
  return row;
}

export async function getReviewScores(reviewId: string): Promise<StonerismReviewScore[]> {
  return db.select().from(stonerismReviewScores).where(eq(stonerismReviewScores.reviewId, reviewId));
}

export async function createReview(data: InsertStonerismReview): Promise<StonerismReview> {
  const [row] = await db.insert(stonerismReviews).values(data).returning();
  return row;
}

export async function updateReview(id: string, data: Partial<InsertStonerismReview>): Promise<StonerismReview | undefined> {
  const [row] = await db.update(stonerismReviews)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(stonerismReviews.id, id))
    .returning();
  return row;
}

export async function deleteReview(id: string): Promise<boolean> {
  const r = await db.delete(stonerismReviews).where(eq(stonerismReviews.id, id));
  return (r.rowCount ?? 0) > 0;
}

// ── Events ────────────────────────────────────────────────────────────────────

export async function getEvents(city?: string): Promise<StonerismEvent[]> {
  if (city) {
    return db.select().from(stonerismEvents)
      .where(eq(stonerismEvents.city, city))
      .orderBy(desc(stonerismEvents.createdAt));
  }
  return db.select().from(stonerismEvents).orderBy(desc(stonerismEvents.createdAt));
}

export async function getEventBySlug(slug: string): Promise<StonerismEvent | undefined> {
  const [row] = await db.select().from(stonerismEvents).where(eq(stonerismEvents.slug, slug));
  return row;
}

export async function createEvent(data: InsertStonerismEvent): Promise<StonerismEvent> {
  const [row] = await db.insert(stonerismEvents).values(data).returning();
  return row;
}

export async function updateEvent(id: string, data: Partial<InsertStonerismEvent>): Promise<StonerismEvent | undefined> {
  const [row] = await db.update(stonerismEvents)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(stonerismEvents.id, id))
    .returning();
  return row;
}

export async function deleteEvent(id: string): Promise<boolean> {
  const r = await db.delete(stonerismEvents).where(eq(stonerismEvents.id, id));
  return (r.rowCount ?? 0) > 0;
}

// ── Categories ────────────────────────────────────────────────────────────────

export async function getCategories(): Promise<StonerismCategory[]> {
  return db.select().from(stonerismCategories).orderBy(stonerismCategories.name);
}

// ── Authors ───────────────────────────────────────────────────────────────────

export async function getAuthors(): Promise<StonerismAuthor[]> {
  return db.select().from(stonerismAuthors).orderBy(stonerismAuthors.name);
}

// ── Series ────────────────────────────────────────────────────────────────────

export async function getAllSeries(): Promise<StonerismSeries[]> {
  return db.select().from(stonerismSeries).orderBy(stonerismSeries.title);
}

// ── Newsletter ────────────────────────────────────────────────────────────────

export async function subscribeNewsletter(
  email: string, city: string
): Promise<{ ok: boolean; duplicate: boolean }> {
  const [existing] = await db.select()
    .from(stonerismNewsletterSubscribers)
    .where(eq(stonerismNewsletterSubscribers.email, email.toLowerCase().trim()));
  if (existing) return { ok: false, duplicate: true };
  await db.insert(stonerismNewsletterSubscribers).values({
    email: email.toLowerCase().trim(),
    city,
    consent: "true",
  });
  return { ok: true, duplicate: false };
}

export async function getAllSubscribers(): Promise<StonerismNewsletterSubscriber[]> {
  return db.select().from(stonerismNewsletterSubscribers)
    .orderBy(desc(stonerismNewsletterSubscribers.subscribedAt));
}
