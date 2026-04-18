import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("personal submissions page implementation", () => {
  it("redirects reviewer-capable users to the scoped review queue and keeps the page personal-only", () => {
    const source = read("src/app/(dashboard)/dashboard/submissions/page.tsx");

    expect(source).toContain("resolveCapabilities(session.user.role)");
    expect(source).toContain('caps.has("submissions.view_all") || caps.has("assignments.view_status")');
    expect(source).toContain('redirect("/dashboard/admin/submissions")');
    expect(source).toContain("const userFilter = eq(submissions.userId, session.user.id);");
    expect(source).not.toContain("isInstructor(");
    expect(source).not.toContain('t("table.student")');
  });
});
