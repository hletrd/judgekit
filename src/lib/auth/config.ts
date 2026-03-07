import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { UserRole } from "@/types";

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const username = credentials.username as string;
        const password = credentials.password as string;

        const user = await db.query.users.findFirst({
          where: eq(users.username, username),
        });

        if (!user || !user.passwordHash || !user.isActive) return null;

        const isValid = await compare(password, user.passwordHash);
        if (!isValid) return null;

        return {
          id: user.id,
          username: user.username,
          name: user.name,
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
        token.id = user.id;
        token.role = (user as any).role;
        token.mustChangePassword = (user as any).mustChangePassword ?? false;
      }
      if (trigger === "update") {
        // Re-fetch user to get updated mustChangePassword
        const freshUser = await db.query.users.findFirst({
          where: eq(users.id, token.id as string),
        });
        if (freshUser) {
          token.mustChangePassword = freshUser.mustChangePassword ?? false;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.mustChangePassword = token.mustChangePassword as boolean;
      }
      return session;
    },
  },
};
