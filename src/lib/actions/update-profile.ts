"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { auth, unstable_update } from "@/lib/auth";
import { buildServerActionAuditContext, recordAuditEvent } from "@/lib/audit/events";
import {
  type UpdateProfileInput,
  updateProfileSchema,
} from "@/lib/validators/profile";

export async function updateProfile(
  input: UpdateProfileInput
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "notAuthenticated" };
  }

  const parsedInput = updateProfileSchema.safeParse(input);
  if (!parsedInput.success) {
    return {
      success: false,
      error: parsedInput.error.issues[0]?.message ?? "updateError",
    };
  }

  const currentUser = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: {
      id: true,
      username: true,
      name: true,
      email: true,
      className: true,
    },
  });

  if (!currentUser) {
    return { success: false, error: "notAuthenticated" };
  }

  const { name, email, className } = parsedInput.data;
  const normalizedEmail = email ?? null;
  const normalizedClassName = className ?? null;
  const changedFields = [
    currentUser.name !== name ? "name" : null,
    currentUser.email !== normalizedEmail ? "email" : null,
    currentUser.className !== normalizedClassName ? "className" : null,
  ].flatMap((value) => (value ? [value] : []));

  // Check if email is taken by someone else
  if (normalizedEmail) {
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, normalizedEmail),
    });
    if (existingUser && existingUser.id !== session.user.id) {
      return { success: false, error: "emailInUse" };
    }
  }

  db.update(users)
    .set({
      name,
      email: normalizedEmail,
      className: normalizedClassName,
      updatedAt: new Date(),
    })
    .where(eq(users.id, session.user.id))
    .run();

  await unstable_update({
    user: {
      name,
      email: normalizedEmail,
      className: normalizedClassName,
    },
  });

  const auditContext = await buildServerActionAuditContext("/dashboard/profile");
  recordAuditEvent({
    actorId: currentUser.id,
    actorRole: session.user.role,
    action: "user.profile_updated",
    resourceType: "user",
    resourceId: currentUser.id,
    resourceLabel: currentUser.username,
    summary: `Updated profile for @${currentUser.username}`,
    details: {
      changedFields,
      emailSet: normalizedEmail !== null,
      classNameSet: normalizedClassName !== null,
    },
    context: auditContext,
  });

  return { success: true };
}
