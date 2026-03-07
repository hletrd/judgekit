import {
  LOGIN_RATE_LIMIT_BLOCK_MS,
  LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
  LOGIN_RATE_LIMIT_WINDOW_MS,
} from "@/lib/security/constants";

type RateLimitEntry = {
  attempts: number;
  windowStartedAt: number;
  blockedUntil: number;
};

declare global {
  var __onlineJudgeRateLimitStore: Map<string, RateLimitEntry> | undefined;
}

const rateLimitStore = globalThis.__onlineJudgeRateLimitStore ?? new Map<string, RateLimitEntry>();

if (!globalThis.__onlineJudgeRateLimitStore) {
  globalThis.__onlineJudgeRateLimitStore = rateLimitStore;
}

function getEntry(key: string) {
  const now = Date.now();
  const existing = rateLimitStore.get(key);

  if (!existing) {
    return {
      now,
      entry: {
        attempts: 0,
        windowStartedAt: now,
        blockedUntil: 0,
      },
    };
  }

  if (existing.windowStartedAt + LOGIN_RATE_LIMIT_WINDOW_MS <= now) {
    return {
      now,
      entry: {
        attempts: 0,
        windowStartedAt: now,
        blockedUntil: existing.blockedUntil > now ? existing.blockedUntil : 0,
      },
    };
  }

  return { now, entry: existing };
}

export function getRateLimitKey(action: string, headers: Headers) {
  const forwardedFor = headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();

  const realIp = headers.get("x-real-ip")?.trim();
  const clientIp = forwardedFor || realIp || "unknown";

  return `${action}:${clientIp}`;
}

export function isRateLimited(key: string) {
  const { now, entry } = getEntry(key);

  if (entry.blockedUntil > now) {
    rateLimitStore.set(key, entry);
    return true;
  }

  return false;
}

export function recordRateLimitFailure(key: string) {
  const { now, entry } = getEntry(key);
  const attempts = entry.attempts + 1;

  const nextEntry: RateLimitEntry = {
    attempts,
    windowStartedAt: entry.windowStartedAt,
    blockedUntil:
      attempts >= LOGIN_RATE_LIMIT_MAX_ATTEMPTS ? now + LOGIN_RATE_LIMIT_BLOCK_MS : entry.blockedUntil,
  };

  rateLimitStore.set(key, nextEntry);
}

export function clearRateLimit(key: string) {
  rateLimitStore.delete(key);
}
