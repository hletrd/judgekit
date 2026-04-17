# Admin security operations

_Last updated: 2026-04-17_

This guide documents the current operational security baseline for admin and instructor access, plus the integration points for stronger enterprise controls.

## Current built-in baseline

### Login lockout policy
- login attempts are tracked in PostgreSQL-backed rate-limit state
- lockouts survive app restarts because the authoritative state is persisted in the database
- the default policy is driven by system settings / env-backed defaults:
  - `loginRateLimitMaxAttempts`
  - `loginRateLimitWindowMs`
  - `loginRateLimitBlockMs`
- repeated violations escalate the effective block duration via the existing exponential backoff path

### Session invalidation
- password changes and account deactivation invalidate JWT-backed sessions through `tokenInvalidatedAt`
- invalidated tokens are cleared of identity and preference claims before reuse

### Dependency scanning baseline
- CI runs `npm audit --audit-level=high`
- CI runs `cargo audit`
- Dependabot monitors:
  - npm dependencies
  - Rust crates (`judge-worker-rs`, `code-similarity-rs`, `rate-limiter-rs`)
  - GitHub Actions workflows

## MFA and SSO status

JudgeKit does **not** currently ship native MFA or institution-grade SSO (SAML/OIDC) for admin/instructor sign-in.

### Recommended integration point today
Until native support exists, deploy higher-assurance admin access behind an external identity-aware control plane such as:
- a reverse proxy / access gateway with IdP-backed MFA
- institution-managed SSO in front of the admin hostname
- IP allowlisting / VPN requirements for admin-only entry points

### What to protect first
- `/dashboard/admin/*`
- deployment hosts and SSH access
- any workstation or CI environment that can run `deploy-docker.sh`
- secrets used for backups, judge workers, and runtime auth

## Operator checklist
- review login-log and audit-log exports during investigations
- verify lockout settings before high-stakes launches
- rotate leaked credentials using `docs/operator-incident-runbook.md`
- review `docs/judge-worker-incident-runbook.md` for worker-boundary incidents

## Future native work
- app-native MFA enrollment/recovery flow
- institution-facing SSO/SAML/OIDC sign-in
- role-aware admin session hardening and risk-based step-up auth
