import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  getApiUserMock,
  csrfForbiddenMock,
  consumeApiRateLimitMock,
  resolveCapabilitiesMock,
  verifyPasswordMock,
  dbSelectMock,
  readJsonBodyWithLimitMock,
} = vi.hoisted(() => ({
  getApiUserMock: vi.fn(),
  csrfForbiddenMock: vi.fn(),
  consumeApiRateLimitMock: vi.fn(),
  resolveCapabilitiesMock: vi.fn(),
  verifyPasswordMock: vi.fn(),
  dbSelectMock: vi.fn(),
  readJsonBodyWithLimitMock: vi.fn(),
}));

vi.mock("@/lib/api/auth", () => ({
  getApiUser: getApiUserMock,
  unauthorized: () => new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 }),
  forbidden: () => new Response(JSON.stringify({ error: "forbidden" }), { status: 403 }),
  csrfForbidden: csrfForbiddenMock,
}));

vi.mock("@/lib/security/api-rate-limit", () => ({
  consumeApiRateLimit: consumeApiRateLimitMock,
}));

vi.mock("@/lib/capabilities/cache", () => ({
  resolveCapabilities: resolveCapabilitiesMock,
}));

vi.mock("@/lib/security/password-hash", () => ({
  verifyPassword: verifyPasswordMock,
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: dbSelectMock,
  },
}));

vi.mock("drizzle-orm", async () => {
  const actual = await vi.importActual<typeof import("drizzle-orm")>("drizzle-orm");
  return {
    ...actual,
    eq: vi.fn((_field: unknown, value: unknown) => ({ _eq: value })),
  };
});

vi.mock("@/lib/db/export", () => ({
  streamDatabaseExport: vi.fn(() => new ReadableStream()),
  validateExport: vi.fn(() => []),
}));

vi.mock("@/lib/db/import", () => ({
  importDatabase: vi.fn(),
}));

vi.mock("@/lib/db/import-transfer", () => ({
  MAX_IMPORT_BYTES: 1024 * 1024,
  readJsonBodyWithLimit: readJsonBodyWithLimitMock,
  readUploadedJsonFileWithLimit: vi.fn(async () => ({
    version: 1,
    exportedAt: "2026-04-12T00:00:00.000Z",
    sourceDialect: "postgresql",
    appVersion: "test",
    tables: {},
  })),
}));

vi.mock("@/lib/audit/events", () => ({
  recordAuditEvent: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn() },
}));

function makeLimitChain(rows: unknown[]) {
  return {
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn().mockResolvedValue(rows),
      })),
    })),
  };
}

function makeJsonRequest(url: string, body: unknown) {
  return new NextRequest(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: JSON.stringify(body),
  });
}

function makeFormRequest(url: string, formData: FormData) {
  return new NextRequest(url, {
    method: "POST",
    headers: {
      "X-Requested-With": "XMLHttpRequest",
    },
    body: formData,
  });
}

describe("destructive backup/import route password confirmation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getApiUserMock.mockResolvedValue({
      id: "admin-1",
      role: "admin",
      username: "admin",
      email: "admin@example.com",
      name: "Admin",
      className: null,
      mustChangePassword: false,
    });
    csrfForbiddenMock.mockReturnValue(null);
    consumeApiRateLimitMock.mockResolvedValue(null);
    resolveCapabilitiesMock.mockResolvedValue(new Set(["system.backup"]));
    verifyPasswordMock.mockResolvedValue({ valid: false });
    dbSelectMock.mockReturnValue(makeLimitChain([{ passwordHash: "stored-hash" }]));
    readJsonBodyWithLimitMock.mockResolvedValue({
      password: "wrong-password",
      data: {
        version: 1,
        exportedAt: "2026-04-12T00:00:00.000Z",
        sourceDialect: "postgresql",
        appVersion: "test",
        tables: {},
      },
    });
  });

  it("requires password confirmation for POST /api/v1/admin/backup", async () => {
    const { POST } = await import("@/app/api/v1/admin/backup/route");
    const res = await POST(makeJsonRequest("http://localhost:3000/api/v1/admin/backup", {}));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("passwordRequired");
  });

  it("rejects invalid password for POST /api/v1/admin/backup", async () => {
    const { POST } = await import("@/app/api/v1/admin/backup/route");
    const res = await POST(
      makeJsonRequest("http://localhost:3000/api/v1/admin/backup", { password: "wrong-password" })
    );
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe("invalidPassword");
  });

  it("requires password confirmation for POST /api/v1/admin/migrate/export", async () => {
    const { POST } = await import("@/app/api/v1/admin/migrate/export/route");
    const res = await POST(makeJsonRequest("http://localhost:3000/api/v1/admin/migrate/export", {}));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("passwordRequired");
  });

  it("rejects invalid password for POST /api/v1/admin/migrate/export", async () => {
    const { POST } = await import("@/app/api/v1/admin/migrate/export/route");
    const res = await POST(
      makeJsonRequest("http://localhost:3000/api/v1/admin/migrate/export", { password: "wrong-password" })
    );
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe("invalidPassword");
  });

  it("requires password confirmation for POST /api/v1/admin/restore", async () => {
    const { POST } = await import("@/app/api/v1/admin/restore/route");
    const form = new FormData();
    form.set("file", new File(["{}"], "backup.json", { type: "application/json" }));
    const res = await POST(makeFormRequest("http://localhost:3000/api/v1/admin/restore", form));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("passwordRequired");
  });

  it("rejects invalid password for POST /api/v1/admin/restore", async () => {
    const { POST } = await import("@/app/api/v1/admin/restore/route");
    const form = new FormData();
    form.set("password", "wrong-password");
    form.set("file", new File(["{}"], "backup.json", { type: "application/json" }));
    const res = await POST(makeFormRequest("http://localhost:3000/api/v1/admin/restore", form));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe("invalidPassword");
  });

  it("requires password confirmation for POST /api/v1/admin/migrate/import JSON payloads", async () => {
    readJsonBodyWithLimitMock.mockResolvedValue({
      data: {
        version: 1,
        exportedAt: "2026-04-12T00:00:00.000Z",
        sourceDialect: "postgresql",
        appVersion: "test",
        tables: {},
      },
    });

    const { POST } = await import("@/app/api/v1/admin/migrate/import/route");
    const res = await POST(makeJsonRequest("http://localhost:3000/api/v1/admin/migrate/import", {}));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("passwordRequired");
  });

  it("rejects invalid password for POST /api/v1/admin/migrate/import JSON payloads", async () => {
    const { POST } = await import("@/app/api/v1/admin/migrate/import/route");
    const res = await POST(
      makeJsonRequest("http://localhost:3000/api/v1/admin/migrate/import", { password: "wrong-password" })
    );
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe("invalidPassword");
  });
});
