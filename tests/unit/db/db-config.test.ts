import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("DB Config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("getDialect", () => {
    it("defaults to sqlite when DB_DIALECT is not set", async () => {
      delete process.env.DB_DIALECT;
      const { getDialect, _resetDialectCache } = await import("@/lib/db/config");
      _resetDialectCache();
      expect(getDialect()).toBe("sqlite");
    });

    it("returns postgresql when DB_DIALECT=postgresql", async () => {
      process.env.DB_DIALECT = "postgresql";
      const { getDialect, _resetDialectCache } = await import("@/lib/db/config");
      _resetDialectCache();
      expect(getDialect()).toBe("postgresql");
    });

    it("returns mysql when DB_DIALECT=mysql", async () => {
      process.env.DB_DIALECT = "mysql";
      const { getDialect, _resetDialectCache } = await import("@/lib/db/config");
      _resetDialectCache();
      expect(getDialect()).toBe("mysql");
    });

    it("is case-insensitive", async () => {
      process.env.DB_DIALECT = "PostgreSQL";
      const { getDialect, _resetDialectCache } = await import("@/lib/db/config");
      _resetDialectCache();
      expect(getDialect()).toBe("postgresql");
    });

    it("trims whitespace", async () => {
      process.env.DB_DIALECT = "  sqlite  ";
      const { getDialect, _resetDialectCache } = await import("@/lib/db/config");
      _resetDialectCache();
      expect(getDialect()).toBe("sqlite");
    });

    it("throws on invalid dialect", async () => {
      process.env.DB_DIALECT = "oracle";
      const { getDialect, _resetDialectCache } = await import("@/lib/db/config");
      _resetDialectCache();
      expect(() => getDialect()).toThrow('Invalid DB_DIALECT "oracle"');
    });
  });

  describe("getConnectionConfig", () => {
    it("returns sqlite config with default path", async () => {
      delete process.env.DB_DIALECT;
      delete process.env.DATABASE_PATH;
      const { getConnectionConfig, _resetDialectCache } = await import("@/lib/db/config");
      _resetDialectCache();
      const config = getConnectionConfig();
      expect(config.dialect).toBe("sqlite");
      expect((config as any).path).toBe("data/judge.db");
    });

    it("returns sqlite config with custom path", async () => {
      delete process.env.DB_DIALECT;
      process.env.DATABASE_PATH = "/custom/path.db";
      const { getConnectionConfig, _resetDialectCache } = await import("@/lib/db/config");
      _resetDialectCache();
      const config = getConnectionConfig();
      expect(config.dialect).toBe("sqlite");
      expect((config as any).path).toBe("/custom/path.db");
    });

    it("returns postgresql config with DATABASE_URL", async () => {
      process.env.DB_DIALECT = "postgresql";
      process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/testdb";
      const { getConnectionConfig, _resetDialectCache } = await import("@/lib/db/config");
      _resetDialectCache();
      const config = getConnectionConfig();
      expect(config.dialect).toBe("postgresql");
      expect((config as any).url).toBe("postgres://user:pass@localhost:5432/testdb");
    });

    it("throws if postgresql without DATABASE_URL", async () => {
      process.env.DB_DIALECT = "postgresql";
      delete process.env.DATABASE_URL;
      const { getConnectionConfig, _resetDialectCache } = await import("@/lib/db/config");
      _resetDialectCache();
      expect(() => getConnectionConfig()).toThrow("DATABASE_URL is required");
    });

    it("returns mysql config with DATABASE_URL", async () => {
      process.env.DB_DIALECT = "mysql";
      process.env.DATABASE_URL = "mysql://user:pass@localhost:3306/testdb";
      const { getConnectionConfig, _resetDialectCache } = await import("@/lib/db/config");
      _resetDialectCache();
      const config = getConnectionConfig();
      expect(config.dialect).toBe("mysql");
      expect((config as any).url).toBe("mysql://user:pass@localhost:3306/testdb");
    });

    it("throws if mysql without DATABASE_URL", async () => {
      process.env.DB_DIALECT = "mysql";
      delete process.env.DATABASE_URL;
      const { getConnectionConfig, _resetDialectCache } = await import("@/lib/db/config");
      _resetDialectCache();
      expect(() => getConnectionConfig()).toThrow("DATABASE_URL is required");
    });
  });

  describe("convenience helpers", () => {
    it("isSqlite returns true for sqlite dialect", async () => {
      delete process.env.DB_DIALECT;
      const { isSqlite, _resetDialectCache } = await import("@/lib/db/config");
      _resetDialectCache();
      expect(isSqlite()).toBe(true);
    });

    it("isPostgresql returns true for postgresql dialect", async () => {
      process.env.DB_DIALECT = "postgresql";
      const { isPostgresql, _resetDialectCache } = await import("@/lib/db/config");
      _resetDialectCache();
      expect(isPostgresql()).toBe(true);
    });

    it("isMysql returns true for mysql dialect", async () => {
      process.env.DB_DIALECT = "mysql";
      const { isMysql, _resetDialectCache } = await import("@/lib/db/config");
      _resetDialectCache();
      expect(isMysql()).toBe(true);
    });
  });
});
