import type { Express, Request, Response } from "express";
import { requireUser } from "./user-auth";
import { pool } from "./db";
import {
  countUnreadActivityForUser,
  hasMoreActivity,
  listActivityForUser,
  markActivityReadForUser,
  markAllActivityReadForUser,
} from "./activity-service";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;
const MAX_OFFSET = 10_000;

function boundedInteger(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === "string" ? Number.parseInt(value, 10) : Number.NaN;
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

function currentUserId(req: Request): string {
  return (req as any).currentUser.userId;
}

export function registerActivityRoutes(app: Express) {
  app.get("/api/activity", requireUser, async (req: Request, res: Response) => {
    const userId = currentUserId(req);
    const limit = boundedInteger(req.query.limit, DEFAULT_LIMIT, 1, MAX_LIMIT);
    const offset = boundedInteger(req.query.offset, 0, 0, MAX_OFFSET);

    try {
      const options = { limit, offset };
      const [items, hasMore] = await Promise.all([
        listActivityForUser(userId, options),
        hasMoreActivity(userId, options),
      ]);
      return res.json({ items, limit, offset, has_more: hasMore });
    } catch (error) {
      console.error("[activity] list:", error);
      return res.status(500).json({ error: "Failed to load Activity" });
    }
  });

  app.get("/api/activity/unread-count", requireUser, async (req: Request, res: Response) => {
    try {
      const count = await countUnreadActivityForUser(currentUserId(req));
      return res.json({ count });
    } catch (error) {
      console.error("[activity] unread count:", error);
      return res.status(500).json({ error: "Failed to load unread Activity count" });
    }
  });

  app.patch("/api/activity/:id/read", requireUser, async (req: Request, res: Response) => {
    const activityId = req.params.id;
    if (!UUID_PATTERN.test(activityId)) return res.status(404).json({ error: "Activity item not found" });

    try {
      const marked = await markActivityReadForUser(currentUserId(req), activityId);
      if (!marked) {
        const item = await pool.query(
          "SELECT 1 FROM activity_events WHERE id=$1 AND recipient_user_id=$2 LIMIT 1",
          [activityId, currentUserId(req)],
        );
        if (!item.rows[0]) return res.status(404).json({ error: "Activity item not found" });
      }
      return res.json({ id: activityId, is_read: true });
    } catch (error) {
      console.error("[activity] mark read:", error);
      return res.status(500).json({ error: "Failed to update Activity item" });
    }
  });

  app.post("/api/activity/read-all", requireUser, async (req: Request, res: Response) => {
    try {
      const updatedCount = await markAllActivityReadForUser(currentUserId(req));
      return res.json({ updated_count: updatedCount });
    } catch (error) {
      console.error("[activity] read all:", error);
      return res.status(500).json({ error: "Failed to mark Activity as read" });
    }
  });
}