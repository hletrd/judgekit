import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROUTE_PATH = "src/app/api/v1/contests/[assignmentId]/anti-cheat/route.ts";

describe("anti-cheat POST route — detail encoding", () => {
  it("does not double-encode details with JSON.stringify({ message: rawDetails })", () => {
    const source = readFileSync(join(process.cwd(), ROUTE_PATH), "utf8");
    expect(source).not.toContain("JSON.stringify({ message: rawDetails })");
  });

  it("stores rawDetails directly using rawDetails ?? null", () => {
    const source = readFileSync(join(process.cwd(), ROUTE_PATH), "utf8");
    expect(source).toContain("rawDetails ?? null");
  });

  it("assigns details from rawDetails without wrapping in an object", () => {
    const source = readFileSync(join(process.cwd(), ROUTE_PATH), "utf8");
    // The fix line: const details = rawDetails ?? null;
    expect(source).toMatch(/const details\s*=\s*rawDetails\s*\?\?\s*null/);
  });
});
