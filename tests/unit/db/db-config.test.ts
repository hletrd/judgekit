import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
    it("always returns postgresql when DB_DIALECT is not set", async () => {
      delete process.env.DB_DIALECT;
      const { getDialect } = await import("@/lib/db/config");
      expect(getDialect()).toBe("postgresql");
    });

    it("returns postgresql when DB_DIALECT=postgresql", async () => {
      process.env.DB_DIALECT = "postgresql";
      const { getDialect } = await import("@/lib/db/config");
      expect(getDialect()).toBe("postgresql");
    });

    it("returns postgresql even when legacy DB_DIALECT values are present", async () => {
      process.env.DB_DIALECT = "mysql";
      const { getDialect } = await import("@/lib/db/config");
      expect(getDialect()).toBe("postgresql");
    });
  });

  describe("getConnectionConfig", () => {
    it("returns postgresql config with DATABASE_URL", async () => {
      process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/testdb";
      const { getConnectionConfig } = await import("@/lib/db/config");
      const config = getConnectionConfig();
      expect(config).toEqual({
        dialect: "postgresql",
        url: "postgres://user:pass@localhost:5432/testdb",
      });
    });

    it("throws without DATABASE_URL", async () => {
      delete process.env.DATABASE_URL;
      const { getConnectionConfig } = await import("@/lib/db/config");
      expect(() => getConnectionConfig()).toThrow("DATABASE_URL is required");
    });
  });

  describe("convenience helpers", () => {
    it("isSqlite always returns false", async () => {
      const { isSqlite } = await import("@/lib/db/config");
      expect(isSqlite()).toBe(false);
    });

    it("isPostgresql always returns true", async () => {
      const { isPostgresql } = await import("@/lib/db/config");
      expect(isPostgresql()).toBe(true);
    });

    it("isMysql always returns false", async () => {
      const { isMysql } = await import("@/lib/db/config");
      expect(isMysql()).toBe(false);
    });
  });
});
