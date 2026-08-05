import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { registerStonerismRoutes } from "./stonerism-routes";
import { insertPostSchema, insertReleaseSchema, insertVaultItemSchema, updateSiteContentSchema } from "@shared/schema";
import { z } from "zod";
import { generateAudioPreview, deleteAudioPreview } from "./audio-preview";
import { compressAudioFile, deleteCompressedAudio } from "./audio-compress";

declare module "express-session" {
  interface SessionData {
    isAdmin: boolean;
    vaultAuthorized: boolean;
  }
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.session?.isAdmin === true) return next();
  return res.status(401).json({ error: "Unauthorized" });
}
import multer from "multer";
import path from "path";
import fs from "fs";

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const fileStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage: fileStorage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "image/jpeg", "image/jpg", "image/png", "image/webp",
      "audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav",
      "audio/x-m4a", "audio/mp4", "audio/aac",
    ];
    cb(null, allowed.includes(file.mimetype));
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // ── Admin Auth ───────────────────────────────────────────────────
  app.get("/api/admin/me", (req, res) => {
    res.json({ authenticated: req.session?.isAdmin === true });
  });

  app.post("/api/admin/login", (req, res) => {
    const { password } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      return res.status(500).json({ error: "ADMIN_PASSWORD not configured." });
    }
    if (password === adminPassword) {
      req.session.isAdmin = true;
      req.session.save((err) => {
        if (err) return res.status(500).json({ error: "Session error" });
        res.json({ authenticated: true });
      });
    } else {
      return res.status(401).json({ error: "Invalid password" });
    }
  });

  app.post("/api/admin/logout", (req, res) => {
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
  });

  // ── File Upload ──────────────────────────────────────────────────
  app.post("/api/upload", requireAdmin, upload.single("file"), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded or file type not allowed" });
    res.json({ url: `/uploads/${req.file.filename}` });
  });

  // ── Admin Posts (all including drafts) ─────────────────────────
  app.get("/api/admin/posts", requireAdmin, async (_req, res) => {
    try {
      const posts = await storage.getAllPosts();
      res.json(posts);
    } catch (error) {
      console.error("Error fetching all posts:", error);
      res.status(500).json({ error: "Failed to fetch posts" });
    }
  });

  // ── Posts ──────────────────────────────────────────────────────
  app.get("/api/posts/search", async (req, res) => {
    try {
      const { q, category } = req.query;
      if (!q || typeof q !== "string") {
        return res.status(400).json({ error: "Search query is required" });
      }
      const posts = await storage.searchPosts(q, category as string | undefined);
      res.json(posts);
    } catch (error) {
      console.error("Error searching posts:", error);
      res.status(500).json({ error: "Failed to search posts" });
    }
  });

  app.get("/api/posts", async (_req, res) => {
    try {
      const posts = await storage.getPosts();
      res.json(posts);
    } catch (error) {
      console.error("Error fetching posts:", error);
      res.status(500).json({ error: "Failed to fetch posts" });
    }
  });

  app.get("/api/posts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const post = await storage.getPost(id);
      if (!post) return res.status(404).json({ error: "Post not found" });
      res.json(post);
    } catch (error) {
      console.error("Error fetching post:", error);
      res.status(500).json({ error: "Failed to fetch post" });
    }
  });

  app.post("/api/posts", requireAdmin, async (req, res) => {
    try {
      const validatedData = insertPostSchema.parse(req.body);
      const post = await storage.createPost(validatedData);
      res.status(201).json(post);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
      console.error("Error creating post:", error);
      res.status(500).json({ error: "Failed to create post" });
    }
  });

  app.patch("/api/posts/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertPostSchema.partial().parse(req.body);
      const post = await storage.updatePost(id, validatedData);
      if (!post) return res.status(404).json({ error: "Post not found" });
      res.json(post);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
      console.error("Error updating post:", error);
      res.status(500).json({ error: "Failed to update post" });
    }
  });

  app.delete("/api/posts/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deletePost(id);
      if (!deleted) return res.status(404).json({ error: "Post not found" });
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting post:", error);
      res.status(500).json({ error: "Failed to delete post" });
    }
  });

  // ── Releases ────────────────────────────────────────────────────
  app.get("/api/releases", async (_req, res) => {
    try {
      const allReleases = await storage.getReleases();
      res.json(allReleases);
    } catch (error) {
      console.error("Error fetching releases:", error);
      res.status(500).json({ error: "Failed to fetch releases" });
    }
  });

  app.get("/api/releases/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const release = await storage.getRelease(id);
      if (!release) return res.status(404).json({ error: "Release not found" });
      res.json(release);
    } catch (error) {
      console.error("Error fetching release:", error);
      res.status(500).json({ error: "Failed to fetch release" });
    }
  });

  app.post("/api/releases", requireAdmin, async (req, res) => {
    try {
      const validatedData = insertReleaseSchema.parse(req.body);
      let release = await storage.createRelease(validatedData);

      if (release.audioFileUrl) {
        const previewUrl = await generateAudioPreview(
          release.audioFileUrl,
          release.id,
          release.previewStartSeconds,
          release.previewDurationSeconds,
        );
        if (previewUrl) {
          release = (await storage.updateRelease(release.id, { audioPreviewUrl: previewUrl })) ?? release;
        }
      }

      res.status(201).json(release);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
      console.error("Error creating release:", error);
      res.status(500).json({ error: "Failed to create release" });
    }
  });

  app.patch("/api/releases/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertReleaseSchema.partial().parse(req.body);

      const shouldRegenPreview =
        "audioFileUrl" in validatedData ||
        "previewStartSeconds" in validatedData ||
        "previewDurationSeconds" in validatedData;

      let release = await storage.updateRelease(id, validatedData);
      if (!release) return res.status(404).json({ error: "Release not found" });

      if (shouldRegenPreview && release.audioFileUrl) {
        const previewUrl = await generateAudioPreview(
          release.audioFileUrl,
          release.id,
          release.previewStartSeconds,
          release.previewDurationSeconds,
        );
        if (previewUrl) {
          release = (await storage.updateRelease(release.id, { audioPreviewUrl: previewUrl })) ?? release;
        }
      }

      res.json(release);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
      console.error("Error updating release:", error);
      res.status(500).json({ error: "Failed to update release" });
    }
  });

  // ── Manual preview regeneration (admin only) ─────────────────────
  app.post("/api/releases/:id/regenerate-preview", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const release = await storage.getRelease(id);
      if (!release) return res.status(404).json({ error: "Release not found" });
      if (!release.audioFileUrl) {
        return res.status(400).json({ error: "No audio file uploaded for this release" });
      }

      const previewUrl = await generateAudioPreview(
        release.audioFileUrl,
        release.id,
        release.previewStartSeconds,
        release.previewDurationSeconds,
      );

      if (!previewUrl) {
        return res.status(500).json({ error: "Preview generation failed — check server logs" });
      }

      const updated = await storage.updateRelease(release.id, { audioPreviewUrl: previewUrl });
      res.json({ previewUrl, release: updated });
    } catch (error) {
      console.error("Error regenerating preview:", error);
      res.status(500).json({ error: "Failed to regenerate preview" });
    }
  });

  app.delete("/api/releases/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteRelease(id);
      if (!deleted) return res.status(404).json({ error: "Release not found" });
      deleteAudioPreview(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting release:", error);
      res.status(500).json({ error: "Failed to delete release" });
    }
  });

  // ── Vault Auth ───────────────────────────────────────────────────
  // Admins are automatically treated as vault-authorized (convenience override).
  // Non-admin users still require the vault code.
  app.get("/api/vault/me", (req, res) => {
    const authorized =
      req.session?.isAdmin === true || req.session?.vaultAuthorized === true;
    res.json({ authorized });
  });

  app.post("/api/vault/verify", (req, res) => {
    const { code } = req.body;
    const vaultCode = process.env.VAULT_CODE;
    if (!vaultCode) {
      return res.status(503).json({ error: "Vault is not configured." });
    }
    if (typeof code === "string" && code.trim().toUpperCase() === vaultCode.trim().toUpperCase()) {
      req.session.vaultAuthorized = true;
      req.session.save((err) => {
        if (err) return res.status(500).json({ error: "Session error" });
        res.json({ authorized: true });
      });
    } else {
      return res.status(401).json({ error: "Invalid access code." });
    }
  });

  app.post("/api/vault/logout", (req, res) => {
    req.session.vaultAuthorized = false;
    req.session.save(() => res.json({ success: true }));
  });

  // ── Vault Items ──────────────────────────────────────────────────
  app.get("/api/vault/items", async (req, res) => {
    const canRead =
      req.session?.isAdmin === true || req.session?.vaultAuthorized === true;
    if (!canRead) {
      return res.status(401).json({ error: "Vault access required" });
    }
    try {
      const items = await storage.getVaultItems();
      res.json(items);
    } catch (error) {
      console.error("Error fetching vault items:", error);
      res.status(500).json({ error: "Failed to fetch vault items" });
    }
  });

  app.post("/api/vault/items", requireAdmin, async (req, res) => {
    try {
      const parsed = insertVaultItemSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
      const item = await storage.createVaultItem(parsed.data);
      res.status(201).json(item);

      // Background: compress audio if the file URL points to an uploaded audio file
      const isAudioType = item.type === "audio" || item.type === "demo";
      if (isAudioType && item.fileUrl?.startsWith("/uploads/")) {
        compressAudioFile(item.fileUrl, item.id).then(async (compressedUrl) => {
          if (compressedUrl) {
            await storage.updateVaultItem(item.id, { compressedUrl });
            console.log(`[vault] compressed audio ready for item ${item.id}`);
          }
        }).catch((err) => console.error(`[vault] compression error for ${item.id}:`, err));
      }
    } catch (error) {
      console.error("Error creating vault item:", error);
      res.status(500).json({ error: "Failed to create vault item" });
    }
  });

  // Manual re-compress trigger (admin only)
  app.post("/api/vault/items/:id/recompress", requireAdmin, async (req, res) => {
    try {
      const items = await storage.getVaultItems();
      const item = items.find(i => i.id === req.params.id);
      if (!item) return res.status(404).json({ error: "Item not found" });
      if (!item.fileUrl?.startsWith("/uploads/")) {
        return res.status(400).json({ error: "Item has no uploaded audio file to compress" });
      }
      res.json({ status: "compression started" });

      compressAudioFile(item.fileUrl, item.id).then(async (compressedUrl) => {
        if (compressedUrl) {
          await storage.updateVaultItem(item.id, { compressedUrl });
          console.log(`[vault] recompressed audio ready for item ${item.id}`);
        }
      }).catch((err) => console.error(`[vault] recompression error for ${item.id}:`, err));
    } catch (error) {
      console.error("Error triggering recompression:", error);
      res.status(500).json({ error: "Failed to start recompression" });
    }
  });

  app.patch("/api/vault/items/:id", requireAdmin, async (req, res) => {
    try {
      const parsed = insertVaultItemSchema.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
      const updated = await storage.updateVaultItem(req.params.id, parsed.data);
      if (!updated) return res.status(404).json({ error: "Item not found" });
      res.json(updated);
    } catch (error) {
      console.error("Error updating vault item:", error);
      res.status(500).json({ error: "Failed to update vault item" });
    }
  });

  app.delete("/api/vault/items/:id", requireAdmin, async (req, res) => {
    try {
      const deleted = await storage.deleteVaultItem(req.params.id);
      if (!deleted) return res.status(404).json({ error: "Item not found" });
      deleteCompressedAudio(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting vault item:", error);
      res.status(500).json({ error: "Failed to delete vault item" });
    }
  });

  // ── Site Content ─────────────────────────────────────────────────
  app.get("/api/site-content/about", async (req, res) => {
    try {
      const content = await storage.getAboutContent();
      res.json(content);
    } catch (error) {
      console.error("Error fetching about content:", error);
      res.status(500).json({ error: "Failed to load about content" });
    }
  });

  app.patch("/api/site-content/about", requireAdmin, async (req, res) => {
    try {
      const parsed = updateSiteContentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid data", details: parsed.error.flatten() });
      }
      const content = await storage.upsertAboutContent(parsed.data);
      res.json(content);
    } catch (error) {
      console.error("Error updating about content:", error);
      res.status(500).json({ error: "Failed to update about content" });
    }
  });

  registerStonerismRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}
