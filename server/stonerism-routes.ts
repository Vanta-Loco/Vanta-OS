// ─── Stonerism API Routes ─────────────────────────────────────────────────────
import type { Express, Request, Response, NextFunction } from "express";
import { z } from "zod";
import * as st from "./stonerism-storage";
import {
  insertStonerismContentSchema,
  insertStonerismEntitySchema,
  insertStonerismReviewSchema,
  insertStonerismEventSchema,
} from "@shared/schema";

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.session?.isAdmin === true) return next();
  return res.status(401).json({ error: "Unauthorized" });
}

function handleError(res: Response, error: unknown, msg: string) {
  if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
  console.error(`[stonerism] ${msg}:`, error);
  res.status(500).json({ error: msg });
}

export function registerStonerismRoutes(app: Express) {

  // ── Public: Content ──────────────────────────────────────────────
  app.get("/api/stonerism/content", async (req, res) => {
    try {
      const { section } = req.query;
      const rows = await st.getPublishedContent(section as string | undefined);
      res.json(rows);
    } catch (e) { handleError(res, e, "Failed to fetch content"); }
  });

  app.get("/api/stonerism/content/featured", async (_req, res) => {
    try { res.json(await st.getFeaturedContent()); }
    catch (e) { handleError(res, e, "Failed to fetch featured content"); }
  });

  app.get("/api/stonerism/content/:slug", async (req, res) => {
    try {
      const row = await st.getContentBySlug(req.params.slug);
      if (!row) return res.status(404).json({ error: "Not found" });
      res.json(row);
    } catch (e) { handleError(res, e, "Failed to fetch content"); }
  });

  // Alias: articles endpoint for backwards compat
  app.get("/api/stonerism/articles", async (req, res) => {
    try {
      const rows = await st.getPublishedContent();
      res.json(rows.filter(r => r.type === "article" || r.type === "editorial" || r.type === "guide"));
    } catch (e) { handleError(res, e, "Failed to fetch articles"); }
  });

  app.get("/api/stonerism/articles/:slug", async (req, res) => {
    try {
      const row = await st.getContentBySlug(req.params.slug);
      if (!row) return res.status(404).json({ error: "Not found" });
      res.json(row);
    } catch (e) { handleError(res, e, "Failed to fetch article"); }
  });

  // ── Public: Entities / Businesses ────────────────────────────────
  app.get("/api/stonerism/businesses", async (req, res) => {
    try {
      const { type, city } = req.query;
      res.json(await st.getEntities(type as string, city as string));
    } catch (e) { handleError(res, e, "Failed to fetch businesses"); }
  });

  app.get("/api/stonerism/businesses/:slug", async (req, res) => {
    try {
      const row = await st.getEntityBySlug(req.params.slug);
      if (!row) return res.status(404).json({ error: "Not found" });
      res.json(row);
    } catch (e) { handleError(res, e, "Failed to fetch business"); }
  });

  // ── Public: Reviews ───────────────────────────────────────────────
  app.get("/api/stonerism/reviews", async (_req, res) => {
    try { res.json(await st.getReviews()); }
    catch (e) { handleError(res, e, "Failed to fetch reviews"); }
  });

  app.get("/api/stonerism/reviews/:id", async (req, res) => {
    try {
      const row = await st.getReviewById(req.params.id);
      if (!row) return res.status(404).json({ error: "Not found" });
      const scores = await st.getReviewScores(row.id);
      res.json({ ...row, scores });
    } catch (e) { handleError(res, e, "Failed to fetch review"); }
  });

  // ── Public: Events ────────────────────────────────────────────────
  app.get("/api/stonerism/events", async (req, res) => {
    try {
      const { city } = req.query;
      res.json(await st.getEvents(city as string));
    } catch (e) { handleError(res, e, "Failed to fetch events"); }
  });

  // ── Public: Categories / Authors / Series ─────────────────────────
  app.get("/api/stonerism/categories", async (_req, res) => {
    try { res.json(await st.getCategories()); }
    catch (e) { handleError(res, e, "Failed to fetch categories"); }
  });

  app.get("/api/stonerism/series", async (_req, res) => {
    try { res.json(await st.getAllSeries()); }
    catch (e) { handleError(res, e, "Failed to fetch series"); }
  });

  // ── Newsletter ────────────────────────────────────────────────────
  const newsletterSchema = z.object({
    email:   z.string().email("Invalid email address"),
    city:    z.string().default(""),
    consent: z.boolean({ required_error: "Consent is required" }).refine(v => v === true, {
      message: "You must consent to subscribe",
    }),
  });

  app.post("/api/stonerism/newsletter", async (req, res) => {
    try {
      const parsed = newsletterSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
      const { email, city } = parsed.data;
      const result = await st.subscribeNewsletter(email, city);
      if (result.duplicate) return res.status(409).json({ error: "Already subscribed" });
      res.status(201).json({ success: true });
    } catch (e) { handleError(res, e, "Failed to subscribe"); }
  });

  // ── Admin: Content CRUD ───────────────────────────────────────────
  app.get("/api/admin/stonerism/content", requireAdmin, async (_req, res) => {
    try { res.json(await st.getAllContent()); }
    catch (e) { handleError(res, e, "Failed to fetch content"); }
  });

  app.post("/api/admin/stonerism/content", requireAdmin, async (req, res) => {
    try {
      const data = insertStonerismContentSchema.parse(req.body);
      const row = await st.createContent(data);
      res.status(201).json(row);
    } catch (e) { handleError(res, e, "Failed to create content"); }
  });

  app.patch("/api/admin/stonerism/content/:id", requireAdmin, async (req, res) => {
    try {
      const data = insertStonerismContentSchema.partial().parse(req.body);
      const row = await st.updateContent(req.params.id, data);
      if (!row) return res.status(404).json({ error: "Not found" });
      res.json(row);
    } catch (e) { handleError(res, e, "Failed to update content"); }
  });

  app.delete("/api/admin/stonerism/content/:id", requireAdmin, async (req, res) => {
    try {
      const ok = await st.deleteContent(req.params.id);
      if (!ok) return res.status(404).json({ error: "Not found" });
      res.status(204).send();
    } catch (e) { handleError(res, e, "Failed to delete content"); }
  });

  // ── Admin: Entities CRUD ──────────────────────────────────────────
  app.post("/api/admin/stonerism/businesses", requireAdmin, async (req, res) => {
    try {
      const data = insertStonerismEntitySchema.parse(req.body);
      res.status(201).json(await st.createEntity(data));
    } catch (e) { handleError(res, e, "Failed to create entity"); }
  });

  app.patch("/api/admin/stonerism/businesses/:id", requireAdmin, async (req, res) => {
    try {
      const data = insertStonerismEntitySchema.partial().parse(req.body);
      const row = await st.updateEntity(req.params.id, data);
      if (!row) return res.status(404).json({ error: "Not found" });
      res.json(row);
    } catch (e) { handleError(res, e, "Failed to update entity"); }
  });

  app.delete("/api/admin/stonerism/businesses/:id", requireAdmin, async (req, res) => {
    try {
      const ok = await st.deleteEntity(req.params.id);
      if (!ok) return res.status(404).json({ error: "Not found" });
      res.status(204).send();
    } catch (e) { handleError(res, e, "Failed to delete entity"); }
  });

  // ── Admin: Reviews CRUD ───────────────────────────────────────────
  app.post("/api/admin/stonerism/reviews", requireAdmin, async (req, res) => {
    try {
      const data = insertStonerismReviewSchema.parse(req.body);
      res.status(201).json(await st.createReview(data));
    } catch (e) { handleError(res, e, "Failed to create review"); }
  });

  app.patch("/api/admin/stonerism/reviews/:id", requireAdmin, async (req, res) => {
    try {
      const data = insertStonerismReviewSchema.partial().parse(req.body);
      const row = await st.updateReview(req.params.id, data);
      if (!row) return res.status(404).json({ error: "Not found" });
      res.json(row);
    } catch (e) { handleError(res, e, "Failed to update review"); }
  });

  app.delete("/api/admin/stonerism/reviews/:id", requireAdmin, async (req, res) => {
    try {
      const ok = await st.deleteReview(req.params.id);
      if (!ok) return res.status(404).json({ error: "Not found" });
      res.status(204).send();
    } catch (e) { handleError(res, e, "Failed to delete review"); }
  });

  // ── Admin: Events CRUD ────────────────────────────────────────────
  app.post("/api/admin/stonerism/events", requireAdmin, async (req, res) => {
    try {
      const data = insertStonerismEventSchema.parse(req.body);
      res.status(201).json(await st.createEvent(data));
    } catch (e) { handleError(res, e, "Failed to create event"); }
  });

  app.patch("/api/admin/stonerism/events/:id", requireAdmin, async (req, res) => {
    try {
      const data = insertStonerismEventSchema.partial().parse(req.body);
      const row = await st.updateEvent(req.params.id, data);
      if (!row) return res.status(404).json({ error: "Not found" });
      res.json(row);
    } catch (e) { handleError(res, e, "Failed to update event"); }
  });

  app.delete("/api/admin/stonerism/events/:id", requireAdmin, async (req, res) => {
    try {
      const ok = await st.deleteEvent(req.params.id);
      if (!ok) return res.status(404).json({ error: "Not found" });
      res.status(204).send();
    } catch (e) { handleError(res, e, "Failed to delete event"); }
  });

  // ── Admin: Newsletter list ────────────────────────────────────────
  app.get("/api/admin/stonerism/newsletter", requireAdmin, async (_req, res) => {
    try { res.json(await st.getAllSubscribers()); }
    catch (e) { handleError(res, e, "Failed to fetch subscribers"); }
  });
}
