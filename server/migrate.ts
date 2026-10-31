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
  {
    id: "0004_media_assets_foundation",
    apply: async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS media_assets (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          storage_key TEXT NOT NULL UNIQUE,
          owner_type TEXT,
          owner_id TEXT,
          namespace TEXT NOT NULL,
          purpose TEXT NOT NULL,
          original_filename TEXT,
          mime_type TEXT NOT NULL,
          byte_size INTEGER NOT NULL CHECK (byte_size >= 0),
          width INTEGER CHECK (width IS NULL OR width > 0),
          height INTEGER CHECK (height IS NULL OR height > 0),
          duration_ms INTEGER CHECK (duration_ms IS NULL OR duration_ms >= 0),
          visibility TEXT NOT NULL DEFAULT 'public'
            CHECK (visibility IN ('public', 'private')),
          processing_status TEXT NOT NULL DEFAULT 'pending'
            CHECK (processing_status IN ('pending', 'ready', 'failed')),
          checksum_sha256 CHAR(64) NOT NULL
            CHECK (checksum_sha256 ~ '^[0-9a-f]{64}$'),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          deleted_at TIMESTAMPTZ,
          CHECK (
            (owner_type IS NULL AND owner_id IS NULL)
            OR (owner_type IS NOT NULL AND owner_id IS NOT NULL)
          )
        );
        CREATE INDEX IF NOT EXISTS media_assets_namespace_purpose_idx
          ON media_assets(namespace, purpose);
        CREATE INDEX IF NOT EXISTS media_assets_owner_idx
          ON media_assets(owner_type, owner_id)
          WHERE owner_id IS NOT NULL;
        CREATE INDEX IF NOT EXISTS media_assets_processing_status_idx
          ON media_assets(processing_status);
        CREATE INDEX IF NOT EXISTS media_assets_checksum_sha256_idx
          ON media_assets(checksum_sha256);
        CREATE INDEX IF NOT EXISTS media_assets_deleted_at_idx
          ON media_assets(deleted_at)
          WHERE deleted_at IS NOT NULL;
      `);
    },
  },
  {
    id: "0005_activity_center_foundation",
    apply: async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS activity_events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          recipient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          event_type TEXT NOT NULL,
          title TEXT NOT NULL,
          body TEXT,
          target_url TEXT,
          entity_type TEXT,
          entity_id TEXT,
          is_read BOOLEAN NOT NULL DEFAULT false,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          dedupe_key TEXT UNIQUE
        );
        CREATE INDEX IF NOT EXISTS activity_events_recipient_created_idx
          ON activity_events(recipient_user_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS activity_events_recipient_unread_idx
          ON activity_events(recipient_user_id, is_read, created_at DESC);
      `);
    },
  },
  {
    id: "0006_vanta_social_mvp",
    apply: async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS social_follows (
          follower_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          followed_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (follower_user_id, followed_user_id),
          CHECK (follower_user_id <> followed_user_id)
        );
        CREATE INDEX IF NOT EXISTS social_follows_followed_created_idx
          ON social_follows(followed_user_id, created_at DESC);

        CREATE TABLE IF NOT EXISTS member_transmissions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          author_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          body TEXT NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 3000),
          moderation_status TEXT NOT NULL DEFAULT 'published'
            CHECK (moderation_status IN ('published', 'pending', 'hidden', 'removed')),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS member_transmissions_public_created_idx
          ON member_transmissions(moderation_status, created_at DESC);
        CREATE INDEX IF NOT EXISTS member_transmissions_author_created_idx
          ON member_transmissions(author_user_id, created_at DESC);

        CREATE TABLE IF NOT EXISTS social_comments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          transmission_id UUID NOT NULL REFERENCES member_transmissions(id) ON DELETE CASCADE,
          author_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          body TEXT NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 1500),
          moderation_status TEXT NOT NULL DEFAULT 'published'
            CHECK (moderation_status IN ('published', 'pending', 'hidden', 'removed')),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS social_comments_public_created_idx
          ON social_comments(transmission_id, moderation_status, created_at ASC);
        CREATE INDEX IF NOT EXISTS social_comments_author_created_idx
          ON social_comments(author_user_id, created_at DESC);

        CREATE TABLE IF NOT EXISTS social_reports (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          reporter_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          target_type TEXT NOT NULL CHECK (target_type IN ('transmission', 'comment', 'project')),
          target_id UUID NOT NULL,
          reason TEXT NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 1 AND 1000),
          status TEXT NOT NULL DEFAULT 'open'
            CHECK (status IN ('open', 'reviewed', 'dismissed', 'actioned')),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          reviewed_at TIMESTAMPTZ,
          UNIQUE (reporter_user_id, target_type, target_id)
        );
        CREATE INDEX IF NOT EXISTS social_reports_status_created_idx
          ON social_reports(status, created_at DESC);

        ALTER TABLE creator_work_items
          ADD COLUMN IF NOT EXISTS visibility_status TEXT NOT NULL DEFAULT 'published'
            CHECK (visibility_status IN ('draft', 'published'));
        ALTER TABLE creator_work_items
          ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'published'
            CHECK (moderation_status IN ('published', 'pending', 'hidden', 'removed'));
        CREATE INDEX IF NOT EXISTS creator_work_public_idx
          ON creator_work_items(visibility_status, moderation_status, creator_user_id);
      `);
    },
  },
  {
    id: "0007_social_feed_cursor_index",
    apply: async () => {
      await pool.query(`
        CREATE INDEX IF NOT EXISTS member_transmissions_feed_cursor_idx
          ON member_transmissions(moderation_status, created_at DESC, id DESC);
        CREATE INDEX IF NOT EXISTS member_transmissions_author_cursor_idx
          ON member_transmissions(author_user_id, moderation_status, created_at DESC, id DESC);
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
