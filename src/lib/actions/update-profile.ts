"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { auth } from "@/lib/auth";

export async function updateProfile(
  name: string,
  email: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  if (!name || name.trim() === "" || !email || email.trim() === "") {
    return { success: false, error: "Name and email are required" };
  }

  // Check if email is taken by someone else
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (existingUser && existingUser.id !== session.user.id) {
    return { success: false, error: "Email already in use" };
  }

  db.update(users)
    .set({
      name: name.trim(),
      email: email.trim(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, session.user.id))
    .run();

  return { success: true };
}
