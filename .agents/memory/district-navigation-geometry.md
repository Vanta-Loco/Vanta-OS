---
name: District navigation geometry
description: The shared-geometry rule for District routing and map rendering.
---

District routes must use the same coordinate space, projection, road network, obstacle polygons, bridge permissions, and destination entrances as the District map. Reject unsafe connectors and show an unavailable route instead of drawing through blocked areas.

**Why:** Independent decorative map lines and sparse route waypoints produced routes that visibly crossed building blocks and did not match walkable streets.

**How to apply:** When changing District artwork or navigation, update their shared geometry contract together and validate emitted route segments against the same obstacles. Keep District city coordinates separate from station-local coordinates.
