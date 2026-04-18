import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("problem-set visibility implementation", () => {
  it("derives global problem-set visibility from capabilities instead of admin role level shortcuts", () => {
    const source = read("src/lib/problem-sets/visibility.ts");

    expect(source).toContain("const caps = await resolveCapabilities(role);");
    expect(source).toContain('caps.has("groups.view_all")');
    expect(source).toContain("PROBLEM_SET_CAPABILITIES.some");
    expect(source).not.toContain("isAtLeastRoleAsync");
    expect(source).not.toContain('requiredRole: "admin"');
  });
});
