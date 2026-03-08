import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { groups, enrollments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getApiUser, unauthorized, forbidden, isAdmin, isInstructor } from "@/lib/api/auth";
import { recordAuditEvent } from "@/lib/audit/events";
import { nanoid } from "nanoid";
import { createGroupSchema } from "@/lib/validators/groups";

export async function GET(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    if (!user) return unauthorized();

    let results;

    if (isAdmin(user.role) || isInstructor(user.role)) {
      results = await db.query.groups.findMany({
        with: {
          instructor: {
            columns: { id: true, name: true, email: true },
          },
        },
      });
    } else {
      const userEnrollments = await db.query.enrollments.findMany({
        where: eq(enrollments.userId, user.id),
        with: {
          group: {
            with: {
              instructor: {
                columns: { id: true, name: true, email: true },
              },
            },
          },
        },
      });
      results = userEnrollments.map((e) => e.group);
    }

    return NextResponse.json({ data: results });
  } catch (error) {
    console.error("GET /api/v1/groups error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    if (!user) return unauthorized();
    if (!isInstructor(user.role)) return forbidden();

    const body = await request.json();
    const parsedInput = createGroupSchema.safeParse(body);

    if (!parsedInput.success) {
      return NextResponse.json(
        { error: parsedInput.error.issues[0]?.message ?? "createError" },
        { status: 400 }
      );
    }

    const { name, description } = parsedInput.data;

    const id = nanoid();
    await db.insert(groups).values({
      id,
      name,
      description: description || null,
      instructorId: user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const group = await db.query.groups.findFirst({ where: eq(groups.id, id) });

    if (group) {
      recordAuditEvent({
        actorId: user.id,
        actorRole: user.role,
        action: "group.created",
        resourceType: "group",
        resourceId: group.id,
        resourceLabel: group.name,
        summary: `Created group \"${group.name}\"`,
        details: {
          isArchived: group.isArchived,
        },
        request,
      });
    }

    return NextResponse.json({ data: group }, { status: 201 });
  } catch (error) {
    console.error("POST /api/v1/groups error:", error);
    return NextResponse.json({ error: "createError" }, { status: 500 });
  }
}
