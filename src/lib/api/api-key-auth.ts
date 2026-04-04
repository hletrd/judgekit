import { randomBytes } from "node:crypto";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { apiKeys, users } from "@/lib/db/schema";
import { authUserSelect } from "@/lib/db/selects";
import type { UserRole } from "@/types";

const KEY_PREFIX = "jk_";
const KEY_RANDOM_BYTES = 20; // 20 bytes = 40 hex chars → total key = "jk_" + 40 = 43 chars
const STORED_PREFIX_LEN = 8; // store first 8 chars of full key for display

/** Generate a new API key. Returns { rawKey, keyPrefix }. */
export function generateApiKey(): {
  rawKey: string;
  keyPrefix: string;
} {
  const rawKey = KEY_PREFIX + randomBytes(KEY_RANDOM_BYTES).toString("hex");
  const keyPrefix = rawKey.slice(0, STORED_PREFIX_LEN);
  return { rawKey, keyPrefix };
}

/**
 * Authenticate a request using a Bearer API key.
 * Returns the user-like object if valid, or null.
 */
export async function authenticateApiKey(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) return null;

  const rawKey = authHeader.slice(7).trim();
  if (!rawKey.startsWith(KEY_PREFIX) || rawKey.length < 10) return null;

  // Direct plaintext lookup
  const [candidate] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keyPlain, rawKey), eq(apiKeys.isActive, true)))
    .limit(1);

  if (!candidate) return null;

  // Check expiry
  if (candidate.expiresAt && candidate.expiresAt < new Date()) return null;

  // Fetch the creator user for context
  const user = await db
    .select(authUserSelect)
    .from(users)
    .where(eq(users.id, candidate.createdById))
    .then((rows) => rows[0] ?? null);

  if (!user?.isActive) return null;

  // Update lastUsedAt (fire-and-forget)
  db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, candidate.id))
    .run();

  return {
    id: user.id,
    role: candidate.role as UserRole,
    username: user.username,
    email: user.email,
    name: user.name,
    className: user.className,
    mustChangePassword: false,
    _apiKeyAuth: true as const,
  };
}
