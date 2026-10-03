---
name: Native browser render-clock availability
description: Distinguish failed native compositing from application reveal defects in Linux browser acceptance.
---

Before diagnosing a native-browser reveal failure, verify that native animation
times advance and requestAnimationFrame/intersection callbacks are delivered.
JavaScript timers and a visible document alone do not prove a working render clock.

**Why:** The packaged Linux WebKit browser's EGL initialization failed while
navigation, scripting and timers worked. Animations stayed at zero and every
reveal remained pending. Changing application visibility logic would have
concealed an environment failure.

**How to apply:** Inspect driver graphics errors and a small native-clock probe.
For this software-only GTK environment, launch the test browser with
`WEBKIT_DISABLE_COMPOSITING_MODE=1`; verify clock delivery again. Label the result
as software CSS rendering, not Safari or live physical-GPU coverage. Keep all
production gates and scene logic unchanged.

Use native navigation commands to await a seeded-document replacement.

**Why:** Scheduling location.reload() inside a synchronous automation script can
let the next DOM predicate match the old document before it is replaced, losing
the newly installed observer.

**How to apply:** Seed only boot/intro preferences, then use the driver's awaited
navigation and install observers in the resulting document. For exceptions
across navigations, prefer an engine-wide feed such as Firefox BiDi; document
listeners alone do not cover startup in replacement documents.