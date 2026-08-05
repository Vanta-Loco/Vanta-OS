// ─── Shared admin token auth ──────────────────────────────────────────────────
// Single source of truth for the in-memory admin token.
// Both routes.ts and stonerism-routes.ts import from here so they share state.
import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";

let activeAdminToken: string | null = null;

export function issueAdminToken(): string {
  activeAdminToken = crypto.randomBytes(32).toString("hex");
  return activeAdminToken;
}

export function clearAdminToken(): void {
  activeAdminToken = null;
}

export function hasValidAdminToken(req: Request): boolean {
  const header = req.headers["x-admin-token"];
  return (
    typeof header === "string" &&
    activeAdminToken !== null &&
    (() => {
      try {
        const a = Buffer.from(header);
        const b = Buffer.from(activeAdminToken!);
        return a.length === b.length && crypto.timingSafeEqual(a, b);
      } catch { return false; }
    })()
  );
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.session?.isAdmin === true || hasValidAdminToken(req)) return next();
  return res.status(401).json({ error: "Unauthorized" });
}
