import type { Express, Request, Response } from "express";
import { pool } from "./db";
import { getRequestUser, requireUser } from "./user-auth";
import { emitActivitySafely } from "./activity-service";

const CATEGORIES = ["Music", "Visual", "Fashion", "Media"] as const;

function clean(value: unknown, max = 500): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function roomVisibility(value: unknown): "public" | "private" {
  return value === "private" ? "private" : "public";
}

export function registerRoomsRoutes(app: Express) {
  app.get("/api/rooms", async (req: Request, res: Response) => {
    try {
      const category = clean(req.query.category, 30);
      const user = await getRequestUser(req);
      const result = await pool.query(
        `SELECT r.id, r.name, r.slug, r.description, r.category, r.visibility,
                r.owner_user_id, r.created_at,
                COUNT(DISTINCT m.id)::int AS member_count,
                 (SELECT COUNT(*)::int
                  FROM creator_work_items w
                  WHERE w.room_id=r.id) AS work_count,
                 (SELECT COUNT(*)::int
                  FROM marketplace_listings l
                  WHERE l.room_id=r.id AND l.status='active') AS listing_count,
                CASE WHEN $2::uuid IS NULL THEN false
                     ELSE EXISTS (SELECT 1 FROM room_memberships x WHERE x.room_id=r.id AND x.user_id=$2::uuid)
                END AS joined
         FROM rooms r
         LEFT JOIN room_memberships m ON m.room_id=r.id
         WHERE r.visibility='public' AND ($1='' OR r.category=$1)
         GROUP BY r.id
         ORDER BY r.owner_user_id IS NULL DESC, r.created_at ASC`,
        [category, user?.userId ?? null],
      );
      res.json({ categories: CATEGORIES, rooms: result.rows });
    } catch (error) {
      console.error("[rooms] browse:", error);
      res.status(500).json({ error: "Failed to load Rooms" });
    }
  });

  app.get("/api/rooms/:id", async (req: Request, res: Response) => {
    try {
      const user = await getRequestUser(req);
      const result = await pool.query(
        `SELECT r.id, r.name, r.slug, r.description, r.category, r.visibility,
                r.owner_user_id, r.created_at,
                COUNT(DISTINCT m.id)::int AS member_count,
                CASE WHEN $2::uuid IS NULL THEN false
                     ELSE EXISTS (SELECT 1 FROM room_memberships x WHERE x.room_id=r.id AND x.user_id=$2::uuid)
                END AS joined,
                CASE WHEN r.owner_user_id=$2::uuid THEN true ELSE false END AS is_owner,
                u.username AS owner_username, u.display_name AS owner_display_name
         FROM rooms r
         LEFT JOIN room_memberships m ON m.room_id=r.id
         LEFT JOIN users u ON u.id=r.owner_user_id
         WHERE r.id=$1 AND (r.visibility='public' OR r.owner_user_id=$2::uuid
           OR EXISTS (SELECT 1 FROM room_memberships x WHERE x.room_id=r.id AND x.user_id=$2::uuid))
         GROUP BY r.id, u.username, u.display_name`,
        [req.params.id, user?.userId ?? null],
      );
      if (!result.rows[0]) return res.status(404).json({ error: "Room not found" });
      res.json(result.rows[0]);
    } catch (error) {
      console.error("[rooms] detail:", error);
      res.status(500).json({ error: "Failed to load Room" });
    }
  });

  app.get("/api/rooms/:id/work", async (req: Request, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT w.id, w.title, w.description, w.work_type, w.external_url,
                w.thumbnail_url, w.room_id, w.sort_order, w.is_featured,
                w.created_at, w.updated_at,
                u.username AS creator_username,
                c.display_name AS creator_display_name,
                c.is_certified AS creator_is_certified
         FROM creator_work_items w
         JOIN rooms r ON r.id=w.room_id
         JOIN users u ON u.id=w.creator_user_id
         JOIN creator_profiles c ON c.user_id=w.creator_user_id
         WHERE r.id=$1 AND r.visibility='public'
         ORDER BY w.is_featured DESC, w.sort_order ASC, w.created_at DESC`,
        [req.params.id],
      );
      return res.json(result.rows);
    } catch (error) {
      console.error("[rooms] work:", error);
      return res.status(500).json({ error: "Failed to load Room Work" });
    }
  });

  app.post("/api/rooms", requireUser, async (req: Request, res: Response) => {
    const user = (req as any).currentUser as { userId: string };
    const name = clean(req.body?.name, 80);
    const description = clean(req.body?.description, 500);
    const category = clean(req.body?.category, 30);
    const visibility = roomVisibility(req.body?.visibility);
    if (name.length < 3 || !CATEGORIES.includes(category as any)) {
      return res.status(400).json({ error: "Name and a valid category are required" });
    }
    try {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const room = await client.query(
          `INSERT INTO rooms (name, slug, description, category, visibility, owner_user_id)
           VALUES ($1, lower(regexp_replace($1, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(gen_random_uuid()::text,1,8), $2, $3, $4, $5)
           RETURNING id, name, slug, description, category, visibility, owner_user_id, created_at`,
          [name, description, category, visibility, user.userId],
        );
        await client.query(
          `INSERT INTO room_memberships (room_id, user_id) VALUES ($1, $2)`,
          [room.rows[0].id, user.userId],
        );
        await client.query("COMMIT");
        res.status(201).json({ ...room.rows[0], joined: true, member_count: 1 });
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("[rooms] create:", error);
      res.status(500).json({ error: "Failed to create Room" });
    }
  });

  app.post("/api/rooms/:id/join", requireUser, async (req: Request, res: Response) => {
    const user = (req as any).currentUser as { userId: string; username: string };
    try {
      const room = await pool.query(
        `SELECT r.id, r.name, r.owner_user_id
         FROM rooms r
         WHERE r.id=$1 AND r.visibility='public'`,
        [req.params.id],
      );
      if (!room.rows[0]) return res.status(404).json({ error: "Public Room not found" });
      const joined = await pool.query(
        `INSERT INTO room_memberships (room_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [req.params.id, user.userId],
      );

      if (joined.rowCount && room.rows[0].owner_user_id && room.rows[0].owner_user_id !== user.userId) {
        await emitActivitySafely(
          {
            recipientUserId: room.rows[0].owner_user_id,
            actorUserId: user.userId,
            eventType: "room_member_joined",
            title: "New Room member",
            body: `${user.username} joined ${room.rows[0].name}`,
            targetUrl: `/rooms/${room.rows[0].id}`,
            entityType: "room",
            entityId: room.rows[0].id,
            dedupeKey: `roomjoin:${room.rows[0].id}:${user.userId}`,
          },
          "Room member join",
        );
      }

      res.json({ joined: true });
    } catch (error) {
      console.error("[rooms] join:", error);
      res.status(500).json({ error: "Failed to join Room" });
    }
  });

  app.delete("/api/rooms/:id/leave", requireUser, async (req: Request, res: Response) => {
    const user = (req as any).currentUser as { userId: string };
    try {
      const room = await pool.query("SELECT owner_user_id FROM rooms WHERE id=$1", [req.params.id]);
      if (!room.rows[0]) return res.status(404).json({ error: "Room not found" });
      if (room.rows[0].owner_user_id === user.userId) {
        return res.status(400).json({ error: "Room owners cannot leave their Room" });
      }
      await pool.query("DELETE FROM room_memberships WHERE room_id=$1 AND user_id=$2", [req.params.id, user.userId]);
      res.json({ joined: false });
    } catch (error) {
      console.error("[rooms] leave:", error);
      res.status(500).json({ error: "Failed to leave Room" });
    }
  });

  app.get("/api/rooms/:id/members", async (req: Request, res: Response) => {
    try {
      const user = await getRequestUser(req);
      const access = await pool.query(
        `SELECT 1 FROM rooms r
         WHERE r.id=$1 AND (r.visibility='public' OR r.owner_user_id=$2::uuid
           OR EXISTS (SELECT 1 FROM room_memberships x WHERE x.room_id=r.id AND x.user_id=$2::uuid))`,
        [req.params.id, user?.userId ?? null],
      );
      if (!access.rows[0]) return res.status(404).json({ error: "Room not found" });
      const result = await pool.query(
        `SELECT u.id, u.username, u.display_name, p.avatar_url, m.joined_at,
                (r.owner_user_id=u.id) AS owner
         FROM room_memberships m JOIN users u ON u.id=m.user_id
         LEFT JOIN user_profiles p ON p.user_id=u.id
         JOIN rooms r ON r.id=m.room_id
         WHERE m.room_id=$1 ORDER BY owner DESC, m.joined_at ASC`,
        [req.params.id],
      );
      res.json(result.rows);
    } catch (error) {
      console.error("[rooms] members:", error);
      res.status(500).json({ error: "Failed to load members" });
    }
  });

  app.get("/api/rooms/:id/posts", async (req: Request, res: Response) => {
    try {
      const user = await getRequestUser(req);
      const access = await pool.query(
        `SELECT 1 FROM rooms r
         WHERE r.id=$1 AND (r.visibility='public' OR r.owner_user_id=$2::uuid
           OR EXISTS (SELECT 1 FROM room_memberships x WHERE x.room_id=r.id AND x.user_id=$2::uuid))`,
        [req.params.id, user?.userId ?? null],
      );
      if (!access.rows[0]) return res.status(404).json({ error: "Room not found" });
      const result = await pool.query(
        `SELECT p.id, p.body, p.created_at, u.username, u.display_name, up.avatar_url
         FROM room_posts p JOIN users u ON u.id=p.user_id
         LEFT JOIN user_profiles up ON up.user_id=u.id
         WHERE p.room_id=$1 ORDER BY p.created_at DESC`,
        [req.params.id],
      );
      res.json(result.rows);
    } catch (error) {
      console.error("[rooms] posts:", error);
      res.status(500).json({ error: "Failed to load feed" });
    }
  });

  app.post("/api/rooms/:id/posts", requireUser, async (req: Request, res: Response) => {
    const user = (req as any).currentUser as { userId: string };
    const body = clean(req.body?.body, 2000);
    if (!body) return res.status(400).json({ error: "Post cannot be empty" });
    try {
      const result = await pool.query(
        `INSERT INTO room_posts (room_id, user_id, body)
         SELECT $1, $2, $3 WHERE EXISTS (
           SELECT 1 FROM room_memberships WHERE room_id=$1 AND user_id=$2
         )
         RETURNING id, body, created_at`,
        [req.params.id, user.userId, body],
      );
      if (!result.rows[0]) return res.status(403).json({ error: "Join this Room to post" });
      const author = await pool.query("SELECT username, display_name FROM users WHERE id=$1", [user.userId]);
      res.status(201).json({ ...result.rows[0], ...author.rows[0] });
    } catch (error) {
      console.error("[rooms] post:", error);
      res.status(500).json({ error: "Failed to publish post" });
    }
  });

}