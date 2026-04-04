import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import * as relations from "./relations";
import { getDialect } from "./config";
import type { DbDialect } from "./config";
import path from "path";
import fs from "fs";

const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

/**
 * The active database dialect. Determined at startup from DB_DIALECT env var.
 * Defaults to "sqlite" during build phase.
 */
export const activeDialect: DbDialect = isBuildPhase ? "sqlite" : getDialect();

// --- SQLite (default, compile-time types) ---

const dbPath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(process.cwd(), "data", "judge.db");

let sqlite: Database.Database;

if (activeDialect === "sqlite") {
  if (isBuildPhase) {
    sqlite = new Database(":memory:");
  } else {
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
    }
    sqlite = new Database(dbPath);
  }

  sqlite.pragma("busy_timeout = 5000");
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("synchronous = NORMAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("wal_autocheckpoint = 100");
} else {
  // Dummy instance for non-SQLite — never used at runtime
  sqlite = null as unknown as Database.Database;
}

/**
 * The Drizzle ORM database instance.
 *
 * At compile time this is always typed as the SQLite Drizzle instance.
 * At runtime, when DB_DIALECT is "postgresql" or "mysql", this is replaced
 * with the appropriate driver's Drizzle instance. The query builder API
 * is compatible across all dialects.
 */
let db = drizzle(activeDialect === "sqlite" ? sqlite : new Database(":memory:"), {
  schema: { ...schema, ...relations },
});

// Runtime override for non-SQLite dialects (dynamic imports to avoid bundling unused drivers)
let _pool: any = null;

if (activeDialect === "postgresql" && !isBuildPhase) {
  const [{ Pool }, { drizzle: pgDrizzle }, pgSchema, pgRelations] = await Promise.all([
    import("pg"),
    import("drizzle-orm/node-postgres"),
    import("./schema.pg"),
    import("./relations.pg"),
  ]);

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required when DB_DIALECT=postgresql");

  _pool = new Pool({ connectionString: url });
  db = pgDrizzle(_pool, { schema: { ...pgSchema, ...pgRelations } }) as unknown as typeof db;
} else if (activeDialect === "mysql" && !isBuildPhase) {
  const [mysql2, { drizzle: mysqlDrizzle }, mysqlSchema, mysqlRelations] = await Promise.all([
    import("mysql2/promise"),
    import("drizzle-orm/mysql2"),
    import("./schema.mysql"),
    import("./relations.mysql"),
  ]);

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required when DB_DIALECT=mysql");

  _pool = mysql2.createPool(url);
  db = mysqlDrizzle(_pool, { schema: { ...mysqlSchema, ...mysqlRelations }, mode: "default" }) as unknown as typeof db;
}

/**
 * Connection pool for PostgreSQL/MySQL. Null for SQLite.
 */
export const pool: any = _pool;

/**
 * Run a function inside a SQLite transaction using explicit BEGIN/COMMIT.
 *
 * better-sqlite3's `sqlite.transaction()` throws when the callback returns a
 * Promise.  Turbopack converts modules with top-level `await` into async
 * modules, which can cause arrow-function callbacks to become async and
 * implicitly return a Promise.  This helper avoids that by using raw SQL
 * BEGIN/COMMIT instead of the `transaction()` wrapper.
 */
export function execTransaction<T>(fn: () => T): T {
  sqlite.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    sqlite.exec("COMMIT");
    return result;
  } catch (e) {
    sqlite.exec("ROLLBACK");
    throw e;
  }
}

export { db, sqlite };
export type DbType = typeof db;

// Set file permissions for SQLite
if (activeDialect === "sqlite" && !isBuildPhase) {
  try {
    for (const ext of ["", "-wal", "-shm"]) {
      const p = dbPath + ext;
      if (fs.existsSync(p)) {
        fs.chmodSync(p, 0o600);
      }
    }
  } catch {
    // non-fatal
  }
}
