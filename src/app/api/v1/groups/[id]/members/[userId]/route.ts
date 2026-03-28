import { NextRequest, NextResponse } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/responses";
import { and, eq } from "drizzle-orm";
import { recordAuditEvent } from "@/lib/audit/events";
import { db } from "@/lib/db";
import { assignments, enrollments, submissions } from "@/lib/db/schema";
import { canManageGroupResources } from "@/lib/assignments/management";
import { getApiUser, forbidden, notFound, unauthorized, csrfForbidden } from "@/lib/api/auth";
import { assertUserRole } from "@/lib/security/constants";
import { consumeApiRateLimit } from "@/lib/security/api-rate-limit";
import { logger } from "@/lib/logger";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const csrfError = csrfForbidden(request);
    if (csrfError) return csrfError;

    const rateLimitResponse = consumeApiRateLimit(request, "members:remove");
    if (rateLimitResponse) return rateLimitResponse;

    const user = await getApiUser(request);
    if (!user) return unauthorized();

    const { id, userId } = await params;
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

    const enrollment = await db.query.enrollments.findFirst({
      where: and(eq(enrollments.groupId, id), eq(enrollments.userId, userId)),
      columns: { id: true },
    });

    if (!enrollment) {
      return apiError("studentEnrollmentNotFound", 404);
    }

    const member = await db.query.users.findFirst({
      where: (users, { eq: equals }) => equals(users.id, userId),
      columns: { id: true, username: true },
    });

    const assignmentSubmission = await db
      .select({ id: submissions.id })
      .from(submissions)
      .innerJoin(assignments, eq(assignments.id, submissions.assignmentId))
      .where(and(eq(submissions.userId, userId), eq(assignments.groupId, id)))
      .then((rows) => rows[0] ?? null);

    if (assignmentSubmission) {
      return apiError("groupMemberRemovalBlocked", 409);
    }

    await db.delete(enrollments).where(eq(enrollments.id, enrollment.id));

    recordAuditEvent({
      actorId: user.id,
      actorRole: user.role,
      action: "group.member_removed",
      resourceType: "group_member",
      resourceId: userId,
      resourceLabel: member?.username ?? userId,
      summary: `Removed @${member?.username ?? userId} from group membership`,
      details: {
        groupId: id,
        username: member?.username ?? null,
      },
      request,
    });

    return apiSuccess({ userId });
  } catch (error) {
    logger.error({ err: error }, "DELETE /api/v1/groups/[id]/members/[userId] error");
    return apiError("memberRemoveFailed", 500);
  }
}
