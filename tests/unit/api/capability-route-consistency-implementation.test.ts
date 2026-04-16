import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const routes: Array<{ file: string; capabilities: string[] }> = [
  {
    file: "src/app/api/v1/admin/tags/route.ts",
    capabilities: ['auth: { capabilities: ["system.settings"] }'],
  },
  {
    file: "src/app/api/v1/admin/tags/[id]/route.ts",
    capabilities: ['auth: { capabilities: ["system.settings"] }'],
  },
  {
    file: "src/app/api/v1/contests/quick-create/route.ts",
    capabilities: ['auth: { capabilities: ["contests.create"] }'],
  },
  {
    file: "src/app/api/v1/contests/[assignmentId]/code-snapshots/[userId]/route.ts",
    capabilities: ['auth: { capabilities: ["contests.view_analytics"] }'],
  },
];

describe("remaining route capability consistency guards", () => {
  it("uses capability auth instead of built-in role checks for the remaining converted routes", () => {
    for (const { file, capabilities } of routes) {
      const source = readFileSync(join(process.cwd(), file), "utf8");
      for (const capabilitySnippet of capabilities) {
        expect(source).toContain(capabilitySnippet);
      }
      expect(source).not.toContain("isAdmin(user.role)");
    }
  });
});
