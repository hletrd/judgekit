import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getApiUser, unauthorized, forbidden, isAdmin } from "@/lib/api/auth";
import { recordAuditEvent } from "@/lib/audit/events";
import { nanoid } from "nanoid";
import { hash } from "bcryptjs";
import { generateSecurePassword } from "@/lib/auth/generated-password";
import {
  MIN_PASSWORD_LENGTH,
  canManageRole,
  isUserRole,
} from "@/lib/security/constants";

export async function GET(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    if (!user) return unauthorized();
    if (!isAdmin(user.role)) return forbidden();

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const offset = (page - 1) * limit;
    const role = searchParams.get("role");

    if (role && !isUserRole(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const userSelect = {
      id: users.id,
      username: users.username,
      email: users.email,
      name: users.name,
      className: users.className,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    };

    const results = role
      ? await db
          .select(userSelect)
          .from(users)
          .where(eq(users.role, role))
          .orderBy(desc(users.createdAt))
          .limit(limit)
          .offset(offset)
      : await db
          .select(userSelect)
          .from(users)
          .orderBy(desc(users.createdAt))
          .limit(limit)
          .offset(offset);

    return NextResponse.json({ data: results, page, limit });
  } catch (error) {
    console.error("GET /api/v1/users error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    if (!user) return unauthorized();
    if (!isAdmin(user.role)) return forbidden();

    const body = await request.json();
    const { username, email, name, className, password, role } = body;
    const normalizedEmail = typeof email === "string" && email.trim() !== "" ? email.trim() : null;
    const normalizedClassName = typeof className === "string" && className.trim() !== "" ? className.trim() : null;

    if (!username || typeof username !== "string") {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }
    if (email !== undefined && typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (password !== undefined && (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH)) {
      return NextResponse.json(
        { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
        { status: 400 }
      );
    }

    const requestedRole = typeof role === "string" && role.trim() !== "" ? role.trim() : "student";

    if (!isUserRole(requestedRole)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    if (!canManageRole(user.role, requestedRole)) {
      return NextResponse.json(
        { error: "Only super_admin can assign super_admin role" },
        { status: 403 }
      );
    }

    const existing = await db.query.users.findFirst({ where: eq(users.username, username) });
    if (existing) {
      return NextResponse.json({ error: "Username already in use" }, { status: 409 });
    }

    if (normalizedEmail) {
      const existingEmail = await db.query.users.findFirst({ where: eq(users.email, normalizedEmail) });
      if (existingEmail) {
        return NextResponse.json({ error: "Email already in use" }, { status: 409 });
      }
    }

    const generatedPassword = generateSecurePassword();
    const passwordToHash =
      typeof password === "string" && password.length >= MIN_PASSWORD_LENGTH ? password : generatedPassword;
    const passwordHash = await hash(passwordToHash, 12);
    const id = nanoid();

    await db.insert(users).values({
      id,
      username,
      email: normalizedEmail,
      name,
      className: normalizedClassName,
      passwordHash,
      role: requestedRole,
      isActive: true,
      mustChangePassword: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const created = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        name: users.name,
        className: users.className,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .then((r) => r[0]);

    if (created) {
      recordAuditEvent({
        actorId: user.id,
        actorRole: user.role,
        action: "user.created_api",
        resourceType: "user",
        resourceId: created.id,
        resourceLabel: created.username,
        summary: `Created user @${created.username} via API`,
        details: {
          role: created.role,
          usedGeneratedPassword: !password,
        },
        request,
      });
    }

    return NextResponse.json({ data: created, generatedPassword: password ? undefined : generatedPassword }, { status: 201 });
  } catch (error) {
    console.error("POST /api/v1/users error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
