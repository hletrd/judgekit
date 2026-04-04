import { randomBytes } from "crypto";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { assignments, contestAccessTokens, enrollments } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

/**
 * Generate a random 8-character uppercase alphanumeric access code.
 * Uses crypto.randomBytes for cryptographic security.
 */
export function generateAccessCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1 for readability
  const len = chars.length; // 32
  const maxUnbiased = 256 - (256 % len); // rejection threshold
  let code = "";
  while (code.length < 8) {
    const byte = randomBytes(1)[0];
    if (byte < maxUnbiased) {
      code += chars[byte % len];
    }
  }
  return code;
}

/**
 * Set or regenerate an access code for an assignment.
 */
export async function setAccessCode(assignmentId: string, code?: string): Promise<string> {
  const accessCode = code ?? generateAccessCode();
  await db.update(assignments)
    .set({ accessCode })
    .where(eq(assignments.id, assignmentId));
  return accessCode;
}

/**
 * Revoke (clear) the access code for an assignment.
 */
export async function revokeAccessCode(assignmentId: string): Promise<void> {
  await db.update(assignments)
    .set({ accessCode: null })
    .where(eq(assignments.id, assignmentId));
}

/**
 * Get the current access code for an assignment.
 */
export async function getAccessCode(assignmentId: string): Promise<string | null> {
  const [row] = await db
    .select({ accessCode: assignments.accessCode })
    .from(assignments)
    .where(eq(assignments.id, assignmentId))
    .limit(1);
  return row?.accessCode ?? null;
}

type RedeemResult =
  | { ok: true; assignmentId: string; groupId: string; alreadyEnrolled?: boolean }
  | { ok: false; error: string };

/**
 * Redeem an access code: verify it, create access token, auto-enroll in group.
 */
export async function redeemAccessCode(
  code: string,
  userId: string,
  ipAddress?: string
): Promise<RedeemResult> {
  const normalizedCode = code.trim().toUpperCase();

  if (!normalizedCode || normalizedCode.length < 4) {
    return { ok: false, error: "invalidAccessCode" };
  }

  const [assignment] = await db
    .select({
      id: assignments.id,
      groupId: assignments.groupId,
      accessCode: assignments.accessCode,
      examMode: assignments.examMode,
      deadline: assignments.deadline,
      lateDeadline: assignments.lateDeadline,
    })
    .from(assignments)
    .where(eq(assignments.accessCode, normalizedCode))
    .limit(1);

  if (!assignment) {
    return { ok: false, error: "invalidAccessCode" };
  }

  if (assignment.examMode === "none") {
    return { ok: false, error: "notAContest" };
  }

  // Block join after contest deadline
  const now = Date.now();
  const effectiveClose = assignment.lateDeadline?.valueOf() ?? assignment.deadline?.valueOf() ?? null;
  if (effectiveClose && effectiveClose < now) {
    return { ok: false, error: "contestClosed" };
  }

  // Transaction: check + create token + auto-enroll (atomic to prevent TOCTOU race)
  let alreadyRedeemed = false;

  await db.transaction(async (tx) => {
    // Check if already redeemed (inside transaction to prevent race condition)
    const [existing] = await tx
      .select({ id: contestAccessTokens.id })
      .from(contestAccessTokens)
      .where(
        and(
          eq(contestAccessTokens.assignmentId, assignment.id),
          eq(contestAccessTokens.userId, userId)
        )
      )
      .limit(1);

    if (existing) {
      alreadyRedeemed = true;
      return;
    }

    // Create access token
    await tx.insert(contestAccessTokens)
      .values({
        id: nanoid(),
        assignmentId: assignment.id,
        userId,
        redeemedAt: new Date(),
        ipAddress: ipAddress ?? null,
      });

    // Auto-enroll in group if not already enrolled
    const [enrollment] = await tx
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.groupId, assignment.groupId),
          eq(enrollments.userId, userId)
        )
      )
      .limit(1);

    if (!enrollment) {
      await tx.insert(enrollments)
        .values({
          id: nanoid(),
          userId,
          groupId: assignment.groupId,
          enrolledAt: new Date(),
        });
    }
  });

  if (alreadyRedeemed) {
    return { ok: true, alreadyEnrolled: true, assignmentId: assignment.id, groupId: assignment.groupId };
  }

  return { ok: true, assignmentId: assignment.id, groupId: assignment.groupId };
}
