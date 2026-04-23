# RPF Cycle 36 — Review Remediation Plan

**Date:** 2026-04-23
**Cycle:** 36/100
**Base commit:** 601ff71a
**Status:** In Progress

## Lanes

### Lane 1: Add NaN guard to PATCH invitation route for expiryDate [AGG-1]

**Severity:** MEDIUM/HIGH (8 of 11 perspectives)
**File:** `src/app/api/v1/contests/[assignmentId]/recruiting-invitations/[invitationId]/route.ts:114`
**Status:** Done

**Tasks:**
- [x] Add `Number.isFinite(expiresAtUpdate.getTime())` check after `new Date(\`${body.expiryDate}T23:59:59Z\`)` construction
- [x] Return `apiError("invalidExpiryDate", 400)` if the guard triggers
- [x] Add inline comment explaining defense-in-depth, consistent with POST routes

**Verification:** Run `npm run test:unit` and `npm run build`

---

### Lane 2: Consolidate remaining 4 inline password rehash blocks into verifyAndRehashPassword [AGG-2]

**Severity:** MEDIUM/MEDIUM (6 of 11 perspectives)
**Files:** `src/app/api/v1/admin/backup/route.ts:63-82`, `src/app/api/v1/admin/migrate/export/route.ts:57-74`, `src/lib/auth/config.ts:268-291`, `src/lib/assignments/recruiting-invitations.ts:387-402`
**Status:** Done

**Tasks:**
- [x] Replace inline rehash in `backup/route.ts` with `verifyAndRehashPassword`
- [x] Replace inline rehash in `migrate/export/route.ts` with `verifyAndRehashPassword`
- [x] Replace inline rehash in `recruiting-invitations.ts` with `verifyAndRehashPassword` (inside transaction)
- [x] Replace inline rehash in `auth/config.ts` with `verifyAndRehashPassword` (handle NextAuth callback context)
- [x] Verify all 6 rehash sites now use the shared utility

**Verification:** Run `npm run test:unit` and `npm run build`

---

### Lane 3: Escape LIKE wildcards in buildGroupMemberScopeFilter [AGG-3]

**Severity:** LOW/MEDIUM (4 of 11 perspectives)
**File:** `src/app/(dashboard)/dashboard/admin/audit-logs/page.tsx:150`
**Status:** Done

**Tasks:**
- [x] Import `escapeLikePattern` in the audit-logs page
- [x] Update `buildGroupMemberScopeFilter` to use `escapeLikePattern(groupId)` in the LIKE pattern
- [x] Add `ESCAPE '\\'` clause for consistency with other LIKE queries

**Verification:** Run `npm run test:unit` and `npm run build`

---

### Lane 4: Add aria-label to chat widget textarea [AGG-4]

**Severity:** LOW/LOW (4 of 11 perspectives)
**File:** `src/lib/plugins/chat-widget/chat-widget.tsx:363`
**Status:** Done

**Tasks:**
- [x] Add `aria-label={t("placeholder")}` to the `<textarea>` element

**Verification:** Run `npm run build`

---

## Deferred Items

| Finding | File+Line | Severity/Confidence | Reason for Deferral | Exit Criterion |
|---------|-----------|-------------------|--------------------|---------------|
| SEC-3: Import route JSON body path with password | migrate/import/route.ts:113-191 | MEDIUM/MEDIUM | Deprecated with Sunset header; functional for backward compatibility | Sunset date reached (Nov 2026) or API clients migrated |
| PERF-1: Chat widget scrollToBottom effect runs on every messages change | chat-widget.tsx:107-115 | LOW/LOW | rAF deduplication catches redundant calls; micro-optimization | Performance profiling shows bottleneck |
| Prior AGG-5: Console.error in client components | discussions/*.tsx, groups/*.tsx | LOW/MEDIUM | Requires architectural decision; no data loss | Client error reporting feature request |
| Prior AGG-6: SSE O(n) eviction scan | events/route.ts:44-55 | LOW/MEDIUM | Bounded by 1000-entry cap | Performance profiling shows bottleneck |
| Prior AGG-7: Manual routes duplicate createApiHandler | migrate/import, restore routes | MEDIUM/MEDIUM | Requires extending createApiHandler to support multipart | Next API framework iteration |
| Prior AGG-8: Global timer HMR pattern duplication | 4 modules | LOW/MEDIUM | DRY concern; each module works correctly | Module refactoring cycle |
| Prior SEC-3: Anti-cheat copies text content | anti-cheat-monitor.tsx:206 | LOW/LOW | 80-char limit; privacy notice accepted | Privacy audit or user complaint |
| Prior SEC-4: Docker build error leaks paths | docker/client.ts:169 | LOW/LOW | Admin-only; Docker output expected | Admin permission review |
| CR-4 (carry-over): Chat widget entry animation not using motion-safe prefix | chat-widget.tsx:294 | LOW/LOW | globals.css override is functional | Component refactoring cycle |
| DOC-1: PATCH route lacks JSDoc for expiryDate | [invitationId]/route.ts | LOW/LOW | Documentation-only | Next documentation cycle |
| DOC-2: Import route dual-path deprecation not in README | migrate/import/route.ts | LOW/LOW | Documentation-only | Next documentation cycle |
