# Tracer Review — RPF Cycle 37

**Date:** 2026-04-23
**Reviewer:** tracer
**Base commit:** 3d729cee

## Causal Tracing of Suspicious Flows

### TR-1: quick-create route NaN Date flows through schedule check without guard [MEDIUM/MEDIUM]

**File:** `src/app/api/v1/contests/quick-create/route.ts:31-37`

**Description:** Tracing the quick-create flow for invalid dates:
1. `body.startsAt` = "garbage" (passes Zod `.datetime()` due to schema bypass or future loosening)
2. Line 31: `startsAt = new Date("garbage")` → `Invalid Date`
3. Line 33: `deadline = new Date(now.getTime() + 30 * 24 * 3600000)` → valid Date
4. Line 36: `startsAt.getTime() >= deadline.getTime()` → `NaN >= number` → `false`
5. Validation passes (the check is `if (startsAt >= deadline) return error`)
6. Contest created with `Invalid Date` for startsAt — PostgreSQL may reject or store null

The failure mode depends on how PostgreSQL handles the invalid Date. If it throws, the transaction rolls back. If it coerces to NULL, the contest has a NULL startsAt, which could allow submissions at any time (windowed contests compare against startsAt).

**Hypothesis 1 (confirmed):** NaN comparison bypasses the schedule check. The `>=` check is "startsAt is at or after deadline" — if the comparison is false, it means "startsAt is before deadline", which passes validation. This is the same NaN-bypass pattern that was fixed in the recruiting invitation routes.

**Hypothesis 2 (possible):** PostgreSQL rejects the NULL/NaN date, causing the transaction to fail. This is a safe failure mode but produces an unhelpful 500 error instead of a 400 validation error.

**Fix:** Add NaN guards after Date construction, consistent with the recruiting invitation routes.

**Confidence:** Medium

---

### Previously Fixed Items (Verified)

- TR-1 (sendMessage isStreaming closure race): Fixed — isStreamingRef pattern
- TR-2 (TABLE_MAP drift): Fixed — TABLE_MAP derived from TABLE_ORDER
