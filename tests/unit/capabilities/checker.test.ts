import { describe, expect, it } from "vitest";
import { hasCapability, hasAnyCapability, hasAllCapabilities } from "@/lib/capabilities/checker";

describe("hasCapability", () => {
  const caps = new Set(["users.view", "users.edit", "problems.create"]);

  it("returns true when capability is present", () => {
    expect(hasCapability(caps, "users.view")).toBe(true);
  });

  it("returns false when capability is absent", () => {
    expect(hasCapability(caps, "users.delete")).toBe(false);
  });

  it("returns false for empty set", () => {
    expect(hasCapability(new Set(), "users.view")).toBe(false);
  });
});

describe("hasAnyCapability", () => {
  const caps = new Set(["users.view", "problems.create"]);

  it("returns true when at least one capability matches", () => {
    expect(hasAnyCapability(caps, ["users.delete", "problems.create"])).toBe(true);
  });

  it("returns false when no capabilities match", () => {
    expect(hasAnyCapability(caps, ["users.delete", "system.settings"])).toBe(false);
  });

  it("returns false for empty capability list", () => {
    expect(hasAnyCapability(caps, [])).toBe(false);
  });

  it("returns false for empty set", () => {
    expect(hasAnyCapability(new Set(), ["users.view"])).toBe(false);
  });
});

describe("hasAllCapabilities", () => {
  const caps = new Set(["users.view", "users.edit", "problems.create"]);

  it("returns true when all capabilities match", () => {
    expect(hasAllCapabilities(caps, ["users.view", "users.edit"])).toBe(true);
  });

  it("returns false when some capabilities are missing", () => {
    expect(hasAllCapabilities(caps, ["users.view", "users.delete"])).toBe(false);
  });

  it("returns true for empty capability list", () => {
    expect(hasAllCapabilities(caps, [])).toBe(true);
  });

  it("returns false for empty set with non-empty list", () => {
    expect(hasAllCapabilities(new Set(), ["users.view"])).toBe(false);
  });
});
