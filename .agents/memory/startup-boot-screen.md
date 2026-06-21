---
name: Startup boot screen vs screenshots
description: Why fresh-session screenshots show the VANTA COLD splash instead of page content, and how to verify pages anyway
---

# Startup boot screen races screenshots

`client/src/components/startup-screen.tsx` renders a full-screen `fixed inset-0 z-[9999]` boot splash ("As Above / So Below" → "VANTA COLD" → progress bar) for ~2.8s. It is gated in `App.tsx` by `sessionStorage` key `vc-boot` (`STARTUP_SESSION_KEY`) — shown once per browser session.

**Why this matters:** the app-preview screenshot tool opens a fresh session each capture, so `vc-boot` is unset and the splash overlays the page for the first ~2.8s. Captures taken in that window show the faint dark "VANTA COLD" splash, NOT the actual page — this looks like a broken/blank page but is not.

**How to verify pages anyway:**
- Don't trust a single fresh-session screenshot that shows the splash — it's a timing race, not a bug.
- Rely on `npm run check` (clean tsc) + the browser console (no React errors) as primary evidence the page compiles/renders.
- Retake screenshots; some captures land after the 2.8s boot and render fully. Once one navigation in a shared context sets `vc-boot`, subsequent captures in that same context skip the splash.
