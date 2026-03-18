import { NextRequest } from "next/server";
import { getApiUser, unauthorized, csrfForbidden, isAdmin, isInstructor } from "@/lib/api/auth";
import { apiSuccess, apiError } from "@/lib/api/responses";
import { setAccessCode, revokeAccessCode, getAccessCode } from "@/lib/assignments/access-codes";
import { getContestAssignment, type ContestAssignmentRow } from "@/lib/assignments/contests";
import { logger } from "@/lib/logger";

function canManage(user: { id: string; role: string }, assignment: ContestAssignmentRow): boolean {
  return isAdmin(user.role) || (isInstructor(user.role) && assignment.instructorId === user.id);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const user = await getApiUser(request);
    if (!user) return unauthorized();
    const { assignmentId } = await params;

    const assignment = getContestAssignment(assignmentId);
    if (!assignment || assignment.examMode === "none") return apiError("notFound", 404);
    if (!canManage(user, assignment)) return apiError("forbidden", 403);

    const code = getAccessCode(assignmentId);
    return apiSuccess({ accessCode: code });
  } catch (error) {
    logger.error({ err: error }, "GET access-code error");
    return apiError("serverError", 500);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const csrfError = csrfForbidden(request);
    if (csrfError) return csrfError;

    const user = await getApiUser(request);
    if (!user) return unauthorized();
    const { assignmentId } = await params;

    const assignment = getContestAssignment(assignmentId);
    if (!assignment || assignment.examMode === "none") return apiError("notFound", 404);
    if (!canManage(user, assignment)) return apiError("forbidden", 403);

    const code = setAccessCode(assignmentId);
    return apiSuccess({ accessCode: code }, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "POST access-code error");
    return apiError("serverError", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const csrfError = csrfForbidden(request);
    if (csrfError) return csrfError;

    const user = await getApiUser(request);
    if (!user) return unauthorized();
    const { assignmentId } = await params;

    const assignment = getContestAssignment(assignmentId);
    if (!assignment || assignment.examMode === "none") return apiError("notFound", 404);
    if (!canManage(user, assignment)) return apiError("forbidden", 403);

    revokeAccessCode(assignmentId);
    return apiSuccess({ accessCode: null });
  } catch (error) {
    logger.error({ err: error }, "DELETE access-code error");
    return apiError("serverError", 500);
  }
}
