// ─── User / Profile API routes ───────────────────────────────────────────────
import type { Express, Request, Response } from "express";
import { pool } from "./db";
import {
  hashPassword, verifyPassword,
  issueUserToken, revokeUserToken,
  getRequestUser, requireUser,
  RESERVED_USERNAMES,
} from "./user-auth";

// ── helpers ──────────────────────────────────────────────────────────────────

function normalizeEmail(e: string): string {
  return e.trim().toLowerCase();
}

function isValidUsername(u: string): boolean {
  return /^[a-z0-9_]{3,20}$/.test(u);
}

function stripPrivate(user: any) {
  const { password_hash, ...rest } = user;
  return rest;
}

// ── registration rate-limit (simple in-memory, per IP) ───────────────────────
const regAttempts = new Map<string, { count: number; resetAt: number }>();
function checkRegRateLimit(ip: string): boolean {
  const now = Date.now();
  const e = regAttempts.get(ip);
  if (!e || e.resetAt < now) {
    regAttempts.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (e.count >= 5) return false;
  e.count++;
  return true;
}

export function registerUserRoutes(app: Express) {

  // ── Register ─────────────────────────────────────────────────────
  app.post("/api/user/register", async (req: Request, res: Response) => {
    try {
      const ip = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "";
      if (!checkRegRateLimit(ip)) {
        return res.status(429).json({ error: "Too many registration attempts. Try again in a minute." });
      }

      const { username, display_name, email, password, confirm_password } = req.body;

      // ── Validate ──
      const errors: Record<string, string> = {};

      if (!username || typeof username !== "string")
        errors.username = "Username is required";
      else if (!isValidUsername(username.toLowerCase()))
        errors.username = "Username must be 3–20 characters: letters, numbers, underscores only";
      else if (RESERVED_USERNAMES.has(username.toLowerCase()))
        errors.username = "That username is reserved";

      if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        errors.email = "Valid email required";

      if (!password || typeof password !== "string" || password.length < 8)
        errors.password = "Password must be at least 8 characters";

      if (password !== confirm_password)
        errors.confirm_password = "Passwords do not match";

      if (Object.keys(errors).length) return res.status(400).json({ errors });

      const uname = username.toLowerCase();
      const email_norm = normalizeEmail(email);

      // ── Uniqueness checks ──
      const existing = await pool.query(
        "SELECT id FROM users WHERE username=$1 OR email=$2 LIMIT 1",
        [uname, email_norm],
      );
      if (existing.rows.length) {
        // Don't reveal which field matches for privacy
        const row = existing.rows[0];
        const byEmail = await pool.query("SELECT id FROM users WHERE email=$1 LIMIT 1", [email_norm]);
        if (byEmail.rows.length) return res.status(409).json({ errors: { email: "An account with this email already exists" } });
        return res.status(409).json({ errors: { username: "Username is already taken" } });
      }

      const password_hash = await hashPassword(password);

      const userResult = await pool.query(
        `INSERT INTO users (username, email, password_hash, display_name, role)
         VALUES ($1, $2, $3, $4, 'user')
         RETURNING id, username, email, display_name, role, created_at`,
        [uname, email_norm, password_hash, display_name?.trim() || uname],
      );
      const user = userResult.rows[0];

      // Create empty profile
      await pool.query(
        `INSERT INTO user_profiles (user_id) VALUES ($1)`,
        [user.id],
      );

      const token = issueUserToken(user.id, user.username);
      res.status(201).json({ user: stripPrivate(user), token });
    } catch (e: any) {
      console.error("[user-routes] register:", e.message);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // ── Login ────────────────────────────────────────────────────────
  app.post("/api/user/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ error: "Email and password required" });

      const r = await pool.query(
        `SELECT u.*, p.avatar_url, p.banner_url, p.bio, p.location,
                p.creator_category, p.interests, p.theme_preference, p.skip_startup
         FROM users u
         LEFT JOIN user_profiles p ON p.user_id = u.id
         WHERE u.email=$1 LIMIT 1`,
        [normalizeEmail(email)],
      );
      if (!r.rows[0]) {
        // Timing-safe: still hash to avoid revealing user existence
        await hashPassword(password);
        return res.status(401).json({ error: "Invalid email or password" });
      }
      const user = r.rows[0];
      const valid = await verifyPassword(password, user.password_hash);
      if (!valid) return res.status(401).json({ error: "Invalid email or password" });

      await pool.query("UPDATE users SET last_login_at=NOW() WHERE id=$1", [user.id]);

      const token = issueUserToken(user.id, user.username);
      res.json({ user: stripPrivate(user), token });
    } catch (e: any) {
      console.error("[user-routes] login:", e.message);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // ── Logout ───────────────────────────────────────────────────────
  app.post("/api/user/logout", (req: Request, res: Response) => {
    const header = req.headers["x-user-token"];
    if (typeof header === "string") revokeUserToken(header);
    res.json({ success: true });
  });

  // ── Current user ─────────────────────────────────────────────────
  app.get("/api/user/me", async (req: Request, res: Response) => {
    try {
      const session = getRequestUser(req);
      if (!session) return res.json({ authenticated: false });

      const r = await pool.query(
        `SELECT u.id, u.username, u.email, u.display_name, u.role, u.created_at,
                p.avatar_url, p.banner_url, p.bio, p.location,
                p.creator_category, p.interests, p.social_links,
                p.theme_preference, p.skip_startup
         FROM users u
         LEFT JOIN user_profiles p ON p.user_id = u.id
         WHERE u.id=$1 LIMIT 1`,
        [session.userId],
      );
      if (!r.rows[0]) return res.json({ authenticated: false });
      res.json({ authenticated: true, user: r.rows[0] });
    } catch (e: any) {
      console.error("[user-routes] me:", e.message);
      res.json({ authenticated: false });
    }
  });

  // ── Public profile by username ────────────────────────────────────
  app.get("/api/profile/:username", async (req: Request, res: Response) => {
    try {
      const r = await pool.query(
        `SELECT u.username, u.display_name, u.role, u.created_at,
                p.avatar_url, p.banner_url, p.bio, p.location,
                p.creator_category, p.interests, p.social_links
         FROM users u
         LEFT JOIN user_profiles p ON p.user_id = u.id
         WHERE u.username=$1 LIMIT 1`,
        [req.params.username.toLowerCase()],
      );
      if (!r.rows[0]) return res.status(404).json({ error: "Profile not found" });
      res.json(r.rows[0]);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Update own profile ────────────────────────────────────────────
  app.patch("/api/profile", requireUser, async (req: Request, res: Response) => {
    try {
      const { userId } = (req as any).currentUser;
      const allowed = ["display_name", "bio", "location", "creator_category",
        "interests", "social_links", "theme_preference", "skip_startup",
        "avatar_url", "banner_url"];
      const fields: string[] = [];
      const vals: unknown[] = [];
      let i = 1;

      for (const k of allowed) {
        if (k in req.body) {
          if (k === "display_name") {
            const v = String(req.body[k]).trim().slice(0, 100);
            fields.push(`${k}=$${i++}`);
            vals.push(v);
          } else if (k === "bio") {
            const v = String(req.body[k]).trim().slice(0, 500);
            fields.push(`${k}=$${i++}`);
            vals.push(v);
          } else if (k === "location") {
            const v = String(req.body[k]).trim().slice(0, 100);
            fields.push(`${k}=$${i++}`);
            vals.push(v);
          } else if (k === "interests" && Array.isArray(req.body[k])) {
            fields.push(`${k}=$${i++}`);
            vals.push(req.body[k].slice(0, 10));
          } else if (k === "social_links" && typeof req.body[k] === "object") {
            fields.push(`${k}=$${i++}`);
            vals.push(JSON.stringify(req.body[k]));
          } else {
            fields.push(`${k}=$${i++}`);
            vals.push(req.body[k]);
          }
        }
      }

      if (fields.length === 0) return res.status(400).json({ error: "No valid fields" });
      fields.push("updated_at=NOW()");

      // Update profile
      await pool.query(
        `UPDATE user_profiles SET ${fields.join(",")} WHERE user_id=$${i}`,
        [...vals, userId],
      );

      // If display_name was updated, also update users table
      if ("display_name" in req.body) {
        await pool.query(
          "UPDATE users SET display_name=$1 WHERE id=$2",
          [String(req.body.display_name).trim().slice(0, 100), userId],
        );
      }

      res.json({ success: true });
    } catch (e: any) {
      console.error("[user-routes] patch profile:", e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // ── Public dev logs ───────────────────────────────────────────────
  app.get("/api/devlogs", async (_req: Request, res: Response) => {
    try {
      const r = await pool.query(
        `SELECT id, title, slug, summary, status, affected_apps,
                log_number, cover_image, author, published_at, created_at
         FROM dev_logs
         WHERE status='published'
         ORDER BY COALESCE(log_number, 0) DESC, published_at DESC NULLS LAST`,
      );
      res.json(r.rows);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/devlogs/:slug", async (req: Request, res: Response) => {
    try {
      const r = await pool.query(
        `SELECT * FROM dev_logs WHERE slug=$1 AND status='published' LIMIT 1`,
        [req.params.slug],
      );
      if (!r.rows[0]) return res.status(404).json({ error: "Dev log not found" });
      res.json(r.rows[0]);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Public app teasers ────────────────────────────────────────────
  app.get("/api/apps", async (_req: Request, res: Response) => {
    try {
      const r = await pool.query(
        `SELECT id, name, slug, description, status, planned_features,
                teaser_image, early_access_enabled, display_order
         FROM app_teasers
         WHERE published='true'
         ORDER BY display_order ASC, created_at DESC`,
      );
      res.json(r.rows);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Public waitlist signup ────────────────────────────────────────
  // Rate limit per IP
  const wlAttempts = new Map<string, { count: number; resetAt: number }>();
  function checkWlRateLimit(ip: string): boolean {
    const now = Date.now();
    const e = wlAttempts.get(ip);
    if (!e || e.resetAt < now) { wlAttempts.set(ip, { count: 1, resetAt: now + 300_000 }); return true; }
    if (e.count >= 10) return false;
    e.count++;
    return true;
  }

  app.post("/api/waitlist", async (req: Request, res: Response) => {
    try {
      const ip = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "";
      if (!checkWlRateLimit(ip)) return res.status(429).json({ error: "Rate limit reached. Try later." });

      const { email, app_name, name, marketing_consent, referral_source } = req.body;
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return res.status(400).json({ error: "Valid email required" });
      if (!app_name || typeof app_name !== "string")
        return res.status(400).json({ error: "App name required" });
      if (!marketing_consent)
        return res.status(400).json({ error: "Consent required" });

      const email_norm = normalizeEmail(email);

      // Duplicate check — per email+app
      const existing = await pool.query(
        "SELECT id FROM waitlist_signups WHERE email=$1 AND app_name=$2 LIMIT 1",
        [email_norm, app_name],
      );
      if (existing.rows.length)
        return res.status(409).json({ duplicate: true, message: "Already on waitlist for this app" });

      // Get user_id if logged in
      const session = getRequestUser(req);
      const user_id = session?.userId ?? null;

      await pool.query(
        `INSERT INTO waitlist_signups (email, app_name, name, status, marketing_consent, referral_source, user_id)
         VALUES ($1, $2, $3, 'pending', $4, $5, $6)`,
        [email_norm, app_name, name?.trim() || "", "true", referral_source?.trim() || "", user_id],
      );

      res.status(201).json({ success: true });
    } catch (e: any) {
      console.error("[user-routes] waitlist:", e.message);
      res.status(500).json({ error: "Signup failed" });
    }
  });
}
