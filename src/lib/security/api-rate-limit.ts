import { NextRequest, NextResponse } from "next/server";
import { getRateLimitKey, isRateLimited, recordRateLimitFailure } from "./rate-limit";

export const API_RATE_LIMIT_MAX = parseInt(process.env.API_RATE_LIMIT_MAX || "30", 10);
export const API_RATE_LIMIT_WINDOW_MS = parseInt(process.env.API_RATE_LIMIT_WINDOW_MS || "60000", 10);

const consumedRequestKeys = new WeakMap<NextRequest, Set<string>>();

function rememberRequestKey(request: NextRequest, key: string) {
  const requestKeys = consumedRequestKeys.get(request) ?? new Set<string>();
  requestKeys.add(key);
  consumedRequestKeys.set(request, requestKeys);
}

function hasConsumedRequestKey(request: NextRequest, key: string) {
  return consumedRequestKeys.get(request)?.has(key) ?? false;
}

function rateLimitedResponse() {
  return NextResponse.json(
    { error: "rateLimited" },
    { status: 429, headers: { "Retry-After": "60" } }
  );
}

/**
 * Check API rate limit for a mutation endpoint.
 * Returns a 429 response if rate limited, or null if allowed.
 */
export function checkApiRateLimit(
  request: NextRequest,
  endpoint: string
): NextResponse | null {
  const key = getRateLimitKey(`api:${endpoint}`, request.headers);

  if (isRateLimited(key)) {
    return rateLimitedResponse();
  }

  recordRateLimitFailure(key);
  rememberRequestKey(request, key);

  if (isRateLimited(key)) {
    return rateLimitedResponse();
  }

  return null;
}

/**
 * Record a rate limit hit (call on every mutation request).
 */
export function recordApiRateHit(request: NextRequest, endpoint: string) {
  const key = getRateLimitKey(`api:${endpoint}`, request.headers);

  if (hasConsumedRequestKey(request, key)) {
    return;
  }

  recordRateLimitFailure(key);
  rememberRequestKey(request, key);
}
