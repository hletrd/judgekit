import { randomBytes } from "node:crypto";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { apiKeys, users } from "@/lib/db/schema";
import { hashPassword, verifyPassword } from "@/lib/security/password-hash";
import { authUserSelect } from "@/lib/db/selects";
import type { UserRole } from "@/types";

const KEY_PREFIX = "jk_";
const KEY_RANDOM_BYTES = 20; // 20 bytes = 40 hex chars → total key = "jk_" + 40 = 43 chars
const STORED_PREFIX_LEN = 8; // store first 8 chars of full key for lookup

/** Generate a new API key. Returns { rawKey, keyHash, keyPrefix }. */
export async function generateApiKey(): Promise<{
  rawKey: string;
  keyHash: string;
  keyPrefix: string;
}> {
  const rawKey = KEY_PREFIX + randomBytes(KEY_RANDOM_BYTES).toString("hex");
  const keyHash = await hashPassword(rawKey);
  const keyPrefix = rawKey.slice(0, STORED_PREFIX_LEN);
  return { rawKey, keyHash, keyPrefix };
}

/**
 * Authenticate a request using a Bearer API key.
 * Returns the user-like object if valid, or null.
 */
export async function authenticateApiKey(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) return null;

  const rawKey = authHeader.slice(7).trim();
  if (!rawKey.startsWith(KEY_PREFIX) || rawKey.length < 10) return null;

  const prefix = rawKey.slice(0, STORED_PREFIX_LEN);

  // Look up active, non-expired keys matching this prefix
  const candidates = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keyPrefix, prefix), eq(apiKeys.isActive, true)));

  for (const candidate of candidates) {
    // Check expiry
    if (candidate.expiresAt && candidate.expiresAt < new Date()) continue;

    const { valid } = await verifyPassword(rawKey, candidate.keyHash);
    if (!valid) continue;

    // Valid key found — fetch the creator user for context
    const user = await db
      .select(authUserSelect)
      .from(users)
      .where(eq(users.id, candidate.createdById))
      .then((rows) => rows[0] ?? null);

    if (!user?.isActive) continue;

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

  return null;
}
