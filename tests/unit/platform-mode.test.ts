import { describe, expect, it } from "vitest";
import { getPlatformModePolicy } from "@/lib/platform-mode";

describe("getPlatformModePolicy", () => {
  it("keeps homework mode permissive by default", () => {
    const policy = getPlatformModePolicy("homework");
    expect(policy.restrictAiByDefault).toBe(false);
    expect(policy.restrictStandaloneCompiler).toBe(false);
  });

  it("restricts standalone compiler in exam mode", () => {
    const policy = getPlatformModePolicy("exam");
    expect(policy.restrictAiByDefault).toBe(true);
    expect(policy.restrictStandaloneCompiler).toBe(true);
  });

  it("restricts AI but keeps standalone compiler available in contest mode", () => {
    const policy = getPlatformModePolicy("contest");
    expect(policy.restrictAiByDefault).toBe(true);
    expect(policy.restrictStandaloneCompiler).toBe(false);
  });

  it("restricts standalone compiler in recruiting mode", () => {
    const policy = getPlatformModePolicy("recruiting");
    expect(policy.restrictAiByDefault).toBe(true);
    expect(policy.restrictStandaloneCompiler).toBe(true);
  });
});
