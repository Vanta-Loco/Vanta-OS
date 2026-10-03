# Phase 6.1 acceptance

## Automated acceptance passed

Accepted code snapshot title: **VANTA OS — Phase 6: bounded spatial atmosphere**

Physical-device acceptance remains manual. Nothing was published.

## Ordered work and preservation

1. Repaired only the Transmission verifier first.
2. Passed the corrected desktop/phone suite against an isolated, untouched
   Phase 5.1.1 build, and against the pre-tuning Phase 6 implementation.
3. Tuned only existing Home shader parameters, then passed the corrected suite
   again against the final build.

Transmission runtime is unchanged. Source guards preserve Phase 5.1.1 signal,
reveal, navigation, CSS, depth and district sources; Phase 6 Home layout,
eligibility, loader and lifecycle are byte-identical to their pre-tuning state.
No dependencies, routes, global signals, photo/crop, typography, geometry,
excluded features, or additional WebGL surfaces changed.

## Corrected Transmission verifier

The test passively records the application's real `Animation.currentTime`
writes: both local echoes start at zero, use the actual paused 155ms effects,
advance monotonically within bounds, and reach 155 before completed cleanup.
An interrupted attempt is triggered at its observed start boundary, never by a
timer that could arrive after a short effect. Retry waits for route clearance
and starts fresh. Original text is held at creation and its release boundary is
checked.

Native transitionrun/start events verify actual transition delays and ordering
using `startTime + delay`, not delivery timestamps. Events from multiple targets
can arrive in DOM order in one batch. Slow headless frames can jump directly
from zero to the endpoint; intermediate writes are reported, not required as an
arbitrary sample-count condition. This proves preserved lifecycle and authored
effects, not physical-device flash perception when no intermediate frame was
delivered. Focus, reduced motion, scrolling, navigation, back/forward and
overflow checks also pass.

Evidence:
- `baseline-transmission/results.json`: untouched baseline.
- `transmission-before-tuning/results.json`: pre-tuning candidate.
- `transmission-final/results.json`: final candidate.

## Bounded visual tuning

- Same 68 points, two draw calls, four triangles and 1.25 DPR cap.
- Dust authored size: 1.55–3.70; opacity: 0.16–0.36.
- Depth-dependent drift: 0.42–0.90 rad/s with small, varied travel.
- Window-ray peak shader strength: 0.18 rather than 0.105.
- Source UVs, ray alignment, projection, camera, pointer limits and cleanup
  remain unchanged.

The controlled 1280×900 images have identical scroll, shader time (1.70s), CSS
animation times and render-frame count. The test pauses settled CSS and holds
only the identified renderer callback; it never seeks time or alters shader
uniforms or device eligibility. Hiding the transparent layer reveals the same
permanent CSS/photo underlay. Hidden-window lifecycle is tested separately:
CDP screenshots can make a minimized document visible again.

Window-region difference: **58,533 changed pixels**, maximum channel delta
**25/255**, mean delta **1.42/255** (previously 17 and 0.91).
Navigation retains the existing tiny translucent-background tolerance:
maximum 3/255, mean 0.089/255. Below-hero pixels are identical.

Two real point-pass GPU readbacks, before ray compositing and outside the
scheduler profile, show all 68 tracked dots moving over 2.20 animation seconds.
Maximum nearest-matched travel is 5.14 framebuffer pixels; varied horizontal
and vertical movement rejects a single flat translated layer.

`controlled-comparison.html` is self-contained and provides a draggable
comparison using the exact paired images.

## Performance and lifecycle evidence

Actual GPU `uTime` updates are associated with native rAF timestamps. Delivered
intervals of 133.4–200.1ms in software WebGL respect the 24Hz ceiling; animation
deltas remain positive and bounded at 0.1s. This verifies the scheduler cap,
**not** 24fps delivery or hardware smoothness. The unchanged lifecycle wrapper
retains its bounded timer+rAF scheduler rather than a permanent 60fps loop.

Startup JS remains **1,222,702 bytes / 314,356 gzip**: raw size unchanged from
Phase 6; gzip differs by two content-hash bytes. Gzip transfer is 42.85% below
the original baseline. Optional scene chunk is about 6.03KB / 2.46KB gzip;
Three remains deferred and unchanged.

All ten focused cases pass, including real offscreen/hidden pause, disposal,
zero remaining geometries, context loss/restoration fallback without retry,
unavailable WebGL, phone/coarse/reduced-motion fallbacks, preference changes,
resize/DPR limits, navigation and deferred district loading. Pointer, scroll
energy and keyboard checks pass. No uncaught browser exceptions.

Type check, production build and whitespace validation pass. The managed
production preview is running. Its existing MemoryStore warning and existing
build-tool warnings were not changed in this bounded pass.

## Reproduction

Use a fresh Chrome CDP instance on 9223 with fine-pointer Blink settings,
SwiftShader WebGL, and background throttling disabled, as documented in the
historical Phase 6 report.

```sh
npm run check
npm run build
node scripts/verify-phase6.mjs
node scripts/verify-phase6-inputs.mjs
PHASE511_FOCUSED=1 PHASE5_TEST_OUTPUT=verification/phase6-1/transmission-final \
  node scripts/verify-phase5.mjs
git diff --check
```

## Remaining manual checks

- Real fine-pointer desktop GPU: native smoothness, visual restraint and text
  readability during pointer/scroll motion; warm rays should stay room-aligned.
- Physical iOS/Android touch devices: unchanged CSS-only Home, orientation,
  navigation and reduced-motion preference changes.
- Safari/Firefox: short Transmission handoff perception and Home eligibility,
  pause, cleanup and context-loss behavior.

No claim of physical-device or cross-browser completion is made.