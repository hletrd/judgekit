import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("admin log route capability guards", () => {
  it("uses system log capabilities instead of admin-only role checks", () => {
    const loginLogsRoute = readFileSync(
      join(process.cwd(), "src/app/api/v1/admin/login-logs/route.ts"),
      "utf8"
    );
    const auditLogsRoute = readFileSync(
      join(process.cwd(), "src/app/api/v1/admin/audit-logs/route.ts"),
      "utf8"
    );

    expect(loginLogsRoute).toContain('auth: { capabilities: ["system.login_logs"] }');
    expect(loginLogsRoute).not.toContain("isAdmin(user.role)");

    expect(auditLogsRoute).toContain('auth: { capabilities: ["system.audit_logs"] }');
    expect(auditLogsRoute).not.toContain("isAdmin(user.role)");
  });
});
