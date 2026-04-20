/**
 * Drizzle ORM update helpers.
 *
 * Drizzle's `$defaultFn` only runs on INSERT, not UPDATE.
 * Use `withUpdatedAt()` to automatically inject `updatedAt` into
 * every `.set()` call so that no update silently leaves the timestamp stale.
 *
 * The `now` parameter is required — pass the result of `getDbNowUncached()`
 * (or `getDbNow()` in server component context) to keep timestamps consistent
 * with the DB-time migration across the codebase.
 *
 * @example
 *   await db.update(users).set(withUpdatedAt({ name: "Alice" }, await getDbNowUncached())).where(eq(users.id, id));
 */
export function withUpdatedAt<T extends Record<string, unknown>>(
  data: T,
  now: Date
): T & { updatedAt: Date } {
  return { ...data, updatedAt: now };
}
