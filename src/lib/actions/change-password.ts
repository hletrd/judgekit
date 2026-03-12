"use server";

import { hash, compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { findSessionUserWithPassword, hasSessionIdentity } from "@/lib/auth/find-session-user";
import { buildServerActionAuditContext, recordAuditEvent } from "@/lib/audit/events";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { clearRateLimit, isRateLimited, recordRateLimitFailure } from "@/lib/security/rate-limit";
import { getPasswordValidationError } from "@/lib/security/password";
import { isTrustedServerActionOrigin } from "@/lib/security/server-actions";
import { logger } from "@/lib/logger";

function getChangePasswordRateLimitKey(userId: string) {
  return `change-password:user:${userId}`;
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  if (!(await isTrustedServerActionOrigin())) {
    return { success: false, error: "unauthorized" };
  }

  const session = await auth();

  if (!hasSessionIdentity(session)) {
    return { success: false, error: "sessionExpired" };
  }

  const user = await findSessionUserWithPassword(session);

  if (!user || !user.passwordHash) {
    return { success: false, error: "sessionExpired" };
  }

  const rateLimitKey = getChangePasswordRateLimitKey(user.id);

  if (isRateLimited(rateLimitKey)) {
    return { success: false, error: "changePasswordRateLimited" };
  }

  const isValid = await compare(currentPassword, user.passwordHash);
  if (!isValid) {
    recordRateLimitFailure(rateLimitKey);
    return { success: false, error: "currentPasswordIncorrect" };
  }

  const passwordValidationError = getPasswordValidationError(newPassword, {
    username: user.username,
    email: user.email,
  });

  if (passwordValidationError) {
    return { success: false, error: passwordValidationError };
  }

  const newHash = await hash(newPassword, 12);

  try {
    db.update(users)
      .set({
        passwordHash: newHash,
        mustChangePassword: false,
        tokenInvalidatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
      .run();
  } catch (error) {
    logger.error({ err: error }, "Failed to change password");
    return { success: false, error: "error" };
  }

  clearRateLimit(rateLimitKey);

  const auditContext = await buildServerActionAuditContext("/change-password");
  recordAuditEvent({
    actorId: user.id,
    actorRole: user.role,
    action: "user.password_changed",
    resourceType: "user",
    resourceId: user.id,
    resourceLabel: user.username,
    summary: `Changed password for @${user.username}`,
    details: {
      invalidatedExistingSessions: true,
      mustChangePassword: false,
    },
    context: auditContext,
  });

  return { success: true };
}
