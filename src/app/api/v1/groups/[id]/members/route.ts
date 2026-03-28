import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/responses";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { recordAuditEvent } from "@/lib/audit/events";
import { db } from "@/lib/db";
import { enrollments, users } from "@/lib/db/schema";
import { canManageGroupResources } from "@/lib/assignments/management";
import { groupMembershipSchema } from "@/lib/validators/groups";
import { canAccessGroup } from "@/lib/auth/permissions";
import { assertUserRole } from "@/lib/security/constants";
import { createApiHandler, forbidden, notFound } from "@/lib/api/handler";

export const GET = createApiHandler({
  handler: async (_req: NextRequest, { user, params }) => {
    const { id } = params;
    const hasAccess = await canAccessGroup(id, user.id, user.role);
    if (!hasAccess) return forbidden();

    const members = await db.query.enrollments.findMany({
      where: eq(enrollments.groupId, id),
      with: {
        user: {
          columns: {
            id: true,
            username: true,
            name: true,
            className: true,
            isActive: true,
          },
        },
      },
    });

    return apiSuccess(members);
  },
});

export const POST = createApiHandler({
  rateLimit: "members:add",
  schema: groupMembershipSchema,
  handler: async (req: NextRequest, { user, body, params }) => {
    const { id } = params;
    const group = await db.query.groups.findFirst({
      where: (groups, { eq: equals }) => equals(groups.id, id),
      columns: { id: true, instructorId: true },
    });

    if (!group) return notFound("Group");

    const canManage = canManageGroupResources(
      group.instructorId,
      user.id,
      user.role
    );

    if (!canManage) return forbidden();

    const student = await db.query.users.findFirst({
      where: eq(users.id, body.userId),
      columns: {
        id: true,
        username: true,
        name: true,
        className: true,
        role: true,
        isActive: true,
      },
    });

    if (!student) {
      return apiError("studentNotFound", 404);
    }

    if (!student.isActive) {
      return apiError("studentInactive", 409);
    }

    if (student.role !== "student") {
      return apiError("studentRoleInvalid", 409);
    }

    const existingEnrollment = await db.query.enrollments.findFirst({
      where: (enrollmentsTable, { and, eq: equals }) =>
        and(
          equals(enrollmentsTable.groupId, id),
          equals(enrollmentsTable.userId, body.userId)
        ),
      columns: { id: true },
    });

    if (existingEnrollment) {
      return apiError("studentAlreadyEnrolled", 409);
    }

    const enrollmentId = nanoid();
    await db.insert(enrollments).values({
      id: enrollmentId,
      groupId: id,
      userId: body.userId,
      enrolledAt: new Date(),
    });

    const createdEnrollment = await db.query.enrollments.findFirst({
      where: eq(enrollments.id, enrollmentId),
      with: {
        user: {
          columns: {
            id: true,
            username: true,
            name: true,
            className: true,
            isActive: true,
          },
        },
      },
    });

    if (createdEnrollment?.user) {
      recordAuditEvent({
        actorId: user.id,
        actorRole: user.role,
        action: "group.member_added",
        resourceType: "group_member",
        resourceId: createdEnrollment.user.id,
        resourceLabel: createdEnrollment.user.username,
        summary: `Added @${createdEnrollment.user.username} to group membership`,
        details: {
          groupId: id,
          username: createdEnrollment.user.username,
        },
        request: req,
      });
    }

    return apiSuccess(createdEnrollment, { status: 201 });
  },
});
