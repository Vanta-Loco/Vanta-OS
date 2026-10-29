---
name: GODFORSAKEN coordinate spaces
description: Keep station-local movement separate from the Vanta District city grid.
---

Keep GODFORSAKEN PARADISE station-local X/Y coordinates separate from Vanta District city X/Z coordinates. The city map may use the station's city landmark as an anchor, but must not display station movement as movement along city streets.

**Why:** The station is a separate playable interior, and the user explicitly asked that its live minimap not be conflated with the district map.

**How to apply:** Persist only a destination ID and coordinate-space marker for cross-route context. Restore local player coordinates only through the station save system; otherwise retain its spawn behavior.
