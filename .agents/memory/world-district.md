---
name: World District — isometric canvas
description: Architecture decisions for /world isometric district page (Vanta City upgrade)
---

# /world Isometric District — Vanta City

## Key rule — no shared screen column
Each building's `col - row` value must be unique across ALL buildings (interactive + decorative), or buildings will fully occlude each other (same x in screen space). Before placing a building at (c,r), verify no other building has the same `c - r`.

**Why:** Isometric x = (col - row) * HW + ox. Same col-row = same x = full z-occlusion.

## Current interactive building col-row values (must stay unique)
- Black Index     (1,0):  +1
- Transmissions   (6,0):  +6
- Music Hub       (11,0): +11
- Vault Gate      (1,4):  -3
- Mission Handler (5,3):  +2
- Worlds Archive  (8,3):  +5
- Vanta OS Core   (12,4): +8
- Vanta Box       (10,7): +3

## Canvas geometry (Vanta City upgrade)
- TW=56, TH=28, HW=28, HH=14, WU=12
- Grid: 14 cols (0-13) × 9 rows (0-8)
- Streets at: STREET_ROWS={2,6}, STREET_COLS={4,9}
- Origin: { x: w/2 - 112, y: h/2 - 100 }
- Pre-sorted render lists: ALL_TILES, ALL_BUILDINGS (both sorted by col+row at module level)
- Painter's algorithm: sort buildings by (col+row) ascending

## Layout
- Canvas: `fixed inset-0 z-0`, Header: `fixed z-50`
- HUD drawn directly onto canvas (not DOM overlay) — top-left below header, bottom status bar
- Hover tooltip: fixed DOM element (bottom-center), appears when hoveredBuilding && !selected
- Decorative deco buildings in DECO array (no click, same drawBuilding fn but no sign/label)
- Checkpoint barriers drawn at street/avenue intersections (col∈STREET_COLS, row∈STREET_ROWS)

## Palettes
10 palettes: violet, blue, red, green, slate, dark, core, crimson, noir, plague.
Interactive nodes: violet(Black Index, Worlds Archive), slate(Transmissions), blue(Music Hub), red(Vault Gate), green(Mission Handler), core(Vanta OS Core), dark(Vanta Box).

## StartupScreen behavior
Screenshots on fresh browser sessions always show the startup animation ("AS ABOVE / SO BELOW"). This is expected — it fires once per session from sessionStorage. Pages load correctly after dismissal.
