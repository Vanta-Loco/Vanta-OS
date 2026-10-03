---
name: Headless CSS animation timing
description: Timing caveat when verifying short entry effects through Chrome DevTools.
---

A CSS animation can remain pending for several seconds in headless Chrome even when the document reports visible; once it becomes ready, its document timeline may advance past a short effect before a wall-clock timeout samples opacity. This occurred in both an inherited and a fresh browser instance.

**Why:** Coupling text assembly to `CSSAnimation.ready` without a bounded escape path delayed content for seconds during verification. Repeated fixed-time opacity samples also missed the intermediate animation frames and could not prove a perceptible handoff.

**How to apply:** Keep content availability independent of unbounded animation readiness. For short-effect verification, distinguish DOM lock duration from actual animated frames and sample frame-by-frame or use another visual check; do not infer visible progress from `display: block` or a running animation name alone.

Headless frame delivery can also have gaps exceeding 100ms. A first-observed text opacity timestamp is therefore an upper bound on its onset, not the exact transition-start time.

**Why:** A fixed wall-clock tolerance incorrectly rejected correctly configured text delays when the browser delivered no intermediate observation frame.

**How to apply:** Assert the actual release boundary and native transition effect timing separately. Prefer lifecycle events and the application's observed animation-timeline writes to short polling windows; retain delivered-frame coverage as evidence, not a mandatory sample count.

Timing-dependent entry checks can fail on an untouched baseline as well as a
candidate in the same headless-browser setup.

**Why:** Short-window capture and text-onset failures were reproduced without
changing the accepted animation code; the failing check alone did not identify
a new application regression.

**How to apply:** Compare an untouched baseline before changing previously
accepted timings or weakening assertions. Retain failed observations and report
the preservation check as blocked: baseline failure is not a passing result.

Transition events for separate targets may be delivered together in DOM order,
even when their intrinsic delays differ.

**Why:** Receipt ordering falsely reversed title and metadata assembly on a
preserved baseline; native transition start times and delays retained the
correct order.

**How to apply:** Compare native effect `startTime + delay`, not listener receipt
times. Passive setter instrumentation can observe manually driven paused
effects; never seek or drive their clocks to manufacture a passing result.
Distinguish programmatic completion from visible intermediate-frame coverage.

CDP screenshot capture can make a minimized document visible again.

**Why:** A genuinely hidden renderer resumed between paired captures, so their
GPU animation times differed despite identical paused CSS clocks.

**How to apply:** Test real hidden-state pause separately from capture. For exact
visual pairs, hold only the identified renderer's next callback in test code,
pause settled CSS, and assert identical shader/CSS times and scroll before and
after. Resume with a fresh native frame timestamp; leave production lifecycle
and eligibility untouched.