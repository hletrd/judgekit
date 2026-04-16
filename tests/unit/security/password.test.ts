import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/system-settings-config", () => ({
  getConfiguredSettings: () => ({
    minPasswordLength: 8,
  }),
}));
import {
  getPasswordValidationError,
  isStrongPassword,
} from "@/lib/security/password";

describe("getPasswordValidationError", () => {
  // --- Length boundary tests ---

  it("rejects empty password as too short", () => {
    expect(getPasswordValidationError("")).toBe("passwordTooShort");
  });

  it("rejects password shorter than minimum length (7 chars)", () => {
    expect(getPasswordValidationError("Abc123!")).toBe("passwordTooShort");
  });

  it("rejects the classic short example Abc123 (6 chars)", () => {
    expect(getPasswordValidationError("Abc123")).toBe("passwordTooShort");
  });

  it("accepts password at exactly the minimum length (8 chars)", () => {
    expect(getPasswordValidationError("Kj7xMq9z")).toBeNull();
  });

  it("accepts a strong password well above the minimum", () => {
    expect(getPasswordValidationError("Kj7xMq9zN2")).toBeNull();
    expect(isStrongPassword("Kj7xMq9zN2")).toBe(true);
  });

  it("accepts very long passwords because only the minimum length is enforced", () => {
    const veryLong = "x".repeat(200);
    expect(getPasswordValidationError(veryLong)).toBeNull();
  });

  it("accepts password with only lowercase letters", () => {
    expect(getPasswordValidationError("abcdefgh")).toBeNull();
  });

  it("accepts password with only digits", () => {
    expect(getPasswordValidationError("99887766")).toBeNull();
  });

  it("accepts a common password (no common password check)", () => {
    expect(getPasswordValidationError("password")).toBeNull();
  });

  it("ignores username and email context because similarity checks are disabled", () => {
    expect(getPasswordValidationError("Alice123", { username: "alice" })).toBeNull();
    expect(
      getPasswordValidationError("mysupersecretpassword", { username: "secret" })
    ).toBeNull();
    expect(
      getPasswordValidationError("mysupersecretpassword", { email: "secret@example.com" })
    ).toBeNull();
  });
});

describe("isStrongPassword", () => {
  it("returns true for a valid password", () => {
    expect(isStrongPassword("Kj7xMq9zN2")).toBe(true);
  });

  it("returns false for a short password", () => {
    expect(isStrongPassword("Abc123")).toBe(false);
  });

  it("returns true for a simple password that meets length requirement", () => {
    expect(isStrongPassword("password")).toBe(true);
  });
});
