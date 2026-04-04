import { NextRequest, NextResponse } from "next/server";
import { getRateLimitKey } from "./rate-limit";
import { execTransaction } from "@/lib/db";
import { rateLimits } from "@/lib/db/schema";
import { getConfiguredSettings } from "@/lib/system-settings-config";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

function getApiRateLimitConfig() {
  const s = getConfiguredSettings();
  return { max: s.apiRateLimitMax, windowMs: s.apiRateLimitWindowMs };
}

/** @deprecated Use getConfiguredSettings().apiRateLimitMax */
export const API_RATE_LIMIT_MAX = getApiRateLimitConfig().max;
/** @deprecated Use getConfiguredSettings().apiRateLimitWindowMs */
export const API_RATE_LIMIT_WINDOW_MS = getApiRateLimitConfig().windowMs;

const consumedRequestKeys = new WeakMap<NextRequest, Set<string>>();

function rememberRequestKey(request: NextRequest, key: string) {
  const requestKeys = consumedRequestKeys.get(request) ?? new Set<string>();
  requestKeys.add(key);
  consumedRequestKeys.set(request, requestKeys);
}

function hasConsumedRequestKey(request: NextRequest, key: string) {
  return consumedRequestKeys.get(request)?.has(key) ?? false;
}

/**
 * Atomically check rate limit and record an API request attempt inside a
 * PostgreSQL transaction with SELECT FOR UPDATE to prevent TOCTOU races.
 * Returns true if the request is rate-limited, false if allowed.
 */
async function atomicConsumeRateLimit(key: string): Promise<boolean> {
  const now = Date.now();
  const { max: apiMax, windowMs } = getApiRateLimitConfig();

  return execTransaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(rateLimits)
      .where(eq(rateLimits.key, key))
      .for("update")
      .limit(1);

    if (!existing) {
      await tx.insert(rateLimits)
        .values({
          id: nanoid(),
          key,
          attempts: 1,
          windowStartedAt: now,
          blockedUntil: null,
          consecutiveBlocks: 0,
          lastAttempt: now,
        });
      return false;
    }

    if (existing.blockedUntil && existing.blockedUntil > now) {
      return true;
    }

    if (existing.windowStartedAt + windowMs <= now) {
      await tx.update(rateLimits)
        .set({ attempts: 1, windowStartedAt: now, lastAttempt: now, blockedUntil: null })
        .where(eq(rateLimits.key, key));
      return false;
    }

    if (existing.attempts >= apiMax) {
      return true;
    }

    const newAttempts = existing.attempts + 1;
    const blocked = newAttempts >= apiMax ? now + windowMs : null;

    await tx.update(rateLimits)
      .set({
        attempts: newAttempts,
        lastAttempt: now,
        blockedUntil: blocked,
      })
      .where(eq(rateLimits.key, key));

    return false;
  });
}

function rateLimitedResponse() {
  return NextResponse.json(
    { error: "rateLimited" },
    { status: 429, headers: { "Retry-After": "60" } }
  );
}

/**
 * Consume one rate limit token for a mutation endpoint.
 * Returns a 429 response if rate limited, or null if allowed.
 */
export async function consumeApiRateLimit(
  request: NextRequest,
  endpoint: string
): Promise<NextResponse | null> {
  const key = getRateLimitKey(`api:${endpoint}`, request.headers);

  if (hasConsumedRequestKey(request, key)) {
    return null;
  }

  const limited = await atomicConsumeRateLimit(key);
  if (limited) {
    return rateLimitedResponse();
  }

  rememberRequestKey(request, key);
  return null;
}

/**
 * Consume one rate limit token keyed on authenticated user ID.
 * Use for authenticated API endpoints where IP-based limiting is insufficient
 * (shared IPs, VPNs). Returns a 429 response if rate limited, or null if allowed.
 */
export async function consumeUserApiRateLimit(
  request: NextRequest,
  userId: string,
  endpoint: string,
): Promise<NextResponse | null> {
  const key = `api:${endpoint}:user:${userId}`;

  if (hasConsumedRequestKey(request, key)) {
    return null;
  }

  const limited = await atomicConsumeRateLimit(key);
  if (limited) {
    return rateLimitedResponse();
  }

  rememberRequestKey(request, key);
  return null;
}

/**
 * Check and record a rate limit for a server action.
 * Keyed on userId + actionName so each user has their own counter.
 * Returns { error: "rateLimited" } if the limit is exceeded, or null if allowed.
 */
export async function checkServerActionRateLimit(
  userId: string,
  actionName: string,
  maxRequests: number = 20,
  windowSeconds: number = 60,
): Promise<{ error: string } | null> {
  const key = `sa:${userId}:${actionName}`;
  const windowMs = windowSeconds * 1000;

  return execTransaction(async (tx) => {
    const now = Date.now();
    const [existing] = await tx
      .select()
      .from(rateLimits)
      .where(eq(rateLimits.key, key))
      .for("update")
      .limit(1);

    let attempts: number;
    let windowStartedAt: number;
    let exists: boolean;

    if (!existing) {
      attempts = 0;
      windowStartedAt = now;
      exists = false;
    } else if (existing.windowStartedAt + windowMs <= now) {
      attempts = 0;
      windowStartedAt = now;
      exists = true;
    } else {
      attempts = existing.attempts;
      windowStartedAt = existing.windowStartedAt;
      exists = true;
    }

    if (attempts >= maxRequests) {
      return { error: "rateLimited" };
    }

    const newAttempts = attempts + 1;

    if (exists) {
      await tx.update(rateLimits)
        .set({ attempts: newAttempts, windowStartedAt, lastAttempt: now })
        .where(eq(rateLimits.key, key));
    } else {
      await tx.insert(rateLimits)
        .values({
          id: nanoid(),
          key,
          attempts: newAttempts,
          windowStartedAt,
          blockedUntil: null,
          consecutiveBlocks: 0,
          lastAttempt: now,
        });
    }

    return null;
  });
}
