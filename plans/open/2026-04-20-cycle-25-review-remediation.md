# Cycle 25 Review Remediation Plan

**Date:** 2026-04-20
**Source:** `.context/reviews/cycle-25-aggregate.md`

---

## Scope

This cycle addresses the new cycle-25 findings from the multi-agent review:
- AGG-1: Hardcoded English string "Solved" in public-problem-set-detail.tsx
- AGG-2: 13 components still have hardcoded `tracking-tight` on Korean-reachable headings
- AGG-3: `/languages` route missing from SEO route matrix and sitemap
- AGG-4: "Languages" as top-level nav item — addressed by user-injected TODO

Plus the user-injected TODO:
- Move "Languages" from top-level public nav into a submenu/sub-navigation

No cycle-25 review finding is silently dropped. No new refactor-only work is added under deferred.

---

## Implementation lanes

### H1: Move "Languages" from top-level public nav to secondary navigation (AGG-4 / user-injected TODO)

- **Source:** AGG-4, user-injected TODO
- **Severity / confidence:** MEDIUM / HIGH
- **Citations:** `src/lib/navigation/public-nav.ts:32`, `src/components/layout/public-header.tsx`, `src/components/layout/public-footer.tsx`
- **Problem:** The "Languages" page is an informational reference page that does not warrant a prominent top-level nav position. It should still be reachable but not as a top-level link.
- **Plan:**
  1. Remove `{ href: "/languages", label: t("nav.languages") }` from `getPublicNavItems()` in `src/lib/navigation/public-nav.ts`.
  2. Add "Languages" as a link in the `PublicFooter` — specifically, add `/languages` to the footer navigation alongside any existing admin-configured links. Since the footer uses admin-configured `footerContent`, the simplest approach is to add a "Languages" link as a static footer link alongside the dynamic content.
  3. Alternatively (or additionally), add a "View supported languages" link on the home page judge info section (already exists: `judgeInfo.languagesHref` in `public-home-page.tsx:130`). This link already points to `/languages`, so no change needed there.
  4. Update any tests that assert the number of nav items.
  5. Ensure the `/languages` page is still accessible at its URL.
- **Status:** DONE

### M1: Replace hardcoded "Solved" string with i18n prop (AGG-1)

- **Source:** AGG-1
- **Severity / confidence:** MEDIUM / HIGH
- **Citations:** `src/components/problem/public-problem-set-detail.tsx:81`
- **Problem:** The Badge text "Solved" is hardcoded in English while the rest of the component uses i18n props.
- **Plan:**
  1. Add `solvedLabel: string` to `PublicProblemSetDetailProps` in `src/components/problem/public-problem-set-detail.tsx`.
  2. Replace `>Solved<` with `{solvedLabel}` in the Badge component.
  3. Find the calling page component and pass the i18n string for `solvedLabel`.
  4. Add the i18n key to `messages/en.json` and `messages/ko.json` if not already present.
- **Status:** DONE

### M2: Fix remaining 13 components with hardcoded `tracking-tight` on Korean-reachable headings (AGG-2)

- **Source:** AGG-2
- **Severity / confidence:** MEDIUM / MEDIUM
- **Citations:** See AGG-2 file list above.
- **Problem:** Per CLAUDE.md, Korean text must use default letter-spacing. 13 components still apply hardcoded `tracking-tight` to headings that may render Korean text.
- **Plan:**
  1. For each client component (uses `"use client"`): add `const locale = useLocale()` and `const headingTracking = locale !== "ko" ? " tracking-tight" : ""`, then replace hardcoded `tracking-tight` with `${headingTracking}`.
  2. For each server component: add `const locale = await getLocale()` and apply the same pattern.
  3. Some components are shared/presentational (accept `title` as a prop). These need `locale` added as a prop or the calling page needs to handle tracking.
  4. Specifically for `DiscussionThreadList` — it accepts `titleAs` prop and is used in multiple contexts. Add `locale` prop or have the parent pass pre-formatted tracking.

  **Client components to fix:**
  - `src/app/(public)/community/new/page.tsx:19`
  - `src/app/(public)/rankings/page.tsx:217`
  - `src/app/(public)/submissions/page.tsx:123,275`
  - `src/components/discussions/discussion-thread-list.tsx:48` (accepts props)
  - `src/components/discussions/my-discussions-list.tsx:26` (accepts props)
  - `src/components/discussions/discussion-thread-view.tsx:41` (accepts props)
  - `src/components/discussions/discussion-moderation-list.tsx:39` (accepts props)
  - `src/components/user/user-stats-dashboard.tsx:58` (accepts props)

  **Server components to fix:**
  - `src/app/(public)/users/[id]/page.tsx:215`
  - `src/components/problem/public-problem-set-detail.tsx:49` (accepts props — needs locale prop)
  - `src/components/problem/public-problem-set-list.tsx:33` (accepts props — needs locale prop)
  - `src/app/(public)/_components/public-preview-page.tsx:14` (accepts props — needs locale prop)
  - `src/app/(public)/_components/public-problem-list.tsx:96` (accepts props — needs locale prop)
- **Status:** TODO

### L1: Add `/languages` to SEO route matrix and sitemap (AGG-3)

- **Source:** AGG-3
- **Severity / confidence:** LOW / MEDIUM
- **Citations:** `src/lib/public-route-seo.ts`
- **Problem:** The `/languages` page is a public page but is not in the SEO route matrix, so it is excluded from sitemap generation.
- **Plan:**
  1. Add `"/languages"` to `INDEXABLE_PUBLIC_ROUTE_PREFIXES` in `src/lib/public-route-seo.ts`.
  2. Add a `SEO_ROUTE_MATRIX` entry for `/languages` with `indexable: true, localized: true, includedInSitemap: true, jsonLd: false, socialCards: false`.
  3. Verify sitemap generation includes `/languages`.
- **Status:** DONE

---

## Deferred items

None. Every cycle-25 finding above is planned for implementation in this cycle.

---

## Progress log

- 2026-04-20: Plan created from cycle-25 aggregate review.
- 2026-04-20: H1, M1, M2, L1 all DONE. All cycle-25 findings resolved. Quality gates pass (tsc, eslint, vitest, build).
