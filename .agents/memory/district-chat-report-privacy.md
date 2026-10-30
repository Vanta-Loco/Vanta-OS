---
name: District chat report privacy
description: Privacy constraints for user reports in temporary District chat.
---

Chat reports must reference a recent message actually delivered to the reporting player, but report metadata must not include message text or private recipients. Keep any report-validation cache bounded and free of message bodies.

**Why:** Private chat content should not be retained by default when a player reports abuse; the server can verify eligibility and identify the sender without storing the conversation.

**How to apply:** Preserve these limits in future moderation tooling, report storage, exports, and support workflows. Explicitly scope and disclose any feature that would retain message content.
