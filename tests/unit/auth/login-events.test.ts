import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  dbInsertValues: vi.fn<(...args: unknown[]) => Promise<void>>(),
  normalizeText: vi.fn((text: unknown, _max: number) => (text == null ? null : String(text))),
  getClientIp: vi.fn(() => "127.0.0.1"),
  getRequestPath: vi.fn(() => "/login"),
  MAX_PATH_LENGTH: 256,
  loggerWarn: vi.fn(),
  loggerError: vi.fn(),
  loggerInfo: vi.fn(),
  loggerDebug: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn(() => ({
      values: mocks.dbInsertValues,
    })),
  },
}));

vi.mock("@/lib/db/schema", () => ({
  loginEvents: { id: "loginEvents.id" },
}));

vi.mock("@/lib/security/request-context", () => ({
  normalizeText: mocks.normalizeText,
  getClientIp: mocks.getClientIp,
  getRequestPath: mocks.getRequestPath,
  MAX_PATH_LENGTH: mocks.MAX_PATH_LENGTH,
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: mocks.loggerError,
    warn: mocks.loggerWarn,
    info: mocks.loggerInfo,
    debug: mocks.loggerDebug,
  },
}));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mocks.dbInsertValues.mockResolvedValue(undefined);
  mocks.normalizeText.mockImplementation((text: unknown, _max: number) =>
    text == null ? null : String(text)
  );
  mocks.getClientIp.mockReturnValue("127.0.0.1");
  mocks.getRequestPath.mockReturnValue("/login");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("sanitizeLoginEventContext", () => {
  it("normalizes attemptedIdentifier to max length", async () => {
    const { sanitizeLoginEventContext } = await import("@/lib/auth/login-events");
    mocks.normalizeText.mockImplementation((text: unknown, max: number) =>
      text == null ? null : String(text).slice(0, max)
    );

    const result = sanitizeLoginEventContext({
      attemptedIdentifier: "user@example.com",
      ipAddress: null,
      userAgent: null,
      requestMethod: null,
      requestPath: null,
    });

    expect(mocks.normalizeText).toHaveBeenCalledWith("user@example.com", 320);
    expect(result.attemptedIdentifier).toBe("user@example.com");
  });

  it("normalizes ipAddress", async () => {
    const { sanitizeLoginEventContext } = await import("@/lib/auth/login-events");

    const result = sanitizeLoginEventContext({
      ipAddress: "192.168.0.1",
    });

    expect(mocks.normalizeText).toHaveBeenCalledWith("192.168.0.1", 128);
    expect(result.ipAddress).toBe("192.168.0.1");
  });

  it("uppercases requestMethod", async () => {
    const { sanitizeLoginEventContext } = await import("@/lib/auth/login-events");

    const result = sanitizeLoginEventContext({
      requestMethod: "post",
    });

    expect(result.requestMethod).toBe("POST");
  });

  it("returns null for undefined fields", async () => {
    const { sanitizeLoginEventContext } = await import("@/lib/auth/login-events");

    const result = sanitizeLoginEventContext({});

    expect(result.attemptedIdentifier).toBeNull();
    expect(result.ipAddress).toBeNull();
    expect(result.userAgent).toBeNull();
    expect(result.requestMethod).toBeNull();
    expect(result.requestPath).toBeNull();
  });
});

describe("buildLoginEventContext", () => {
  it("builds context from request headers", async () => {
    const { buildLoginEventContext } = await import("@/lib/auth/login-events");
    mocks.getClientIp.mockReturnValue("10.0.0.5");
    mocks.getRequestPath.mockReturnValue("/api/auth/login");

    const hdrs = new Headers({ "user-agent": "TestClient/2.0" });
    const result = buildLoginEventContext(
      { headers: hdrs, method: "POST", url: "http://localhost/api/auth/login" },
    );

    expect(mocks.getClientIp).toHaveBeenCalledWith(hdrs);
    expect(mocks.getRequestPath).toHaveBeenCalledWith("http://localhost/api/auth/login");
    expect(result.ipAddress).toBe("10.0.0.5");
    expect(result.requestPath).toBe("/api/auth/login");
    expect(result.requestMethod).toBe("POST");
  });

  it("includes attemptedIdentifier when provided", async () => {
    const { buildLoginEventContext } = await import("@/lib/auth/login-events");

    const hdrs = new Headers();
    const result = buildLoginEventContext(
      { headers: hdrs, method: "POST", url: "http://localhost/login" },
      "alice@example.com"
    );

    expect(mocks.normalizeText).toHaveBeenCalledWith("alice@example.com", 320);
    expect(result.attemptedIdentifier).toBe("alice@example.com");
  });
});

