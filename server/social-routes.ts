import type { Express, Request, Response } from "express";
import { pool } from "./db";
import { requireAdmin } from "./admin-auth";
import { getRequestUser, requireUser } from "./user-auth";
import {
  canFollowUser,
  parseModerationState,
  parseReportTarget,
  parseSocialText,
} from "./social-logic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const writeLimits = new Map<string, { count: number; resetAt: number }>();

function allowedWrite(key: string, maximum: number, windowMs: number): boolean {
  const now = Date.now();
  writeLimits.forEach((limit, candidate) => {
    if (limit.resetAt <= now) writeLimits.delete(candidate);
  });
  const current = writeLimits.get(key);
  if (!current || current.resetAt <= now) {
    writeLimits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= maximum) return false;
  current.count += 1;
  return true;
}

function rateLimit(req: Request, res: Response, action: string, maximum: number, windowMs: number): boolean {
  const userId = (req as any).currentUser.userId as string;
  if (allowedWrite(`${action}:${userId}`, maximum, windowMs)) return false;
  res.status(429).json({ error: "Too many requests. Please wait before trying again." });
  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function loadPublicTransmission(id: string) {
  const result = await pool.query(
    `SELECT t.id, t.body, t.created_at, t.updated_at,
            u.username, u.display_name, p.avatar_url,
            (SELECT COUNT(*)::int FROM social_comments c
             JOIN users cu ON cu.id=c.author_user_id
             WHERE c.transmission_id=t.id
               AND c.moderation_status='published'
               AND COALESCE(cu.account_status, 'active') <> 'suspended') AS comment_count
     FROM member_transmissions t
     JOIN users u ON u.id=t.author_user_id
     LEFT JOIN user_profiles p ON p.user_id=u.id
     WHERE t.id=$1
       AND t.moderation_status='published'
       AND COALESCE(u.account_status, 'active') <> 'suspended'
     LIMIT 1`,
    [id],
  );
  return result.rows[0] ?? null;
}

async function reportTargetAuthorId(targetType: string, targetId: string): Promise<string | null> {
  const allowedType = parseReportTarget(targetType);
  if (!allowedType) return null;
  const table = allowedType === "transmission"
    ? "member_transmissions"
    : allowedType === "comment"
      ? "social_comments"
      : "creator_work_items";
  const owner = allowedType === "project" ? "creator_user_id" : "author_user_id";
  const result = await pool.query(`SELECT ${owner} AS author_user_id FROM ${table} WHERE id=$1 LIMIT 1`, [targetId]);
  return result.rows[0]?.author_user_id ?? null;
}

export function registerSocialRoutes(app: Express) {
  app.get("/api/social/feed", async (req: Request, res: Response) => {
    const scope = req.query.scope === "following" ? "following" : "all";
    const user = await getRequestUser(req);
    if (scope === "following" && !user) return res.status(401).json({ error: "Sign in to view your following feed" });

    try {
      const result = await pool.query(
        `SELECT t.id, t.body, t.created_at, t.updated_at,
                u.username, u.display_name, p.avatar_url,
                (SELECT COUNT(*)::int
                 FROM social_comments c
                 JOIN users cu ON cu.id=c.author_user_id
                 WHERE c.transmission_id=t.id
                   AND c.moderation_status='published'
                   AND COALESCE(cu.account_status, 'active') <> 'suspended') AS comment_count,
                CASE WHEN $1::uuid IS NULL THEN false ELSE EXISTS (
                  SELECT 1 FROM social_follows f
                  WHERE f.follower_user_id=$1 AND f.followed_user_id=u.id
                ) END AS is_following
         FROM member_transmissions t
         JOIN users u ON u.id=t.author_user_id
         LEFT JOIN user_profiles p ON p.user_id=u.id
         WHERE t.moderation_status='published'
           AND COALESCE(u.account_status, 'active') <> 'suspended'
           AND ($2::text <> 'following' OR EXISTS (
             SELECT 1 FROM social_follows f
             WHERE f.follower_user_id=$1 AND f.followed_user_id=u.id
           ))
         ORDER BY t.created_at DESC, t.id DESC
         LIMIT 100`,
        [user?.userId ?? null, scope],
      );
      return res.json({ transmissions: result.rows });
    } catch (error) {
      console.error("[social] feed:", error);
      return res.status(500).json({ error: "Unable to load the member feed" });
    }
  });

  app.get("/api/social/users/:username/transmissions", async (req: Request, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT t.id, t.body, t.created_at, t.updated_at, u.username,
                u.display_name, p.avatar_url,
                (SELECT COUNT(*)::int FROM social_comments c
                 JOIN users cu ON cu.id=c.author_user_id
                 WHERE c.transmission_id=t.id
                   AND c.moderation_status='published'
                   AND COALESCE(cu.account_status, 'active') <> 'suspended') AS comment_count
         FROM member_transmissions t
         JOIN users u ON u.id=t.author_user_id
         LEFT JOIN user_profiles p ON p.user_id=u.id
         WHERE LOWER(u.username)=LOWER($1)
           AND t.moderation_status='published'
           AND COALESCE(u.account_status, 'active') <> 'suspended'
         ORDER BY t.created_at DESC, t.id DESC
         LIMIT 50`,
        [req.params.username],
      );
      if (!result.rows.length) {
        const profile = await pool.query(
          "SELECT 1 FROM users WHERE LOWER(username)=LOWER($1) AND COALESCE(account_status, 'active') <> 'suspended' LIMIT 1",
          [req.params.username],
        );
        if (!profile.rows[0]) return res.status(404).json({ error: "Member not found" });
      }
      return res.json({ transmissions: result.rows });
    } catch (error) {
      console.error("[social] member transmissions:", error);
      return res.status(500).json({ error: "Unable to load member Transmissions" });
    }
  });

  app.get("/api/social/follow-state/:username", async (req: Request, res: Response) => {
    try {
      const user = await getRequestUser(req);
      const result = await pool.query(
        `SELECT u.id, u.username, u.display_name,
                (SELECT COUNT(*)::int FROM social_follows f WHERE f.followed_user_id=u.id) AS follower_count,
                (SELECT COUNT(*)::int FROM social_follows f WHERE f.follower_user_id=u.id) AS following_count,
                CASE WHEN $2::uuid IS NULL THEN false ELSE EXISTS (
                  SELECT 1 FROM social_follows f
                  WHERE f.follower_user_id=$2 AND f.followed_user_id=u.id
                ) END AS is_following
         FROM users u
         WHERE LOWER(u.username)=LOWER($1)
           AND COALESCE(u.account_status, 'active') <> 'suspended'
         LIMIT 1`,
        [req.params.username, user?.userId ?? null],
      );
      if (!result.rows[0]) return res.status(404).json({ error: "Member not found" });
      const { id: _privateUserId, ...publicState } = result.rows[0];
      return res.json(publicState);
    } catch (error) {
      console.error("[social] follow state:", error);
      return res.status(500).json({ error: "Unable to load follow status" });
    }
  });

  app.post("/api/social/follows/:username", requireUser, async (req: Request, res: Response) => {
    const followerId = (req as any).currentUser.userId as string;
    if (rateLimit(req, res, "follow", 60, 60_000)) return;
    try {
      const target = await pool.query(
        "SELECT id FROM users WHERE LOWER(username)=LOWER($1) AND COALESCE(account_status, 'active') <> 'suspended' LIMIT 1",
        [req.params.username],
      );
      if (!target.rows[0]) return res.status(404).json({ error: "Member not found" });
      if (!canFollowUser(followerId, target.rows[0].id)) return res.status(400).json({ error: "You cannot follow yourself" });
      await pool.query(
        "INSERT INTO social_follows (follower_user_id, followed_user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [followerId, target.rows[0].id],
      );
      return res.json({ following: true });
    } catch (error) {
      console.error("[social] follow:", error);
      return res.status(500).json({ error: "Unable to follow this member" });
    }
  });

  app.delete("/api/social/follows/:username", requireUser, async (req: Request, res: Response) => {
    const followerId = (req as any).currentUser.userId as string;
    try {
      await pool.query(
        `DELETE FROM social_follows f
         USING users u
         WHERE f.follower_user_id=$1 AND f.followed_user_id=u.id
           AND LOWER(u.username)=LOWER($2)`,
        [followerId, req.params.username],
      );
      return res.json({ following: false });
    } catch (error) {
      console.error("[social] unfollow:", error);
      return res.status(500).json({ error: "Unable to unfollow this member" });
    }
  });

  app.post("/api/social/transmissions", requireUser, async (req: Request, res: Response) => {
    if (rateLimit(req, res, "transmission", 10, 60_000)) return;
    const body = parseSocialText(isRecord(req.body) ? req.body.body : null, 3000);
    if (body.error) return res.status(400).json({ error: body.error });
    try {
      const userId = (req as any).currentUser.userId as string;
      const result = await pool.query(
        "INSERT INTO member_transmissions (author_user_id, body) VALUES ($1, $2) RETURNING id",
        [userId, body.value],
      );
      const transmission = await loadPublicTransmission(result.rows[0].id);
      return res.status(201).json({ transmission });
    } catch (error) {
      console.error("[social] create transmission:", error);
      return res.status(500).json({ error: "Unable to publish your Transmission" });
    }
  });

  app.patch("/api/social/transmissions/:id", requireUser, async (req: Request, res: Response) => {
    if (!UUID_PATTERN.test(req.params.id)) return res.status(400).json({ error: "Transmission ID is invalid" });
    const body = parseSocialText(isRecord(req.body) ? req.body.body : null, 3000);
    if (body.error) return res.status(400).json({ error: body.error });
    try {
      const userId = (req as any).currentUser.userId as string;
      const result = await pool.query(
        `UPDATE member_transmissions SET body=$1, updated_at=NOW()
         WHERE id=$2 AND author_user_id=$3 AND moderation_status <> 'removed'
         RETURNING id`,
        [body.value, req.params.id, userId],
      );
      if (!result.rows[0]) return res.status(404).json({ error: "Transmission not found" });
      const transmission = await loadPublicTransmission(req.params.id);
      return res.json({ transmission });
    } catch (error) {
      console.error("[social] update transmission:", error);
      return res.status(500).json({ error: "Unable to update your Transmission" });
    }
  });

  app.delete("/api/social/transmissions/:id", requireUser, async (req: Request, res: Response) => {
    if (!UUID_PATTERN.test(req.params.id)) return res.status(400).json({ error: "Transmission ID is invalid" });
    try {
      const result = await pool.query(
        `UPDATE member_transmissions SET moderation_status='removed', updated_at=NOW()
         WHERE id=$1 AND author_user_id=$2 AND moderation_status <> 'removed'
         RETURNING id`,
        [req.params.id, (req as any).currentUser.userId],
      );
      if (!result.rows[0]) return res.status(404).json({ error: "Transmission not found" });
      return res.status(204).send();
    } catch (error) {
      console.error("[social] remove transmission:", error);
      return res.status(500).json({ error: "Unable to remove your Transmission" });
    }
  });

  app.get("/api/social/transmissions/:id/comments", async (req: Request, res: Response) => {
    if (!UUID_PATTERN.test(req.params.id)) return res.status(400).json({ error: "Transmission ID is invalid" });
    try {
      if (!(await loadPublicTransmission(req.params.id))) return res.status(404).json({ error: "Transmission not found" });
      const result = await pool.query(
        `SELECT c.id, c.transmission_id, c.body, c.created_at, c.updated_at,
                u.username, u.display_name, p.avatar_url
         FROM social_comments c
         JOIN users u ON u.id=c.author_user_id
         LEFT JOIN user_profiles p ON p.user_id=u.id
         WHERE c.transmission_id=$1
           AND c.moderation_status='published'
           AND COALESCE(u.account_status, 'active') <> 'suspended'
         ORDER BY c.created_at ASC, c.id ASC
         LIMIT 100`,
        [req.params.id],
      );
      return res.json({ comments: result.rows });
    } catch (error) {
      console.error("[social] comments:", error);
      return res.status(500).json({ error: "Unable to load comments" });
    }
  });

  app.post("/api/social/transmissions/:id/comments", requireUser, async (req: Request, res: Response) => {
    if (!UUID_PATTERN.test(req.params.id)) return res.status(400).json({ error: "Transmission ID is invalid" });
    if (rateLimit(req, res, "comment", 30, 60_000)) return;
    const body = parseSocialText(isRecord(req.body) ? req.body.body : null, 1500);
    if (body.error) return res.status(400).json({ error: body.error });
    try {
      if (!(await loadPublicTransmission(req.params.id))) return res.status(404).json({ error: "Transmission not found" });
      const result = await pool.query(
        "INSERT INTO social_comments (transmission_id, author_user_id, body) VALUES ($1, $2, $3) RETURNING id",
        [req.params.id, (req as any).currentUser.userId, body.value],
      );
      const created = await pool.query(
        `SELECT c.id, c.transmission_id, c.body, c.created_at, c.updated_at,
                u.username, u.display_name, p.avatar_url
         FROM social_comments c
         JOIN users u ON u.id=c.author_user_id
         LEFT JOIN user_profiles p ON p.user_id=u.id
         WHERE c.id=$1`,
        [result.rows[0].id],
      );
      return res.status(201).json({ comment: created.rows[0] });
    } catch (error) {
      console.error("[social] create comment:", error);
      return res.status(500).json({ error: "Unable to publish your comment" });
    }
  });

  app.delete("/api/social/comments/:id", requireUser, async (req: Request, res: Response) => {
    if (!UUID_PATTERN.test(req.params.id)) return res.status(400).json({ error: "Comment ID is invalid" });
    try {
      const result = await pool.query(
        `UPDATE social_comments SET moderation_status='removed', updated_at=NOW()
         WHERE id=$1 AND author_user_id=$2 AND moderation_status <> 'removed'
         RETURNING id`,
        [req.params.id, (req as any).currentUser.userId],
      );
      if (!result.rows[0]) return res.status(404).json({ error: "Comment not found" });
      return res.status(204).send();
    } catch (error) {
      console.error("[social] remove comment:", error);
      return res.status(500).json({ error: "Unable to remove your comment" });
    }
  });

  app.post("/api/social/reports", requireUser, async (req: Request, res: Response) => {
    const targetType = isRecord(req.body) ? parseReportTarget(req.body.targetType) : null;
    const targetId = isRecord(req.body) && typeof req.body.targetId === "string" ? req.body.targetId : "";
    const reason = parseSocialText(isRecord(req.body) ? req.body.reason : null, 1000);
    if (!targetType) return res.status(400).json({ error: "Report target is invalid" });
    if (!UUID_PATTERN.test(targetId)) return res.status(400).json({ error: "Report target ID is invalid" });
    if (reason.error) return res.status(400).json({ error: reason.error });
    if (rateLimit(req, res, "report", 10, 60 * 60_000)) return;
    try {
      const authorId = await reportTargetAuthorId(targetType, targetId);
      if (!authorId) return res.status(404).json({ error: "Content not found" });
      if (authorId === (req as any).currentUser.userId) return res.status(400).json({ error: "You cannot report your own content" });
      const result = await pool.query(
        `INSERT INTO social_reports (reporter_user_id, target_type, target_id, reason)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (reporter_user_id, target_type, target_id) DO NOTHING
         RETURNING id`,
        [(req as any).currentUser.userId, targetType, targetId, reason.value],
      );
      if (!result.rows[0]) return res.status(409).json({ error: "You have already reported this content" });
      return res.status(201).json({ submitted: true });
    } catch (error) {
      console.error("[social] report:", error);
      return res.status(500).json({ error: "Unable to submit your report" });
    }
  });

  app.get("/api/projects/:id", async (req: Request, res: Response) => {
    if (!UUID_PATTERN.test(req.params.id)) return res.status(400).json({ error: "Project ID is invalid" });
    try {
      const result = await pool.query(
        `SELECT w.id, w.title, w.description, w.work_type, w.external_url, w.thumbnail_url,
                w.room_id, r.name AS room_name, r.slug AS room_slug,
                w.sort_order, w.is_featured, w.created_at, w.updated_at,
                c.display_name AS creator_display_name, c.profile_image_url AS creator_image_url,
                c.is_certified AS creator_is_certified, u.username AS creator_username
         FROM creator_work_items w
         JOIN creator_profiles c ON c.user_id=w.creator_user_id
         JOIN users u ON u.id=w.creator_user_id
         LEFT JOIN rooms r ON r.id=w.room_id AND r.visibility='public'
         WHERE w.id=$1
           AND w.visibility_status='published'
           AND w.moderation_status='published'
           AND COALESCE(u.account_status, 'active') <> 'suspended'
         LIMIT 1`,
        [req.params.id],
      );
      if (!result.rows[0]) return res.status(404).json({ error: "Project not found" });
      return res.json({ project: result.rows[0] });
    } catch (error) {
      console.error("[social] project page:", error);
      return res.status(500).json({ error: "Unable to load this project" });
    }
  });

  app.get("/api/admin/social/reports", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT sr.id, sr.target_type, sr.target_id, sr.reason, sr.status, sr.created_at,
                reporter.username AS reporter_username,
                COALESCE(t.body, c.body, w.title) AS target_summary,
                COALESCE(t.moderation_status, c.moderation_status, w.moderation_status) AS moderation_status,
                COALESCE(tu.username, cu.username, wu.username) AS target_author_username
         FROM social_reports sr
         JOIN users reporter ON reporter.id=sr.reporter_user_id
         LEFT JOIN member_transmissions t ON sr.target_type='transmission' AND t.id=sr.target_id
         LEFT JOIN users tu ON tu.id=t.author_user_id
         LEFT JOIN social_comments c ON sr.target_type='comment' AND c.id=sr.target_id
         LEFT JOIN users cu ON cu.id=c.author_user_id
         LEFT JOIN creator_work_items w ON sr.target_type='project' AND w.id=sr.target_id
         LEFT JOIN users wu ON wu.id=w.creator_user_id
         WHERE sr.status='open'
         ORDER BY sr.created_at ASC
         LIMIT 200`,
      );
      return res.json({ reports: result.rows });
    } catch (error) {
      console.error("[social] admin reports:", error);
      return res.status(500).json({ error: "Unable to load social reports" });
    }
  });

  app.patch("/api/admin/social/reports/:id", requireAdmin, async (req: Request, res: Response) => {
    if (!UUID_PATTERN.test(req.params.id)) return res.status(400).json({ error: "Report ID is invalid" });
    if (!isRecord(req.body) || !["dismissed", "reviewed", "actioned"].includes(String(req.body.status))) {
      return res.status(400).json({ error: "Report status is invalid" });
    }
    const status = req.body.status as "dismissed" | "reviewed" | "actioned";
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const report = await client.query(
        "SELECT target_type, target_id FROM social_reports WHERE id=$1 FOR UPDATE",
        [req.params.id],
      );
      if (!report.rows[0]) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Report not found" });
      }
      if (status === "actioned") {
        const tableByType: Record<string, string> = {
          transmission: "member_transmissions",
          comment: "social_comments",
          project: "creator_work_items",
        };
        const table = tableByType[report.rows[0].target_type];
        if (table) {
          await client.query(
            `UPDATE ${table} SET moderation_status='hidden', updated_at=NOW() WHERE id=$1`,
            [report.rows[0].target_id],
          );
        }
      }
      await client.query(
        "UPDATE social_reports SET status=$1, reviewed_at=NOW() WHERE id=$2",
        [status, req.params.id],
      );
      await client.query("COMMIT");
      return res.json({ status });
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      console.error("[social] review report:", error);
      return res.status(500).json({ error: "Unable to update report" });
    } finally {
      client.release();
    }
  });

  app.patch("/api/admin/social/content/:type/:id", requireAdmin, async (req: Request, res: Response) => {
    if (!UUID_PATTERN.test(req.params.id)) return res.status(400).json({ error: "Content ID is invalid" });
    const state = isRecord(req.body) ? parseModerationState(req.body.moderationStatus) : null;
    if (!state) return res.status(400).json({ error: "Moderation state is invalid" });
    const tableByType: Record<string, string> = {
      transmission: "member_transmissions",
      comment: "social_comments",
      project: "creator_work_items",
    };
    const table = tableByType[req.params.type];
    if (!table) return res.status(400).json({ error: "Content type is invalid" });
    try {
      const result = await pool.query(
        `UPDATE ${table} SET moderation_status=$1, updated_at=NOW() WHERE id=$2 RETURNING id`,
        [state, req.params.id],
      );
      if (!result.rows[0]) return res.status(404).json({ error: "Content not found" });
      return res.json({ moderationStatus: state });
    } catch (error) {
      console.error("[social] moderate content:", error);
      return res.status(500).json({ error: "Unable to update content" });
    }
  });
}
