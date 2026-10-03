# Phase 6 verification

## Historical acceptance status: blocked; superseded by Phase 6.1

This records the original blocked verification attempt. The corrected verifier
has since passed against the untouched baseline and tuned candidate; see
[`../phase6-1/README.md`](../phase6-1/README.md) for current acceptance evidence.

The Home-only prototype is implemented and its focused checks passed. The
unchanged Phase 5.1.1 Transmission verifier did **not** pass, so the requested
“VANTA OS — Phase 6: bounded spatial atmosphere” checkpoint has not been created.
Nothing was published. Transmission runtime and verifier files were not edited.

## Scope and source preservation

Baseline: `aa59ec5c9f171a8ee8e6c64a324a3209e2920999`.

Only Home mounts the new transparent procedural atmosphere. The existing image,
crop, CSS atmosphere, hero layout, text, and navigation remain underneath it.
The original camera/parallax transforms carry the photo and canvas together;
pointer input affects only the small atmospheric offsets.

The existing `/world` is lazily imported behind a route-local loading boundary.
Its page and bedroom implementation are byte-identical to the baseline.
No enhancement was added to Worlds or another route. No dependencies, textures,
models, shadows, postprocessing, audio, or physics were added. Sleaze, Wireline,
Marketplace, placeholders, and Late Night Sessions were not edited.

Source guards passed for the prior scene, signal, depth, environment, scroll,
global/Phase 5 CSS, navigation, OS boot/intro, district, Worlds, dependency
manifests, studio image, and Transmission verification files.

## Passing checks

- `npm run check`, production build, and whitespace checks.
- Ten focused browser cases in `results.json`:
  - Genuine desktop WebGL rendering, one canvas, 68 points, two draw calls,
    four triangles; shader errors absent.
  - Import begins only after the original image is loaded and title is visible.
  - Hero/image/title/subtitle geometry, fonts, and image crop match the baseline;
    no layout shift caused by the enhancement.
  - Controlled enhanced-versus-CSS-only visual comparison.
  - Actual offscreen and minimized-window pause/resume; render counts stop.
  - Resize stability and unmount cleanup, including zero remaining geometries,
    detached canvas removal, and stopped render count.
  - Real `WEBGL_lose_context` recovery to the permanent CSS underlay without
    reallocation loops; navigation remains available.
  - Unavailable WebGL retains the original scene.
  - Phone, wide coarse-pointer, initial reduced-motion, and unsupported-observer
    paths do not request optional engine chunks or allocate a canvas.
  - Active reduced-motion and narrow-width changes dispose the renderer.
  - DPR cap of 1.25 and eligible-width reentry without duplicate canvases.
  - `/world` engine loads only on district navigation; back/forward navigation
    and the separate Worlds route remain functional.
- Actual mouse/wheel/keyboard checks in `inputs.json`: nonzero input values reach
  the GPU, pointer/energy values are bounded, pointer input does not move the
  image, scroll energy settles to zero, and the decorative canvas does not
  receive keyboard focus.
- A fresh preview loads the unchanged VANTA OS entry screen.

### Visual evidence

All accepted comparison images use controlled viewport metrics.

- `desktop-baseline-css.png`: original baseline.
- `desktop-enhanced.png` / `desktop-css-only.png`: same settled page and crop;
  only the enhancement's visibility differs. Settled CSS animations are paused
  for this comparison, not sought or accelerated. The renderer remains genuine.
- `desktop-context-loss-fallback.png`: original scene after actual context loss.
- `desktop-webgl-unavailable.png`: original scene without WebGL.
- `phone-css-fallback.png`: 390 × 844 CSS-only view, no overflow.

Visual review found restrained warm air/light depth in the window region, not a
new composition or camera effect. The controlled pair changes 51,003 pixels in
the sampled window region, with maximum channel difference 17/255. Below-hero
pixels are identical. The unchanged translucent header samples the background,
so its tiny response is measured separately: maximum difference 2/255, mean
0.063/255. Navigation source, geometry, and text remain unchanged.

`desktop-enhanced-initial.png` was an exploratory capture with different viewport
metrics; it is **not** acceptance/comparison evidence.

### Bundle comparison

Totals include the full static-import JS closure, measured as file bytes and
Node gzip, not Vite's displayed character count.

| Initial JavaScript | Baseline | Candidate | Reduction |
| --- | ---: | ---: | ---: |
| Uncompressed | 2,099,425 B | 1,222,702 B | 41.76% |
| Gzip | 550,074 B | 314,354 B | 42.85% |

Optional scene/Three code is deferred until an eligible visible hero is ready.
World's route-specific code is deferred until `/world` navigation. The optional
desktop scene still adds a download after eligibility; it is not free.

### Performance limits

Browser tests used Headless Chromium 152, desktop/mobile emulation, and ANGLE
SwiftShader for real WebGL output. This is **software rendering**, not a physical
GPU or phone benchmark. The scheduler is capped at 24 Hz; observed delivery in
the sampled software-rendered interval was nine updates in 1.2 seconds.
Offscreen/hidden intervals produced zero updates. Real-device smoothness and
Safari/Firefox behavior were not verified.

Existing Browserslist, PostCSS, chunk-size, and server MemoryStore warnings
remain; no new build failure was introduced.

## Blocking Transmission verification

The original verifier and all its assertions were kept intact.

1. On the WebGL-enabled test browser, the hard-navigation local window yielded
   no intermediate frame samples; its lock lasted about 514 ms.
2. On a fresh CSS-only browser, two local samples were observed, but metadata
   onset was approximately 502 ms versus its configured 250 ms delay, outside
   the verifier's frame-gap allowance. Details: `transmission/failure.json`.
3. An isolated export of the untouched baseline was rebuilt in `/tmp`, sharing
   the existing dependencies without installation. Its entry bytes/gzip exactly
   matched the recorded baseline. A temporary static server served that build
   and forwarded only GET API requests to the existing app; no second backend,
   migrations, or database mutations were run. On the same fresh CSS-browser
   setup, the original baseline also failed: only one local sample was observed.
   Details: `baseline-transmission/failure.json`.

The failure is therefore not demonstrated to be a Phase 6 regression. However,
a failing baseline is not a substitute for a passing preservation check.
Acceptance remains blocked. No Phase 5 timing was changed and no assertion was
relaxed to obtain a passing result.

## Reproduction

Build and run the existing production workflow first. A fresh browser must
expose CDP. The functional WebGL test launch used:

```sh
chromium --headless=new --no-sandbox --disable-dev-shm-usage \
  --disable-background-networking --disable-renderer-backgrounding \
  --disable-background-timer-throttling --disable-backgrounding-occluded-windows \
  --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader \
  --blink-settings=primaryPointerType=4,availablePointerTypes=4,primaryHoverType=2,availableHoverTypes=2 \
  --window-size=1280,900 --remote-debugging-port=9223 \
  --remote-allow-origins='*' --user-data-dir=/tmp/vanta-phase6-browser-fine about:blank
```

Then:

```sh
node scripts/verify-phase6.mjs
node scripts/verify-phase6-inputs.mjs
PHASE511_FOCUSED=1 PHASE5_TEST_OUTPUT=verification/phase6/transmission \
  node scripts/verify-phase5.mjs
```

`CHROME_DEBUG_URL`, `PHASE6_TEST_URL`, and `PHASE5_TEST_URL` can select a dedicated
browser or preview. Do not rerun baseline capture against the candidate; its
source guard rejects a changed working tree.