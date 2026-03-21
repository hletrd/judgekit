/**
 * Database dialect configuration.
 *
 * Supported dialects:
 *   - sqlite (default) — file-based, zero-config
 *   - postgresql — requires DATABASE_URL
 *   - mysql — requires DATABASE_URL
 *
 * Set via DB_DIALECT environment variable.
 */

export type DbDialect = "sqlite" | "postgresql" | "mysql";

const VALID_DIALECTS = new Set<DbDialect>(["sqlite", "postgresql", "mysql"]);

let cachedDialect: DbDialect | null = null;

/**
 * Returns the configured database dialect.
 * Defaults to "sqlite" if DB_DIALECT is not set.
 */
export function getDialect(): DbDialect {
  if (cachedDialect) return cachedDialect;

  const raw = process.env.DB_DIALECT?.trim().toLowerCase() ?? "sqlite";
  if (!VALID_DIALECTS.has(raw as DbDialect)) {
    throw new Error(
      `Invalid DB_DIALECT "${raw}". Must be one of: ${[...VALID_DIALECTS].join(", ")}`
    );
  }
  cachedDialect = raw as DbDialect;
  return cachedDialect;
}

/**
 * Returns true if the current dialect is SQLite.
 */
export function isSqlite(): boolean {
  return getDialect() === "sqlite";
}

/**
 * Returns true if the current dialect is PostgreSQL.
 */
export function isPostgresql(): boolean {
  return getDialect() === "postgresql";
}

/**
 * Returns true if the current dialect is MySQL.
 */
export function isMysql(): boolean {
  return getDialect() === "mysql";
}

export type ConnectionConfig =
  | { dialect: "sqlite"; path: string }
  | { dialect: "postgresql"; url: string }
  | { dialect: "mysql"; url: string };

/**
 * Returns the connection configuration for the current dialect.
 */
export function getConnectionConfig(): ConnectionConfig {
  const dialect = getDialect();

  switch (dialect) {
    case "sqlite": {
      const path = process.env.DATABASE_PATH ?? "data/judge.db";
      return { dialect, path };
    }
    case "postgresql":
    case "mysql": {
      const url = process.env.DATABASE_URL;
      if (!url) {
        throw new Error(
          `DATABASE_URL is required when DB_DIALECT is "${dialect}"`
        );
      }
      return { dialect, url };
    }
  }
}

/**
 * Reset cached dialect (for testing only).
 */
export function _resetDialectCache(): void {
  cachedDialect = null;
}
