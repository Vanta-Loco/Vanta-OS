---
name: Headless CSS animation timing
description: Timing caveat when verifying short entry effects through Chrome DevTools.
---

A CSS animation can remain pending for several seconds in headless Chrome even when the document reports visible; once it becomes ready, its document timeline may advance past a short effect before a wall-clock timeout samples opacity. This occurred in both an inherited and a fresh browser instance.

**Why:** Coupling text assembly to `CSSAnimation.ready` without a bounded escape path delayed content for seconds during verification. Repeated fixed-time opacity samples also missed the intermediate animation frames and could not prove a perceptible handoff.

**How to apply:** Keep content availability independent of unbounded animation readiness. For short-effect verification, distinguish DOM lock duration from actual animated frames and sample frame-by-frame or use another visual check; do not infer visible progress from `display: block` or a running animation name alone.

Headless frame delivery can also have gaps exceeding 100ms. A first-observed text opacity timestamp is therefore an upper bound on its onset, not the exact transition-start time.

**Why:** A fixed wall-clock tolerance incorrectly rejected correctly configured text delays when the browser delivered no intermediate observation frame.

**How to apply:** Assert the actual release boundary and configured delay separately; retain frame samples and account for observed frame gaps when checking the first visible text sample.

Timing-dependent entry checks can fail on an untouched baseline as well as a
candidate in the same headless-browser setup.

**Why:** Short-window capture and text-onset failures were reproduced without
changing the accepted animation code; the failing check alone did not identify
a new application regression.

**How to apply:** Compare an untouched baseline before changing previously
accepted timings or weakening assertions. Retain failed observations and report
the preservation check as blocked: baseline failure is not a passing result.