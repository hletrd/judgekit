import type { NextAuthConfig } from "next-auth";
import type { JWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import {
  AUTH_SESSION_MAX_AGE_SECONDS,
  clearAuthToken,
  getTokenAuthenticatedAtSeconds,
  isTokenInvalidated,
} from "@/lib/auth/session-security";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { UserRole } from "@/types";
import {
  clearRateLimitMulti,
  getRateLimitKey,
  getUsernameRateLimitKey,
  isAnyKeyRateLimited,
  recordRateLimitFailureMulti,
} from "@/lib/security/rate-limit";
import {
  getAuthSessionCookieName,
  getValidatedAuthSecret,
  shouldTrustAuthHost,
  validateAuthUrl,
} from "@/lib/security/env";
import { shouldUseSecureAuthCookie } from "@/lib/auth/secure-cookie";
import { getTokenUserId } from "@/lib/api/auth";
import {
  getLoginEventContextFromUser,
  recordLoginEvent,
  recordLoginEventWithContext,
  type LoginEventContextCarrier,
  type LoginEventRequestSummary,
  sanitizeLoginEventContext,
} from "@/lib/auth/login-events";
import { extractClientIp } from "@/lib/security/ip";

type AuthUserRecord = {
  id: string;
  username: string;
  email: string | null;
  name: string;
  className: string | null;
  role: UserRole;
  mustChangePassword: boolean | null;
};

type AuthenticatedLoginUser = Omit<AuthUserRecord, "mustChangePassword"> & {
  mustChangePassword: boolean;
} & LoginEventContextCarrier;

const DUMMY_PASSWORD_HASH = "$2b$12$QC3n1zFm/d.VeSd2lLKcnuUmuj1CiQHs3t7UuJ.8HW2XMFJaknQeq";

function createSuccessfulLoginResponse(
  user: AuthUserRecord,
  loginEventContext: LoginEventRequestSummary
): AuthenticatedLoginUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    name: user.name,
    className: user.className,
    role: user.role,
    mustChangePassword: user.mustChangePassword ?? false,
    loginEventContext,
  };
}

function syncTokenWithUser(
  token: JWT,
  user: AuthUserRecord,
  authenticatedAtSeconds = getTokenAuthenticatedAtSeconds(token) ?? Math.trunc(Date.now() / 1000)
) {
  token.sub = user.id;
  token.id = user.id;
  token.role = user.role;
  token.username = user.username;
  token.email = user.email;
  token.name = user.name;
  token.className = user.className;
  token.mustChangePassword = user.mustChangePassword ?? false;
  token.authenticatedAt = authenticatedAtSeconds;

  return token;
}

validateAuthUrl();
const secureSessionCookie = shouldUseSecureAuthCookie();

