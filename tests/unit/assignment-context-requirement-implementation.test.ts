import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("assignment-context requirement implementation", () => {
  it("uses a shared helper instead of hard-coding the built-in student role", () => {
    const helperSource = read("src/lib/assignments/submissions.ts");
    const problemPage = read("src/app/(dashboard)/dashboard/problems/[id]/page.tsx");
    const submissionsRoute = read("src/app/api/v1/submissions/route.ts");
    const snapshotsRoute = read("src/app/api/v1/code-snapshots/route.ts");

    expect(helperSource).toContain("export async function getRequiredAssignmentContextsForProblem(");
    expect(helperSource).toContain('if (isAdmin(role) || role === "instructor")');
    expect(helperSource).toContain('caps.has("assignments.view_status")');

    expect(problemPage).toContain("getRequiredAssignmentContextsForProblem(");
    expect(problemPage).not.toContain('session.user.role === "student"');

    expect(submissionsRoute).toContain("getRequiredAssignmentContextsForProblem(");
    expect(submissionsRoute).not.toContain('user.role === "student"');

    expect(snapshotsRoute).toContain("getRequiredAssignmentContextsForProblem(");
    expect(snapshotsRoute).not.toContain('user.role === "student"');
  });

  it("uses capabilities instead of built-in admin-only checks for sidebar mode restrictions", () => {
    const sidebarSource = read("src/components/layout/app-sidebar.tsx");

    expect(sidebarSource).toContain("const canBypassModeRestrictions =");
    expect(sidebarSource).toContain('capsSet.has("groups.view_all")');
    expect(sidebarSource).toContain('capsSet.has("submissions.view_all")');
    expect(sidebarSource).toContain('capsSet.has("assignments.view_status")');
  });
});
