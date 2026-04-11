import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("setup script implementation guards", () => {
  it("does not rely on raw eval-based shell parsing", () => {
    const source = readFileSync(join(process.cwd(), "scripts/setup.sh"), "utf8");

    expect(source).not.toMatch(/\beval\b/);
  });
});
