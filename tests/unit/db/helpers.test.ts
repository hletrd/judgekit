import { describe, expect, it } from "vitest";
import { withUpdatedAt } from "@/lib/db/helpers";

describe("withUpdatedAt", () => {
  it("injects updatedAt with the provided date", () => {
    const now = new Date("2025-06-15T12:00:00Z");
    const result = withUpdatedAt({ name: "Alice" }, now);
    expect(result).toEqual({
      name: "Alice",
      updatedAt: now,
    });
  });

  it("preserves all original fields", () => {
    const now = new Date("2025-06-15T12:00:00Z");
    const result = withUpdatedAt({ a: 1, b: "two", c: true }, now);
    expect(result).toMatchObject({ a: 1, b: "two", c: true });
    expect(result.updatedAt).toBe(now);
  });

  it("overrides an existing updatedAt field", () => {
    const now = new Date("2025-06-15T12:00:00Z");
    const result = withUpdatedAt({ updatedAt: new Date("2000-01-01") }, now);
    expect(result.updatedAt).toBe(now);
  });

  it("works with an empty object", () => {
    const now = new Date("2025-06-15T12:00:00Z");
    const result = withUpdatedAt({}, now);
    expect(result).toEqual({ updatedAt: now });
  });
});
