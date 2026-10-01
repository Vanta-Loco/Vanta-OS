---
name: Media fade progress bounds
description: Why media volume fades must clamp interpolated progress on both ends.
---

Clamp progress to [0, 1] before interpolating a value assigned to an HTMLMediaElement volume.

**Why:** In the browser's animation scheduling, a requestAnimationFrame timestamp can fall slightly before a performance.now() value captured when the fade begins. An upper-bound-only clamp then yields a negative volume and throws IndexSizeError, interrupting the entrance flow. The audible fade itself should remain unchanged.

**How to apply:** For future timed media fades, bound the progress (or final volume) on both ends, even when the elapsed-time calculation normally appears nonnegative.