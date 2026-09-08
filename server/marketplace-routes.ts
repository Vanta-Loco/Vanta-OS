import type { Express, Request, Response } from "express";
import { pool } from "./db";
import { requireUser } from "./user-auth";

const CATEGORIES = [
  "Beats", "Recording", "Mixing & Mastering", "Artwork", "Photography",
  "Video", "Styling", "Modeling", "Songwriting", "Fashion Design",
  "Web / Development", "Other",
] as const;
const PRICE_TYPES = ["fixed", "negotiable", "contact"] as const;
const DELIVERY_MODES = ["remote", "in_person", "both"] as const;
const STATUSES = ["active", "paused", "closed"] as const;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ListingInput = {
  title: string;
  description: string;
  category: string;
  price_amount: string | null;
  currency: string;
  price_type: string;
  city: string | null;
  delivery_mode: string;
  room_id: string | null;
};

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function optionalText(value: unknown, max: number): string | null {
  const valueText = text(value, max);
  return valueText || null;
}

function isOneOf<T extends readonly string[]>(value: string, values: T): value is T[number] {
  return values.includes(value);
}

function normalizePrice(value: unknown): string | null | undefined {
  if (value === null || value === undefined || value === "") return null;
  const valueText = typeof value === "number" ? String(value) : typeof value === "string" ? value.trim() : "";
  if (!/^\d+(?:\.\d{1,2})?$/.test(valueText)) return undefined;
  if (Number(valueText) <= 0 || Number(valueText) > 9999999999.99) return undefined;
  return valueText;
}

function validateInput(source: any, partial = false): { input?: Partial<ListingInput>; error?: string } {
  const input: Partial<ListingInput> = {};
  if (!partial || source.title !== undefined) {
    input.title = text(source.title, 120);
    if (input.title.length < 3) return { error: "Title must be at least 3 characters" };
  }
  if (!partial || source.description !== undefined) {
    input.description = text(source.description, 3000);
    if (input.description.length < 1) return { error: "Description is required" };
  }
  if (!partial || source.category !== undefined) {
    input.category = text(source.category, 40);
    if (!isOneOf(input.category, CATEGORIES)) return { error: "A valid category is required" };
  }
  if (!partial || source.price_type !== undefined) {
    input.price_type = text(source.price_type, 20);
    if (!isOneOf(input.price_type, PRICE_TYPES)) return { error: "A valid price type is required" };
  }
  if (!partial || source.delivery_mode !== undefined) {
    input.delivery_mode = text(source.delivery_mode, 20);
    if (!isOneOf(input.delivery_mode, DELIVERY_MODES)) return { error: "A valid delivery mode is required" };
  }
  if (!partial || source.price_amount !== undefined) {
    const price = normalizePrice(source.price_amount);
    if (price === undefined) return { error: "Price must be a positive amount with up to two decimals" };
    input.price_amount = price;
  }
  if (!partial || source.currency !== undefined) {
    input.currency = text(source.currency || "ZAR", 3).toUpperCase();
    if (!/^[A-Z]{3}$/.test(input.currency)) return { error: "Currency must be a three-letter code" };
  }
  if (!partial || source.city !== undefined) input.city = optionalText(source.city, 100);
  if (!partial || source.room_id !== undefined) {
    if (source.room_id === null || source.room_id === "") input.room_id = null;
    else {
      input.room_id = text(source.room_id, 50);
      if (!UUID_PATTERN.test(input.room_id)) return { error: "Room ID must be a valid UUID" };
    }
  }

  const priceType = input.price_type;
  const price = input.price_amount;
  if (priceType === "fixed" && (!price || Number(price) <= 0)) {
    return { error: "Fixed pricing requires a positive price" };
  }
  return { input };
}

async function validateRoomAssociation(roomId: string | null, userId: string): Promise<boolean> {
  if (!roomId) return true;
  const result = await pool.query(
    `SELECT 1 FROM rooms r
     WHERE r.id=$1 AND r.visibility='public'
       AND EXISTS (
         SELECT 1 FROM room_memberships m WHERE m.room_id=r.id AND m.user_id=$2
       )`,
    [roomId, userId],
  );
  return Boolean(result.rows[0]);
}

