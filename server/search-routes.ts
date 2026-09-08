import type { Express, Request, Response } from "express";
import { pool } from "./db";

const MAX_QUERY_LENGTH = 100;
const RESULT_LIMIT = 5;

type SearchRow = Record<string, unknown>;

function emptyResults(query = "") {
  return {
    query,
    creators: [],
    work: [],
    rooms: [],
    marketplace: [],
    transmission: [],
    releases: [],
    play: [],
  };
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, character => `\\${character}`);
}

function searchParams(query: string): [string, string, string] {
  const escaped = escapeLike(query);
  return [`%${escaped}%`, query, `${escaped}%`];
}

export function registerSearchRoutes(app: Express) {
  app.get("/api/search", async (req: Request, res: Response) => {
    const rawQuery = typeof req.query.q === "string" ? req.query.q : "";
    const query = rawQuery.trim();

    if (query.length > MAX_QUERY_LENGTH) {
      return res.status(400).json({
        error: `Search query must be ${MAX_QUERY_LENGTH} characters or fewer`,
      });
    }

    if (!query) {
      return res.json(emptyResults());
    }

    const [like, exact, prefix] = searchParams(query);
    const params = [like, exact, prefix, RESULT_LIMIT];

    try {
      const [
        creators,
        work,
        rooms,
        marketplace,
        transmission,
        releases,
        play,
      ] = await Promise.all([
        pool.query(
          `SELECT
             u.username,
             c.display_name,
             c.disciplines,
             c.bio,
             c.city,
             c.country,
             c.profile_image_url,
             c.is_certified,
             CASE
               WHEN LOWER(u.username)=LOWER($2) OR LOWER(c.display_name)=LOWER($2) THEN 0
               WHEN u.username ILIKE $3 OR c.display_name ILIKE $3 THEN 1
               WHEN COALESCE(array_to_string(c.disciplines, ' '), '') ILIKE $1 THEN 2
               ELSE 3
             END AS match_rank
           FROM creator_profiles c
           JOIN users u ON u.id=c.user_id
           WHERE COALESCE(u.account_status, 'active') <> 'suspended'
             AND (
               u.username ILIKE $1
               OR c.display_name ILIKE $1
               OR COALESCE(c.disciplines::text, '') ILIKE $1
               OR COALESCE(c.bio, '') ILIKE $1
               OR COALESCE(c.city, '') ILIKE $1
               OR COALESCE(c.country, '') ILIKE $1
             )
           ORDER BY match_rank ASC, c.is_certified DESC, c.created_at DESC
           LIMIT $4`,
          params,
        ),
        pool.query(
          `SELECT
             w.id,
             w.title,
             w.description,
             w.work_type,
             w.thumbnail_url,
             w.is_featured,
             w.created_at,
             u.username AS creator_username,
             c.display_name AS creator_display_name,
             c.is_certified AS creator_is_certified,
             CASE WHEN r.visibility='public' THEN r.name ELSE NULL END AS room_name,
             CASE
               WHEN LOWER(w.title)=LOWER($2) THEN 0
               WHEN w.title ILIKE $3 THEN 1
               WHEN w.work_type ILIKE $1 THEN 2
               ELSE 3
             END AS match_rank
           FROM creator_work_items w
           JOIN creator_profiles c ON c.user_id=w.creator_user_id
           JOIN users u ON u.id=w.creator_user_id
           LEFT JOIN rooms r ON r.id=w.room_id
           WHERE COALESCE(u.account_status, 'active') <> 'suspended'
             AND (
               w.title ILIKE $1
               OR COALESCE(w.description, '') ILIKE $1
               OR w.work_type ILIKE $1
               OR u.username ILIKE $1
               OR c.display_name ILIKE $1
             )
           ORDER BY match_rank ASC, w.is_featured DESC, w.created_at DESC
           LIMIT $4`,
          params,
        ),
        pool.query(
          `SELECT
             r.id,
             r.name,
             r.category,
             r.description,
             r.member_count,
             r.created_at,
             CASE
               WHEN LOWER(r.name)=LOWER($2) THEN 0
               WHEN r.name ILIKE $3 THEN 1
               WHEN r.category ILIKE $1 THEN 2
               ELSE 3
             END AS match_rank
           FROM (
             SELECT
               rooms.id,
               rooms.name,
               rooms.category,
               rooms.description,
               rooms.created_at,
               COUNT(DISTINCT room_memberships.id)::int AS member_count
             FROM rooms
             LEFT JOIN room_memberships ON room_memberships.room_id=rooms.id
             WHERE rooms.visibility='public'
             GROUP BY rooms.id
           ) r
           WHERE r.name ILIKE $1
              OR r.category ILIKE $1
              OR COALESCE(r.description, '') ILIKE $1
           ORDER BY match_rank ASC, r.created_at ASC
           LIMIT $4`,
          params,
        ),
        pool.query(
          `SELECT
             l.id,
             l.title,
             l.description,
             l.category,
             l.price_amount,
             l.currency,
             l.price_type,
             l.city,
             l.delivery_mode,
             l.created_at,
             u.username AS creator_username,
             u.display_name AS creator_display_name,
             CASE
               WHEN LOWER(l.title)=LOWER($2) THEN 0
               WHEN l.title ILIKE $3 THEN 1
               WHEN l.category ILIKE $1 THEN 2
               ELSE 3
             END AS match_rank
           FROM marketplace_listings l
           JOIN users u ON u.id=l.creator_user_id
           WHERE l.status='active'
             AND COALESCE(u.account_status, 'active') <> 'suspended'
             AND (
               l.title ILIKE $1
               OR COALESCE(l.description, '') ILIKE $1
               OR l.category ILIKE $1
               OR COALESCE(l.city, '') ILIKE $1
               OR u.username ILIKE $1
               OR u.display_name ILIKE $1
             )
           ORDER BY match_rank ASC, l.created_at DESC
           LIMIT $4`,
          params,
        ),
        pool.query(
          `SELECT
             p.id,
             p.title,
             p.excerpt,
             p.cover_image,
             p.category,
             p.created_at,
             p.read_time,
             CASE
               WHEN LOWER(p.title)=LOWER($2) THEN 0
               WHEN p.title ILIKE $3 THEN 1
               WHEN p.category ILIKE $1 THEN 2
               ELSE 3
             END AS match_rank
           FROM posts p
           WHERE p.published='true'
             AND (
               p.title ILIKE $1
               OR p.excerpt ILIKE $1
               OR p.content ILIKE $1
               OR p.category ILIKE $1
             )
           ORDER BY match_rank ASC, p.created_at DESC
           LIMIT $4`,
          params,
        ),
        pool.query(
          `SELECT
             r.id,
             r.title,
             r.type,
             r.cover_image,
             r.description,
             r.release_date,
             r.genre,
             r.subgenre,
             r.mood_tags,
             CASE
               WHEN LOWER(r.title)=LOWER($2) THEN 0
               WHEN r.title ILIKE $3 THEN 1
               WHEN r.type ILIKE $1
                 OR r.genre ILIKE $1
                 OR r.subgenre ILIKE $1
                 OR COALESCE(array_to_string(r.mood_tags, ' '), '') ILIKE $1 THEN 2
               ELSE 3
             END AS match_rank
           FROM releases r
           WHERE (
             r.title ILIKE $1
             OR r.type ILIKE $1
             OR r.description ILIKE $1
             OR r.genre ILIKE $1
             OR r.subgenre ILIKE $1
             OR COALESCE(array_to_string(r.mood_tags, ' '), '') ILIKE $1
           )
           ORDER BY match_rank ASC, r.created_at DESC
           LIMIT $4`,
          params,
        ),
        pool.query(
          `SELECT
             g.id,
             g.sport,
             g.city,
             g.venue,
             g.game_date AS date,
             g.game_time AS time,
             g.skill,
             g.capacity,
             g.seed_players + COUNT(p.id) FILTER (WHERE p.status='joined')::int AS players,
             CASE
               WHEN LOWER(g.sport)=LOWER($2)
                 OR LOWER(g.city)=LOWER($2)
                 OR LOWER(g.venue)=LOWER($2) THEN 0
               WHEN g.sport ILIKE $3 OR g.city ILIKE $3 OR g.venue ILIKE $3 THEN 1
               ELSE 2
             END AS match_rank
           FROM vanta_play_games g
           LEFT JOIN vanta_play_participants p ON p.game_id=g.id
           WHERE g.status='open'
             AND (
               g.sport ILIKE $1
               OR g.city ILIKE $1
               OR g.venue ILIKE $1
               OR COALESCE(g.skill, '') ILIKE $1
             )
           GROUP BY g.id
           ORDER BY match_rank ASC, g.game_date ASC, g.game_time ASC
           LIMIT $4`,
          params,
        ),
      ]);

      return res.json({
        query,
        creators: creators.rows.map(({ match_rank: _rank, ...row }: SearchRow) => row),
        work: work.rows.map(({ match_rank: _rank, ...row }: SearchRow) => row),
        rooms: rooms.rows.map(({ match_rank: _rank, ...row }: SearchRow) => row),
        marketplace: marketplace.rows.map(({ match_rank: _rank, ...row }: SearchRow) => row),
        transmission: transmission.rows.map(({ match_rank: _rank, ...row }: SearchRow) => row),
        releases: releases.rows.map(({ match_rank: _rank, ...row }: SearchRow) => row),
        play: play.rows.map(({ match_rank: _rank, ...row }: SearchRow) => row),
      });
    } catch (error) {
      console.error("[search] universal index:", error);
      return res.status(500).json({ error: "Failed to search Vanta" });
    }
  });
}