export const authConfig: NextAuthConfig = {
  secret: getValidatedAuthSecret(),
  useSecureCookies: secureSessionCookie,
  cookies: {
    sessionToken: {
      name: getAuthSessionCookieName(),
      options: {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secure: secureSessionCookie,
      },
    },
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Username or Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const ipRateLimitKey = getRateLimitKey("login", request.headers);
        const attemptedIdentifier = typeof credentials?.username === "string" ? credentials.username : null;
        const usernameRateLimitKey = attemptedIdentifier
          ? getUsernameRateLimitKey("login", attemptedIdentifier)
          : null;

        const rateLimitKeys = [ipRateLimitKey, ...(usernameRateLimitKey ? [usernameRateLimitKey] : [])];

        if (isAnyKeyRateLimited(...rateLimitKeys)) {
          recordLoginEvent({
            outcome: "rate_limited",
            attemptedIdentifier,
            request,
          });
          return null;
        }

        if (typeof credentials?.username !== "string" || typeof credentials?.password !== "string") {
          return null;
        }

        const identifier = credentials.username;
        const password = credentials.password;

        let user = await db.query.users.findFirst({
          where: eq(users.username, identifier),
        });

        if (!user) {
          user = await db.query.users.findFirst({
            where: eq(users.email, identifier),
          });
        }

        if (!user || !user.passwordHash || !user.isActive) {
          await compare(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
          recordRateLimitFailureMulti(...rateLimitKeys);
          recordLoginEvent({
            outcome: "invalid_credentials",
            attemptedIdentifier: identifier,
            userId: user?.id ?? null,
            request,
          });
          return null;
        }

        const isValid = await compare(password, user.passwordHash);
        if (!isValid) {
          recordRateLimitFailureMulti(...rateLimitKeys);
          recordLoginEvent({
            outcome: "invalid_credentials",
            attemptedIdentifier: identifier,
            userId: user.id,
            request,
          });
          return null;
        }

        clearRateLimitMulti(...rateLimitKeys);

        return createSuccessfulLoginResponse(
          {
            id: user.id,
            username: user.username,
            email: user.email,
            name: user.name,
            className: user.className,
            role: user.role,
            mustChangePassword: user.mustChangePassword ?? false,
          },
          {
            attemptedIdentifier: identifier,
            ipAddress: extractClientIp(request.headers),
            userAgent: request.headers.get("user-agent")?.trim() || null,
            requestMethod: request.method?.trim().toUpperCase() || null,
            requestPath: (() => {
              try {
                return new URL(request.url).pathname;
              } catch {
                return null;
              }
            })(),
          }
        );
      },
    }),
  ],
  trustHost: shouldTrustAuthHost(),
  session: { strategy: "jwt", maxAge: AUTH_SESSION_MAX_AGE_SECONDS },
  pages: {
    signIn: "/login",
  },
  events: {
    async signIn({ account, user }) {
      if (account?.provider !== "credentials") {
        return;
      }

      const loginEventContext = getLoginEventContextFromUser(user);

      if (!loginEventContext) {
        return;
      }

      recordLoginEventWithContext({
        outcome: "success",
        userId: user.id ?? null,
        context: loginEventContext,
      });
    },
  },
  callbacks: {
    async signIn({ account, credentials, user }) {
      if (account?.provider !== "credentials") {
        return true;
      }

      const carriedLoginEventContext = getLoginEventContextFromUser(user);
      const loginEventContext =
        carriedLoginEventContext ??
        sanitizeLoginEventContext({
          attemptedIdentifier: typeof credentials?.username === "string" ? credentials.username : null,
        });

      if (!user.id || !carriedLoginEventContext) {
        recordLoginEventWithContext({
          outcome: "policy_denied",
          userId: user.id ?? null,
          context: loginEventContext,
        });

        return false;
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        const authenticatedAtSeconds = Math.trunc(Date.now() / 1000);

        return syncTokenWithUser(token, {
          id: user.id ?? token.sub ?? "",
          username: user.username,
          email: user.email ?? null,
          name: user.name ?? "",
          className: user.className ?? null,
          role: user.role,
          mustChangePassword: user.mustChangePassword ?? false,
        }, authenticatedAtSeconds);
      }

      const userId = getTokenUserId(token);

      if (!userId) {
        return clearAuthToken(token);
      }

      const freshUser = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
          id: true,
          username: true,
          email: true,
          name: true,
          className: true,
          role: true,
          isActive: true,
          mustChangePassword: true,
          tokenInvalidatedAt: true,
        },
      });

      if (
        !freshUser ||
        !freshUser.isActive ||
        isTokenInvalidated(getTokenAuthenticatedAtSeconds(token), freshUser.tokenInvalidatedAt)
      ) {
        return clearAuthToken(token);
      }

      return syncTokenWithUser(token, {
        id: freshUser.id,
        username: freshUser.username,
        email: freshUser.email,
        name: freshUser.name,
        className: freshUser.className,
        role: freshUser.role,
        mustChangePassword: freshUser.mustChangePassword ?? false,
      });
    },
    async session({ session, token }) {
      const userId = getTokenUserId(token);

      if (userId && token.role) {
        session.user.id = userId;
        session.user.role = token.role;
        session.user.username = token.username ?? "";
        session.user.name = token.name ?? session.user.name ?? "";
        session.user.className = token.className ?? null;
        session.user.mustChangePassword = token.mustChangePassword ?? false;

        if (typeof token.email === "string") {
          session.user.email = token.email;
        }
      }
      return session;
    },
  },
};
