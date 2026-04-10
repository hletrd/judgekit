import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    delete: vi.fn(),
    insert: vi.fn(),
    transaction: vi.fn(),
  },
}));

vi.mock("@/lib/db/queries", () => ({
  rawQueryAll: vi.fn(),
}));

vi.mock("@/lib/assignments/code-similarity-client", () => ({
  computeSimilarityRust: vi.fn(),
}));

describe("normalizeSource", () => {
  it("preserves identifier casing for case-sensitive languages", async () => {
    const { normalizeSource } = await import("@/lib/assignments/code-similarity");
    const normalized = normalizeSource("const Foo = bar + BAZ;");

    expect(normalized).toContain("Foo");
    expect(normalized).toContain("BAZ");
    expect(normalized).not.toContain("foo");
  });

  it("still strips comments and collapses whitespace", async () => {
    const { normalizeSource } = await import("@/lib/assignments/code-similarity");
    const normalized = normalizeSource("let Value = 1; // comment\n\n/* block */\nValue++;");

    expect(normalized).toBe("let Value = 1; Value++;");
  });
});
