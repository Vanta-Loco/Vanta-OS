import { pool } from "./db";

async function cleanupUserSessions() {
  const result = await pool.query(
    `DELETE FROM member_sessions
     WHERE expires_at <= NOW() OR revoked_at IS NOT NULL`,
  );
  console.log(`Removed ${result.rowCount ?? 0} expired or revoked user sessions`);
}

cleanupUserSessions()
  .then(() => pool.end())
  .catch(async error => {
    console.error("Session cleanup failed:", error instanceof Error ? error.message : "Unknown error");
    await pool.end().catch(() => undefined);
    process.exit(1);
  });
