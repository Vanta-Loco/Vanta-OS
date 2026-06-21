---
name: World — walkable isometric city
description: Durable design decisions/gotchas for /world (client/src/pages/world.tsx), a walkable street-level isometric city explorer
---

# /world — Walkable Isometric City

The /world page is a canvas-rendered, street-level isometric city you WALK through
(controllable avatar via WASD/arrows + mobile d-pad), not a map you pan/drag. Camera
follows the player. ~580+ procedurally-placed structures across named neighborhoods;
12 landmark NODES route to real pages. Single self-contained file, no deps, no WebGL.

## City generation = weighted hoods + SPECIALS override + flat FEATURES
The grid (48x32) is partitioned into named neighborhoods (HOODS), each a rect with a
WEIGHTED building-type table (TYPES catalogue: cat/drawKind/height/names/sign). Generation
fills each non-road/non-plaza/non-node tile by sampling its hood's table, THEN a curated
SPECIALS list overrides specific coords (hotels/transit/billboards/radio towers/garages/
precincts/clubs/cinema/courts/skatepark/tunnel/compounds) so hand-placed landmarks read
distinctly. Flat FEATURES (food trucks/stalls/bridge) draw at ground level, not as boxes.
**Why:** weighted tables give believable district character cheaply; a SPECIALS override
layer lets you place memorable one-offs without fighting the random fill.
**How to apply:** to add variety, extend TYPES + a hood's weight table; to place a specific
named thing at a coord, add to SPECIALS (it wins over the hood fill).

## Reachability guard — relocating a NODE can strand its entrance
A BFS-from-player-start IIFE floods over `isWalkable` tiles and `console.warn`s if any
node's entrance tile is unreachable. ALWAYS keep it green: every node entrance must sit on
a street/alley/plaza/lot tile that connects to the start. Roads are formulaic
(`isStreet`/`isAlley` by col/row modulo) so moving a node near a plaza/lot edge can quietly
cut it off. **Why:** fast-travel + the Enter flow both depend on the entrance being a
walkable, connected tile; an unreachable node is invisible to walking players.

## Clutter + per-frame perf: gate signs/windows by proximity, hover by squared dist
Minor neon signs (1-pass) and lit windows only draw within a Manhattan radius of the player
(SIGN_NEAR / WIN_NEAR); landmark NODES always render their 4-pass glow. Hover hit-testing
builds a per-frame `hitRef` of ONLY visible, labeled, hoverable buildings and picks the
nearest by SQUARED screen distance (no sqrt). Click opens a modal only for `interactive`
NODES; flavor buildings hover-only. **Why:** drawing every sign/window each frame both
clutters desktop and burns CPU over ~600 items + 1536 ground tiles; proximity gating fixes
both. **How to apply:** keep new decorative signage behind the proximity gate; reserve the
always-on multi-pass glow for true landmarks.

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
