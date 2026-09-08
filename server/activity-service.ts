import { pool } from "./db";

export const ACTIVITY_EVENT_TYPES = [
  "room_member_joined",
  "room_post_created",
  "passport_achievement_unlocked",
  "passport_xp_gained",
  "creator_certified",
  "creator_work_added",
  "marketplace_activity",
  "play_update",
  "system_notice",
] as const;

export type ActivityEventType = typeof ACTIVITY_EVENT_TYPES[number] | (string & {});

export type CreateActivityInput = {
  recipientUserId: string;
  actorUserId?: string | null;
  eventType: ActivityEventType;
  title: string;
  body?: string | null;
  targetUrl?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  dedupeKey?: string | null;
};

export async function createActivity(input: CreateActivityInput) {
  const result = await pool.query(
    `INSERT INTO activity_events (
       recipient_user_id, actor_user_id, event_type, title, body,
       target_url, entity_type, entity_id, dedupe_key
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, recipient_user_id, actor_user_id, event_type, title, body,
               target_url, entity_type, entity_id, is_read, created_at, dedupe_key`,
    [
      input.recipientUserId,
      input.actorUserId ?? null,
      input.eventType,
      input.title,
      input.body ?? null,
      input.targetUrl ?? null,
      input.entityType ?? null,
      input.entityId ?? null,
      input.dedupeKey ?? null,
    ],
  );
  return result.rows[0];
}

type ActivityListOptions = {
  limit: number;
  offset: number;
};

export async function listActivityForUser(userId: string, options: ActivityListOptions) {
  const result = await pool.query(
    `SELECT
       e.id,
       e.recipient_user_id,
       e.actor_user_id,
       e.event_type,
       e.title,
       e.body,
       e.target_url,
       e.entity_type,
       e.entity_id,
       e.is_read,
       e.created_at,
       CASE
         WHEN c.user_id IS NOT NULL AND COALESCE(actor.account_status, 'active') <> 'suspended'
         THEN json_build_object(
           'username', actor.username,
           'display_name', c.display_name,
           'is_certified', c.is_certified
         )
         ELSE NULL
       END AS actor
     FROM activity_events e
     LEFT JOIN users actor ON actor.id=e.actor_user_id
     LEFT JOIN creator_profiles c ON c.user_id=e.actor_user_id
     WHERE e.recipient_user_id=$1
     ORDER BY e.created_at DESC, e.id DESC
     LIMIT $2 OFFSET $3`,
    [userId, options.limit, options.offset],
  );
  return result.rows;
}

export async function hasMoreActivity(userId: string, options: ActivityListOptions): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1
     FROM activity_events
     WHERE recipient_user_id=$1
     ORDER BY created_at DESC, id DESC
     LIMIT 1 OFFSET $2`,
    [userId, options.offset + options.limit],
  );
  return Boolean(result.rows[0]);
}

export async function countUnreadActivityForUser(userId: string): Promise<number> {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM activity_events
     WHERE recipient_user_id=$1 AND is_read=false`,
    [userId],
  );
  return result.rows[0]?.count ?? 0;
}

export async function markActivityReadForUser(userId: string, activityId: string): Promise<boolean> {
  const result = await pool.query(
    `UPDATE activity_events
     SET is_read=true
     WHERE id=$1 AND recipient_user_id=$2 AND is_read=false
     RETURNING id`,
    [activityId, userId],
  );
  return Boolean(result.rows[0]);
}

export async function markAllActivityReadForUser(userId: string): Promise<number> {
  const result = await pool.query(
    `UPDATE activity_events
     SET is_read=true
     WHERE recipient_user_id=$1 AND is_read=false`,
    [userId],
  );
  return result.rowCount ?? 0;
}