---
name: Post schema evolution
description: Key decisions about how the posts table has grown and pitfalls to avoid when adding fields.
---

The `posts` table uses text columns for boolean-like flags (`featured`, `published`, `musicUrl`) matching the existing pattern — values are `"true"`/`"false"` strings, not booleans.

When a new column is added to `shared/schema.ts`, three things must always be updated together:
1. The Drizzle pgTable definition
2. The `insertPostSchema` Zod extension
3. `server/seed.ts` seed data (TypeScript enforces all InsertPost fields)

Run `npm run db:push` to sync; use `--force` flag only if data-loss warnings appear (e.g. dropping columns).

**Why:** The Zod insert schema infers required types — any missing field in seed data causes a TS error that blocks server startup.

**How to apply:** Any time a new column is added, grep for `server/seed.ts` and update all seed objects simultaneously.
