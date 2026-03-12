import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/responses";
import { db } from "@/lib/db";
import { assignments, groups, submissions, enrollments } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { canAccessGroup } from "@/lib/auth/permissions";
import { getApiUser, unauthorized, forbidden, notFound, isAdmin, csrfForbidden } from "@/lib/api/auth";
import { recordAuditEvent } from "@/lib/audit/events";
import { updateGroupSchema } from "@/lib/validators/groups";
import { consumeApiRateLimit } from "@/lib/security/api-rate-limit";
import { logger } from "@/lib/logger";

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
          limit: 50,
        },
      },
    });

    if (!group) return notFound("Group");

    // Get total member count for pagination
    const memberCountResult = await db
      .select({ count: sql<number>`count(${enrollments.id})` })
      .from(enrollments)
      .where(eq(enrollments.groupId, id));
    const memberCount = Number(memberCountResult[0]?.count ?? 0);

    const canViewEmails = isAdmin(user.role) || group.instructorId === user.id;

    return apiSuccess({
      ...group,
      memberCount,
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
    });
  } catch (error) {
    logger.error({ err: error }, "GET /api/v1/groups/[id] error");
    return apiError("internalServerError", 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const csrfError = csrfForbidden(request);
    if (csrfError) return csrfError;

    const rateLimitResponse = consumeApiRateLimit(request, "groups:update");
    if (rateLimitResponse) return rateLimitResponse;

    const user = await getApiUser(request);
    if (!user) return unauthorized();

    const { id } = await params;
    const group = await db.query.groups.findFirst({ where: eq(groups.id, id) });
    if (!group) return notFound("Group");

    if (!isAdmin(user.role) && group.instructorId !== user.id) return forbidden();

    const body = await request.json();
    const parsed = updateGroupSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "validationError", 400);
    }

    const { name, description, isArchived } = parsed.data;

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description ?? null;
    if (isArchived !== undefined) updates.isArchived = isArchived;

    await db.update(groups).set(updates).where(eq(groups.id, id));

    const updated = await db.query.groups.findFirst({ where: eq(groups.id, id) });

    if (updated) {
      recordAuditEvent({
        actorId: user.id,
        actorRole: user.role,
        action: "group.updated",
        resourceType: "group",
        resourceId: updated.id,
        resourceLabel: updated.name,
        summary: `Updated group \"${updated.name}\"`,
        details: {
          changedFields: Object.keys(body).filter((key) => ["name", "description", "isArchived"].includes(key)),
          isArchived: updated.isArchived,
        },
        request,
      });
    }

    return apiSuccess(updated);
  } catch (error) {
    logger.error({ err: error }, "PATCH /api/v1/groups/[id] error");
    return apiError("internalServerError", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const csrfError = csrfForbidden(request);
    if (csrfError) return csrfError;

    const rateLimitResponse = consumeApiRateLimit(request, "groups:delete");
    if (rateLimitResponse) return rateLimitResponse;

    const user = await getApiUser(request);
    if (!user) return unauthorized();
    if (!isAdmin(user.role)) return forbidden();

    const { id } = await params;
    const group = await db.query.groups.findFirst({ where: eq(groups.id, id) });
    if (!group) return notFound("Group");

    const assignmentSubmissionCountRow = await db
      .select({ total: sql<number>`count(${submissions.id})` })
      .from(assignments)
      .innerJoin(submissions, eq(submissions.assignmentId, assignments.id))
      .where(eq(assignments.groupId, id))
      .then((rows) => rows[0] ?? { total: 0 });

    const assignmentSubmissionCount = Number(assignmentSubmissionCountRow.total ?? 0);

    if (assignmentSubmissionCount > 0) {
      return apiError("groupDeleteBlocked", 409);
    }

    await db.delete(groups).where(eq(groups.id, id));

    recordAuditEvent({
      actorId: user.id,
      actorRole: user.role,
      action: "group.deleted",
      resourceType: "group",
      resourceId: group.id,
      resourceLabel: group.name,
      summary: `Deleted group \"${group.name}\"`,
      details: {
        isArchived: group.isArchived,
      },
      request,
    });

    return apiSuccess({ id });
  } catch (error) {
    logger.error({ err: error }, "DELETE /api/v1/groups/[id] error");
    return apiError("internalServerError", 500);
  }
}
