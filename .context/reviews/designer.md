# Designer Review — UI/UX Review

## Scope
This is a Next.js web application with a full frontend (TSX components, Tailwind CSS, React components for contests, submissions, code editing, discussions, admin panels). The review covers accessibility, UX patterns, and UI concerns.

## Finding UX1: Error Boundary Components Use `console.error`
- **File**: `src/app/(dashboard)/dashboard/groups/error.tsx:17`, `src/app/(dashboard)/dashboard/problems/error.tsx:17`, `src/app/(dashboard)/dashboard/submissions/error.tsx:17`, `src/app/(dashboard)/dashboard/admin/error.tsx:17`
- **Severity**: Low | **Confidence**: High
- **Description**: All error boundary components use `console.error(error)` which is not captured in production logging. Users see a generic error message but the details are lost unless someone checks the browser console.
- **Fix**: Send error details to the server-side logging system via an API endpoint, or use the existing logger infrastructure.

## Finding UX2: No Skip-to-Content Focus Management
- **File**: `src/components/layout/skip-to-content.tsx`
- **Severity**: Low | **Confidence**: Medium
- **Description**: A skip-to-content component exists (good), but it needs to be verified that focus actually moves to the main content area when activated. The target element must have `tabindex="-1"` and receive `.focus()` for keyboard users.
- **Fix**: Verify the skip-to-content target element has proper focus handling.

## Finding UX3: Countdown Timer Accessibility
- **File**: `src/components/exam/countdown-timer.tsx`
- **Severity**: Low | **Confidence**: Medium
- **Description**: Exam countdown timers need `aria-live="polite"` or `aria-live="assertive"` for screen reader users to be notified of time remaining. Without this, visually impaired users may not know when time is running out.
- **Fix**: Add `aria-live` region for the countdown timer with periodic announcements.

## Finding UX4: Korean Letter Spacing Correctly Handled
- **File**: Per CLAUDE.md project rules
- **Severity**: N/A | **Confidence**: High
- **Description**: The project rules explicitly state to keep Korean text at default letter spacing. Reviewed a sample of Korean-containing components; no custom `tracking-*` or `letter-spacing` was found applied to Korean text. This rule is being followed.
- **Verdict**: PASS

## Finding UX5: Dark/Light Mode Support
- **File**: `src/components/layout/theme-toggle.tsx`, `src/components/theme-provider.tsx`
- **Severity**: N/A | **Confidence**: High
- **Description**: Theme switching is implemented via `next-themes`. The code editor theme picker (`src/app/(dashboard)/dashboard/profile/editor-theme-picker.tsx`) allows selecting editor themes. This appears well-implemented.
- **Verdict**: PASS

## Finding UX6: Code Editor Loading States
- **File**: `src/components/code/code-editor-skeleton.tsx`
- **Severity**: Low | **Confidence**: Medium
- **Description**: A skeleton component exists for the code editor loading state. Good pattern. Need to verify it matches the actual editor dimensions to avoid layout shift (CLS).
- **Fix**: Verify skeleton dimensions match the loaded editor component.

## Browser audit supplement (cycle 2)
- **Auth flow**: `https://algo.xylolabs.com/login` submits to `https://algo.xylolabs.com/api/auth/error` and renders `{"error":"UntrustedHost"}` after clicking the `Sign in` button with safe credentials from local `.env`.
- **Playground i18n leak**: on `https://algo.xylolabs.com/playground`, selector `label[for="stdin-case-name"]` renders raw text `compiler.testCaseLabel`.
- **Public page failures**:
  - `https://algo.xylolabs.com/practice` → `h1` = `This page couldn’t load`
  - `https://algo.xylolabs.com/rankings` → `h1` = `This page couldn’t load`
  - `https://algo.xylolabs.com/languages` remains in `Loading...` state after a 3s wait
