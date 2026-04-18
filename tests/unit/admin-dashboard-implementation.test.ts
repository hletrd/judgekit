import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("admin dashboard implementation", () => {
  it("surfaces only the quick links the actor can actually access", () => {
    const source = read("src/app/(dashboard)/dashboard/_components/admin-dashboard.tsx");
    const dashboardPage = read("src/app/(dashboard)/dashboard/page.tsx");

    expect(source).toContain("const caps = new Set(capabilities);");
    expect(source).toContain('caps.has("system.settings")');
    expect(source).toContain('caps.has("users.view")');
    expect(source).toContain('caps.has("system.audit_logs")');
    expect(source).toContain('CardTitle>{t("adminQuickActions")}');
    expect(source).toContain('href="/dashboard/admin/workers"');
    expect(source).toContain('href="/dashboard/admin/languages"');
    expect(source).toContain('href="/dashboard/admin/users"');
    expect(source).toContain('href="/dashboard/admin/audit-logs"');
    expect(dashboardPage).toContain("<AdminDashboard capabilities={capabilityList} />");
  });

  it("renders a system health snapshot using the shared admin health helper", () => {
    const source = read("src/app/(dashboard)/dashboard/_components/admin-dashboard.tsx");

    expect(source).toContain('getAdminHealthSnapshot()');
    expect(source).toContain('CardTitle>{t("systemHealthTitle")}');
    expect(source).toContain('t("databaseStatusTitle")');
    expect(source).toContain('t("auditPipelineStatusTitle")');
    expect(source).toContain('t("submissionQueueStatusTitle")');
    expect(source).toContain('t("workerFleetStatusTitle")');
    expect(source).toContain('t("uptimeStatusTitle")');
    expect(source).toContain('t("responseTimeStatusTitle")');
  });
});
