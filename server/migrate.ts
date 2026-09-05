import { pool } from "./db";
import { migrateDatabase } from "./seed";

type Migration = {
  id: string;
  apply: () => Promise<void>;
};

const migrations: Migration[] = [
  {
    id: "0001_current_schema_baseline",
    apply: migrateDatabase,
  },
  {
    id: "0002_durable_user_sessions",
    apply: async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS member_sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token_hash CHAR(64) NOT NULL UNIQUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          expires_at TIMESTAMPTZ NOT NULL,
          last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          revoked_at TIMESTAMPTZ
        );
        CREATE INDEX IF NOT EXISTS member_sessions_user_id_idx
          ON member_sessions(user_id);
        CREATE INDEX IF NOT EXISTS member_sessions_expires_at_idx
          ON member_sessions(expires_at);
        CREATE INDEX IF NOT EXISTS member_sessions_revoked_at_idx
          ON member_sessions(revoked_at) WHERE revoked_at IS NOT NULL;
      `);
    },
  },
  {
    id: "0003_durable_admin_auth",
    apply: async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS admin_users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          username TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          display_name TEXT,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          last_login_at TIMESTAMPTZ
        );
        CREATE TABLE IF NOT EXISTS admin_sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          admin_user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
          token_hash CHAR(64) NOT NULL UNIQUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          expires_at TIMESTAMPTZ NOT NULL,
          last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          revoked_at TIMESTAMPTZ
        );
        CREATE INDEX IF NOT EXISTS admin_sessions_admin_user_id_idx
          ON admin_sessions(admin_user_id);
        CREATE INDEX IF NOT EXISTS admin_sessions_expires_at_idx
          ON admin_sessions(expires_at);
        CREATE INDEX IF NOT EXISTS admin_sessions_revoked_at_idx
          ON admin_sessions(revoked_at) WHERE revoked_at IS NOT NULL;
      `);
    },
  },
];

async function runMigrations() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS vanta_schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  for (const migration of migrations) {
    const existing = await pool.query(
      "SELECT 1 FROM vanta_schema_migrations WHERE id=$1",
      [migration.id],
    );
    if (existing.rows[0]) {
      console.log(`Migration already applied: ${migration.id}`);
      continue;
    }
    console.log(`Applying migration: ${migration.id}`);
    await migration.apply();
    await pool.query(
      "INSERT INTO vanta_schema_migrations (id) VALUES ($1)",
      [migration.id],
    );
    console.log(`Applied migration: ${migration.id}`);
  }
}

runMigrations()
  .then(() => pool.end())
  .catch(async error => {
    console.error("Migration failed:", error instanceof Error ? error.message : "Unknown error");
    await pool.end().catch(() => undefined);
    process.exit(1);
  });
