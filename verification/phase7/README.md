# VANTA OS — Phase 7 compatibility acceptance

Baseline: `e6bb74d` (clean Phase 6 checkpoint). No application, design,
geometry, navigation, content, dependency, configuration, shader, or budget
changes were needed. Nothing was published.

## Engines and coverage

| Engine | Available automated coverage | Limits |
| --- | --- | --- |
| Chromium 152.0.7977.64 / ANGLE SwiftShader | Full Phase 5 preservation; Phase 5.1.1 handoff; all ten Phase 6 cases; live-renderer inputs; desktop, real emulated coarse pointer, portrait/landscape, reduced motion | Software GPU, not physical hardware |
| Firefox 141.0, Linux | Native desktop/phone layout, fine/coarse pointer preferences, native mouse/wheel/keyboard, unchanged photo geometry, post-mount native reduced motion, CSS fallback, no optional mobile module requests, orientation/resize, Home/article Transmission, back/forward, passive visible-intermediate observations; BiDi JavaScript exception monitoring | WebGL2 context creation unavailable in this container |
| WebKitGTK 2.40.2, Linux | Native desktop/phone layout, native mouse/wheel/keyboard, unchanged photo geometry, CSS fallback, no optional mobile module requests, orientation/resize, Home/article Transmission, back/forward, passive visible-intermediate observations, active-document error listeners | Not Safari; no native coarse-pointer/reduced-motion emulation supplied by this driver; no working WebGL2 context; listener is not a browser-wide startup exception feed |

Both native drivers use HTTP loopback for the same running production build.
The packaged GTK browser could not use the development HTTPS origin's TLS
setup; no app URL or security setting was changed.

Chromium's phone viewport is 390 CSS pixels. Native GUI windows enforce minimum
widths: the resulting Firefox phone viewport was 450 CSS pixels and GTK's was
447, not the requested 390. Both remain below the app's mobile breakpoint, and
their actual viewport/overflow values are recorded. These are phone-mode layout
checks, not emulation of specific physical phone hardware.

WebKitGTK initially failed EGL initialization: JavaScript timers worked but
native animation times stayed at zero and no intersection callbacks arrived.
Restarting **only the test driver** with `WEBKIT_DISABLE_COMPOSITING_MODE=1`
restored its native render clock and software CSS rendering. This was an
environment failure, not a reason to change application reveal logic.

The full preservation check now waits for the release-artwork entrance's
actual settled transform instead of assuming a fixed sleep has advanced its
native CSS transition. Its assertion remains unchanged. The passive handoff
observer additionally records computed opacity, ancestor opacity and viewport
intersection after the app's own timeline writes; delivered middle frames must
show a visible local echo. It never seeks or advances the handoff timeline.

## Acceptance evidence

- `chromium-phase5/results.json`: full preservation and handoff acceptance.
- `chromium-phase6/results.json`: all ten focused acceptance cases.
- `chromium-phase6/inputs.json`: native mouse/wheel GPU values, bounded input,
  unchanged image geometry, energy settling and non-focusable decoration.
- `firefox/results.json`: seven native cases.
- `webkit/results.json`: five native cases.
- PNG captures in those directories: desktop/phone and CSS fallback evidence.

Chromium verifies **genuine** minimized-window visibility, offscreen pause,
stable stopped render counters, resume, detached cleanup, zero remaining
geometries, permanent context-loss fallback, back/forward, resize re-entry,
post-mount motion changes and deferred district loading. Native Linux engines
verify the available fallback paths; they are not represented as live-GPU tests.

The paired image check retains its original thresholds. It passed with 58,518
changed window-region pixels, maximum channel difference 25, mean difference
1.4141; navigation maximum difference 3, mean difference 0.0881; below-hero
content changed pixels zero. Some earlier captures fell just below the
existing peak threshold or just above the navigation rounding threshold. No
shader, lighting or threshold adjustment was made.

Budgets remain: 68 points, two calls, four triangles, maximum DPR 1.25 and
24 Hz scheduling ceiling. Initial JS remains **1,222,702 bytes / 314,356 gzip**.
Type checking and production build passed; whitespace and baseline source
preservation are checked before the acceptance checkpoint.

Desktop native software rendering can deliver no frames within the 155 ms
handoff window. This is recorded as zero intermediate coverage, not as proof
of an intermediate paint. Where middle frames were delivered, actual local
echo opacity/viewport checks passed; phone Firefox and GTK captured visible
intermediates. Every completed observed window reaches its real 155 ms endpoint.

## Reproduction

Use the existing Chrome CDP service at port 9223 with fine-pointer Blink
capabilities, ANGLE SwiftShader, and fresh page targets. Do not replace app
eligibility, visibility, media-query or frame-clock behavior.

```sh
PHASE5_TEST_OUTPUT=verification/phase7/chromium-phase5 node scripts/verify-phase5.mjs
PHASE6_TEST_OUTPUT=verification/phase7/chromium-phase6 node scripts/verify-phase6.mjs
PHASE6_TEST_OUTPUT=verification/phase7/chromium-phase6 node scripts/verify-phase6-inputs.mjs
node scripts/verify-phase7-native.mjs firefox
node scripts/verify-phase7-native.mjs webkit
npm run check
npm run build
git diff --check
```

Native adapters require an already-running Firefox Marionette service on 2828
(BiDi enabled) and the packaged WebKitGTK driver on 4445. The adapters reuse
the existing `ws` package and bundled engines; no new packages or browsers
were installed. Their test services are stopped after verification.

## Still manual — not claimed as verified

- Actual Safari on macOS and iOS (GTK WebKit is not a substitute).
- Physical iPhone/iPad/Android touch, orientation, backgrounding and return.
- Safari/coarse-device post-mount motion changes and real context loss.
- Physical GPU smoothness, thermal throttling, battery cost and prolonged use.
- Visible desktop handoff intermediates on devices delivering normal frames,
  where this software-rendering session delivered none.

Acceptance applies to the **available engine/capability matrix**, not a blanket
Safari or physical-device certification.