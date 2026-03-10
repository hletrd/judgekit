# Review & Plan — Multi-Perspective Review + Remediation Planning

A 2-step skill that reviews the online judge platform from 6 perspectives, then produces actionable remediation plans for every identified weakness.

---

## Step 1: Multi-Perspective Review

Perform a comprehensive review of the codebase from **6 distinct perspectives**. For each perspective, assign a letter grade (A+ through F) and list specific findings with severity ratings.

### 1A — Security Review

Examine the platform for vulnerabilities and hardening gaps. Check:

- **Authentication & Sessions**: JWT handling, cookie security, `trustHost` setting, `AUTH_URL` validation, session expiry, credential storage (bcrypt rounds, salt)
- **Authorization**: Role enforcement (`super_admin > admin > instructor > student`), route guards in `src/proxy.ts`, per-resource access control (`canAccessProblem`, `assertGroupAccess`, `assertRole`), IDOR vulnerabilities
- **Input Validation**: Zod schemas on all mutation endpoints, SQL injection via Drizzle (parameterized?), XSS via DOMPurify version and CSP, path traversal in file handling
- **Rate Limiting**: Login rate limiting (IP + username dual-key), submission rate limiting (per-user, concurrency, global queue), persistence mechanism (in-memory vs SQLite), bypass vectors (IP rotation, header spoofing)
- **CSRF Protection**: `X-Requested-With` header check, coverage across all state-changing routes, error response clarity
- **Sandbox Security**: Docker container isolation (seccomp profile, capabilities, `--no-new-privileges`), workspace mount permissions (R/W vs R/O), network isolation, resource limits (memory, CPU, PIDs, file size, file descriptors), seccomp syscall whitelist review
- **CSP & Headers**: Content-Security-Policy (nonce-based scripts, `unsafe-inline` for styles), security headers (`X-Frame-Options`, `HSTS`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`), `poweredByHeader` suppression
- **Secrets Management**: Environment variable validation, seed password randomness, no secrets in code/logs
- **Dependency Security**: Known CVEs (`npm audit`), outdated packages, supply chain risks

Output format per finding:
```
[CRITICAL/HIGH/MEDIUM/LOW/INFO] <title>
Location: <file:line or component>
Description: <what the issue is>
Impact: <what could go wrong>
```

### 1B — Student Experience Review

Evaluate the platform from a student's perspective — someone submitting code for assignments. Check:

- **Submission Flow**: Code editor usability (syntax highlighting, language switching, draft recovery), submission feedback speed, error message clarity (compile errors, runtime errors, TLE, MLE)
- **Results & Feedback**: Test case visibility (pass/fail per case vs aggregate only), score display (fraction vs percentage), submission history navigation, diff between attempts
- **Assignment Experience**: Deadline visibility and countdown, late submission handling and messaging, assignment navigation and discovery, problem grouping within assignments
- **Dashboard & Navigation**: Landing page usefulness, sidebar organization, breadcrumbs, back-to-list navigation, mobile responsiveness
- **Accessibility**: Keyboard navigation, screen reader support, color contrast, font sizing, dark mode completeness
- **Performance**: Page load times, editor responsiveness, real-time submission status updates (polling vs SSE/WebSocket)
- **Error Handling**: Graceful degradation on network errors, clear error states, recovery paths (retry buttons, draft recovery)
- **Localization**: Translation completeness (EN/KO), locale switching, date/time formatting with timezone awareness

Output format per finding:
```
[CRITICAL/HIGH/MEDIUM/LOW/INFO] <title>
Persona: Student
User Story: As a student, I want to <goal> so that <benefit>
Current State: <what happens now>
Gap: <what's missing or broken>
```

### 1C — Instructor Experience Review

Evaluate the platform from an instructor's perspective — someone managing courses, problems, and grading. Check:

- **Problem Management**: Create/edit/delete flow, test case management (add/edit/reorder/bulk import), problem visibility and access control per group, problem cloning
- **Assignment Management**: Create/edit/delete assignments, assign problems to assignments, set deadlines (start/end/late), manage per-group assignments
- **Grading & Monitoring**: Assignment scoreboard/leaderboard, individual student drill-down, submission review (source code viewing), score export (CSV), bulk operations
- **Student Management**: View enrolled students, manage group membership, bulk user creation (CSV import), student progress tracking
- **Group Management**: Create/archive groups, assign instructors, manage access scope (problems visible to group)
- **Analytics & Reporting**: Submission statistics, score distributions, plagiarism indicators, activity logs
- **Administrative Efficiency**: Batch operations, keyboard shortcuts, quick actions, search and filtering across all entities
- **Feedback Mechanisms**: Commenting on submissions, announcements to groups, grade override capability

Output format per finding:
```
[CRITICAL/HIGH/MEDIUM/LOW/INFO] <title>
Persona: Instructor
Workflow: <which instructor workflow is affected>
Current State: <what happens now>
Gap: <what's missing or broken>
```

### 1D — Tutor / Teaching Assistant Experience Review

Evaluate the platform from a tutor or teaching assistant's perspective — someone who helps grade, monitors student progress, and provides guidance, but with limited administrative privileges compared to a full instructor. Check:

- **Role & Permissions**: Does the platform distinguish tutors/TAs from instructors? Can tutors be assigned to specific groups without full instructor privileges? Are there appropriate permission boundaries (e.g., view submissions but not modify problems)?
- **Grading Workflow**: Can a tutor view and review student submissions across the groups they assist? Is there a queue or dashboard for pending reviews? Can tutors mark submissions, leave comments, or provide feedback?
- **Student Interaction**: Can tutors see which students are struggling (low scores, many attempts, no submissions)? Is there a way to reach out or leave notes? Can tutors see student submission history and progress over time?
- **Submission Monitoring**: Can tutors view real-time submission activity for their groups? Is there a feed or notification system for new submissions? Can tutors filter submissions by status, student, or problem?
- **Limited Administration**: Can tutors manage group membership (add/remove students) without full admin access? Can tutors create or modify assignments, or is that instructor-only? Is the scope of tutor visibility correctly limited to assigned groups?
- **Communication**: Is there a channel for tutors to communicate with students (announcements, comments)? Can tutors escalate issues to instructors?
- **Dashboard & Overview**: Does the tutor have a dedicated dashboard showing their assigned groups, recent activity, and pending tasks? Or do they see the same generic view as students?

Output format per finding:
```
[CRITICAL/HIGH/MEDIUM/LOW/INFO] <title>
Persona: Tutor/TA
Workflow: <which tutor workflow is affected>
Current State: <what happens now>
Gap: <what's missing or broken>
```

### 1E — Developer Experience Review

Evaluate the platform from a developer's perspective — someone maintaining or extending the codebase. Check:

- **Architecture**: Separation of concerns, API route structure, shared utilities, database access patterns (N+1 queries, connection management), error handling patterns
- **Type Safety**: Proper TypeScript types (no `any`), Zod schema <> TypeScript type alignment, API response type contracts, database type inference from Drizzle
- **Testing**: Unit test coverage, integration test coverage, E2E test coverage (Playwright), test organization, mocking strategy, CI integration
- **Build & Tooling**: Build time, bundle size, linting configuration, formatter setup, pre-commit hooks, development workflow (hot reload, seed scripts)
- **Documentation**: README completeness, API documentation, inline code comments, AGENTS.md accuracy, deployment guide
- **Extensibility**: Adding new judge languages, adding new roles, adding new API endpoints, plugin/hook points
- **Dependency Management**: Package versions, lock file hygiene, unused dependencies, upgrade path complexity
- **Error Handling**: Consistent error response format, logging strategy, error boundaries (React), unhandled promise rejections
- **Performance Patterns**: Database indexing, query optimization, caching strategy, lazy loading, pagination patterns

Output format per finding:
```
[CRITICAL/HIGH/MEDIUM/LOW/INFO] <title>
Location: <file:line or module>
Description: <what the issue is>
Impact: <developer productivity / maintainability / reliability>
Suggestion: <brief fix direction>
```

### 1F — Code Quality Review

Evaluate code quality, maintainability, and adherence to best practices across the codebase. Check:

- **TypeScript Strictness**: Strict mode enabled, no `any`/`@ts-ignore`/`@ts-expect-error`, proper type narrowing, exhaustive switch/if-else patterns
- **Function & File Size**: Functions > 50 lines, files > 300 lines, components mixing concerns. Identify candidates for decomposition.
- **Code Duplication**: Duplicated utility functions, repeated query patterns, copy-pasted validation logic, similar components that could share a base
- **Naming Conventions**: Consistent naming (camelCase for functions/variables, PascalCase for components/types, UPPER_SNAKE for constants), descriptive names, no single-letter variables outside loops
- **Dead Code**: Unused imports, unreachable branches, commented-out code blocks, exported functions with no callers
- **API Consistency**: Uniform request/response shapes, consistent status codes, standard error format, pagination contract alignment
- **Database Patterns**: Query builder vs raw SQL consistency, transaction usage, select field consistency, relation definitions
- **Component Patterns**: Server vs Client component boundary correctness, prop drilling depth, state management patterns, effect cleanup
- **Import Organization**: Consistent import ordering (external > internal > relative), circular dependency risks, barrel export patterns
- **Error Handling Patterns**: Try/catch coverage, error propagation strategy, user-facing vs developer-facing error messages, logging consistency

Output format per finding:
```
[CRITICAL/HIGH/MEDIUM/LOW/INFO] <title>
Location: <file:line or module>
Description: <what the issue is>
Impact: <readability / maintainability / bug risk>
Suggestion: <concrete refactoring approach>
```

### Review Summary Table

After all 6 sub-reviews, produce a summary:

```
| Perspective   | Grade | Critical | High | Medium | Low | Info |
|---------------|-------|----------|------|--------|-----|------|
| Security      | X     | N        | N    | N      | N   | N    |
| Student UX    | X     | N        | N    | N      | N   | N    |
| Instructor UX | X     | N        | N    | N      | N   | N    |
| Tutor/TA UX   | X     | N        | N    | N      | N   | N    |
| Developer XP  | X     | N        | N    | N      | N   | N    |
| Code Quality  | X     | N        | N    | N      | N   | N    |
| **Overall**   | X     | N        | N    | N      | N   | N    |
```

Write the full review to `docs/review.md`, replacing any existing content.

---

## Step 2: Remediation Plan

After completing Step 1, read the review output and produce a **phased remediation plan** that addresses every CRITICAL, HIGH, and MEDIUM finding. LOW and INFO findings should be listed in a "Future Improvements" appendix.

### Plan Structure

Organize into phases by priority and dependency:

#### Phase 1 — Critical Fixes (must-fix before any deployment)
For each CRITICAL finding from all 6 perspectives:
```
### <N>. <Title>
**Source**: <perspective> review, severity CRITICAL
**Finding**: <summary of the issue>
**Files to modify**:
- `path/to/file.ts` — <what changes>
**Implementation**:
1. <step 1>
2. <step 2>
...
**Verification**:
- <how to verify the fix works>
- <how to verify no regression>
```

#### Phase 2 — High-Priority Fixes
Same format for all HIGH findings, grouped by perspective.

#### Phase 3 — Medium-Priority Improvements
Same format for all MEDIUM findings, grouped by perspective.

#### Phase 4 — Future Improvements (appendix)
Bullet-point list of LOW and INFO findings with brief descriptions and suggested approaches.

### Plan Rules

1. **Be specific**: Name exact files, line numbers, functions, and schemas to modify. No vague "improve X" items.
2. **Order by dependency**: If fix B depends on fix A, A must come first. Note dependencies explicitly.
3. **Estimate scope**: For each item, note approximate file count and complexity (trivial / moderate / significant).
4. **Deduplicate**: If the same underlying issue appears in multiple perspectives, consolidate into one plan item and cross-reference.
5. **Preserve working features**: Never propose removing functionality that works correctly. Only propose additions, fixes, or refactors.
6. **Include verification**: Every plan item must have at least one concrete verification step (test command, manual check, or build verification).

### Plan Summary

End with:
```
## Summary

| Phase | Items | Est. Files | Blocking Deployment? |
|-------|-------|------------|---------------------|
| 1     | N     | N          | Yes                 |
| 2     | N     | N          | No                  |
| 3     | N     | N          | No                  |
| 4     | N     | N          | No                  |
```

Write the full plan to `docs/review-plan.md`, preserving any existing "Local Progress Update" sections at the top while replacing the plan body.

---

## Execution Notes

- Use multiple explorer agents in parallel to gather context across all 6 perspectives simultaneously
- Read actual source files — do not speculate about what code does based on file names alone
- Cross-reference findings between perspectives to find systemic issues
- Prioritize findings that affect multiple perspectives higher than single-perspective issues
- Check `docs/review.md` and `docs/review-plan.md` for any prior reviews to compare against
- For the Tutor/TA perspective: if no distinct tutor role exists in the codebase, that itself is a finding — document the gap and plan for the role's introduction
