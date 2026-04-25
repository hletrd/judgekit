import { describe, expect, it, vi } from "vitest";
import {
  normalizeIdentifiersForSimilarity,
  normalizeSource,
} from "@/lib/assignments/code-similarity";

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
  it("preserves identifier casing for case-sensitive languages", () => {
    const normalized = normalizeSource("const Foo = bar + BAZ;");

    expect(normalized).toContain("Foo");
    expect(normalized).toContain("BAZ");
    expect(normalized).not.toContain("foo");
  });

  it("still strips comments and collapses whitespace", () => {
    const normalized = normalizeSource("let Value = 1; // comment\n\n/* block */\nValue++;");

    expect(normalized).toBe("let Value = 1; Value++;");
  });

  it("strips content from closed double-quoted strings, preserving delimiters", () => {
    const normalized = normalizeSource('printf("hello world");');
    expect(normalized).toBe("printf(\"\");");
  });

  it("strips content from closed single-quoted strings, preserving delimiters", () => {
    const normalized = normalizeSource("char c = 'x';");
    expect(normalized).toBe("char c = '';");
  });

  it("strips content from closed template literals, preserving delimiters", () => {
    const normalized = normalizeSource("const msg = `hello`; ");
    expect(normalized).toBe("const msg = ``;");
  });

  it("strips content from template literals with interpolation", () => {
    const normalized = normalizeSource("const msg = `hello ${name}!`; ");
    expect(normalized).toBe("const msg = ``;");
  });

  it("discards unclosed double-quoted strings entirely (no opening quote output)", () => {
    const normalized = normalizeSource('"hello');
    expect(normalized).toBe("");
  });

  it("discards unclosed single-quoted strings entirely", () => {
    const normalized = normalizeSource("'hello");
    expect(normalized).toBe("");
  });

  it("discards unclosed template literals entirely", () => {
    const normalized = normalizeSource("`hello");
    expect(normalized).toBe("");
  });

  it("does not consume code after an unclosed string as string content", () => {
    // An unclosed string should NOT cause identifiers on the next line to be lost.
    // Without a newline, there is no way to distinguish string content from code
    // within an unclosed string, so we test the newline boundary.
    const normalized = normalizeSource('"unclosed\nint x = 1;');
    expect(normalized).toBe("int x = 1;");
  });

  it("handles multiple closed strings correctly", () => {
    const normalized = normalizeSource('printf("a" + "b");');
    expect(normalized).toBe('printf("" + "");');
  });

  it("handles escape sequences inside strings", () => {
    const normalized = normalizeSource('printf("hello\\nworld");');
    expect(normalized).toBe('printf("");');
  });
});

describe("normalizeIdentifiersForSimilarity", () => {
  it("maps renamed identifiers onto the same placeholder stream", () => {
    const left = normalizeIdentifiersForSimilarity(
      normalizeSource("int total = left + right; return total;")
    );
    const right = normalizeIdentifiersForSimilarity(
      normalizeSource("int answer = alpha + beta; return answer;")
    );

    expect(left).toBe("int v1 = v2 + v3; return v1;");
    expect(right).toBe(left);
  });

  it("preserves language keywords and preprocessor directives", () => {
    const normalized = normalizeIdentifiersForSimilarity(
      normalizeSource("#include <stdio.h>\nfor (int i = 0; i < n; i++) return value;")
    );

    expect(normalized).toContain("#include");
    expect(normalized).toContain("for");
    expect(normalized).toContain("int");
    expect(normalized).toContain("return");
  });
});
