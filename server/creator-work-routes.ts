import type { Express, Request, Response } from "express";
import { pool } from "./db";
import { requireUser } from "./user-auth";
import { emitActivitiesSafely } from "./activity-service";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const WORK_TYPES = new Set([
  "Music",
  "Photography",
  "Artwork",
  "Fashion",
  "Video",
  "Writing / Media",
  "Web / Development",
  "Design",
  "Other",
]);
const EDITABLE_FIELDS = [
  "title",
  "description",
  "work_type",
  "external_url",
  "thumbnail_url",
  "room_id",
  "sort_order",
  "is_featured",
] as const;

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function nullableText(value: unknown, max: number): string | null {
  const result = text(value, max);
  return result || null;
}

function parseUrl(value: unknown, field: string): { value?: string | null; error?: string } {
  if (value === null || value === undefined || value === "") return { value: null };
  const candidate = text(value, 1000);
  try {
    const url = new URL(candidate);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error();
    return { value: url.toString() };
  } catch {
    return { error: `${field} must be a valid http(s) URL` };
  }
}

function parseWorkType(value: unknown): { value?: string; error?: string } {
  const workType = text(value, 50);
  if (!WORK_TYPES.has(workType)) return { error: "work_type is invalid" };
  return { value: workType };
}

function parseSortOrder(value: unknown): { value?: number; error?: string } {
  if (value === undefined) return { value: 0 };
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 1000000) {
    return { error: "sort_order must be a non-negative integer" };
  }
  return { value };
}

function parseRoomId(value: unknown): { value?: string | null; error?: string } {
  if (value === null || value === undefined || value === "") return { value: null };
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    return { error: "room_id must be a valid UUID" };
  }
  return { value };
}

function publicWork(row: any) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    work_type: row.work_type,
    external_url: row.external_url,
    thumbnail_url: row.thumbnail_url,
    room_id: row.room_id,
    room_name: row.room_name ?? null,
    room_slug: row.room_slug ?? null,
    sort_order: row.sort_order,
    is_featured: row.is_featured,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function validateCreate(body: any): { values?: Record<string, unknown>; error?: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { error: "Invalid work data" };
  if ("creator_user_id" in body) return { error: "creator_user_id cannot be supplied by a Member" };
  const title = text(body.title, 200);
  if (!title) return { error: "title is required" };
  const workType = parseWorkType(body.work_type);
  if (workType.error) return { error: workType.error };
  const externalUrl = parseUrl(body.external_url, "external_url");
  if (externalUrl.error) return { error: externalUrl.error };
  const thumbnailUrl = parseUrl(body.thumbnail_url, "thumbnail_url");
  if (thumbnailUrl.error) return { error: thumbnailUrl.error };
  const roomId = parseRoomId(body.room_id);
  if (roomId.error) return { error: roomId.error };
  const sortOrder = parseSortOrder(body.sort_order);
  if (sortOrder.error) return { error: sortOrder.error };
  if (body.is_featured !== undefined && typeof body.is_featured !== "boolean") {
    return { error: "is_featured must be a boolean" };
  }
  return {
    values: {
      title,
      description: text(body.description, 5000),
      work_type: workType.value,
      external_url: externalUrl.value,
      thumbnail_url: thumbnailUrl.value,
      room_id: roomId.value,
      sort_order: sortOrder.value,
      is_featured: body.is_featured ?? false,
    },
  };
}

function validateUpdate(body: any): { values?: Record<string, unknown>; error?: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { error: "Invalid work data" };
  if ("creator_user_id" in body) return { error: "creator_user_id cannot be changed by a Member" };
  const values: Record<string, unknown> = {};
  const supplied = EDITABLE_FIELDS.filter(field => body[field] !== undefined);
  if (!supplied.length) return { error: "No editable fields supplied" };

  if (body.title !== undefined) {
    values.title = text(body.title, 200);
    if (!values.title) return { error: "title cannot be empty" };
  }
  if (body.description !== undefined) values.description = text(body.description, 5000);
  if (body.work_type !== undefined) {
    const workType = parseWorkType(body.work_type);
    if (workType.error) return { error: workType.error };
    values.work_type = workType.value;
  }
  for (const field of ["external_url", "thumbnail_url"] as const) {
    if (body[field] !== undefined) {
      const parsed = parseUrl(body[field], field);
      if (parsed.error) return { error: parsed.error };
      values[field] = parsed.value;
    }
  }
  if (body.room_id !== undefined) {
    const roomId = parseRoomId(body.room_id);
    if (roomId.error) return { error: roomId.error };
    values.room_id = roomId.value;
  }
  if (body.sort_order !== undefined) {
    const sortOrder = parseSortOrder(body.sort_order);
    if (sortOrder.error) return { error: sortOrder.error };
    values.sort_order = sortOrder.value;
  }
  if (body.is_featured !== undefined) {
    if (typeof body.is_featured !== "boolean") return { error: "is_featured must be a boolean" };
    values.is_featured = body.is_featured;
  }
  return { values };
}

