import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { getRateLimitKeyMock, dbMock } = vi.hoisted(() => {
  const txMock = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  };
  return {
    getRateLimitKeyMock: vi.fn(),
    dbMock: {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      transaction: vi.fn(async (cb: (tx: typeof txMock) => Promise<unknown>) => cb(txMock)),
      _tx: txMock,
    },
  };
});

vi.mock("@/lib/security/rate-limit", () => ({
  getRateLimitKey: getRateLimitKeyMock,
}));

vi.mock("@/lib/db", () => ({
  db: dbMock,
}));

vi.mock("nanoid", () => ({
  nanoid: vi.fn(() => "test-nanoid"),
}));

import { consumeApiRateLimit } from "@/lib/security/api-rate-limit";

function mockTxSelectResult(row: Record<string, unknown> | undefined) {
  const rows = row ? [row] : [];
  dbMock._tx.select.mockReturnValue({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn(() => rows),
      })),
    })),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: tx.select returns no existing row (new request)
  mockTxSelectResult(undefined);
  dbMock._tx.insert.mockReturnValue({
    values: vi.fn(() => ({ run: vi.fn() })),
  });
  dbMock._tx.update.mockReturnValue({
    set: vi.fn(() => ({
      where: vi.fn(() => ({ run: vi.fn() })),
    })),
  });
  dbMock.transaction.mockImplementation(async (cb: any) => cb(dbMock._tx));
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
    // atomicConsumeRateLimit inserts via tx for new keys
    expect(dbMock._tx.insert).toHaveBeenCalled();
  });

  it("returns a 429 response when the request is already rate limited", async () => {
    getRateLimitKeyMock.mockReturnValue("api:groups:198.51.100.8");
    // Simulate an existing entry that is blocked
    mockTxSelectResult({
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
    expect(dbMock.transaction).toHaveBeenCalledTimes(1);
  });
});
