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
