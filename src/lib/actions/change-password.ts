"use server";

import { hash, compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { auth } from "@/lib/auth";

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!user || !user.passwordHash) {
    return { success: false, error: "userNotFound" };
  }

  const isValid = await compare(currentPassword, user.passwordHash);
  if (!isValid) {
    return { success: false, error: "currentPasswordIncorrect" };
  }

  if (newPassword.length < 8) {
    return { success: false, error: "passwordTooShort" };
  }

  const newHash = await hash(newPassword, 12);

  db.update(users)
    .set({
      passwordHash: newHash,
      mustChangePassword: false,
      updatedAt: new Date(),
    })
    .where(eq(users.id, session.user.id))
    .run();

  return { success: true };
}
