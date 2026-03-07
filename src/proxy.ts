import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { shouldUseSecureAuthCookie } from "@/lib/auth/secure-cookie";
import { getValidatedAuthSecret } from "@/lib/security/env";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const token = await getToken({
    req: request,
    secret: getValidatedAuthSecret(),
    secureCookie: shouldUseSecureAuthCookie(request),
  });

  const isAuthPage = pathname.startsWith("/login");
  const isChangePasswordPage = pathname === "/change-password";
  const isApiRoute = pathname.startsWith("/api/v1");
  const isJudgeWorkerRoute = pathname.startsWith("/api/v1/judge/");
  const isProtectedRoute = pathname.startsWith("/dashboard") || (isApiRoute && !isJudgeWorkerRoute);

  if ((isProtectedRoute || isChangePasswordPage) && !token) {
    if (isApiRoute) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPage && token) {
    if (token.mustChangePassword) {
      return NextResponse.redirect(new URL("/change-password", request.url));
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (isProtectedRoute && token?.mustChangePassword) {
    if (isApiRoute) {
      return NextResponse.json({ error: "Password change required" }, { status: 403 });
    }

    return NextResponse.redirect(new URL("/change-password", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/v1/:path*", "/login", "/change-password"],
};
