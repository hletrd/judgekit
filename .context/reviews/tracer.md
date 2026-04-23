# Tracer Review — RPF Cycle 23

**Date:** 2026-04-22
**Reviewer:** tracer
**Base commit:** 429d1b86

## TR-1: DRY violation trace — how 5 local `normalizePage` copies diverged from the shared version [HIGH/HIGH]

**Confidence:** HIGH

**Causal trace:**

1. The shared `normalizePage` was created in `src/lib/pagination.ts` and used by client components and public routes.
2. Server components (admin pages, problems page) were written with local `normalizePage` functions, likely predating the shared utility or created by copy-paste.
3. In RPF cycle 28, the shared `normalizePage` was fixed: `Number()` -> `parseInt()`, `MAX_PAGE = 10000` added.
4. The 5 local copies were NOT updated at the same time because they are local functions, not imports.

**Competing hypotheses:**
- H1: The developer who fixed the shared version didn't realize local copies existed. (Most likely — no grep for `normalizePage` was done)
- H2: The local copies were intentionally kept because server components can't import from `@/lib/pagination`. (Disproven — server components CAN import from shared modules)
- H3: The local copies were left as-is with a plan to migrate later, but the plan was lost. (Possible)

**Conclusion:** H1 is most likely. The fix is to replace all local copies with imports from the shared module.

---

## TR-2: Double `.json()` pattern trace — recurring anti-pattern across codebase [MEDIUM/MEDIUM]

**Confidence:** MEDIUM

**Pattern occurrences found:**
1. `contest-join-client.tsx:44-49` — error branch + success branch
2. `create-problem-form.tsx:432-437` — error branch + success branch
3. `group-members-manager.tsx:124-128` — error branch + success branch
4. `recruiting-invitations-panel.tsx:207-208` — success branch (ok check, then json)

These all follow the same pattern: check `res.ok`, call `.json()` on error, call `.json()` on success. The codebase's `apiFetchJson` utility was created to eliminate this pattern. The recurring nature suggests developers are copy-pasting from existing code rather than using the utility.

**Fix:** Systematically migrate these 4 files to `apiFetchJson` or the single-parse pattern documented in `client.ts`.

---

## TR-3: `contest-quick-stats.tsx` avgScore trace — null handling inconsistency [MEDIUM/MEDIUM]

**Confidence:** MEDIUM

**Data flow trace:**
1. API returns `{ data: { avgScore: null } }` (no submissions)
2. `apiFetchJson` parses this as `{ ok: true, data: { data: { avgScore: null } } }`
3. Line 67: `data.data!.avgScore !== null && data.data!.avgScore !== undefined && ...` evaluates to false
4. Fallback: `prev.avgScore` which is `0` from initial state (line 42)
5. Display (line 110): `formatNumber(0, { locale, maximumFractionDigits: 1 })` -> "0.0"

The issue is that the initial state uses `0` instead of `null` for `avgScore`. The `participantCount` and `submittedCount` fields default to `0` correctly (0 participants is a valid state), but `avgScore: 0` is semantically different from `avgScore: null`.

**Fix:** Change initial `avgScore` to `null`, update type to `number | null`, handle null in display.
