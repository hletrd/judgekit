import { describe, it, expect } from "vitest";
import { escapeLikePattern } from "@/lib/db/like";

describe("escapeLikePattern", () => {
  it("returns the input unchanged when no special characters are present", () => {
    expect(escapeLikePattern("hello")).toBe("hello");
  });

  it("escapes percent signs", () => {
    expect(escapeLikePattern("100%")).toBe("100\\%");
  });

  it("escapes underscores", () => {
    expect(escapeLikePattern("test_user")).toBe("test\\_user");
  });

  it("escapes backslashes first before percent and underscore", () => {
    // If backslash is not escaped first, a literal backslash before %
    // would create \\% which PostgreSQL interprets as escaped-backslash
    // followed by unescaped %
    expect(escapeLikePattern("a\\%b")).toBe("a\\\\\\%b");
  });

  it("escapes backslash before underscore", () => {
    expect(escapeLikePattern("a\\_b")).toBe("a\\\\\\_b");
  });

  it("handles multiple special characters", () => {
    expect(escapeLikePattern("%test_\\%")).toBe("\\%test\\_\\\\\\%");
  });

  it("handles a string that is all special characters", () => {
    expect(escapeLikePattern("%_\\")).toBe("\\%\\_\\\\");
  });

  it("handles empty string", () => {
    expect(escapeLikePattern("")).toBe("");
  });

  it("escapes a realistic search query with backslash path separator", () => {
    // e.g., searching for "C:\Users"
    expect(escapeLikePattern("C:\\Users")).toBe("C:\\\\Users");
  });

  it("escapes a realistic search query with percent and underscore", () => {
    // e.g., searching for "test_user%" -- underscore is a SQL wildcard
    expect(escapeLikePattern("test_user%")).toBe("test\\_user\\%");
  });

  it("preserves regular characters interspersed with special ones", () => {
    expect(escapeLikePattern("hello%world_test\\path")).toBe("hello\\%world\\_test\\\\path");
  });
});
