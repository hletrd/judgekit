# RPF Cycle 11 — Verifier

**Date:** 2026-04-24
**Reviewer:** verifier
**Scope:** Evidence-based correctness check against stated behavior

## Verified Behaviors

| Behavior | Evidence | Status |
|----------|----------|--------|
| Recruiting token redemption is atomic | `redeemRecruitingToken` uses SQL `WHERE status='pending' AND (expires_at IS NULL OR expires_at > NOW())` inside a transaction | VERIFIED |
| Session invalidation closes revocation window | `clearAuthToken` sets `authenticatedAt=0`; `isTokenInvalidated(0, any)` returns true; JWT callback checks on every refresh | VERIFIED |
| Rate limiting uses DB time for server actions | `checkServerActionRateLimit` uses `getDbNowUncached()` | VERIFIED |
| Rate limiting uses `Date.now()` for API hot path | `atomicConsumeRateLimit` uses `Date.now()` (deferred item #1) | KNOWN-DEFERRED |
| Anti-cheat events use DB time for contest boundary | `POST` handler fetches `NOW()::timestamptz` for start/end checks | VERIFIED |
| SSE re-auth prevents data leakage after deactivation | `onPollResult` awaits `getApiUser` before processing status event | VERIFIED |
| File uploads reject path traversal | `resolveStoredPath` rejects `/`, `\\`, `..` | VERIFIED |
| Plugin secrets are encrypted at rest | `encryptPluginSecret` uses AES-256-GCM; `preparePluginConfigForStorage` calls it for new values | VERIFIED (with caveat: CR11-CR1) |
| Data retention respects legal hold | `DATA_RETENTION_LEGAL_HOLD` checked before any deletion | VERIFIED |

No unverified behaviors found beyond the known CR11-CR1 caveat.
