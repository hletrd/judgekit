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

  it("accepts password with only lowercase letters (not common)", () => {
    expect(getPasswordValidationError("zlxkwmqj")).toBeNull();
  });

  it("accepts password with only digits (not common)", () => {
    expect(getPasswordValidationError("99887766")).toBeNull();
  });

  // --- Common password tests ---

  it("rejects 'password' as too common", () => {
    expect(getPasswordValidationError("password")).toBe("passwordTooCommon");
  });

  it("rejects '12345678' as too common", () => {
    expect(getPasswordValidationError("12345678")).toBe("passwordTooCommon");
  });

  it("rejects common passwords case-insensitively", () => {
    expect(getPasswordValidationError("PASSWORD")).toBe("passwordTooCommon");
    expect(getPasswordValidationError("Password")).toBe("passwordTooCommon");
  });

  // --- Context-aware: username check ---

  it("rejects password matching username", () => {
    expect(
      getPasswordValidationError("johnjohn", { username: "johnjohn" })
    ).toBe("passwordMatchesUsername");
  });

  it("rejects password matching username case-insensitively", () => {
    expect(
      getPasswordValidationError("JohnJohn", { username: "johnjohn" })
    ).toBe("passwordMatchesUsername");
  });

  it("accepts password different from username", () => {
    expect(
      getPasswordValidationError("Kj7xMq9z", { username: "john" })
    ).toBeNull();
  });

  // --- Context-aware: email check ---

  it("rejects password matching email local part", () => {
    expect(
      getPasswordValidationError("john.doe", { email: "john.doe@example.com" })
    ).toBe("passwordMatchesEmail");
  });

  it("rejects password containing email local part", () => {
    expect(
      getPasswordValidationError("john.doe123", { email: "john.doe@example.com" })
    ).toBe("passwordMatchesEmail");
  });

  it("rejects password matching email local part case-insensitively", () => {
    expect(
      getPasswordValidationError("John.Doe", { email: "john.doe@example.com" })
    ).toBe("passwordMatchesEmail");
  });

  it("accepts password unrelated to email", () => {
    expect(
      getPasswordValidationError("Kj7xMq9z", { email: "john.doe@example.com" })
    ).toBeNull();
  });

  it("skips email check when local part is shorter than 3 chars", () => {
    // "ab" is only 2 chars — too short for a meaningful check
    expect(
      getPasswordValidationError("ab123456", { email: "ab@example.com" })
    ).toBeNull();
  });

  // --- Context null/undefined ---

  it("works without context parameter", () => {
    expect(getPasswordValidationError("Kj7xMq9z")).toBeNull();
    expect(getPasswordValidationError("password")).toBe("passwordTooCommon");
  });

  it("works with empty context object", () => {
    expect(getPasswordValidationError("Kj7xMq9z", {})).toBeNull();
  });

  it("works with null email in context", () => {
    expect(
      getPasswordValidationError("Kj7xMq9z", { username: "john", email: null })
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

  it("returns false for a common password", () => {
    expect(isStrongPassword("password")).toBe(false);
  });

  it("returns false when password matches username", () => {
    expect(isStrongPassword("johnjohn", { username: "johnjohn" })).toBe(false);
  });

  it("returns false when password matches email local part", () => {
    expect(isStrongPassword("john.doe", { email: "john.doe@example.com" })).toBe(false);
  });
});
