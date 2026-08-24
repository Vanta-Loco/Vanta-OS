import type { Express, Request, Response } from "express";
import { pool } from "./db";
import { requireAdmin } from "./admin-auth";

const ACCOUNT_STATUSES = new Set(["active", "suspended"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const memberSelect = `
  SELECT
    u.id,
    u.username,
    u.display_name,
    u.role,
    u.account_status,
    u.created_at,
    p.id AS passport_record_id,
    p.passport_id,
    p.passport_level,
    (p.id IS NOT NULL) AS has_passport,
    c.id AS creator_profile_id,
    c.display_name AS creator_display_name,
    (c.id IS NOT NULL) AS has_creator_profile,
    COALESCE(c.is_certified, false) AS creator_is_certified,
    c.certified_at AS creator_certified_at
  FROM users u
  LEFT JOIN user_passports p ON p.user_id=u.id
  LEFT JOIN creator_profiles c ON c.user_id=u.id
`;

function safeMember(row: any) {
  return {
    id: row.id,
    username: row.username,
    display_name: row.display_name,
    role: row.role,
    account_status: row.account_status,
    created_at: row.created_at,
    passport: row.has_passport ? {
      exists: true,
      passport_id: row.passport_id,
      level: row.passport_level,
    } : { exists: false },
    creator: row.has_creator_profile ? {
      exists: true,
      profile_id: row.creator_profile_id,
      display_name: row.creator_display_name,
      is_certified: row.creator_is_certified,
      certified_at: row.creator_certified_at,
    } : { exists: false },
  };
}

export function registerMemberManagementRoutes(app: Express) {
  app.get("/api/admin/users", requireAdmin, async (req: Request, res: Response) => {
    try {
      const search = typeof req.query.search === "string" ? req.query.search.trim().slice(0, 100) : "";
      const values: unknown[] = [];
      const filters: string[] = [];
      if (search) {
        values.push(`%${search}%`);
        filters.push(`(u.username ILIKE $${values.length} OR c.display_name ILIKE $${values.length})`);
      }
      const result = await pool.query(
        `${memberSelect}
         ${filters.length ? `WHERE ${filters.join(" AND ")}` : ""}
         ORDER BY u.created_at DESC`,
        values,
      );
      return res.json(result.rows.map(safeMember));
    } catch (error) {
      console.error("[member-management] list:", error);
      return res.status(500).json({ error: "Failed to fetch Members" });
    }
  });

  app.get("/api/admin/users/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      if (!UUID_PATTERN.test(req.params.id)) return res.status(400).json({ error: "Member ID must be a valid UUID" });
      const result = await pool.query(`${memberSelect} WHERE u.id=$1 LIMIT 1`, [req.params.id]);
      if (!result.rows[0]) return res.status(404).json({ error: "Member not found" });
      return res.json(safeMember(result.rows[0]));
    } catch (error) {
      console.error("[member-management] detail:", error);
      return res.status(500).json({ error: "Failed to fetch Member" });
    }
  });

  app.patch("/api/admin/users/:id/status", requireAdmin, async (req: Request, res: Response) => {
    try {
      if (!UUID_PATTERN.test(req.params.id)) return res.status(400).json({ error: "Member ID must be a valid UUID" });
      const status = typeof req.body?.account_status === "string" ? req.body.account_status.trim().toLowerCase() : "";
      if (!ACCOUNT_STATUSES.has(status)) return res.status(400).json({ error: "account_status must be active or suspended" });
      const result = await pool.query(
        `UPDATE users SET account_status=$2 WHERE id=$1
         RETURNING id, username, display_name, role, account_status, created_at`,
        [req.params.id, status],
      );
      if (!result.rows[0]) return res.status(404).json({ error: "Member not found" });
      return res.json(result.rows[0]);
    } catch (error) {
      console.error("[member-management] status:", error);
      return res.status(500).json({ error: "Failed to update Member status" });
    }
  });
}