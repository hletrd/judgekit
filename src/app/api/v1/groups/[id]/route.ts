import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { groups } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { canAccessGroup } from "@/lib/auth/permissions";
import { getApiUser, unauthorized, forbidden, notFound, isAdmin } from "@/lib/api/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getApiUser(request);
    if (!user) return unauthorized();

    const { id } = await params;
    const existingGroup = await db.query.groups.findFirst({
      where: eq(groups.id, id),
      columns: { id: true },
    });

    if (!existingGroup) return notFound("Group");

    const hasAccess = await canAccessGroup(id, user.id, user.role);

    if (!hasAccess) return forbidden();

    const group = await db.query.groups.findFirst({
      where: eq(groups.id, id),
      columns: {
        id: true,
        name: true,
        description: true,
        instructorId: true,
        isArchived: true,
        createdAt: true,
        updatedAt: true,
      },
      with: {
        instructor: {
          columns: { id: true, name: true, email: true },
        },
        enrollments: {
          columns: {
            id: true,
            userId: true,
            groupId: true,
            enrolledAt: true,
          },
          with: {
            user: {
              columns: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!group) return notFound("Group");

    const canViewEmails = isAdmin(user.role) || group.instructorId === user.id;

    return NextResponse.json({
      data: {
        ...group,
        instructor: group.instructor
          ? {
              ...group.instructor,
              email: canViewEmails ? group.instructor.email : null,
            }
          : null,
        enrollments: group.enrollments.map((enrollment) => ({
          ...enrollment,
          user: {
            ...enrollment.user,
            email: canViewEmails ? enrollment.user.email : null,
          },
        })),
      },
    });
  } catch (error) {
    console.error("GET /api/v1/groups/[id] error:", error);
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
    const group = await db.query.groups.findFirst({ where: eq(groups.id, id) });
    if (!group) return notFound("Group");

    if (!isAdmin(user.role) && group.instructorId !== user.id) return forbidden();

    const body = await request.json();
    const { name, description, isArchived } = body;

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (isArchived !== undefined) updates.isArchived = isArchived;

    await db.update(groups).set(updates).where(eq(groups.id, id));

    const updated = await db.query.groups.findFirst({ where: eq(groups.id, id) });
    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("PATCH /api/v1/groups/[id] error:", error);
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
    const group = await db.query.groups.findFirst({ where: eq(groups.id, id) });
    if (!group) return notFound("Group");

    await db.delete(groups).where(eq(groups.id, id));
    return NextResponse.json({ data: { id } });
  } catch (error) {
    console.error("DELETE /api/v1/groups/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
