import type { Express, Request, Response } from "express";
import { pool } from "./db";
import { requireUser } from "./user-auth";
import { requireAdmin } from "./admin-auth";

const DISCIPLINES = new Set([
  "Artist", "Producer", "Engineer", "Photographer", "Filmmaker", "Model",
  "Designer", "Stylist", "Writer", "Journalist / Media", "Curator",
  "Developer", "Fashion", "Other",
]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FORBIDDEN_MEMBER_FIELDS = new Set(["user_id", "is_certified", "certified_at"]);
const PROFILE_FIELDS = [
  "display_name", "bio", "city", "country", "profile_image_url", "banner_image_url",
  "creator_type", "disciplines", "instagram_url", "website_url", "spotify_url", "soundcloud_url",
] as const;

type ProfileField = typeof PROFILE_FIELDS[number];

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function nullableText(value: unknown, max: number): string | null {
  const result = text(value, max);
  return result || null;
}

function parseUrl(value: unknown, field: string): { value?: string | null; error?: string } {
  if (value === null || value === undefined || value === "") return { value: null };
  const candidate = text(value, 500);
  try {
    const url = new URL(candidate);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error();
    return { value: url.toString() };
  } catch {
    return { error: `${field} must be a valid http(s) URL` };
  }
}

function parseDisciplines(value: unknown): { value?: string[]; error?: string } {
  if (!Array.isArray(value)) return { error: "disciplines must be an array" };
  const disciplines = Array.from(new Set(value
    .filter((item): item is string => typeof item === "string")
    .map(item => item.trim())
    .filter(Boolean)));
  if (disciplines.length > 10 || disciplines.some(item => item.length > 50 || !DISCIPLINES.has(item))) {
    return { error: "disciplines contains an invalid value" };
  }
  return { value: disciplines };
}

function publicProfile(row: any, listings: any[] = []) {
  return {
    username: row.username,
    display_name: row.display_name,
    bio: row.bio,
    city: row.city,
    country: row.country,
    profile_image_url: row.profile_image_url,
    banner_image_url: row.banner_image_url,
    creator_type: row.creator_type,
    disciplines: row.disciplines ?? [],
    instagram_url: row.instagram_url,
    website_url: row.website_url,
    spotify_url: row.spotify_url,
    soundcloud_url: row.soundcloud_url,
    is_certified: row.is_certified,
    certified_at: row.certified_at,
    created_at: row.created_at,
    active_marketplace_listings: listings,
  };
}

async function loadProfileByUserId(userId: string) {
  const result = await pool.query(
    `SELECT c.*, u.username
     FROM creator_profiles c
     JOIN users u ON u.id=c.user_id
     WHERE c.user_id=$1 LIMIT 1`,
    [userId],
  );
  return result.rows[0] ?? null;
}

function validateFields(body: any, partial: boolean): { values?: Record<string, unknown>; error?: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { error: "Invalid profile data" };
  const forbidden = Object.keys(body).find(key => FORBIDDEN_MEMBER_FIELDS.has(key));
  if (forbidden) return { error: `${forbidden} cannot be changed by a Member` };

  const values: Record<string, unknown> = {};
  if (!partial || body.display_name !== undefined) {
    values.display_name = text(body.display_name, 100);
    if (!values.display_name) return { error: "display_name is required" };
  }
  if (!partial || body.bio !== undefined) values.bio = text(body.bio, 5000);
  for (const field of ["city", "country"] as const) {
    if (!partial || body[field] !== undefined) values[field] = nullableText(body[field], 100);
  }
  for (const field of ["profile_image_url", "banner_image_url", "instagram_url", "website_url", "spotify_url", "soundcloud_url"] as const) {
    if (!partial || body[field] !== undefined) {
      const parsed = parseUrl(body[field], field);
      if (parsed.error) return { error: parsed.error };
      values[field] = parsed.value;
    }
  }
  if (!partial || body.creator_type !== undefined) values.creator_type = text(body.creator_type, 100);
  if (!partial || body.disciplines !== undefined) {
    const parsed = parseDisciplines(body.disciplines);
    if (parsed.error) return { error: parsed.error };
    values.disciplines = parsed.value;
  }
  return { values };
}

export function registerCreatorRoutes(app: Express) {
  app.get("/api/admin/creators", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT c.id, c.user_id, c.display_name, c.creator_type, c.disciplines,
                c.is_certified, c.certified_at, c.created_at, u.username
         FROM creator_profiles c
         JOIN users u ON u.id=c.user_id
         ORDER BY c.created_at DESC`,
      );
      return res.json(result.rows);
    } catch (error) {
      console.error("[creator-routes] admin list:", error);
      return res.status(500).json({ error: "Failed to fetch creator profiles" });
    }
  });

  app.get("/api/creators/:username", async (req: Request, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT c.*, u.username
         FROM creator_profiles c JOIN users u ON u.id=c.user_id
         WHERE LOWER(u.username)=LOWER($1) LIMIT 1`,
        [req.params.username],
      );
      const row = result.rows[0];
      if (!row) return res.status(404).json({ error: "Creator profile not found" });
      const listings = await pool.query(
        `SELECT id, title, description, category, price_amount, currency, price_type,
                city, delivery_mode, status, created_at, updated_at,
                r.name AS room_name, r.slug AS room_slug
         FROM marketplace_listings l
         LEFT JOIN rooms r ON r.id=l.room_id
         WHERE creator_user_id=$1 AND status='active'
         ORDER BY created_at DESC`,
        [row.user_id],
      );
      return res.json(publicProfile(row, listings.rows));
    } catch (error) {
      console.error("[creator-routes] public profile:", error);
      return res.status(500).json({ error: "Failed to fetch creator profile" });
    }
  });

  app.get("/api/creator/me", requireUser, async (req: Request, res: Response) => {
    try {
      const user = (req as any).currentUser;
      const row = await loadProfileByUserId(user.userId);
      return res.json(row ? publicProfile(row) : { profile: null });
    } catch (error) {
      console.error("[creator-routes] me:", error);
      return res.status(500).json({ error: "Failed to fetch creator profile" });
    }
  });

  app.post("/api/creator", requireUser, async (req: Request, res: Response) => {
    try {
      const user = (req as any).currentUser;
      const parsed = validateFields(req.body, false);
      if (parsed.error) return res.status(400).json({ error: parsed.error });
      const existing = await loadProfileByUserId(user.userId);
      if (existing) return res.status(409).json({ error: "Creator profile already exists" });
      const fields = Object.keys(parsed.values!);
      const values = fields.map(field => parsed.values![field]);
      const placeholders = fields.map((_, index) => `$${index + 2}`);
      const result = await pool.query(
        `INSERT INTO creator_profiles (user_id, ${fields.join(", ")})
         VALUES ($1, ${placeholders.join(", ")}) RETURNING *`,
        [user.userId, ...values],
      );
      const userResult = await pool.query("SELECT username FROM users WHERE id=$1", [user.userId]);
      return res.status(201).json(publicProfile({ ...result.rows[0], username: userResult.rows[0]?.username }));
    } catch (error: any) {
      if (error?.code === "23505") return res.status(409).json({ error: "Creator profile already exists" });
      console.error("[creator-routes] create:", error);
      return res.status(500).json({ error: "Failed to create creator profile" });
    }
  });

  app.patch("/api/creator", requireUser, async (req: Request, res: Response) => {
    try {
      const user = (req as any).currentUser;
      const parsed = validateFields(req.body, true);
      if (parsed.error) return res.status(400).json({ error: parsed.error });
      const fields = Object.keys(parsed.values!);
      if (!fields.length) return res.status(400).json({ error: "No editable fields supplied" });
      const values = fields.map(field => parsed.values![field]);
      const sets = fields.map((field, index) => `${field}=$${index + 2}`);
      const result = await pool.query(
        `UPDATE creator_profiles SET ${sets.join(", ")}, updated_at=NOW()
         WHERE user_id=$1 RETURNING *`,
        [user.userId, ...values],
      );
      if (!result.rows[0]) return res.status(404).json({ error: "Creator profile not found" });
      const userResult = await pool.query("SELECT username FROM users WHERE id=$1", [user.userId]);
      return res.json(publicProfile({ ...result.rows[0], username: userResult.rows[0]?.username }));
    } catch (error) {
      console.error("[creator-routes] update:", error);
      return res.status(500).json({ error: "Failed to update creator profile" });
    }
  });

  app.patch("/api/admin/creators/:id/certification", requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      if (!UUID_PATTERN.test(id)) return res.status(400).json({ error: "Creator ID must be a valid UUID" });
      if (typeof req.body?.certified !== "boolean") {
        return res.status(400).json({ error: "certified must be a boolean" });
      }
      const certified = req.body.certified;
      const result = await pool.query(
        `UPDATE creator_profiles
         SET is_certified=$2, certified_at=CASE WHEN $2 THEN NOW() ELSE NULL END, updated_at=NOW()
         WHERE id=$1 RETURNING id, user_id, is_certified, certified_at, updated_at`,
        [id, certified],
      );
      if (!result.rows[0]) return res.status(404).json({ error: "Creator profile not found" });
      return res.json(result.rows[0]);
    } catch (error) {
      console.error("[creator-routes] certification:", error);
      return res.status(500).json({ error: "Failed to update certification" });
    }
  });
}