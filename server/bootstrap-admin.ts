import { pool } from "./db";
import { hashPassword } from "./user-auth";

async function bootstrapAdmin() {
  const username = process.env.ADMIN_BOOTSTRAP_USERNAME?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const displayName = process.env.ADMIN_BOOTSTRAP_DISPLAY_NAME?.trim() || null;
  if (!username || !/^[a-z0-9_-]{3,50}$/.test(username)) {
    throw new Error("ADMIN_BOOTSTRAP_USERNAME must be 3-50 lowercase letters, numbers, underscores, or hyphens");
  }
  if (!password) {
    throw new Error("ADMIN_PASSWORD must be set for bootstrap");
  }
  const existing = await pool.query("SELECT 1 FROM admin_users LIMIT 1");
  if (existing.rows[0]) throw new Error("Bootstrap refused: an Admin account already exists");
  await pool.query(
    `INSERT INTO admin_users (username, password_hash, display_name)
     VALUES ($1, $2, $3)`,
    [username, await hashPassword(password), displayName],
  );
  console.log(`Created named Admin account: ${username}`);
}

bootstrapAdmin()
  .then(() => pool.end())
  .catch(async error => {
    console.error(error instanceof Error ? error.message : "Admin bootstrap failed");
    await pool.end().catch(() => undefined);
    process.exit(1);
  });