import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { shouldUseSecureAuthCookie } from "@/lib/auth/secure-cookie";
import { getValidatedAuthSecret } from "@/lib/security/env";
import type { UserRole } from "@/types";

export async function getApiUser(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: getValidatedAuthSecret(),
    secureCookie: shouldUseSecureAuthCookie(request),
  });
  if (!token) return null;
  return {
    id: token.id as string,
    role: token.role as UserRole,
    username: token.username as string,
    email: (token.email as string | null | undefined) ?? null,
    name: token.name as string,
    className: (token.className as string | null | undefined) ?? null,
    mustChangePassword: Boolean(token.mustChangePassword),
  };
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
