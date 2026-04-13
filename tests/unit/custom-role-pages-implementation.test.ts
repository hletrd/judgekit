import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("custom-role page/runtime implementation guards", () => {
  it("removes built-in-only role assertions from custom-role-aware dashboard pages", () => {
    const pagePaths = [
      "src/app/(dashboard)/dashboard/contests/page.tsx",
      "src/app/(dashboard)/dashboard/contests/[assignmentId]/analytics/page.tsx",
      "src/app/(dashboard)/dashboard/contests/[assignmentId]/participant/[userId]/page.tsx",
      "src/app/(dashboard)/dashboard/contests/[assignmentId]/page.tsx",
      "src/app/(dashboard)/dashboard/groups/[id]/assignments/[assignmentId]/student/[userId]/page.tsx",
      "src/app/(dashboard)/dashboard/groups/[id]/assignments/[assignmentId]/page.tsx",
      "src/app/(dashboard)/dashboard/groups/[id]/page.tsx",
    ];

    for (const pagePath of pagePaths) {
      expect(read(pagePath)).not.toContain("assertUserRole(");
    }
  });

  it("keeps contest discovery capability-aware for custom roles", () => {
    const contestsHelper = read("src/lib/assignments/contests.ts");

    expect(contestsHelper).toContain("resolveCapabilities");
    expect(contestsHelper).toContain("group_instructors gi");
    expect(contestsHelper).toContain("groups.view_all");
  });
});
