import { describe, expect, it } from "vitest";
import { withRecruitingContextCache, getCachedRecruitingContext, setCachedRecruitingContext } from "@/lib/recruiting/request-cache";

describe("recruiting request cache (AsyncLocalStorage)", () => {
  it("returns undefined when no store is active", () => {
    // Outside of withRecruitingContextCache, there's no ALS context
    const result = getCachedRecruitingContext("user-1");
    expect(result).toBeUndefined();
  });

  it("returns undefined for a different userId than what's cached", () => {
    const result = withRecruitingContextCache(() => {
      setCachedRecruitingContext("user-1", {
        assignmentIds: ["a1"],
        problemIds: ["p1"],
        isRecruitingCandidate: true,
        effectivePlatformMode: "recruiting",
      });
      return getCachedRecruitingContext("user-2");
    });
    expect(result).toBeUndefined();
  });

  it("returns cached context for the same userId", () => {
    const result = withRecruitingContextCache(() => {
      const ctx = {
        assignmentIds: ["a1", "a2"],
        problemIds: ["p1"],
        isRecruitingCandidate: true,
        effectivePlatformMode: "recruiting" as const,
      };
      setCachedRecruitingContext("user-1", ctx);
      return getCachedRecruitingContext("user-1");
    });
    expect(result).toBeDefined();
    expect(result!.assignmentIds).toEqual(["a1", "a2"]);
    expect(result!.isRecruitingCandidate).toBe(true);
  });

  it("isolates cache between different ALS contexts", () => {
    // First context
    withRecruitingContextCache(() => {
      setCachedRecruitingContext("user-1", {
        assignmentIds: ["a1"],
        problemIds: [],
        isRecruitingCandidate: true,
        effectivePlatformMode: "recruiting",
      });
    });

    // Second context — should not see user-1's data
    const result = withRecruitingContextCache(() => {
      return getCachedRecruitingContext("user-1");
    });
    expect(result).toBeUndefined();
  });

  it("allows overwriting the cached context", () => {
    const result = withRecruitingContextCache(() => {
      setCachedRecruitingContext("user-1", {
        assignmentIds: ["a1"],
        problemIds: [],
        isRecruitingCandidate: true,
        effectivePlatformMode: "recruiting",
      });
      setCachedRecruitingContext("user-1", {
        assignmentIds: ["a1", "a2"],
        problemIds: ["p1"],
        isRecruitingCandidate: true,
        effectivePlatformMode: "recruiting",
      });
      return getCachedRecruitingContext("user-1");
    });
    expect(result!.assignmentIds).toEqual(["a1", "a2"]);
    expect(result!.problemIds).toEqual(["p1"]);
  });
});
