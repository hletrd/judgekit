import type { Session } from "next-auth";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { authUserSelect } from "@/lib/db/selects";

export function hasSessionIdentity(session: Session | null) {
  return Boolean(session?.user?.id || session?.user?.username);
}

/**
 * Find the session user with safe column selection (excludes passwordHash).
 * For password verification, use findSessionUserWithPassword() instead.
 */
export async function findSessionUser(session: Session | null) {
  const sessionUser = session?.user;

  if (!hasSessionIdentity(session)) {
    return null;
  }

  if (sessionUser?.id) {
    return (await db.select(authUserSelect).from(users).where(eq(users.id, sessionUser.id)).limit(1))[0];
  }

  if (sessionUser?.username) {
    return (await db.select(authUserSelect).from(users).where(sql`lower(${users.username}) = lower(${sessionUser.username})`).limit(1))[0];
  }

  return null;
}

/**
 * Find the session user including passwordHash for credential verification.
 */
export async function findSessionUserWithPassword(session: Session | null) {
  const sessionUser = session?.user;

  if (!hasSessionIdentity(session)) {
    return null;
  }

  if (sessionUser?.id) {
    return db.query.users.findFirst({
      where: eq(users.id, sessionUser.id),
      columns: {
        id: true,
        username: true,
        email: true,
        name: true,
        className: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        passwordHash: true,
        tokenInvalidatedAt: true,
        preferredLanguage: true,
        preferredTheme: true,
        shareAcceptedSolutions: true,
        acceptedSolutionsAnonymous: true,
        editorTheme: true,
        editorFontSize: true,
        editorFontFamily: true,
        lectureMode: true,
        lectureFontScale: true,
        lectureColorScheme: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  if (sessionUser?.username) {
    return db.query.users.findFirst({
      where: sql`lower(${users.username}) = lower(${sessionUser.username})`,
      columns: {
        id: true,
        username: true,
        email: true,
        name: true,
        className: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        passwordHash: true,
        tokenInvalidatedAt: true,
        preferredLanguage: true,
        preferredTheme: true,
        shareAcceptedSolutions: true,
        acceptedSolutionsAnonymous: true,
        editorTheme: true,
        editorFontSize: true,
        editorFontFamily: true,
        lectureMode: true,
        lectureFontScale: true,
        lectureColorScheme: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  return null;
}
