import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("contest analytics/export authorization implementation", () => {
  it("uses the same assignment-submission visibility helper in both page-backed APIs", () => {
    const analyticsRoute = read("src/app/api/v1/contests/[assignmentId]/analytics/route.ts");
    const exportRoute = read("src/app/api/v1/contests/[assignmentId]/export/route.ts");

    expect(analyticsRoute).toContain('import { canViewAssignmentSubmissions } from "@/lib/assignments/submissions"');
    expect(analyticsRoute).toContain("const canView = await canViewAssignmentSubmissions(assignmentId, user.id, user.role);");
    expect(analyticsRoute).not.toContain("canManageContest(");

    expect(exportRoute).toContain('import { canViewAssignmentSubmissions } from "@/lib/assignments/submissions"');
    expect(exportRoute).toContain("const canView = await canViewAssignmentSubmissions(assignmentId, user.id, user.role);");
    expect(exportRoute).not.toContain("canManageContest(");
  });
});
