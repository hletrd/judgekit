import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getApiUser, unauthorized, forbidden, notFound, isAdmin } from "@/lib/api/auth";
import { hash } from "bcryptjs";
import {
  MIN_PASSWORD_LENGTH,
  canManageRole,
  isUserRole,
} from "@/lib/security/constants";

const safeUserSelect = {
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getApiUser(request);
    if (!user) return unauthorized();

    const { id } = await params;

    if (!isAdmin(user.role) && user.id !== id) return forbidden();

    const found = await db
      .select(safeUserSelect)
      .from(users)
      .where(eq(users.id, id))
      .then((r) => r[0]);

    if (!found) return notFound("User");

    return NextResponse.json({ data: found });
  } catch (error) {
    console.error("GET /api/v1/users/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getApiUser(request);
    if (!user) return unauthorized();

    const { id } = await params;

    if (!isAdmin(user.role) && user.id !== id) return forbidden();

    const found = await db
      .select(safeUserSelect)
      .from(users)
      .where(eq(users.id, id))
      .then((r) => r[0]);

    if (!found) return notFound("User");

    const body = await request.json();
    const { name, username, email, className, role, isActive, password } = body;

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    const normalizedEmail = typeof email === "string" && email.trim() !== "" ? email.trim() : null;
    const normalizedClassName = typeof className === "string" && className.trim() !== "" ? className.trim() : null;

    if (username !== undefined) {
      const existingUsername = await db.query.users.findFirst({
        where: eq(users.username, username),
      });

      if (existingUsername && existingUsername.id !== id) {
        return NextResponse.json({ error: "Username already in use" }, { status: 409 });
      }
    }

    if (email !== undefined && normalizedEmail) {
      const existingEmail = await db.query.users.findFirst({
        where: eq(users.email, normalizedEmail),
      });

      if (existingEmail && existingEmail.id !== id) {
        return NextResponse.json({ error: "Email already in use" }, { status: 409 });
      }
    }

    if (name !== undefined) updates.name = name;
    if (username !== undefined) updates.username = username;
    if (email !== undefined) updates.email = normalizedEmail;
    if (className !== undefined) updates.className = normalizedClassName;
    if (isActive !== undefined && isAdmin(user.role)) updates.isActive = isActive;
    if (role !== undefined) {
      if (!isAdmin(user.role)) return forbidden();

      if (typeof role !== "string" || !isUserRole(role)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }

      if (!canManageRole(user.role, role)) {
        return NextResponse.json(
          { error: "Only super_admin can assign super_admin role" },
          { status: 403 }
        );
      }

      if (found.role === "super_admin" && role !== "super_admin" && user.role !== "super_admin") {
        return NextResponse.json(
          { error: "Only super_admin can change super_admin role" },
          { status: 403 }
        );
      }

      if (found.role === "super_admin" && role !== "super_admin") {
        return NextResponse.json({ error: "Cannot change super_admin role" }, { status: 403 });
      }

      updates.role = role;
    }
    if (password !== undefined) {
      if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
        return NextResponse.json(
          { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
          { status: 400 }
        );
      }
      updates.passwordHash = await hash(password, 12);
    }

    await db.update(users).set(updates).where(eq(users.id, id));

    const updated = await db
      .select(safeUserSelect)
      .from(users)
      .where(eq(users.id, id))
      .then((r) => r[0]);

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("PATCH /api/v1/users/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getApiUser(request);
    if (!user) return unauthorized();
    if (!isAdmin(user.role)) return forbidden();

    const { id } = await params;

    const found = await db
      .select(safeUserSelect)
      .from(users)
      .where(eq(users.id, id))
      .then((r) => r[0]);

    if (!found) return notFound("User");

    if (found.role === "super_admin") {
      return NextResponse.json({ error: "Cannot deactivate super_admin" }, { status: 403 });
    }

    await db.update(users).set({ isActive: false, updatedAt: new Date() }).where(eq(users.id, id));

    return NextResponse.json({ data: { id, isActive: false } });
  } catch (error) {
    console.error("DELETE /api/v1/users/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
