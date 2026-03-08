"use server";

import { hash, compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { findSessionUser, hasSessionIdentity } from "@/lib/auth/find-session-user";
import { buildServerActionAuditContext, recordAuditEvent } from "@/lib/audit/events";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { MIN_PASSWORD_LENGTH } from "@/lib/security/constants";

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();

  if (!hasSessionIdentity(session)) {
    return { success: false, error: "sessionExpired" };
  }

  const user = await findSessionUser(session);

  if (!user || !user.passwordHash) {
    return { success: false, error: "sessionExpired" };
  }

  const isValid = await compare(currentPassword, user.passwordHash);
  if (!isValid) {
    return { success: false, error: "currentPasswordIncorrect" };
  }

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return { success: false, error: "passwordTooShort" };
  }

  const newHash = await hash(newPassword, 12);

  try {
    db.update(users)
      .set({
        passwordHash: newHash,
        mustChangePassword: false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
      .run();
  } catch (error) {
    console.error("Failed to change password:", error);
    return { success: false, error: "error" };
  }

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
      mustChangePassword: false,
    },
    context: auditContext,
  });

  return { success: true };
}
