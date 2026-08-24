// ─── User token auth ─────────────────────────────────────────────────────────
// In-memory token store: token → {userId, username}
// Survives process lifetime only — acceptable for Phase 1.
import crypto from "crypto";
import { promisify } from "util";
import { pool } from "./db";

const scryptAsync = promisify(crypto.scrypt);

// token → user info
const activeUserTokens = new Map<string, { userId: string; username: string }>();

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

export function issueUserToken(userId: string, username: string): string {
  const token = crypto.randomBytes(32).toString("hex");
  activeUserTokens.set(token, { userId, username });
  return token;
}

export function getUserFromToken(token: string): { userId: string; username: string } | null {
  return activeUserTokens.get(token) ?? null;
}

export function revokeUserToken(token: string): void {
  activeUserTokens.delete(token);
}

export function getRequestUser(req: import("express").Request): { userId: string; username: string } | null {
  const header = req.headers["x-user-token"];
  if (typeof header !== "string") return null;
  return getUserFromToken(header);
}

export async function requireUser(
  req: import("express").Request,
  res: import("express").Response,
  next: import("express").NextFunction,
) {
  const user = getRequestUser(req);
  if (!user) return res.status(401).json({ error: "Login required" });
  try {
    const result = await pool.query(
      "SELECT account_status FROM users WHERE id=$1 LIMIT 1",
      [user.userId],
    );
    if (!result.rows[0]) return res.status(401).json({ error: "Login required" });
    if (result.rows[0].account_status === "suspended") {
      return res.status(403).json({
        error: "Account suspended",
        code: "ACCOUNT_SUSPENDED",
      });
    }
    (req as any).currentUser = user;
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
