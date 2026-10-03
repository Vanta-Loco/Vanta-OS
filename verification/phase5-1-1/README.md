# Phase 5.1.1 Transmission verification

Verified against a freshly rebuilt production preview (`npm run start`) at desktop 1280×900 and phone 390×844 in headless Chromium.

## Checks passed

- `npm run check`
- `npm run build`
- JavaScript syntax checks and `git diff --check`
- `PHASE511_FOCUSED=1 PHASE5_TEST_OUTPUT=verification/phase5-1-1 node scripts/verify-phase5.mjs`
- Preview HTML references the exact JS/CSS assets in the current `dist/public/index.html`, with no Vite development client.

The browser suite observes application behavior without seeking or advancing animations. It checks distinct local names, zero initial timelines, real nonzero-opacity frame samples, route interruption and one full retry, text release at actual local start, stage pacing/order, SPA navigation and back/forward, scrolling/settling, no entry replay, active-window focus and reduced-motion cancellation, initial reduced motion, overflow, and browser exceptions.

`results.json` retains observed windows, animation samples, text samples, route-signal timestamps, and desktop/phone results. PNGs show the settled article, retried featured composition, and reduced-motion article. They are not screenshots of the transient echo; its visibility is established by the frame samples.

## Timing interpretation

Local CSS effect duration is 155ms. Cleanup occurs on the first delivered animation frame at or after that duration. In this run, measured complete windows were 161.3–237.4ms for hard arrivals, 164.5–214ms for retries, and 157.6–189ms for SPA clicks. Interrupted attempts were 92.8–103.7ms.

Text stage delays from the actual local start:

| Stage | Desktop | Phone |
|---|---:|---:|
| Title | 180ms | 170ms |
| Metadata | 250ms | 210ms |
| Description | 315ms | 250ms |
| Controls | 380ms | 290ms |

Only title/metadata exist in the article hero; the featured composition verifies all four stages. First-observed opacity is affected by delivered frame timing, so the suite retains frame gaps rather than claiming exact painted onset times.

No publication occurred. These checks do not establish Safari/Firefox or physical-device behavior, and static screenshots do not establish the subjective quality of the brief effect.