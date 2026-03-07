import type { NextAuthConfig } from "next-auth";
import type { JWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { UserRole } from "@/types";
import {
  clearRateLimit,
  getRateLimitKey,
  isRateLimited,
  recordRateLimitFailure,
} from "@/lib/security/rate-limit";
import {
  getAuthSessionCookieName,
  getValidatedAuthSecret,
  shouldUseSecureSessionCookie,
} from "@/lib/security/env";

type AuthUserRecord = {
  id: string;
  username: string;
  email: string | null;
  name: string;
  className: string | null;
  role: UserRole;
  mustChangePassword: boolean | null;
};

function getTokenUserId(token: JWT) {
  return token.id ?? token.sub;
}

function syncTokenWithUser(token: JWT, user: AuthUserRecord) {
  token.sub = user.id;
  token.id = user.id;
  token.role = user.role;
  token.username = user.username;
  token.email = user.email;
  token.name = user.name;
  token.className = user.className;
  token.mustChangePassword = user.mustChangePassword ?? false;

  return token;
}

const secureSessionCookie = shouldUseSecureSessionCookie();

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
        const rateLimitKey = getRateLimitKey("login", request.headers);

        if (isRateLimited(rateLimitKey)) {
          console.warn("Blocked login attempt due to rate limiting", { rateLimitKey });
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
          recordRateLimitFailure(rateLimitKey);
          console.warn("Rejected login attempt", { identifier, reason: "user_not_found_or_inactive" });
          return null;
        }

        const isValid = await compare(password, user.passwordHash);
        if (!isValid) {
          recordRateLimitFailure(rateLimitKey);
          console.warn("Rejected login attempt", { identifier, reason: "invalid_password" });
          return null;
        }

        clearRateLimit(rateLimitKey);

        return {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          className: user.className,
          role: user.role as UserRole,
          mustChangePassword: user.mustChangePassword ?? false,
        };
      },
    }),
  ],
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        return syncTokenWithUser(token, {
          id: user.id ?? token.sub ?? "",
          username: user.username,
          email: user.email ?? null,
          name: user.name ?? "",
          className: user.className ?? null,
          role: user.role,
          mustChangePassword: user.mustChangePassword ?? false,
        });
      }

      if (trigger === "update") {
        const userId = getTokenUserId(token);

        if (!userId) {
          return token;
        }

        const freshUser = await db.query.users.findFirst({
          where: eq(users.id, userId),
        });

        if (freshUser) {
          return syncTokenWithUser(token, {
            id: freshUser.id,
            username: freshUser.username,
            email: freshUser.email,
            name: freshUser.name,
            className: freshUser.className,
            role: freshUser.role as UserRole,
            mustChangePassword: freshUser.mustChangePassword ?? false,
          });
        }

        delete token.sub;
        delete token.id;
        delete token.role;
        delete token.username;
        delete token.email;
        delete token.name;
        delete token.className;
        delete token.mustChangePassword;
      }

      return token;
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
