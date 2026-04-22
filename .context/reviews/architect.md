# Architectural Review — RPF Cycle 3

**Date:** 2026-04-22
**Reviewer:** architect
**Base commit:** 7b07995f

## Findings

### ARCH-1: Systematic `response.json()` before `response.ok` anti-pattern across 8+ files — needs centralized solution [MEDIUM/HIGH]

**Files:** See code-reviewer CR-1 through CR-5 for full list.

**Description:** The `response.json()` before `response.ok` pattern exists in at least 8 client-side files. Prior cycles fixed this pattern one file at a time, but never addressed it systematically. Each new component written without a shared API utility reintroduces the pattern.

**Fix:** Create a typed `apiJson()` helper in `src/lib/api/client.ts` that checks `response.ok` before parsing JSON, and returns a discriminated union: `{ ok: true, data: T } | { ok: false, error: string }`. Migrate components gradually.

**Confidence:** HIGH

---

### ARCH-2: `contest-replay.tsx` uses native `<select>` — same inconsistency as AGG-5 from cycle 2 [LOW/LOW]

**File:** `src/components/contest/contest-replay.tsx:177-188`

**Description:** The replay speed selector uses a native `<select>` instead of the project's `Select` component. This is the same class of issue flagged in cycle 2 for `contest-clarifications.tsx` (now fixed).

**Fix:** Replace the native `<select>` with the project's `Select` component.

**Confidence:** LOW

---

## Final Sweep

The codebase architecture is sound. The auth layer (config.ts, permissions.ts, csrf.ts) is well-layered. The `useVisibilityPolling` hook provides a good shared abstraction for polling. The main architectural risk is the lack of a centralized API response handler, leading to the repeated anti-pattern.