async function creatorProfileExists(userId: string): Promise<boolean> {
  const result = await pool.query("SELECT 1 FROM creator_profiles WHERE user_id=$1 LIMIT 1", [userId]);
  return Boolean(result.rows[0]);
}

async function validateRoomAssociation(userId: string, roomId: string | null) {
  if (!roomId) return null;
  const result = await pool.query(
    `SELECT r.id
     FROM rooms r
     JOIN room_memberships rm ON rm.room_id=r.id AND rm.user_id=$2
     WHERE r.id=$1 AND r.visibility='public'
     LIMIT 1`,
    [roomId, userId],
  );
  return result.rows[0] ? null : "room_id must reference a public Room the Creator belongs to";
}

async function featuredLimitReached(client: { query: Function }, userId: string, workId?: string) {
  const result = await client.query(
    `SELECT COUNT(*)::int AS count
     FROM creator_work_items
     WHERE creator_user_id=$1 AND is_featured=true ${workId ? "AND id<>$2" : ""}`,
    workId ? [userId, workId] : [userId],
  );
  return Number(result.rows[0]?.count ?? 0) >= 3;
}

export function registerCreatorWorkRoutes(app: Express) {
  app.get("/api/creator/work", requireUser, async (req: Request, res: Response) => {
    try {
      const user = (req as any).currentUser;
      const result = await pool.query(
        `SELECT w.*, r.name AS room_name, r.slug AS room_slug
         FROM creator_work_items w
         LEFT JOIN rooms r ON r.id=w.room_id AND r.visibility='public'
         WHERE w.creator_user_id=$1
         ORDER BY w.is_featured DESC, w.sort_order ASC, w.created_at DESC`,
        [user.userId],
      );
      return res.json(result.rows.map(publicWork));
    } catch (error) {
      console.error("[creator-work-routes] own list:", error);
      return res.status(500).json({ error: "Failed to fetch Creator Work" });
    }
  });

  app.post("/api/creator/work", requireUser, async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const user = (req as any).currentUser;
      const parsed = validateCreate(req.body);
      if (parsed.error) return res.status(400).json({ error: parsed.error });
      if (!(await creatorProfileExists(user.userId))) {
        return res.status(409).json({ error: "Create a Creator Profile before adding Work" });
      }
      const roomError = await validateRoomAssociation(user.userId, parsed.values!.room_id as string | null);
      if (roomError) return res.status(400).json({ error: roomError });

      await client.query("BEGIN");
      await client.query("SELECT id FROM creator_profiles WHERE user_id=$1 FOR UPDATE", [user.userId]);
      if (parsed.values!.is_featured && await featuredLimitReached(client, user.userId)) {
        await client.query("ROLLBACK");
        return res.status(409).json({ error: "A Creator may have at most 3 featured Work items" });
      }
      const result = await client.query(
        `INSERT INTO creator_work_items
          (creator_user_id, title, description, work_type, external_url, thumbnail_url, room_id, sort_order, is_featured)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING *`,
        [user.userId, ...Object.values(parsed.values!)],
      );
      await client.query("COMMIT");

      const createdWork = result.rows[0];
      if (createdWork.room_id) {
        try {
          const members = await pool.query(
            `SELECT rm.user_id, r.name
             FROM room_memberships rm
             JOIN rooms r ON r.id=rm.room_id
             WHERE rm.room_id=$1
               AND rm.user_id<>$2`,
            [createdWork.room_id, user.userId],
          );

          await emitActivitiesSafely(
            members.rows.map(member => ({
              recipientUserId: member.user_id,
              actorUserId: user.userId,
              eventType: "creator_work_added" as const,
              title: `New Work in ${member.name}`,
              body: `@${user.username} added ${createdWork.title}`,
              targetUrl: `/rooms/${createdWork.room_id}`,
              entityType: "creator_work",
              entityId: createdWork.id,
              dedupeKey: `roomwork:${createdWork.id}:${member.user_id}`,
            })),
            "Creator Work",
          );
        } catch (error) {
          console.error("[activity] Creator Work recipient lookup failed", error instanceof Error ? error.message : "Unknown error");
        }
      }

      return res.status(201).json(publicWork(result.rows[0]));
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      console.error("[creator-work-routes] create:", error);
      return res.status(500).json({ error: "Failed to create Creator Work" });
    } finally {
      client.release();
    }
  });

  app.patch("/api/creator/work/:id", requireUser, async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const user = (req as any).currentUser;
      if (!UUID_PATTERN.test(req.params.id)) return res.status(400).json({ error: "Work ID must be a valid UUID" });
      const parsed = validateUpdate(req.body);
      if (parsed.error) return res.status(400).json({ error: parsed.error });
      if (parsed.values!.room_id !== undefined) {
        const roomError = await validateRoomAssociation(user.userId, parsed.values!.room_id as string | null);
        if (roomError) return res.status(400).json({ error: roomError });
      }

      await client.query("BEGIN");
      await client.query("SELECT id FROM creator_profiles WHERE user_id=$1 FOR UPDATE", [user.userId]);
      const existing = await client.query(
        "SELECT id, is_featured FROM creator_work_items WHERE id=$1 AND creator_user_id=$2 FOR UPDATE",
        [req.params.id, user.userId],
      );
      if (!existing.rows[0]) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Creator Work item not found" });
      }
      if (parsed.values!.is_featured === true && !existing.rows[0].is_featured &&
          await featuredLimitReached(client, user.userId, req.params.id)) {
        await client.query("ROLLBACK");
        return res.status(409).json({ error: "A Creator may have at most 3 featured Work items" });
      }
      const fields = Object.keys(parsed.values!);
      const values = fields.map(field => parsed.values![field]);
      const sets = fields.map((field, index) => `${field}=$${index + 2}`);
      const result = await client.query(
        `UPDATE creator_work_items SET ${sets.join(", ")}, updated_at=NOW()
         WHERE id=$1 AND creator_user_id=$${fields.length + 2}
         RETURNING *`,
        [req.params.id, ...values, user.userId],
      );
      await client.query("COMMIT");
      return res.json(publicWork(result.rows[0]));
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      console.error("[creator-work-routes] update:", error);
      return res.status(500).json({ error: "Failed to update Creator Work" });
    } finally {
      client.release();
    }
  });

  app.delete("/api/creator/work/:id", requireUser, async (req: Request, res: Response) => {
    try {
      const user = (req as any).currentUser;
      if (!UUID_PATTERN.test(req.params.id)) return res.status(400).json({ error: "Work ID must be a valid UUID" });
      const result = await pool.query(
        "DELETE FROM creator_work_items WHERE id=$1 AND creator_user_id=$2 RETURNING id",
        [req.params.id, user.userId],
      );
      if (!result.rows[0]) return res.status(404).json({ error: "Creator Work item not found" });
      return res.status(204).send();
    } catch (error) {
      console.error("[creator-work-routes] delete:", error);
      return res.status(500).json({ error: "Failed to delete Creator Work" });
    }
  });

  app.get("/api/creators/:username/work", async (req: Request, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT w.*, r.name AS room_name, r.slug AS room_slug
         FROM creator_work_items w
         JOIN creator_profiles c ON c.user_id=w.creator_user_id
         JOIN users u ON u.id=c.user_id
         LEFT JOIN rooms r ON r.id=w.room_id
         WHERE LOWER(u.username)=LOWER($1)
         ORDER BY w.is_featured DESC, w.sort_order ASC, w.created_at DESC`,
        [req.params.username],
      );
      return res.json(result.rows.map(publicWork));
    } catch (error) {
      console.error("[creator-work-routes] public list:", error);
      return res.status(500).json({ error: "Failed to fetch Creator Work" });
    }
  });
}