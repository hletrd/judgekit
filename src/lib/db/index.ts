import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema.pg";
import * as relations from "./relations.pg";

const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

/**
 * The active database dialect. Always "postgresql".
 */
export const activeDialect = "postgresql" as const;

// --- PostgreSQL connection ---

let _pool: Pool | null = null;
let db: ReturnType<typeof drizzle>;

if (isBuildPhase) {
  // During build phase, create a dummy drizzle instance for type-checking.
  // No actual DB connection is made.
  db = drizzle("postgres://build:build@localhost:5432/build", {
    schema: { ...schema, ...relations },
  });
} else {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");

  _pool = new Pool({ connectionString: url });
  db = drizzle(_pool, { schema: { ...schema, ...relations } });
}

/**
 * Connection pool for PostgreSQL.
 */
export const pool: Pool | null = _pool;

/** @deprecated SQLite support removed. Always null. */
export const sqlite: any = null;

/**
 * Run a function. For PostgreSQL, individual SQL statements are already
 * atomic, so this is a simple passthrough. Use db.transaction() for
 * multi-statement transactions.
 */
export function execTransaction<T>(fn: () => T): T {
  return fn();
}

export { db };
export type DbType = typeof db;
