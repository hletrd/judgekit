import { NextRequest } from "next/server";
import { createApiHandler } from "@/lib/api/handler";
import { apiSuccess, apiError } from "@/lib/api/responses";
import { setAccessCode, revokeAccessCode, getAccessCode } from "@/lib/assignments/access-codes";
import { getContestAssignment, canManageContest } from "@/lib/assignments/contests";


export const GET = createApiHandler({
  handler: async (req: NextRequest, { user, params }) => {
    const { assignmentId } = params;

    const assignment = await getContestAssignment(assignmentId);
    if (!assignment || assignment.examMode === "none") return apiError("notFound", 404);
    if (!canManageContest(user, assignment)) return apiError("forbidden", 403);

    const code = await getAccessCode(assignmentId);
    return apiSuccess({ accessCode: code });
  },
});

export const POST = createApiHandler({
  handler: async (req: NextRequest, { user, params }) => {
    const { assignmentId } = params;

    const assignment = await getContestAssignment(assignmentId);
    if (!assignment || assignment.examMode === "none") return apiError("notFound", 404);
    if (!canManageContest(user, assignment)) return apiError("forbidden", 403);

    const code = await setAccessCode(assignmentId);
    return apiSuccess({ accessCode: code }, { status: 201 });
  },
});

export const DELETE = createApiHandler({
  handler: async (req: NextRequest, { user, params }) => {
    const { assignmentId } = params;

    const assignment = await getContestAssignment(assignmentId);
    if (!assignment || assignment.examMode === "none") return apiError("notFound", 404);
    if (!canManageContest(user, assignment)) return apiError("forbidden", 403);

    await revokeAccessCode(assignmentId);
    return apiSuccess({ accessCode: null });
  },
});
