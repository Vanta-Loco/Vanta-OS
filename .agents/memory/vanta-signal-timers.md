---
name: Vanta signal event timers
description: Prevent stale timeouts from clearing newer interaction or route signals.
---

Each signal timeout must capture the ID of the event it owns and only clear the active event when the IDs still match. Do not compare against a mutable “latest event ID” ref from inside an older timeout.

**Why:** A short media interaction signal can overlap navigation. Its timeout must not prematurely clear the stronger route-entry signal that replaced it.

**How to apply:** Whenever adding route- or interaction-triggered signal effects, capture the event ID when scheduling the timeout and guard the state update with that captured ID.