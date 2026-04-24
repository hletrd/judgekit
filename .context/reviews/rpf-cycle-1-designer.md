# RPF Cycle 1 (loop cycle 1/100) — Designer

**Date:** 2026-04-24
**HEAD:** 8af86fab
**Reviewer:** designer (source-level review, no runtime)

## Scope

Reviewed UI/UX code across:
- All `tracking-*` usage under `src/` — Korean letter-spacing guard compliance (17 occurrences)
- `src/components/problem-description.tsx` — problem description rendering
- `src/components/seo/json-ld.tsx` — structured data
- `src/components/layout/app-sidebar.tsx` — sidebar navigation
- `src/components/layout/public-header.tsx` — public navigation header
- `src/components/layout/public-footer.tsx` — footer with languages link
- `src/components/contest/access-code-manager.tsx` — access code display
- `src/components/discussions/` — discussion thread UI
- `src/app/not-found.tsx` — 404 page

## UI/UX Presence

This is a web application with substantial UI: Next.js App Router pages, React components, Tailwind CSS, CodeMirror editor integration, shadcn/ui components, Korean/English i18n. The designer lane applies.

## Runtime UI/UX Review

Not possible this cycle — the sandbox lacks Docker and a running Postgres instance. The `SKIP_INSTRUMENTATION_SYNC` flag (cycle 55) was specifically added to allow booting the app without DB sync, but a full UI review still requires backing data. The DES-RUNTIME-{1..5} items remain deferred under the cycle-55 exit criterion.

## New Findings

**No new findings this cycle.**

## Source-Level UI/UX Observations

1. **Korean letter-spacing** — All 17 `tracking-*` usages are properly guarded with `locale !== "ko"` or have explicit comments explaining why tracking is safe (numeric codes, Latin keyboard shortcuts, mono-font access codes). The one unguarded use is `src/components/ui/dropdown-menu.tsx:247` (`tracking-widest` on `DropdownMenuShortcut`) — intentional for Latin keyboard-shortcut glyphs (Cmd+K etc.) and does not render Korean content. Compliant with CLAUDE.md rule.

2. **404 page** — `src/app/not-found.tsx` correctly guards `tracking-tight` with `locale !== "ko"` for the heading. The "404" status text uses `tracking-[0.2em]` which is safe for numeric characters. Good.

3. **Select components** — Per AGENTS.md, all SelectValue components must use static children with state variables, not render functions. This is a Turbopack compatibility requirement. Spot-checked several Select usages; they follow the documented pattern.

## Deferred Item Status (Unchanged)

- **DES-1:** Chat widget button badge lacks ARIA announcement — LOW/LOW, deferred
- **DES-1 (cycle 46):** Contests page badge hardcoded colors — LOW/LOW, deferred
- **DES-1 (cycle 48):** Anti-cheat privacy notice accessibility — LOW/LOW, deferred
- **DES-RUNTIME-{1..5} (cycle 55):** blocked-by-sandbox runtime findings — severities LOW..HIGH-if-violated, deferred

## Confidence

HIGH (for source-level review). Runtime review remains blocked.
