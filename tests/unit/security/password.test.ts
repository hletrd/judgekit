import { describe, expect, it } from "vitest";
import {
  getPasswordValidationError,
  isStrongPassword,
} from "@/lib/security/password";

describe("getPasswordValidationError", () => {
  it("rejects passwords shorter than the minimum length", () => {
    expect(getPasswordValidationError("Abc123")).toBe("passwordTooShort");
  });

  it("rejects passwords missing character classes", () => {
    expect(getPasswordValidationError("abcdefgh")).toBe("passwordTooWeak");
    expect(getPasswordValidationError("ABCDEFGH")).toBe("passwordTooWeak");
    expect(getPasswordValidationError("Abcdefgh")).toBe("passwordTooWeak");
  });

  it("accepts passwords with uppercase, lowercase, and digits", () => {
    expect(getPasswordValidationError("Kj7xMq9zN2")).toBeNull();
    expect(isStrongPassword("Kj7xMq9zN2")).toBe(true);
  });
});