const listingSelect = `
  SELECT l.id, l.creator_user_id, l.room_id, l.title, l.description, l.category,
         l.price_amount, l.currency, l.price_type, l.city, l.delivery_mode,
         l.status, l.created_at, l.updated_at,
         u.username AS creator_username, u.display_name AS creator_display_name,
         c.creator_type, c.disciplines AS creator_disciplines,
         c.is_certified AS creator_is_certified,
         CASE WHEN r.visibility='public' THEN r.name ELSE NULL END AS room_name,
         CASE WHEN r.visibility='public' THEN r.slug ELSE NULL END AS room_slug,
         r.visibility AS room_visibility, r.category AS room_category
  FROM marketplace_listings l
  JOIN users u ON u.id=l.creator_user_id
   LEFT JOIN creator_profiles c ON c.user_id=l.creator_user_id
  LEFT JOIN rooms r ON r.id=l.room_id
`;

export function registerMarketplaceRoutes(app: Express) {
  app.get("/api/marketplace", async (req: Request, res: Response) => {
    try {
      const conditions = ["l.status='active'"];
      const values: unknown[] = [];
      const addFilter = (sql: string, value: unknown) => {
        values.push(value);
        conditions.push(sql.replace("?", `$${values.length}`));
      };
      const category = text(req.query.category, 40);
      const city = text(req.query.city, 100);
      const deliveryMode = text(req.query.delivery_mode, 20);
      const roomId = text(req.query.room_id, 50);
      if (category) {
        if (!isOneOf(category, CATEGORIES)) return res.status(400).json({ error: "Invalid category filter" });
        addFilter("l.category=?", category);
      }
      if (city) addFilter("l.city ILIKE ?", `%${city}%`);
      if (deliveryMode) {
        if (!isOneOf(deliveryMode, DELIVERY_MODES)) return res.status(400).json({ error: "Invalid delivery mode filter" });
        addFilter("l.delivery_mode=?", deliveryMode);
      }
      if (roomId) {
        if (!UUID_PATTERN.test(roomId)) return res.status(400).json({ error: "Room ID must be a valid UUID" });
        addFilter("l.room_id=?", roomId);
      }
      const result = await pool.query(
        `${listingSelect} WHERE ${conditions.join(" AND ")} ORDER BY l.created_at DESC`,
        values,
      );
      res.json({ categories: CATEGORIES, listings: result.rows });
    } catch (error) {
      console.error("[marketplace] browse:", error);
      res.status(500).json({ error: "Failed to load Marketplace listings" });
    }
  });

  app.get("/api/marketplace/:id", async (req: Request, res: Response) => {
    if (!UUID_PATTERN.test(req.params.id)) return res.status(404).json({ error: "Listing not found" });
    try {
      const result = await pool.query(
        `${listingSelect} WHERE l.id=$1 AND l.status='active'`,
        [req.params.id],
      );
      if (!result.rows[0]) return res.status(404).json({ error: "Listing not found" });
      res.json(result.rows[0]);
    } catch (error) {
      console.error("[marketplace] detail:", error);
      res.status(500).json({ error: "Failed to load listing" });
    }
  });

  app.post("/api/marketplace", requireUser, async (req: Request, res: Response) => {
    const user = (req as any).currentUser as { userId: string };
    const validation = validateInput(req.body || {});
    if (validation.error) return res.status(400).json({ error: validation.error });
    const input = validation.input as ListingInput;
    try {
      if (!(await validateRoomAssociation(input.room_id, user.userId))) {
        return res.status(400).json({ error: "Listings may only be associated with public Rooms you have joined" });
      }
      const result = await pool.query(
        `INSERT INTO marketplace_listings
           (creator_user_id, room_id, title, description, category, price_amount, currency, price_type, city, delivery_mode)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         RETURNING id, creator_user_id, room_id, title, description, category, price_amount, currency,
                   price_type, city, delivery_mode, status, created_at, updated_at`,
        [user.userId, input.room_id, input.title, input.description, input.category, input.price_amount,
         input.currency || "ZAR", input.price_type, input.city, input.delivery_mode],
      );
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error("[marketplace] create:", error);
      res.status(500).json({ error: "Failed to create listing" });
    }
  });

  app.patch("/api/marketplace/:id", requireUser, async (req: Request, res: Response) => {
    const user = (req as any).currentUser as { userId: string };
    if (!UUID_PATTERN.test(req.params.id)) return res.status(404).json({ error: "Listing not found" });
    const existing = await pool.query(
      "SELECT creator_user_id, title, description, category, price_amount, currency, price_type, city, delivery_mode, room_id, status FROM marketplace_listings WHERE id=$1",
      [req.params.id],
    );
    if (!existing.rows[0]) return res.status(404).json({ error: "Listing not found" });
    if (existing.rows[0].creator_user_id !== user.userId) return res.status(403).json({ error: "You can only edit your own listings" });
    const validation = validateInput(req.body || {}, true);
    if (validation.error) return res.status(400).json({ error: validation.error });
    const input = validation.input || {};
    if (req.body.status !== undefined && (!isOneOf(req.body.status, STATUSES) || req.body.status === "closed")) {
      return res.status(400).json({ error: "Status may only be active or paused; use DELETE to close a listing" });
    }
    const merged = {
      price_type: input.price_type ?? existing.rows[0].price_type,
      price_amount: input.price_amount !== undefined ? input.price_amount : existing.rows[0].price_amount,
    };
    if (merged.price_type === "fixed" && (!merged.price_amount || Number(merged.price_amount) <= 0)) {
      return res.status(400).json({ error: "Fixed pricing requires a positive price" });
    }
    const roomId = input.room_id !== undefined ? input.room_id : existing.rows[0].room_id;
    const mergedValues = {
      title: input.title ?? existing.rows[0].title,
      description: input.description ?? existing.rows[0].description,
      category: input.category ?? existing.rows[0].category,
      currency: input.currency ?? existing.rows[0].currency,
      city: input.city !== undefined ? input.city : existing.rows[0].city,
      delivery_mode: input.delivery_mode ?? existing.rows[0].delivery_mode,
      status: req.body.status ?? existing.rows[0].status,
    };
    try {
      if (!(await validateRoomAssociation(roomId, user.userId))) {
        return res.status(400).json({ error: "Listings may only be associated with public Rooms you have joined" });
      }
      const result = await pool.query(
        `UPDATE marketplace_listings SET
           title=$1, description=$2, category=$3, price_amount=$4, currency=$5,
           price_type=$6, city=$7, delivery_mode=$8, room_id=$9, status=$10, updated_at=NOW()
         WHERE id=$11 AND creator_user_id=$12
         RETURNING id, creator_user_id, room_id, title, description, category, price_amount, currency,
                   price_type, city, delivery_mode, status, created_at, updated_at`,
        [mergedValues.title, mergedValues.description, mergedValues.category,
         merged.price_amount, mergedValues.currency, merged.price_type,
         mergedValues.city, mergedValues.delivery_mode, roomId, mergedValues.status,
         req.params.id, user.userId],
      );
      res.json(result.rows[0]);
    } catch (error) {
      console.error("[marketplace] update:", error);
      res.status(500).json({ error: "Failed to update listing" });
    }
  });

  app.delete("/api/marketplace/:id", requireUser, async (req: Request, res: Response) => {
    const user = (req as any).currentUser as { userId: string };
    if (!UUID_PATTERN.test(req.params.id)) return res.status(404).json({ error: "Listing not found" });
    try {
      const result = await pool.query(
        `UPDATE marketplace_listings SET status='closed', updated_at=NOW()
         WHERE id=$1 AND creator_user_id=$2
         RETURNING id, status, updated_at`,
        [req.params.id, user.userId],
      );
      if (!result.rows[0]) {
        const listing = await pool.query("SELECT id FROM marketplace_listings WHERE id=$1", [req.params.id]);
        return res.status(listing.rows[0] ? 403 : 404).json({ error: listing.rows[0] ? "You can only close your own listings" : "Listing not found" });
      }
      res.json(result.rows[0]);
    } catch (error) {
      console.error("[marketplace] close:", error);
      res.status(500).json({ error: "Failed to close listing" });
    }
  });
}