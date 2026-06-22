---
name: Admin auth pattern
description: How admin authentication works end-to-end in Vanta Cold.
---

Backend: Express session via `connect-pg-simple` (table: `user_sessions`). `requireAdmin` middleware checks `req.session.admin === true`. Session secret from `SESSION_SECRET` env var.

Frontend: `useAdmin()` hook (`client/src/hooks/use-admin.ts`) queries `/api/admin/me` and returns `{ isAuthenticated, isLoading }`. Use `isAuthenticated` to gate admin-only UI elements.

Public post pages: edit/delete buttons are wrapped in `{isAdmin && ...}`. Share buttons are always visible.

**Why:** Single-password admin model — no user accounts. All content mutation routes (POST/PATCH/DELETE posts, releases, upload) require the session.

**How to apply:** Import `useAdmin` hook in any page that needs to conditionally show admin controls.
