// ─── Durable user token auth ─────────────────────────────────────────────────
import crypto from "crypto";
import { promisify } from "util";
import { pool } from "./db";

const scryptAsync = promisify(crypto.scrypt);
export const USER_SESSION_TTL_DAYS = 30;
type SessionUser = { userId: string; username: string; accountStatus: string };

function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [salt, hash] = stored.split(":");
    const derived = (await scryptAsync(password, salt, 64)) as Buffer;
    const storedBuf = Buffer.from(hash, "hex");
    return derived.length === storedBuf.length && crypto.timingSafeEqual(derived, storedBuf);
  } catch { return false; }
}

export async function issueUserToken(userId: string, _username: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  await pool.query(
    `INSERT INTO member_sessions (user_id, token_hash, expires_at)
     VALUES ($1, $2, NOW() + ($3 * INTERVAL '1 day'))`,
    [userId, hashSessionToken(token), USER_SESSION_TTL_DAYS],
  );
  return token;
}

export async function getUserFromToken(token: string): Promise<SessionUser | null> {
  const result = await pool.query(
    `SELECT u.id AS user_id, u.username, u.account_status
     FROM member_sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash=$1
       AND s.revoked_at IS NULL
       AND s.expires_at > NOW()
     LIMIT 1`,
    [hashSessionToken(token)],
  );
  const row = result.rows[0];
  if (!row) return null;
  await pool.query(
    `UPDATE member_sessions
     SET last_used_at=NOW()
     WHERE token_hash=$1
       AND last_used_at < NOW() - INTERVAL '15 minutes'`,
    [hashSessionToken(token)],
  );
  return { userId: row.user_id, username: row.username, accountStatus: row.account_status };
}

export async function revokeUserToken(token: string): Promise<void> {
  await pool.query(
    `UPDATE member_sessions
     SET revoked_at=COALESCE(revoked_at, NOW())
     WHERE token_hash=$1`,
    [hashSessionToken(token)],
  );
}

export async function getRequestUser(req: import("express").Request): Promise<SessionUser | null> {
  const header = req.headers["x-user-token"];
  if (typeof header !== "string") return null;
  return getUserFromToken(header);
}

export async function requireUser(
  req: import("express").Request,
  res: import("express").Response,
  next: import("express").NextFunction,
) {
  try {
    const user = await getRequestUser(req);
    if (!user) return res.status(401).json({ error: "Login required" });
    if (user.accountStatus === "suspended") {
      return res.status(403).json({
        error: "Account suspended",
        code: "ACCOUNT_SUSPENDED",
      });
    }
    (req as any).currentUser = { userId: user.userId, username: user.username };
    return next();
  } catch (error) {
    console.error("[user-auth] status check:", error);
    return res.status(500).json({ error: "Authentication unavailable" });
  }
}

// Reserved usernames — cannot be registered
export const RESERVED_USERNAMES = new Set([
  "admin", "administrator", "vanta", "vantacold", "system",
  "support", "official", "stonerism", "wireline", "blackindex",
  "root", "mod", "moderator", "staff", "team",
]);
