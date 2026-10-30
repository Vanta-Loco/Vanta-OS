---
name: Secondary-touch action buttons
description: Keep District action buttons usable while another finger controls the joystick.
---

When a primary touch is held on the District joystick, Chromium touch emulation can deliver `pointerup` for a second finger on a button without synthesizing the button's `click`. A button that depends only on `onClick` may therefore ignore the second finger.

**Why:** The action control must work concurrently with joystick movement, but activating on every pointer release would incorrectly trigger when the finger started elsewhere.

**How to apply:** Track non-primary touch pointer IDs per button from `pointerdown`; activate on `pointerup` only when that same pointer began on that button. Keep click handling for primary touch, mouse, pen, and keyboard, and suppress the immediate synthetic click if a browser emits one.
