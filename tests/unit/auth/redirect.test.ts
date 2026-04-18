import { describe, it, expect } from "vitest";
import { getSafeRedirectUrl, DEFAULT_POST_AUTH_REDIRECT } from "@/lib/auth/redirect";

describe("getSafeRedirectUrl", () => {
  it("accepts plain same-origin path-absolute URLs", () => {
    expect(getSafeRedirectUrl("/dashboard")).toBe("/dashboard");
    expect(getSafeRedirectUrl("/assignments/123")).toBe("/assignments/123");
    expect(getSafeRedirectUrl("/problems?sort=new")).toBe("/problems?sort=new");
    expect(getSafeRedirectUrl("/problems#anchor")).toBe("/problems#anchor");
  });

  it("falls back to default for missing or empty callback", () => {
    expect(getSafeRedirectUrl(null)).toBe(DEFAULT_POST_AUTH_REDIRECT);
    expect(getSafeRedirectUrl(undefined)).toBe(DEFAULT_POST_AUTH_REDIRECT);
    expect(getSafeRedirectUrl("")).toBe(DEFAULT_POST_AUTH_REDIRECT);
  });

  it("rejects protocol-relative //evil.com", () => {
    expect(getSafeRedirectUrl("//evil.com")).toBe(DEFAULT_POST_AUTH_REDIRECT);
    expect(getSafeRedirectUrl("//evil.com/path")).toBe(DEFAULT_POST_AUTH_REDIRECT);
  });

  it("rejects backslash-prefix tricks like /\\evil.com", () => {
    expect(getSafeRedirectUrl("/\\evil.com")).toBe(DEFAULT_POST_AUTH_REDIRECT);
    expect(getSafeRedirectUrl("/\\\\evil.com/path")).toBe(DEFAULT_POST_AUTH_REDIRECT);
  });

  it("rejects user-info authority tricks starting with /@", () => {
    expect(getSafeRedirectUrl("/@evil.com/path")).toBe(DEFAULT_POST_AUTH_REDIRECT);
  });

  it("rejects absolute URLs with a scheme", () => {
    expect(getSafeRedirectUrl("https://evil.com")).toBe(DEFAULT_POST_AUTH_REDIRECT);
    expect(getSafeRedirectUrl("http://evil.com")).toBe(DEFAULT_POST_AUTH_REDIRECT);
    expect(getSafeRedirectUrl("javascript:alert(1)")).toBe(DEFAULT_POST_AUTH_REDIRECT);
    expect(getSafeRedirectUrl("data:text/html,abc")).toBe(DEFAULT_POST_AUTH_REDIRECT);
  });

  it("strips control characters (CR, LF, NUL) before validation", () => {
    expect(getSafeRedirectUrl("/\r\nSet-Cookie: x=y")).toBe("/Set-Cookie: x=y");
    expect(getSafeRedirectUrl("/\x00evil")).toBe("/evil");
  });

  it("rejects callbacks that resolve to a different origin", () => {
    // URL("//evil.com", placeholder) would already be caught by the //
    // check, but this also covers obscure parser-specific resolutions.
    expect(getSafeRedirectUrl("//")).toBe(DEFAULT_POST_AUTH_REDIRECT);
  });
});