describe("getLoginEventContextFromUser", () => {
  it("returns loginEventContext when present on user object", async () => {
    const { getLoginEventContextFromUser } = await import("@/lib/auth/login-events");

    const ctx = {
      attemptedIdentifier: "alice",
      ipAddress: "1.2.3.4",
      userAgent: "UA",
      requestMethod: "POST",
      requestPath: "/login",
    };
    const user = { id: "user-1", loginEventContext: ctx };

    const result = getLoginEventContextFromUser(user);
    expect(result).toBe(ctx);
  });

  it("returns null when user is null", async () => {
    const { getLoginEventContextFromUser } = await import("@/lib/auth/login-events");
    expect(getLoginEventContextFromUser(null)).toBeNull();
  });

  it("returns null when user is undefined", async () => {
    const { getLoginEventContextFromUser } = await import("@/lib/auth/login-events");
    expect(getLoginEventContextFromUser(undefined)).toBeNull();
  });

  it("returns null when user has no loginEventContext", async () => {
    const { getLoginEventContextFromUser } = await import("@/lib/auth/login-events");
    expect(getLoginEventContextFromUser({ id: "user-1" })).toBeNull();
  });
});

describe("recordLoginEvent", () => {
  it("calls recordLoginEventWithContext with built context", async () => {
    const { recordLoginEvent } = await import("@/lib/auth/login-events");
    const { db } = await import("@/lib/db");

    mocks.getClientIp.mockReturnValue("5.6.7.8");
    mocks.getRequestPath.mockReturnValue("/api/login");

    const hdrs = new Headers({ "user-agent": "BrowserX" });
    recordLoginEvent({
      outcome: "success",
      attemptedIdentifier: "bob@example.com",
      userId: "user-42",
      request: { headers: hdrs, method: "POST", url: "http://localhost/api/login" },
    });
    await Promise.resolve();

    expect(db.insert).toHaveBeenCalled();
    expect(mocks.dbInsertValues).toHaveBeenCalledWith({
      outcome: "success",
      attemptedIdentifier: "bob@example.com",
      userId: "user-42",
      ipAddress: "5.6.7.8",
      userAgent: "BrowserX",
      requestMethod: "POST",
      requestPath: "/api/login",
    });
  });

  it("handles DB write failure gracefully without throwing", async () => {
    const { recordLoginEvent } = await import("@/lib/auth/login-events");

    mocks.dbInsertValues.mockRejectedValueOnce(new Error("db error"));

    const hdrs = new Headers();
    expect(() =>
      recordLoginEvent({
        outcome: "invalid_credentials",
        request: { headers: hdrs, method: "POST", url: "http://localhost/login" },
      })
    ).not.toThrow();

    await Promise.resolve();
    expect(mocks.loggerWarn).toHaveBeenCalled();
  });
});

describe("recordLoginEventWithContext", () => {
  it("inserts login event with all fields", async () => {
    const { recordLoginEventWithContext } = await import("@/lib/auth/login-events");
    const { db } = await import("@/lib/db");

    const context = {
      attemptedIdentifier: "charlie@example.com",
      ipAddress: "9.9.9.9",
      userAgent: "TestAgent/3.0",
      requestMethod: "POST",
      requestPath: "/auth/login",
    };

    recordLoginEventWithContext({
      outcome: "success",
      userId: "user-99",
      context,
    });
    await Promise.resolve();

    expect(db.insert).toHaveBeenCalled();
    expect(mocks.dbInsertValues).toHaveBeenCalledWith({
      outcome: "success",
      attemptedIdentifier: "charlie@example.com",
      userId: "user-99",
      ipAddress: "9.9.9.9",
      userAgent: "TestAgent/3.0",
      requestMethod: "POST",
      requestPath: "/auth/login",
    });
  });

  it("handles DB errors without throwing", async () => {
    const { recordLoginEventWithContext } = await import("@/lib/auth/login-events");

    mocks.dbInsertValues.mockRejectedValueOnce(new Error("insert failed"));

    const context = {
      attemptedIdentifier: null,
      ipAddress: "1.1.1.1",
      userAgent: null,
      requestMethod: "POST",
      requestPath: "/login",
    };

    expect(() =>
      recordLoginEventWithContext({
        outcome: "rate_limited",
        userId: null,
        context,
      })
    ).not.toThrow();

    await Promise.resolve();
    expect(mocks.loggerWarn).toHaveBeenCalled();
  });
});
