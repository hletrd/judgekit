import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { getRateLimitKeyMock, dbMock, execTransactionMock } = vi.hoisted(() => {
  const dbMock = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  };
  return {
    getRateLimitKeyMock: vi.fn(),
    dbMock,
    // execTransaction runs the callback with the db mock as the transaction client
    execTransactionMock: vi.fn(async (fn: (tx: typeof dbMock) => unknown) => fn(dbMock)),
  };
});

vi.mock("@/lib/security/rate-limit", () => ({
  getRateLimitKey: getRateLimitKeyMock,
}));

vi.mock("@/lib/db", () => ({
  db: dbMock,
  execTransaction: execTransactionMock,
}));

vi.mock("@/lib/system-settings-config", () => ({
  getConfiguredSettings: () => ({
    apiRateLimitMax: 2,
    apiRateLimitWindowMs: 60_000,
  }),
}));

vi.mock("nanoid", () => ({
  nanoid: vi.fn(() => "test-nanoid"),
}));

import { consumeApiRateLimit } from "@/lib/security/api-rate-limit";

function mockSelectResult(row: Record<string, unknown> | undefined) {
  const rows = row ? [row] : [];
  dbMock.select.mockReturnValue({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        for: vi.fn(() => ({
          limit: vi.fn(() => rows),
        })),
        limit: vi.fn(() => rows),
      })),
    })),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: select returns no existing row (new request)
  mockSelectResult(undefined);
  dbMock.insert.mockReturnValue({
    values: vi.fn(async () => undefined),
  });
  dbMock.update.mockReturnValue({
    set: vi.fn(() => ({
      where: vi.fn(async () => undefined),
    })),
  });
});

function createRequest() {
  return new NextRequest("https://example.com/api/v1/groups", {
    method: "POST",
    headers: {
      "x-forwarded-for": "198.51.100.8",
    },
  });
}

describe("consumeApiRateLimit", () => {
  it("returns null when the endpoint is still allowed", async () => {
    getRateLimitKeyMock.mockReturnValue("api:groups:198.51.100.8");

    const result = await consumeApiRateLimit(createRequest(), "groups");
    expect(result).toBeNull();
    expect(getRateLimitKeyMock).toHaveBeenCalledWith(
      "api:groups",
      expect.any(Headers)
    );
    expect(dbMock.insert).toHaveBeenCalled();
  });

  it("returns a 429 response when the request is already rate limited", async () => {
    getRateLimitKeyMock.mockReturnValue("api:groups:198.51.100.8");
    // Simulate an existing entry that is blocked
    mockSelectResult({
      key: "api:groups:198.51.100.8",
      attempts: 120,
      windowStartedAt: Date.now(),
      blockedUntil: Date.now() + 60000,
      consecutiveBlocks: 1,
      lastAttempt: Date.now(),
    });

    const response = await consumeApiRateLimit(createRequest(), "groups");

    expect(response?.status).toBe(429);
    expect(response?.headers.get("Retry-After")).toBe("60");
    await expect(response?.json()).resolves.toEqual({ error: "rateLimited" });
  });

  it("does not double-count the same request key", async () => {
    getRateLimitKeyMock.mockReturnValue("api:groups:198.51.100.8");
    const request = createRequest();

    await consumeApiRateLimit(request, "groups");
    // Second call with same request object: key already consumed, returns null without recording
    await consumeApiRateLimit(request, "groups");

    // transaction is only called once (dedup via WeakMap)
    expect(dbMock.insert).toHaveBeenCalledTimes(1);
  });
});
