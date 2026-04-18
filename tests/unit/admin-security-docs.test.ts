import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("admin security operations documentation", () => {
  it("documents persistent lockout policy, MFA/SSO status, and dependency scanning baseline", () => {
    const readme = read("README.md");
    const checklist = read("docs/release-readiness-checklist.md");
    const doc = read("docs/admin-security-operations.md");

    expect(readme).toContain("docs/admin-security-operations.md");
    expect(checklist).toContain("docs/admin-security-operations.md");
    expect(doc).toContain("Login lockout policy");
    expect(doc).toContain("lockouts survive app restarts");
    expect(doc).toContain("does **not** currently ship native MFA or institution-grade SSO");
    expect(doc).toContain("Secret management baseline");
    expect(doc).toContain("AUTH_SECRET");
    expect(doc).toContain("JUDGE_AUTH_TOKEN");
    expect(doc).toContain("Reverse proxy and perimeter controls");
    expect(doc).toContain("IP allowlisting / VPN requirements for admin-only entry points");
    expect(doc).toContain("restrict admin access by network boundary where possible (VPN, allowlist, access proxy)");
    expect(doc).toContain("nginx rate limits");
    expect(doc).toContain("npm audit --audit-level=high");
    expect(doc).toContain("cargo audit");
    expect(doc).toContain("Dependabot");
  });
});
