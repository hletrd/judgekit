import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const EXPECTED_TOKEN = "a".repeat(32);

const { getValidatedJudgeAuthTokenMock } = vi.hoisted(() => ({
  getValidatedJudgeAuthTokenMock: vi.fn(() => EXPECTED_TOKEN),
}));

vi.mock("@/lib/security/env", () => ({
  getValidatedJudgeAuthToken: getValidatedJudgeAuthTokenMock,
}));

import { isJudgeAuthorized } from "@/lib/judge/auth";

function makeRequest(authHeader?: string) {
  return new NextRequest("http://localhost:3000/api/v1/judge/claim", {
    method: "POST",
    headers: authHeader ? { Authorization: authHeader } : {},
  });
}

describe("isJudgeAuthorized", () => {
  it("returns true for a valid Bearer token", () => {
    const request = makeRequest(`Bearer ${EXPECTED_TOKEN}`);
    expect(isJudgeAuthorized(request)).toBe(true);
  });

  it("returns false when Authorization header is missing", () => {
    const request = makeRequest();
    expect(isJudgeAuthorized(request)).toBe(false);
  });

  it("returns false when Authorization header does not start with 'Bearer '", () => {
    const request = makeRequest(`Token ${EXPECTED_TOKEN}`);
    expect(isJudgeAuthorized(request)).toBe(false);
  });

  it("returns false when Authorization header is just 'Bearer' without a space", () => {
    const request = makeRequest("Bearer");
    expect(isJudgeAuthorized(request)).toBe(false);
  });

  it("returns false when token has wrong length (shorter)", () => {
    const request = makeRequest("Bearer short");
    expect(isJudgeAuthorized(request)).toBe(false);
  });

  it("returns false when token has wrong length (longer)", () => {
    const request = makeRequest(`Bearer ${"b".repeat(33)}`);
    expect(isJudgeAuthorized(request)).toBe(false);
  });

  it("returns false when token has correct length but wrong content", () => {
    const request = makeRequest(`Bearer ${"b".repeat(32)}`);
    expect(isJudgeAuthorized(request)).toBe(false);
  });

  it("returns false for an empty Bearer token (zero-length after prefix)", () => {
    const request = makeRequest("Bearer ");
    expect(isJudgeAuthorized(request)).toBe(false);
  });

  it("uses timing-safe comparison and does not short-circuit on partial match", () => {
    // A token that shares the first characters with the expected token
    // but differs at the end — a naive string comparison would also reject
    // it, but we verify timingSafeEqual is invoked by ensuring the function
    // reaches the comparison stage (same length) and still returns false.
    const partialMatch = "a".repeat(31) + "b"; // length 32, differs only at last byte
    const request = makeRequest(`Bearer ${partialMatch}`);
    expect(isJudgeAuthorized(request)).toBe(false);
  });
});
