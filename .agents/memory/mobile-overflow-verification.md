---
name: Mobile overflow verification
description: Avoid false negatives when checking overflow in a headless mobile viewport.
---

Compare document scroll width against the configured device width, not only against window.innerWidth.

**Why:** In Chromium mobile emulation, an overflowing decoration expanded the layout viewport and innerWidth from the requested 390px to 408px. A scrollWidth <= innerWidth check incorrectly appeared to pass.

**How to apply:** Keep the intended viewport width in the browser-test configuration and assert document.documentElement.scrollWidth is no greater than that width. Inspect the visual screenshot as well.