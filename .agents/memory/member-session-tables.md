---
name: Member session table separation
description: Why durable Member bearer sessions and legacy Express sessions must use separate database tables.
---

Durable `X-User-Token` sessions belong in `member_sessions`. Do not rename or merge them into the pre-existing `user_sessions` table.

**Why:** `user_sessions` predates durable Member authentication and uses the legacy Express-session shape (`sid`, `sess`, `expire`). Reusing that name caused a schema collision and risks damaging existing session rows.

**How to apply:** Future Member-session migrations, cleanup jobs, indexes, and auth queries should target `member_sessions`. Treat `user_sessions` as a separate legacy store unless an explicit Admin/Express-session migration safely retires it.