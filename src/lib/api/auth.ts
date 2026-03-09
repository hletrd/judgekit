import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { shouldUseSecureAuthCookie } from "@/lib/auth/secure-cookie";
import { getTokenAuthenticatedAtSeconds, isTokenInvalidated } from "@/lib/auth/session-security";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { authUserSelect } from "@/lib/db/selects";
import { getValidatedAuthSecret } from "@/lib/security/env";
import { validateCsrf } from "@/lib/security/csrf";
import type { UserRole } from "@/types";
import { eq } from "drizzle-orm";

export function getTokenUserId(token: { id?: unknown; sub?: unknown } | null | undefined) {
  if (typeof token?.id === "string" && token.id.length > 0) {
    return token.id;
  }

  if (typeof token?.sub === "string" && token.sub.length > 0) {
    return token.sub;
  }

  return null;
}

export async function getActiveAuthUserById(
  userId: string | null | undefined,
  authenticatedAtSeconds?: number | null
) {
  if (!userId) {
    return null;
  }

  const user = await db
    .select(authUserSelect)
    .from(users)
    .where(eq(users.id, userId))
    .then((rows) => rows[0] ?? null);

  if (!user?.isActive) {
    return null;
  }

  if (isTokenInvalidated(authenticatedAtSeconds ?? null, user.tokenInvalidatedAt)) {
    return null;
  }

  return {
    id: user.id,
    role: user.role as UserRole,
    username: user.username,
    email: user.email,
    name: user.name,
    className: user.className,
    mustChangePassword: Boolean(user.mustChangePassword),
  };
}

export async function getApiUser(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: getValidatedAuthSecret(),
    secureCookie: shouldUseSecureAuthCookie(),
  });

  return getActiveAuthUserById(getTokenUserId(token), getTokenAuthenticatedAtSeconds(token));
}

export function csrfForbidden(request: NextRequest): NextResponse | null {
  return validateCsrf(request);
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export function notFound(resource: string) {
  return NextResponse.json({ error: `${resource} not found` }, { status: 404 });
}

export function isAdmin(role: string) {
  return role === "super_admin" || role === "admin";
}

export function isInstructor(role: string) {
  return isAdmin(role) || role === "instructor";
}
