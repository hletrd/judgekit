# Cycle 2 Prompt 1 Aggregate Review

## Scope
- Aggregated from: `code-reviewer.md`, `perf-reviewer.md`, `security-reviewer.md`, `critic.md`, `verifier.md`, `test-engineer.md`, `architect.md`, `debugger.md`, `designer.md`
- Supplemental browser evidence: `.context/reviews/browser-audit-input-cycle-2.md`
- Live audit host: `https://algo.xylolabs.com`

## Deduped findings

### AGG-1 — Live sign-in is blocked by `UntrustedHost`
- **Severity:** High
- **Confidence:** High
- **Cross-agent agreement:** designer + leader browser audit
- **Evidence:**
  - Live flow: `https://algo.xylolabs.com/login` -> submit valid credentials -> `https://algo.xylolabs.com/api/auth/error`
  - Response body: `{"error":"UntrustedHost"}`
  - Repo hotspot: `src/app/api/auth/[...nextauth]/route.ts`, `src/lib/auth/trusted-host.ts`, `src/lib/security/env.ts`
- **Why it matters:** Production auth is unusable for legitimate users.
- **Concrete failure scenario:** Every browser sign-in from the public host is rejected before credentials are processed.
- **Suggested fix:** Make trusted-host validation honor `AUTH_TRUST_HOST=true` / reverse-proxy deployments, and add regression coverage for that path.

### AGG-2 — Playground exposes a raw translation key in a public workflow
- **Severity:** Medium
- **Confidence:** High
- **Cross-agent agreement:** designer + leader browser audit
- **Evidence:**
  - Live URL: `https://algo.xylolabs.com/playground`
  - Selector: `label[for="stdin-case-name"]`
  - Extracted text: `compiler.testCaseLabel`
  - Repo hotspot: `src/app/(dashboard)/dashboard/compiler/compiler-client.tsx`
- **Why it matters:** Public-facing UI leaks internal i18n keys and degrades trust.
- **Concrete failure scenario:** Users editing test cases see a broken label instead of a localized string.
- **Suggested fix:** Pass the required interpolation value (or a non-interpolated label key) and add a regression test.

### AGG-3 — Public practice catalog currently hard-fails on the live site
- **Severity:** High
- **Confidence:** High (live behavior), Medium (repo root cause)
- **Cross-agent agreement:** leader browser audit
- **Evidence:**
  - Live URL: `https://algo.xylolabs.com/practice`
  - `h1`: `This page couldn’t load`
  - Body copy: `A server error occurred. Reload to try again.`
  - Repo hotspot for manual investigation: `src/app/(public)/practice/page.tsx`
- **Why it matters:** Core discovery funnel is unavailable.
- **Concrete failure scenario:** Anonymous visitors cannot browse practice problems at all.
- **Suggested fix:** Reproduce against current HEAD / production-like data, identify the failing query or render path, and add a non-crashing fallback plus regression coverage.

### AGG-4 — Public rankings page currently hard-fails on the live site
- **Severity:** High
- **Confidence:** High (live behavior), Medium (repo root cause)
- **Cross-agent agreement:** leader browser audit
- **Evidence:**
  - Live URL: `https://algo.xylolabs.com/rankings`
  - `h1`: `This page couldn’t load`
  - Body copy: `A server error occurred. Reload to try again.`
  - Repo hotspot for manual investigation: `src/app/(public)/rankings/page.tsx`
- **Why it matters:** Public competitive ranking is unavailable.
- **Concrete failure scenario:** Visitors cannot see rankings and receive only a generic server-error shell.
- **Suggested fix:** Reproduce against current HEAD / production-like data, isolate the failing SQL/render path, and add fallback + tests.

### AGG-5 — Public languages page appears permanently stuck on loading
- **Severity:** Medium
- **Confidence:** High (live behavior), Medium (repo root cause)
- **Cross-agent agreement:** leader browser audit
- **Evidence:**
  - Live URL: `https://algo.xylolabs.com/languages`
  - After 3s wait, accessibility snapshot still only exposed `Loading...`
  - Repo hotspot for manual investigation: `src/app/(public)/languages/page.tsx`, `src/lib/judge/dashboard-data.ts`
- **Why it matters:** A public information page looks broken and never resolves.
- **Concrete failure scenario:** Visitors only see the route-level loading state and never the language catalog.
- **Suggested fix:** Reproduce with current HEAD, inspect the data-fetch/render path, and add a no-hang fallback plus coverage.

## Lower-signal / validation-needed findings from agent reports
- Over-fetching `select()` calls on sensitive tables: plausible and worth a targeted follow-up, but not yet cycle-2 implementation-critical.
- `rateLimits` table multiplexing across rate limits and SSE coordination: plausible architectural risk; needs a dedicated design pass.
- Export-path performance risks in deprecated helpers: plausible; lower urgency than live public/user-facing failures.

## Review-policy conflicts / invalid findings
- Multiple agent reports requested stronger password-complexity rules. Repo policy in `AGENTS.md` explicitly forbids adding complexity requirements and mandates exactly an 8-character minimum. These findings must not be implemented as written.
- `validateShellCommandStrict` prefix-bypass findings are stale against current HEAD: `src/lib/compiler/execute.ts` already uses `isValidCommandPrefix()` with suffix validation rather than raw `startsWith()`.

## Agent failures
- `tracer` — spawned twice, no review file produced before timeout/shutdown
- `document-specialist` — spawned twice, no review file produced before timeout/shutdown
- `product-marketer-reviewer` — spawned twice, no review file produced before timeout/shutdown
- `ui-ux-designer-reviewer` — spawned twice, no review file produced before timeout/shutdown
