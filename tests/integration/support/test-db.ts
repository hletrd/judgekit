/**
 * In-memory SQLite test database helper.
 *
 * Integration tests in this repo were originally built around better-sqlite3.
 * That package is optional in the current workspace, so we detect it lazily and
 * allow suites to skip cleanly when the runtime is unavailable.
 */
import path from "node:path";
import { createRequire } from "node:module";
import * as schema from "@/lib/db/schema";
import * as relations from "@/lib/db/relations";

const require = createRequire(import.meta.url);

export const hasSqliteIntegrationSupport = (() => {
  try {
    require.resolve("better-sqlite3");
    require.resolve("drizzle-orm/better-sqlite3");
    require.resolve("drizzle-orm/better-sqlite3/migrator");
    return true;
  } catch {
    return false;
  }
})();

export type TestDb = {
  db: any;
  sqlite: any;
  cleanup: () => void;
};

export function createTestDb(): TestDb {
  if (!hasSqliteIntegrationSupport) {
    throw new Error("better-sqlite3 integration support is not installed");
  }

  const Database = require("better-sqlite3");
  const { drizzle } = require("drizzle-orm/better-sqlite3");
  const { migrate } = require("drizzle-orm/better-sqlite3/migrator");

  const sqlite = new Database(":memory:");
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  const db = drizzle(sqlite, { schema: { ...schema, ...relations } });

  const migrationsFolder = path.resolve(__dirname, "../../../drizzle/migrations");
  migrate(db, { migrationsFolder });

  return {
    db,
    sqlite,
    cleanup: () => sqlite.close(),
  };
}
