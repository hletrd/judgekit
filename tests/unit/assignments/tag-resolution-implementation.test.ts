import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("tag resolution implementation guards", () => {
  it("only retries tag creation on unique-constraint races", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/problem-management.ts"), "utf8");

    expect(source).toContain('if (pgErr.code !== "23505")');
    expect(source).toContain("if (!raced) {");
    expect(source).toContain("throw error;");
  });
});
