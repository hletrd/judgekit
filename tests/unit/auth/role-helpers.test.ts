import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mocks = vi.hoisted(() => ({
  getRoleLevel: vi.fn<(role: string) => Promise<number>>(),
  resolveCapabilities: vi.fn<(role: string) => Promise<Set<string>>>(),
}));

vi.mock("@/lib/security/constants", () => ({
  ROLE_LEVEL: {
    student: 0,
    instructor: 1,
    admin: 2,
    super_admin: 3,
  },
}));

vi.mock("@/lib/capabilities/cache", () => ({
  getRoleLevel: mocks.getRoleLevel,
  resolveCapabilities: mocks.resolveCapabilities,
}));

import {
  isAtLeastRoleAsync,
  canManageUsersAsync,
  isInstructorOrAboveAsync,
} from "@/lib/auth/role-helpers";

// ---------------------------------------------------------------------------
// isAtLeastRoleAsync
// ---------------------------------------------------------------------------

describe("isAtLeastRoleAsync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns true when user level >= required level", async () => {
    mocks.getRoleLevel
      .mockResolvedValueOnce(2) // userRole = "admin"
      .mockResolvedValueOnce(1); // requiredRole = "instructor"

    expect(await isAtLeastRoleAsync("admin", "instructor")).toBe(true);
  });

  it("returns false when user level < required level", async () => {
    mocks.getRoleLevel
      .mockResolvedValueOnce(0) // userRole = "student"
      .mockResolvedValueOnce(2); // requiredRole = "admin"

    expect(await isAtLeastRoleAsync("student", "admin")).toBe(false);
  });

  it("returns true when levels are equal", async () => {
    mocks.getRoleLevel
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);

    expect(await isAtLeastRoleAsync("instructor", "instructor")).toBe(true);
  });

  it("delegates to getRoleLevel for both roles", async () => {
    mocks.getRoleLevel
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(0);

    await isAtLeastRoleAsync("super_admin", "student");

    expect(mocks.getRoleLevel).toHaveBeenCalledWith("super_admin");
    expect(mocks.getRoleLevel).toHaveBeenCalledWith("student");
  });
});

// ---------------------------------------------------------------------------
// canManageUsersAsync
// ---------------------------------------------------------------------------

describe("canManageUsersAsync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns true when capabilities include both users.view and users.edit", async () => {
    mocks.resolveCapabilities.mockResolvedValueOnce(
      new Set(["users.view", "users.edit", "users.delete"])
    );

    expect(await canManageUsersAsync("admin")).toBe(true);
  });

  it("returns false when capabilities are missing users.edit", async () => {
    mocks.resolveCapabilities.mockResolvedValueOnce(
      new Set(["users.view"])
    );

    expect(await canManageUsersAsync("instructor")).toBe(false);
  });

  it("returns false when capabilities are missing users.view", async () => {
    mocks.resolveCapabilities.mockResolvedValueOnce(
      new Set(["users.edit"])
    );

    expect(await canManageUsersAsync("custom_role")).toBe(false);
  });

  it("returns false when capabilities are empty", async () => {
    mocks.resolveCapabilities.mockResolvedValueOnce(new Set());

    expect(await canManageUsersAsync("student")).toBe(false);
  });

  it("returns false when capabilities have unrelated permissions", async () => {
    mocks.resolveCapabilities.mockResolvedValueOnce(
      new Set(["content.submit_solutions", "problems.create"])
    );

    expect(await canManageUsersAsync("student")).toBe(false);
  });

  it("delegates to resolveCapabilities with the role name", async () => {
    mocks.resolveCapabilities.mockResolvedValueOnce(new Set());

    await canManageUsersAsync("custom_role");

    expect(mocks.resolveCapabilities).toHaveBeenCalledWith("custom_role");
  });
});

// ---------------------------------------------------------------------------
// isInstructorOrAboveAsync
// ---------------------------------------------------------------------------

describe("isInstructorOrAboveAsync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns true when capabilities include problems.create", async () => {
    mocks.resolveCapabilities.mockResolvedValueOnce(
      new Set(["problems.create", "content.submit_solutions"])
    );

    expect(await isInstructorOrAboveAsync("instructor")).toBe(true);
  });

  it("returns true when capabilities include submissions.view_all", async () => {
    mocks.resolveCapabilities.mockResolvedValueOnce(
      new Set(["submissions.view_all"])
    );

    expect(await isInstructorOrAboveAsync("instructor")).toBe(true);
  });

  it("returns true when capabilities include both problems.create and submissions.view_all", async () => {
    mocks.resolveCapabilities.mockResolvedValueOnce(
      new Set(["problems.create", "submissions.view_all"])
    );

    expect(await isInstructorOrAboveAsync("admin")).toBe(true);
  });

  it("returns false when capabilities lack both required permissions", async () => {
    mocks.resolveCapabilities.mockResolvedValueOnce(
      new Set(["content.submit_solutions", "content.view_own_submissions"])
    );

    expect(await isInstructorOrAboveAsync("student")).toBe(false);
  });

  it("returns false when capabilities are empty", async () => {
    mocks.resolveCapabilities.mockResolvedValueOnce(new Set());

    expect(await isInstructorOrAboveAsync("unknown")).toBe(false);
  });

  it("delegates to resolveCapabilities with the role name", async () => {
    mocks.resolveCapabilities.mockResolvedValueOnce(new Set());

    await isInstructorOrAboveAsync("custom_role");

    expect(mocks.resolveCapabilities).toHaveBeenCalledWith("custom_role");
  });
});
