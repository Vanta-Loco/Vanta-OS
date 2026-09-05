import { pool } from "./db";

async function cleanupAdminSessions() {
  const result = await pool.query(
    `DELETE FROM admin_sessions
     WHERE expires_at <= NOW() OR revoked_at IS NOT NULL`,
  );
  console.log(`Removed ${result.rowCount ?? 0} expired or revoked Admin sessions`);
}

cleanupAdminSessions()
  .then(() => pool.end())
  .catch(async error => {
    console.error("Admin session cleanup failed:", error instanceof Error ? error.message : "Unknown error");
    await pool.end().catch(() => undefined);
    process.exit(1);
  });