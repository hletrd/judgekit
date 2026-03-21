/**
 * Dialect-aware raw SQL query helpers.
 *
 * Abstracts SQLite-specific SQL patterns so the same logic
 * works across SQLite, PostgreSQL, and MySQL.
 */

import { activeDialect, sqlite, pool } from "./index";
import type { DbDialect } from "./config";

/**
 * Returns a SQL expression for "current time in milliseconds since epoch".
 */
export function nowMs(): string {
  switch (activeDialect) {
    case "sqlite":
      return "unixepoch('now') * 1000";
    case "postgresql":
      return "(EXTRACT(EPOCH FROM NOW()) * 1000)::bigint";
    case "mysql":
      return "UNIX_TIMESTAMP() * 1000";
  }
}

/**
 * Returns the ORDER BY clause for deterministic row ordering.
 * SQLite uses `rowid`, PostgreSQL/MySQL use the primary key `id`.
 */
export function deterministicOrder(idColumn: string = "id"): string {
  switch (activeDialect) {
    case "sqlite":
      return "rowid ASC";
    case "postgresql":
    case "mysql":
      return `${idColumn} ASC`;
  }
}

/**
 * Returns the SQL expression for counting tables in the database.
 */
export function countTablesQuery(): string {
  switch (activeDialect) {
    case "sqlite":
      return "SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'";
    case "postgresql":
      return "SELECT COUNT(*)::int AS count FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'";
    case "mysql":
      return "SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'";
  }
}

/**
 * Execute a raw SQL query that returns a single row.
 * Handles the sync (SQLite) vs async (PG/MySQL) difference.
 */
export async function rawQueryOne<T = Record<string, unknown>>(
  sql: string,
  params?: Record<string, unknown>
): Promise<T | undefined> {
  switch (activeDialect) {
    case "sqlite": {
      if (!sqlite) throw new Error("SQLite handle not available");
      const stmt = sqlite.prepare(sql);
      return params ? stmt.get(params) as T | undefined : stmt.get() as T | undefined;
    }
    case "postgresql": {
      if (!pool) throw new Error("PostgreSQL pool not available");
      // Convert named params (@name) to positional ($1, $2...)
      const { text, values } = namedToPositional(sql, params);
      const result = await pool.query(text, values);
      return result.rows[0] as T | undefined;
    }
    case "mysql": {
      if (!pool) throw new Error("MySQL pool not available");
      // Convert named params (@name) to positional (?)
      const { text: mysqlText, values: mysqlValues } = namedToPositionalMySQL(sql, params);
      const [rows] = await pool.query(mysqlText, mysqlValues);
      return (rows as T[])[0];
    }
  }
}

/**
 * Execute a raw SQL query that returns multiple rows.
 */
export async function rawQueryAll<T = Record<string, unknown>>(
  sql: string,
  params?: Record<string, unknown>
): Promise<T[]> {
  switch (activeDialect) {
    case "sqlite": {
      if (!sqlite) throw new Error("SQLite handle not available");
      const stmt = sqlite.prepare(sql);
      return (params ? stmt.all(params) : stmt.all()) as T[];
    }
    case "postgresql": {
      if (!pool) throw new Error("PostgreSQL pool not available");
      const { text, values } = namedToPositional(sql, params);
      const result = await pool.query(text, values);
      return result.rows as T[];
    }
    case "mysql": {
      if (!pool) throw new Error("MySQL pool not available");
      const { text: mysqlText, values: mysqlValues } = namedToPositionalMySQL(sql, params);
      const [rows] = await pool.query(mysqlText, mysqlValues);
      return rows as T[];
    }
  }
}

/**
 * Returns the current dialect.
 */
export function getActiveDialect(): DbDialect {
  return activeDialect;
}

// --- Internal helpers ---

/**
 * Convert SQLite-style named parameters (@name) to PostgreSQL positional ($1, $2...).
 */
function namedToPositional(
  sql: string,
  params?: Record<string, unknown>
): { text: string; values: unknown[] } {
  if (!params) return { text: sql, values: [] };

  const values: unknown[] = [];
  const paramNames: string[] = [];
  const text = sql.replace(/@(\w+)/g, (_, name) => {
    let idx = paramNames.indexOf(name);
    if (idx === -1) {
      paramNames.push(name);
      values.push(params[name]);
      idx = paramNames.length - 1;
    }
    return `$${idx + 1}`;
  });
  return { text, values };
}

/**
 * Convert SQLite-style named parameters (@name) to MySQL positional (?).
 */
function namedToPositionalMySQL(
  sql: string,
  params?: Record<string, unknown>
): { text: string; values: unknown[] } {
  if (!params) return { text: sql, values: [] };

  const values: unknown[] = [];
  const text = sql.replace(/@(\w+)/g, (_, name) => {
    values.push(params[name]);
    return "?";
  });
  return { text, values };
}
