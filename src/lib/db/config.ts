/**
 * Database dialect configuration.
 * PostgreSQL is the only supported dialect.
 */

export type DbDialect = "postgresql";

/**
 * Returns the configured database dialect. Always "postgresql".
 */
export function getDialect(): DbDialect {
  return "postgresql";
}

/**
 * @deprecated Always returns false. Will be removed.
 */
export function isSqlite(): boolean {
  return false;
}

/**
 * Returns true — PostgreSQL is the only supported dialect.
 */
export function isPostgresql(): boolean {
  return true;
}

/**
 * @deprecated Always returns false. Will be removed.
 */
export function isMysql(): boolean {
  return false;
}

export type ConnectionConfig = { dialect: "postgresql"; url: string };

/**
 * Returns the connection configuration.
 */
export function getConnectionConfig(): ConnectionConfig {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }
  return { dialect: "postgresql", url };
}

/**
 * Reset cached dialect (for testing only).
 */
export function _resetDialectCache(): void {
  // no-op
}
