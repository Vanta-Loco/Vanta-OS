---
name: Package firewall blocks
description: Safe recovery when Replit's package firewall rejects a vulnerable transitive npm dependency.
---

# Package firewall blocks

When a lockfile pins a transitive dependency that the Replit package firewall blocks for a security issue, do not bypass the firewall. Identify the direct dependency that pulls it in, update that parent to a safe compatible release, and refresh the lockfile to the patched transitive version. Keep major-version behavior changes out of scope unless necessary.

**Why:** Install failures can otherwise recur in post-merge setup, and bypassing the firewall would restore a known-vulnerable package.

**How to apply:** On npm install or `npm ci` firewall failures, trace the blocked package through the lockfile, check compatible upstream releases, and verify a clean lockfile install before rerunning migrations/build.
