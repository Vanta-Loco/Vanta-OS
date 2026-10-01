---
name: Vanta scene composition constraints
description: Why cinematic assembly uses one visibility owner and media-entry signal effects stay local.
---

Use one visibility owner per composition: either a mechanical panel reveal or independent staged leaf content. Keep entrance motion separate from hover and ongoing environment motion.

**Why:** Multiplying wrapper, group, and leaf opacity made the original Phase 5 assembly unusually dark and slow. Animating entrance and hover transforms on the same element also replaced intended entrance behavior. The focused repair preserves the Phase 1–4 systems instead of changing their motion architecture.

**How to apply:** When extending a Vanta scene, choose which element owns visibility before adding stages. Use separate nested planes for entrance, hover, and parallax when they need independent transforms.

Media-entry signal effects must remain local to the entering frame; route and interaction events remain owned by Phase 3.

**Why:** A global media-entry event activated unrelated signal surfaces. The intended repair is restrained, frame-local reception, not stronger site-wide glitches.

**How to apply:** Do not dispatch a global provider signal merely because a media frame enters the viewport. Local effects should defer to route signals and hover/focus, and cancel on focus, reduced motion, or unmount.