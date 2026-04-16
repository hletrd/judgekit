import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("practice progress filter implementation", () => {
  it("supports solved, attempted, and unsolved problem filters for signed-in users", () => {
    const source = read("src/app/(public)/practice/page.tsx");

    expect(source).toContain('type ProgressFilter = "all" | "solved" | "unsolved" | "attempted"');
    expect(source).toContain('progressFilter !== "all"');
    expect(source).toContain('currentProgressFilter === "solved"');
    expect(source).toContain('currentProgressFilter === "attempted"');
    expect(source).toContain('currentProgressFilter === "unsolved"');
    expect(source).toContain('progress !== "solved"');
    expect(source).toContain('name="progress" value={currentProgressFilter}');
  });
});
