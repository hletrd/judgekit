import type { NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { getValidatedJudgeAuthToken } from "@/lib/security/env";
import { safeTokenCompare } from "@/lib/security/timing";
import { db } from "@/lib/db";
import { judgeWorkers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

function parseBearerToken(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice(7);
}

/**
 * Hash a token with SHA-256 and return the hex digest.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Validate that the request carries a valid judge Bearer token.
 * Checks the shared JUDGE_AUTH_TOKEN from the environment.
 */
export function isJudgeAuthorized(request: NextRequest) {
  const providedToken = parseBearerToken(request.headers.get("authorization"));

  if (!providedToken) {
    return false;
  }

  const expectedToken = getValidatedJudgeAuthToken();
  return safeTokenCompare(providedToken, expectedToken);
}

/**
 * Validate that the request carries a valid judge Bearer token for a
 * specific worker. When the worker has a `secretTokenHash` stored in the DB,
 * the provided token is hashed and compared against it. When only a plaintext
 * `secretToken` exists (backward compatibility during migration), a direct
 * comparison is used. Otherwise it falls back to the shared JUDGE_AUTH_TOKEN.
 *
 * Returns an object with `authorized` boolean and an optional error key
 * that can be returned directly to the client.
 */
export async function isJudgeAuthorizedForWorker(
  request: NextRequest,
  workerId: string,
): Promise<{ authorized: boolean; error?: string }> {
  const providedToken = parseBearerToken(request.headers.get("authorization"));

  if (!providedToken) {
    return { authorized: false, error: "unauthorized" };
  }

  const worker = await db.query.judgeWorkers.findFirst({
    where: eq(judgeWorkers.id, workerId),
    columns: { secretToken: true, secretTokenHash: true },
  });

  // If the worker exists and has a hashed secret, validate against the hash
  if (worker?.secretTokenHash) {
    if (safeTokenCompare(hashToken(providedToken), worker.secretTokenHash)) {
      return { authorized: true };
    }
    // Token didn't match worker secret — don't fall through to shared token
    return { authorized: false, error: "invalidWorkerToken" };
  }

  // Backward compatibility: fall back to plaintext comparison when no hash stored
  if (worker?.secretToken) {
    if (safeTokenCompare(providedToken, worker.secretToken)) {
      return { authorized: true };
    }
    return { authorized: false, error: "invalidWorkerToken" };
  }

  // Worker not found or has no per-worker secret: fall back to shared token
  const expectedToken = getValidatedJudgeAuthToken();
  if (safeTokenCompare(providedToken, expectedToken)) {
    return { authorized: true };
  }

  return { authorized: false, error: "unauthorized" };
}
