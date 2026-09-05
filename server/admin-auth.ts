import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";
import { pool } from "./db";

export const ADMIN_SESSION_TTL_HOURS = 12;
type AdminIdentity = { adminUserId: string; username: string; displayName: string | null };

function hashAdminToken(token: string): string {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

function presentedToken(req: Request): string | null {
  const header = req.headers["x-admin-token"];
  return typeof header === "string" && header.length > 0 ? header : null;
}

export async function issueAdminToken(adminUserId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  await pool.query(
    `INSERT INTO admin_sessions (admin_user_id, token_hash, expires_at)
     VALUES ($1, $2, NOW() + ($3 * INTERVAL '1 hour'))`,
    [adminUserId, hashAdminToken(token), ADMIN_SESSION_TTL_HOURS],
  );
  return token;
}

export async function getRequestAdmin(req: Request): Promise<AdminIdentity | null> {
  const token = presentedToken(req);
  if (!token) return null;
  const tokenHash = hashAdminToken(token);
  const result = await pool.query(
    `SELECT a.id AS admin_user_id, a.username, a.display_name
     FROM admin_sessions s
     JOIN admin_users a ON a.id=s.admin_user_id
     WHERE s.token_hash=$1
       AND s.revoked_at IS NULL
       AND s.expires_at > NOW()
       AND a.is_active=true
     LIMIT 1`,
    [tokenHash],
  );
  const row = result.rows[0];
  if (!row) return null;
  await pool.query(
    `UPDATE admin_sessions SET last_used_at=NOW()
     WHERE token_hash=$1 AND last_used_at < NOW() - INTERVAL '15 minutes'`,
    [tokenHash],
  );
  return {
    adminUserId: row.admin_user_id,
    username: row.username,
    displayName: row.display_name,
  };
}

export async function hasValidAdminToken(req: Request): Promise<boolean> {
  return (await getRequestAdmin(req)) !== null;
}

export async function revokePresentedAdminToken(req: Request): Promise<void> {
  const token = presentedToken(req);
  if (!token) return;
  await pool.query(
    `UPDATE admin_sessions SET revoked_at=COALESCE(revoked_at, NOW())
     WHERE token_hash=$1`,
    [hashAdminToken(token)],
  );
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const admin = await getRequestAdmin(req);
    if (!admin) return res.status(401).json({ error: "Unauthorized" });
    (req as any).currentAdmin = admin;
    return next();
  } catch (error) {
    console.error("[admin-auth] validation failed");
    return res.status(500).json({ error: "Authentication unavailable" });
  }
}