---
name: World — walkable isometric city
description: Durable design decisions/gotchas for /world (client/src/pages/world.tsx), a walkable street-level isometric city explorer
---

# /world — Walkable Isometric City

The /world page is a canvas-rendered, street-level isometric city you WALK through
(controllable avatar via WASD/arrows + mobile d-pad), not a map you pan/drag. Camera
follows the player. ~270 procedurally-placed buildings across districts; ~12 clickable
nodes route to real pages. Single self-contained file, no deps, no WebGL.

## Occlusion: unique col-row OR painter-sort with player inserted
Isometric screen-x = (col - row) * HW. Two buildings sharing `col - row` land on the
same screen column and fully occlude each other. With hand-placed buildings, keep
`col - row` unique. With procedural generation (current), instead rely on a per-frame
painter sort: sort all visible items by `col + row` ascending and INSERT the player
into that order at its own `col + row` so it occludes / is occluded correctly.
**Why:** depth in iso is `col + row`; x-collision is `col - row`.

## Collision must sample a footprint, not just the center tile
`canStand` must check the rounded center PLUS cardinal offsets (±RAD on col and row,
RAD≈0.3). Center-only rounding lets the avatar visually penetrate ~half a tile into
blocked buildings. RAD<0.5 keeps 1-tile-wide alleys passable (offsets still round to
the same walkable tile when centered). Movement is dt-based with axis-separated
sliding (try full move, then x-only, then y-only) so you slide along walls.

## Cull margin: tall towers draw UPWARD from their base
Buildings render upward from their base tile, so a tower whose base is BELOW the
viewport still extends up into view. The bottom cull margin must exceed max building
height (use ~h + 320, not h + small). Too-tight a bottom margin pops foreground towers
in/out near the bottom edge.

## rAF / React correctness
- Single `useEffect([])` rAF loop; all mutable state in refs (player pos, move flags,
  near-node id) so frames never trigger React renders.
- Only call setState when the near-node id actually changes (throttle), else constant
  re-renders.
- Cache the HUD clock string (update ~once/sec via tick%30), don't call `new Date()`
  every frame.
- Add a window `blur` listener that clears all movement flags, or keys stay "stuck"
  pressed when focus leaves mid-walk. Remove it in cleanup alongside resize/key listeners.

## Controls & misc
- Mobile d-pad is `md:hidden` (desktop uses WASD/arrows). Proximity prompt ("Press E")
  is shown for all and also tappable.
- Fast-travel teleports the avatar to a node's entrance tile (entrance must be walkable).
- Canvas is `fixed inset-0 z-0`; Header is `fixed z-50`; HUD + status bar painted onto
  the canvas; modal/tooltip/d-pad/fast-travel are DOM overlays above the canvas.
- Procedural gen is deterministic (mulberry32 seed) so layout is stable across reloads.

## StartupScreen still applies
Fresh-session screenshots show the boot splash first (sessionStorage-gated). Verify via
tsc + console + e2e, not a single capture — see startup-boot-screen.md.
