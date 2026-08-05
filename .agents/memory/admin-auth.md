---
name: Admin auth pattern
description: How admin auth works — token-based, not cookie-based, due to Replit iframe/iOS cookie restrictions
---

# Admin auth — token-based (not cookie-based)

## The rule
Admin auth uses an in-memory server token sent as `X-Admin-Token` request header. Do NOT rely solely on session cookies — they are blocked in Replit's iframe preview and iOS WebView due to SameSite/Secure restrictions.

**Why:** `SameSite=Lax` cookies are silently dropped when the app is embedded in Replit's preview iframe (top-level site is `replit.com`, app is a different origin). `SameSite=None` requires `Secure=true`, which requires the proxy to send `X-Forwarded-Proto: https`, which was unreliable. `connect-pg-simple` was also incompatible with `@neondatabase/serverless`'s WebSocket pool — it silently failed to write sessions. Switching to token-based auth bypassed all of these issues.

## How it works

**Server (`server/routes.ts`):**
- `let activeAdminToken: string | null = null` — single in-memory token (clears on restart)
- `POST /api/admin/login` — verifies password, calls `issueAdminToken()` (32 random bytes), returns `{ authenticated: true, token }` in JSON body
- `GET /api/admin/me` — checks `req.session?.isAdmin === true || hasValidAdminToken(req)`
- `requireAdmin` middleware — same dual check
- `POST /api/admin/logout` — sets `activeAdminToken = null`, destroys session
- Session is still set as fallback for direct-browser access

**Client (`client/src/lib/queryClient.ts`):**
- `getAdminToken()` / `setAdminToken()` / `clearAdminToken()` — localStorage under key `vanta-admin-token`
- `apiRequest()` and `getQueryFn()` both inject `X-Admin-Token` header when a token exists in localStorage

**Client (`client/src/hooks/use-admin.ts`):**
- `loginMutation.mutationFn` — parses `res.json()` to extract `token`, calls `setAdminToken()`
- `initialData` — seeded from `getAdminToken()` so UI doesn't flash "unauthenticated" on reload
- `logoutMutation.onSuccess` — calls `clearAdminToken()`

## How to apply
- Any new admin-only API route: use `requireAdmin` middleware (already checks both session and token)
- Any new admin-only UI: use `useAdmin()` hook's `isAuthenticated` field
- Do NOT add new cookie-based auth paths — the token header is the reliable path
