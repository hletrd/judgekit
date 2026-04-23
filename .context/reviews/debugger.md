# Debugger Review — RPF Cycle 37

**Date:** 2026-04-23
**Reviewer:** debugger
**Base commit:** 3d729cee

## Inventory of Files Reviewed

- `src/lib/plugins/chat-widget/chat-widget.tsx` — Chat widget state management (verified isStreamingRef)
- `src/app/api/v1/submissions/[id]/events/route.ts` — SSE connections (verified threshold cache)
- `src/lib/security/in-memory-rate-limit.ts` — Rate limiter
- `src/lib/db/import.ts` — Import engine (verified TABLE_MAP derivation)
- `src/lib/compiler/execute.ts` — Compiler execution
- `src/lib/realtime/realtime-coordination.ts` — Realtime coordination
- `src/app/api/v1/contests/quick-create/route.ts` — Quick-create contest

## Previously Fixed Items (Verified)

- DBG-1 (sendMessage isStreaming closure race): Fixed — isStreamingRef pattern
- DBG-2 (Import engine silent table skip): Fixed — TABLE_MAP derived from TABLE_ORDER, test added

## New Findings

### DBG-1: quick-create route NaN Date bypasses schedule validation — latent bug [MEDIUM/MEDIUM]

**File:** `src/app/api/v1/contests/quick-create/route.ts:31-37`

**Description:** Tracing the quick-create flow for invalid dates:
1. `body.startsAt` = "garbage" (passes Zod `.datetime()` due to schema bypass or future loosening)
2. Line 31: `startsAt = new Date("garbage")` → `Invalid Date`
3. Line 33: `deadline = new Date(now.getTime() + 30 * 24 * 3600000)` → valid Date
4. Line 36: `startsAt.getTime() >= deadline.getTime()` → `NaN >= number` → `false`
5. Validation passes (the check is `if (startsAt >= deadline) return error`)
6. Contest created with `Invalid Date` for startsAt — PostgreSQL may reject or store null

The failure mode depends on how PostgreSQL handles the invalid Date. If it throws, the transaction rolls back. If it coerces to NULL, the contest has a NULL startsAt, which could allow submissions at any time (windowed contests compare against startsAt).

**Fix:** Add NaN guards after Date construction, consistent with the recruiting invitation routes.

**Confidence:** Medium
