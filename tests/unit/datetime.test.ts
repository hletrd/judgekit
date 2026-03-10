import { describe, expect, it } from "vitest";
import { formatRelativeTimeFromNow } from "@/lib/datetime";

describe("formatRelativeTimeFromNow", () => {
  const baseNow = new Date("2026-03-10T00:00:00.000Z").valueOf();

  it("formats future times relative to now", () => {
    expect(
      formatRelativeTimeFromNow("2026-03-12T00:00:00.000Z", "en-US", baseNow)
    ).toContain("in 2 days");
  });

  it("formats past times relative to now", () => {
    expect(
      formatRelativeTimeFromNow("2026-03-09T00:00:00.000Z", "en-US", baseNow)
    ).toMatch(/yesterday|1 day ago/);
  });

  it("returns a placeholder for invalid dates", () => {
    expect(formatRelativeTimeFromNow("not-a-date", "en-US", baseNow)).toBe("-");
  });
});
