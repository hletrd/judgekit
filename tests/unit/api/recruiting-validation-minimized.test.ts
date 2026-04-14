import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROUTE_PATH = "src/app/api/v1/recruiting/validate/route.ts";

describe("recruiting validation route — minimized response", () => {
  it("does not include status: invitation.status in any response", () => {
    const source = readFileSync(join(process.cwd(), ROUTE_PATH), "utf8");
    expect(source).not.toContain("status: invitation.status");
  });

  it("does not leak expiresAt in any response", () => {
    const source = readFileSync(join(process.cwd(), ROUTE_PATH), "utf8");
    expect(source).not.toContain("expiresAt: invitation.expiresAt");
  });

  it("does not include a reason field distinguishing failure modes", () => {
    const source = readFileSync(join(process.cwd(), ROUTE_PATH), "utf8");
    expect(source).not.toMatch(/reason:\s*["'`]/);
  });

  it("returns a uniform { valid: false } for all invalid cases", () => {
    const source = readFileSync(join(process.cwd(), ROUTE_PATH), "utf8");
    expect(source).toContain("{ valid: false }");
    // All invalid paths go through the same helper — no branched error shapes
    expect(source).not.toMatch(/valid:\s*false.*reason/s);
  });

  it("valid response contains only { valid: true } with no extra fields", () => {
    const source = readFileSync(join(process.cwd(), ROUTE_PATH), "utf8");
    expect(source).toContain("{ valid: true }");
    // Must not attach status or expiresAt alongside valid: true
    expect(source).not.toMatch(/valid:\s*true[^}]*status/s);
    expect(source).not.toMatch(/valid:\s*true[^}]*expiresAt/s);
  });
});
