---
name: Stonerism schema migration pattern
description: How Stonerism tables are created — seed.ts runs DROP+CREATE on first boot; drizzle-kit push is blocked by Neon endpoint sleeping.
---

## The rule
Stonerism tables are created via raw SQL in `seedStonerism()` in `server/seed.ts`, NOT via `drizzle-kit push`.

## Why
Neon's serverless endpoint sleeps when idle. Direct pg connections from shell scripts (separate process) fail with "The endpoint has been disabled. Enable it using the API and retry." The server's existing pool (started at process boot) stays alive, so the only reliable migration path is raw SQL executed inside the running server process.

## How to apply
- `seedStonerism()` in `server/seed.ts` runs DROP IF EXISTS + CREATE TABLE for all Stonerism tables at the top, before any guard or insert.
- This is idempotent on first run (guard on `stonerism_categories` count prevents re-seeding data).
- On subsequent boots: guard triggers early exit — no drops, no re-seeding.
- The raw SQL column names MUST exactly match the drizzle schema in `shared/schema.ts`. A mismatch causes runtime failures (e.g. "column title does not exist").
- `stonerism_series` uses `title` NOT `name`, and has NO `section` column — this has bitten us once.
- `stonerism_newsletter_subscribers` uses `consent TEXT` (not `consent_given`), and has NO `name`, `source`, or `consent_timestamp` columns.
- `stonerism_entities` uses `lat TEXT` and `lng TEXT` (not NUMERIC), and has NO `logo_url` or `facebook_url` columns.

## Never do
- Run `drizzle-kit push` for Stonerism changes from shell — it will time out or fail due to Neon sleeping.
- Use `--force` with drizzle-kit — it still prompts interactively for each table.
