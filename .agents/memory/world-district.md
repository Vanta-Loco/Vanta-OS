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

## THE BIG TRAP: headless tooling browsers have NO stable WebGL — you can't screenshot-verify the 3D
The screenshot tool AND the Playwright testing harness both run a headless browser that
cannot sustain a WebGL2 context. The `webglAvailable()` probe (which only creates a context
briefly) often PASSES there, the `<Canvas>` mounts, then the renderer logs
`THREE.WebGLRenderer: Context Lost.` and R3F throws a cascade during scene creation:
`undefined is not an object (evaluating 'acc[key2]')` in `applyProps`/`createInstance`, plus
a secondary "Invalid hook call". **These are NOT real bugs** — they do not occur in the
user's real (GPU-backed) browser. Do not chase `acc[key2]` as a code defect: it only means a
three object's props are being applied while its context is dying. (Sanity check it's not a
genuine dashed-prop bug by grepping for `someprop-subprop={` in the file — there are none.)
**How to verify the 3D path instead:** `tsc --noEmit` clean + an architect review +
confirming the fallback directory renders/routes + the user testing in their real browser.
You will not get a 3D screenshot from this environment; that is expected, not a failure.

## Graceful degradation is three layered guards, all required
Because of the trap above (and real-world GPU resets), the page degrades to a navigable
`CityDirectory` (a grid of the 12 landmark cards using the SAME route map as the 3D modal,
comingSoon item disabled). Three layers:
1. `webglAvailable()` probe — tests `webgl2` then `webgl1` (matching what three requests),
   and releases the probe context via `WEBGL_lose_context` so it doesn't count against the
   browser's context limit. If false → render directory, never mount Canvas.
2. `GLBoundary` (a class `componentDidCatch`/`getDerivedStateFromError` error boundary)
   wraps `<Canvas>` — catches the SYNCHRONOUS render-time crash (the headless cascade) and
   swaps in the directory. This is what makes the headless screenshot show a clean directory.
3. `<Canvas onCreated>` adds a `webglcontextlost` listener that flips a `glLost` state →
   directory. This covers POST-mount context loss (driver reset) that the boundary misses
   because it isn't a React render error.
**Why all three:** the probe can't predict sustained-renderer success; the boundary can't
catch async context-loss events; the onCreated handler can't catch a synchronous create-time
throw. Each layer covers a gap the others don't.

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
