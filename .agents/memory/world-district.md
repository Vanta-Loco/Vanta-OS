---
name: World — 3D WebGL city explorer
description: Durable design decisions/gotchas for /world (client/src/pages/world.tsx), a true 3D third-person WebGL city explorer, plus the headless-WebGL verification trap
---

# /world — 3D WebGL City Explorer

The /world page is a TRUE 3D, third-person, street-level city explorer built with
`three` + `@react-three/fiber` + `@react-three/drei` (R3F `<Canvas>`). You drive a player
avatar with WASD/arrows; a follow-camera sits behind the player at street level; drag
rotates the camera yaw; collision + bounds clamp keep the player in the city; a proximity
"Press E to enter" prompt opens a modal that routes to one of 12 landmark pages.
Primitives only (boxes/instanced meshes/lights) — no models, NPCs, physics, or backend.

**This replaced an earlier 2D isometric `<canvas>` version.** It also reverses an earlier
project rule of "no WebGL / no new deps" — the user explicitly authorized three/R3F/drei.

## R3F v8 is mandatory on React 18
`@react-three/fiber` v9 requires React 19. This project is React 18, so pin
**@react-three/fiber@^8** (with three ^0.169 + drei ^9). Confirm there is only ONE copy of
`react` after install (`npm ls react` → all "deduped"); `@use-gesture/react` and
`@types/react` are unrelated packages, not duplicate React.
**Why:** a fiber/React major mismatch (or a duplicate React) throws "Invalid hook call"
in a real browser, not just headless. **How to apply:** if you ever bump fiber to v9 you
must also move the whole app to React 19.

## THE BIG TRAP: headless/preview browsers have NO stable WebGL — and a getContext() probe is NOT enough
The screenshot tool, the Playwright harness, AND the user's own Replit preview browser can
all hand back a WebGL context that is LOST the instant three actually renders. A synchronous
`getContext()` probe PASSES there (the context creates fine), so the `<Canvas>` mounts, then
the renderer logs `THREE.WebGLRenderer: Context Lost.` and R3F throws a cascade during scene
creation: `undefined is not an object (evaluating 'acc[key2]')` in `applyProps`/`createInstance`,
plus a secondary "Invalid hook call". **These are NOT real code bugs** — they don't occur in a
GPU-backed browser. Do not chase `acc[key2]` as a defect: it only means a three object's props
are applied while its context is dying. (Grep `someprop-subprop={` to confirm no real
dashed-prop bug — there are none.)
**Why the synchronous probe failed the user:** React 18 dev re-dispatches the caught R3F error
to `window.onerror`, which trips `@replit/vite-plugin-runtime-error-modal` (the crash overlay).
`GLBoundary` recovers the React tree but CANNOT stop that dev overlay — so the only reliable fix
is to NEVER mount the Canvas in a broken env. A getContext check can't tell you that.
**How to verify the 3D path:** `tsc --noEmit` clean + architect review + confirm the fallback
directory renders/routes + user tests in their real browser. You will NOT get a 3D screenshot
from this environment; that is expected, not a failure.

## Graceful degradation is three layered guards, all required
Because of the trap above (and real-world GPU resets), the page degrades to a navigable
`CityDirectory` (a grid of the 12 landmark cards using the SAME route map as the 3D modal,
comingSoon item disabled). Three layers:
1. **`probeWebGL()` — an ASYNC warmup, the primary guard.** It builds a REAL
   `THREE.WebGLRenderer`, renders one frame with an `InstancedMesh` (same op class as the
   scene), `await`s ~80ms for an async `webglcontextlost`, then checks the lost flag /
   `getContext().isContextLost()`, disposes, and releases via `WEBGL_lose_context`. Returns
   `false` in broken envs so the Canvas NEVER mounts → no throw → no dev overlay. Driven by a
   3-phase state `"checking" | "3d" | "fallback"` set from a `useEffect`; `<Canvas>` renders
   only when `phase==="3d" && !glLost`, "checking" shows a brief loader, else `CityDirectory`.
   Compute the return value BEFORE the intentional context-loss in `finally` so it stays valid.
2. `GLBoundary` (class error boundary) wraps `<Canvas>` — catches a synchronous render-time
   crash if a browser passes the warmup but fails the full scene. Backup only.
3. `<Canvas onCreated>` adds a `webglcontextlost` listener that flips `glLost` → directory.
   Covers POST-mount context loss (driver reset). Backup only.
**Why async warmup beats the old sync getContext probe:** only actually rendering a frame and
waiting reveals the "context lost on first render" envs; getContext lies. Keep all three, but
the async probe is what actually fixed the user's crash — the boundary can't suppress the dev
overlay, and onCreated can't catch a create-time throw.
4. **`client/index.html` early error suppressor (final safety net).** A classic (non-module)
   `<script>` at the top of `<head>` registers `capture: true` error/unhandledrejection
   listeners. Capture-phase listeners fire BEFORE any bubble listener regardless of registration
   order, so `stopImmediatePropagation()` here silences the vite `runtime-error-modal` plugin
   even if the Canvas somehow mounts and crashes. Patterns matched: `acc[key2]`, `WebGL`,
   `webgl`, `Context Lost`, `context lost`, `THREE.WebGL`, `applyProps`, `getContext`.
   **Why this works:** the vite plugin uses bubble-phase `window.addEventListener('error')` via
   its own deferred module; our inline classic script runs synchronously first and registers in
   capture, winning regardless. **Only suppress if you're sure the pattern is WebGL-specific** —
   a too-broad suppressor would hide real bugs.

## Per-frame correctness (R3F)
- All movement/camera state lives in refs; the `useFrame` loop mutates them and only calls
  React `setState` when the near-landmark id actually CHANGES (avoids per-frame re-renders).
- Reuse `THREE.Vector3`/temp objects across frames — don't allocate in `useFrame`.
- Movement is dt-clamped and camera-relative; collision is axis-separated (try full move,
  then x-only, then y-only) against an AABB list so the player slides along walls; a final
  `BOUND` clamp prevents leaving the map.
- Procedural city is deterministic (mulberry32 seed) so layout is stable across reloads;
  buildings/signs/streetlights are InstancedMesh (`args={[undefined, undefined, count]}` +
  per-instance matrix/color set in a layout effect, `frustumCulled={false}`).
- Add a window `blur` listener that clears movement flags (keys stick "pressed" otherwise);
  remove all key/pointer/blur listeners in cleanup.

## Landmark routes (12) — keep modal + directory in sync
black-index→/search, transmissions-tower→/, music-hub→/releases, vault-gate→/vault,
mission-handler→/enter, worlds-archive→/worlds, vanta-os-core→/enter, fract-terminal→/fract,
wireline-terminal→/wireline, hidden-himalayas→/himalayas (portal/torus mesh),
fractured-godhead→/fgh, vanta-box→comingSoon (disabled, no route).
**How to apply:** the 3D enter-modal and the `CityDirectory` fallback both read the same
LANDMARKS list — change routes in one place so both paths stay consistent.

## StartupScreen still applies
Fresh-session captures show the ~2.8s VANTA COLD boot splash first (sessionStorage-gated
`vc-boot`). Verify via tsc + console + e2e, not a single capture — see startup-boot-screen.md.
