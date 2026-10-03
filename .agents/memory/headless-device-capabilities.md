---
name: Headless device capabilities
description: Chromium pointer emulation, software WebGL, and actual visibility caveats in this environment.
---

Headless Chromium can report `pointer: none` even with a desktop-sized viewport.
Setting `Emulation.setEmulatedMedia` to `pointer: fine` did not change the actual
pointer capability. Disabling touch emulation did not restore a fine pointer.

**Why:** A correctly gated desktop enhancement appeared inactive because the
test browser did not identify itself as a fine-pointer device, not because the
application was broken.

**How to apply:** Check the real media-query results before diagnosing eligibility.
For this Chromium build, launch with
`--blink-settings=primaryPointerType=4,availablePointerTypes=4,primaryHoverType=2,availableHoverTypes=2`.
Use fresh targets for independent device cases. Real touch emulation produces
coarse-pointer capability; do not replace application gates with a test bypass.

Software WebGL is available using ANGLE SwiftShader with
`--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`.

**Why:** The container lacks a physical GPU, but software rendering can still
prove actual draw and pixel output rather than only successful module loading.

**How to apply:** Label software-rendered checks honestly; do not treat their
frame rate as a physical-GPU performance benchmark. Browser-window minimization
through CDP genuinely changes document visibility and can test hidden-page
pausing without redefining `document.hidden`.