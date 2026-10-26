---
name: Vault media privacy
description: Private storage and delivery requirements for unreleased Vault media.
---

# Vault media privacy

## Rule
New Vault uploads belong in private media storage and must be delivered through an access-checked route. Do not rely on a hidden Vault screen while leaving the underlying file URL public. Legacy uploads must be safely mapped behind access checks. The designated startup-radio track is the only intentional public exception. Keep media publicly addressable when an actual public record references it, but explicit private asset visibility takes precedence.

**Why:** Generic upload URLs and public media assets can bypass the Vault item API gate.

**How to apply:** When adding a Vault media type, update private upload handling, URL decoration and legacy protection, media authorization, and range delivery together; preserve the narrow radio exception.
