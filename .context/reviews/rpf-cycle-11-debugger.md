# RPF Cycle 11 — Debugger

**Date:** 2026-04-24
**Reviewer:** debugger
**Scope:** Latent bug surface, failure modes, regressions

## Findings

Agrees with CR11-CR1: The `preparePluginConfigForStorage` logic on line 132-136 of `src/lib/plugins/secrets.ts` has a latent bug where encryption is performed unconditionally, then the result is discarded if the input starts with `enc:v1:`. This can cause:

1. **Unnecessary CPU work** — Argon2id... wait, it's AES-256-GCM, so it's fast. But still, the encrypt-then-discard pattern is wasteful.
2. **Silent data inconsistency** — The DB row contains a value that `decryptPluginSecret` cannot process, leading to the "Failed to decrypt plugin secret" error log on line 96 of the same file.
3. **Confusing failure mode** — Admin saves a secret, sees it "stick" in the UI (because `redactPluginConfigForRead` only shows whether a value is configured, not whether it decrypts), but the plugin silently falls back to an empty string.

No other latent bugs found.
