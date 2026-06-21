---
name: World District — isometric canvas
description: Architecture decisions for /world isometric district page
---

# /world Isometric District

## Key rule — no shared screen column
Each building's `col - row` value must be unique across all buildings, or buildings will occlude each other completely (same x in screen space). Before placing a building at (c,r), check that no other building has the same `c - r`.

**Current col-row values:**
- Black Index (2,0): +2
- Transmissions (0,2): -2
- Music Hub (4,0): +4
- Vault Gate (0,4): -4
- Mission Handler (2,2): 0
- Worlds Archive (1,4): -3
- Vanta OS Core (4,3): +1
- Vanta Box (5,2): +3

**Why:** Isometric x = (col - row) * (TW/2) + ox. Same col-row = same x = full z-occlusion.

## Canvas geometry
- TW=88, TH=44, WU=19 (wall unit height)
- Origin: { x: w/2, y: h/2 - 50 }
- Painter's algorithm: sort buildings by (col+row) ascending

## Layout
- Canvas is `fixed inset-0 z-0`, Header is `fixed z-50` (renders on top naturally)
- HUD overlays positioned at `top: 80` to appear below the 64px fixed header

## File
`client/src/pages/world.tsx` — fully self-contained (no new dependencies)
