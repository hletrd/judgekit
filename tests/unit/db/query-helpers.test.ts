import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db/index module to avoid actually connecting
vi.mock("@/lib/db/index", () => ({
  activeDialect: "sqlite",
  sqlite: null,
  pool: null,
}));

describe("Query Helpers", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe("nowMs", () => {
    it("returns SQLite expression for sqlite dialect", async () => {
      vi.doMock("@/lib/db/index", () => ({ activeDialect: "sqlite", sqlite: null, pool: null }));
      const { nowMs } = await import("@/lib/db/queries");
      expect(nowMs()).toBe("unixepoch('now') * 1000");
    });

    it("returns PostgreSQL expression for postgresql dialect", async () => {
      vi.doMock("@/lib/db/index", () => ({ activeDialect: "postgresql", sqlite: null, pool: null }));
      const { nowMs } = await import("@/lib/db/queries");
      expect(nowMs()).toBe("(EXTRACT(EPOCH FROM NOW()) * 1000)::bigint");
    });

    it("returns MySQL expression for mysql dialect", async () => {
      vi.doMock("@/lib/db/index", () => ({ activeDialect: "mysql", sqlite: null, pool: null }));
      const { nowMs } = await import("@/lib/db/queries");
      expect(nowMs()).toBe("UNIX_TIMESTAMP() * 1000");
    });
  });

  describe("deterministicOrder", () => {
    it("returns rowid for sqlite", async () => {
      vi.doMock("@/lib/db/index", () => ({ activeDialect: "sqlite", sqlite: null, pool: null }));
      const { deterministicOrder } = await import("@/lib/db/queries");
      expect(deterministicOrder()).toBe("rowid ASC");
    });

    it("returns id column for postgresql", async () => {
      vi.doMock("@/lib/db/index", () => ({ activeDialect: "postgresql", sqlite: null, pool: null }));
      const { deterministicOrder } = await import("@/lib/db/queries");
      expect(deterministicOrder()).toBe("id ASC");
    });

    it("returns id column for mysql", async () => {
      vi.doMock("@/lib/db/index", () => ({ activeDialect: "mysql", sqlite: null, pool: null }));
      const { deterministicOrder } = await import("@/lib/db/queries");
      expect(deterministicOrder()).toBe("id ASC");
    });

    it("uses custom column name", async () => {
      vi.doMock("@/lib/db/index", () => ({ activeDialect: "postgresql", sqlite: null, pool: null }));
      const { deterministicOrder } = await import("@/lib/db/queries");
      expect(deterministicOrder("submission_id")).toBe("submission_id ASC");
    });
  });

  describe("countTablesQuery", () => {
    it("uses sqlite_master for sqlite", async () => {
      vi.doMock("@/lib/db/index", () => ({ activeDialect: "sqlite", sqlite: null, pool: null }));
      const { countTablesQuery } = await import("@/lib/db/queries");
      expect(countTablesQuery()).toContain("sqlite_master");
    });

    it("uses information_schema for postgresql", async () => {
      vi.doMock("@/lib/db/index", () => ({ activeDialect: "postgresql", sqlite: null, pool: null }));
      const { countTablesQuery } = await import("@/lib/db/queries");
      expect(countTablesQuery()).toContain("information_schema.tables");
      expect(countTablesQuery()).toContain("public");
    });

    it("uses information_schema for mysql", async () => {
      vi.doMock("@/lib/db/index", () => ({ activeDialect: "mysql", sqlite: null, pool: null }));
      const { countTablesQuery } = await import("@/lib/db/queries");
      expect(countTablesQuery()).toContain("information_schema.tables");
      expect(countTablesQuery()).toContain("DATABASE()");
    });
  });

  describe("rawQueryOne", () => {
    it("uses sqlite.prepare().get() for sqlite", async () => {
      const mockGet = vi.fn().mockReturnValue({ id: "1" });
      const mockPrepare = vi.fn().mockReturnValue({ get: mockGet });
      vi.doMock("@/lib/db/index", () => ({
        activeDialect: "sqlite",
        sqlite: { prepare: mockPrepare },
        pool: null,
      }));
      const { rawQueryOne } = await import("@/lib/db/queries");
      const result = await rawQueryOne("SELECT * FROM users WHERE id = @id", { id: "1" });
      expect(mockPrepare).toHaveBeenCalledWith("SELECT * FROM users WHERE id = @id");
      expect(mockGet).toHaveBeenCalledWith({ id: "1" });
      expect(result).toEqual({ id: "1" });
    });

    it("uses pool.query() for postgresql with positional params", async () => {
      const mockQuery = vi.fn().mockResolvedValue({ rows: [{ id: "1" }] });
      vi.doMock("@/lib/db/index", () => ({
        activeDialect: "postgresql",
        sqlite: null,
        pool: { query: mockQuery },
      }));
      const { rawQueryOne } = await import("@/lib/db/queries");
      const result = await rawQueryOne("SELECT * FROM users WHERE id = @id", { id: "1" });
      expect(mockQuery).toHaveBeenCalledWith("SELECT * FROM users WHERE id = $1", ["1"]);
      expect(result).toEqual({ id: "1" });
    });

    it("uses pool.query() for mysql with ? params", async () => {
      const mockQuery = vi.fn().mockResolvedValue([[{ id: "1" }]]);
      vi.doMock("@/lib/db/index", () => ({
        activeDialect: "mysql",
        sqlite: null,
        pool: { query: mockQuery },
      }));
      const { rawQueryOne } = await import("@/lib/db/queries");
      const result = await rawQueryOne("SELECT * FROM users WHERE id = @id", { id: "1" });
      expect(mockQuery).toHaveBeenCalledWith("SELECT * FROM users WHERE id = ?", ["1"]);
      expect(result).toEqual({ id: "1" });
    });

    it("throws when sqlite handle is missing", async () => {
      vi.doMock("@/lib/db/index", () => ({
        activeDialect: "sqlite",
        sqlite: null,
        pool: null,
      }));
      const { rawQueryOne } = await import("@/lib/db/queries");
      await expect(rawQueryOne("SELECT 1")).rejects.toThrow("SQLite handle not available");
    });
  });

  describe("rawQueryAll", () => {
    it("returns all rows for sqlite", async () => {
      const rows = [{ id: "1" }, { id: "2" }];
      const mockAll = vi.fn().mockReturnValue(rows);
      const mockPrepare = vi.fn().mockReturnValue({ all: mockAll });
      vi.doMock("@/lib/db/index", () => ({
        activeDialect: "sqlite",
        sqlite: { prepare: mockPrepare },
        pool: null,
      }));
      const { rawQueryAll } = await import("@/lib/db/queries");
      const result = await rawQueryAll("SELECT * FROM users");
      expect(result).toEqual(rows);
    });

    it("returns all rows for postgresql", async () => {
      const rows = [{ id: "1" }, { id: "2" }];
      const mockQuery = vi.fn().mockResolvedValue({ rows });
      vi.doMock("@/lib/db/index", () => ({
        activeDialect: "postgresql",
        sqlite: null,
        pool: { query: mockQuery },
      }));
      const { rawQueryAll } = await import("@/lib/db/queries");
      const result = await rawQueryAll("SELECT * FROM users");
      expect(result).toEqual(rows);
    });
  });

  describe("getActiveDialect", () => {
    it("returns the active dialect", async () => {
      vi.doMock("@/lib/db/index", () => ({
        activeDialect: "postgresql",
        sqlite: null,
        pool: null,
      }));
      const { getActiveDialect } = await import("@/lib/db/queries");
      expect(getActiveDialect()).toBe("postgresql");
    });
  });
});
