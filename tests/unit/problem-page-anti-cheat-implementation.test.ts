import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("problem page anti-cheat implementation", () => {
  it("mounts the anti-cheat monitor when the assignment context enables it", () => {
    const source = read("src/app/(dashboard)/dashboard/problems/[id]/page.tsx");

    expect(source).toContain('import { AntiCheatMonitor } from "@/components/exam/anti-cheat-monitor"');
    expect(source).toContain("enableAntiCheat: true");
    expect(source).toContain("enableAntiCheat: Boolean(assignment.enableAntiCheat)");
    expect(source).toContain("<AntiCheatMonitor assignmentId={assignmentContext.id} enabled />");
  });
});
