# Architecture Review — RPF Cycle 37

**Date:** 2026-04-23
**Reviewer:** architect
**Base commit:** 3d729cee

## Inventory of Files Reviewed

- `src/lib/db/import.ts` — Import engine (verified TABLE_MAP derivation from TABLE_ORDER)
- `src/lib/db/export.ts` — Export engine
- `src/lib/realtime/realtime-coordination.ts` — Realtime coordination
- `src/lib/security/` — Security modules (verified rehash consolidation)
- `src/lib/plugins/chat-widget/` — Chat widget
- `src/app/api/v1/` — API route structure
- `src/lib/docker/client.ts` — Docker client dual-path
- `src/app/api/v1/contests/quick-create/route.ts` — Quick-create contest
- `src/app/api/v1/contests/[assignmentId]/stats/route.ts` — Contest stats

## Previously Fixed Items (Verified)

- ARCH-1 (TABLE_MAP/TABLE_ORDER drift): Fixed — TABLE_MAP derived from TABLE_ORDER at lines 19-22
- ARCH-2 (Password rehash DRY violation): Fixed — `verifyAndRehashPassword` utility consolidated
- AGG-4 (createApiHandler for files route): Fixed

## New Findings

### ARCH-1: MAX_EXPIRY_MS constant duplicated across 4 invitation routes — DRY violation [LOW/MEDIUM]

**File:** `src/app/api/v1/contests/[assignmentId]/recruiting-invitations/route.ts:69`, `src/app/api/v1/contests/[assignmentId]/recruiting-invitations/[invitationId]/route.ts:110`, `src/app/api/v1/contests/[assignmentId]/recruiting-invitations/bulk/route.ts:30`, and implicitly in API keys routes

**Description:** The `MAX_EXPIRY_MS = 10 * 365.25 * 24 * 60 * 60 * 1000` constant is defined identically in 3 separate invitation route files. If the maximum expiry policy changes, all 3 must be updated in lockstep. This is a minor DRY violation that could lead to inconsistent expiry limits.

**Concrete failure scenario:** A policy change increases the maximum expiry from 10 years to 15 years. The developer updates 2 of the 3 route files but misses the bulk route. Bulk-created invitations now have a different maximum than single-created ones.

**Fix:** Extract to a shared constant:
```typescript
// src/lib/assignments/recruiting-constants.ts
export const MAX_EXPIRY_MS = 10 * 365.25 * 24 * 60 * 60 * 1000; // ~10 years
```

**Confidence:** Medium
