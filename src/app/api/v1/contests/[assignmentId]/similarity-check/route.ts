import { NextRequest } from "next/server";
import { getApiUser, unauthorized, csrfForbidden, isAdmin, isInstructor } from "@/lib/api/auth";
import { apiSuccess, apiError } from "@/lib/api/responses";
import { consumeApiRateLimit } from "@/lib/security/api-rate-limit";
import { runAndStoreSimilarityCheck } from "@/lib/assignments/code-similarity";
import { getContestAssignment } from "@/lib/assignments/contests";
import { logger } from "@/lib/logger";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const csrfError = csrfForbidden(request);
    if (csrfError) return csrfError;

    const user = await getApiUser(request);
    if (!user) return unauthorized();

    const rl = consumeApiRateLimit(request, "similarity-check");
    if (rl) return rl;

    const { assignmentId } = await params;

    const assignment = getContestAssignment(assignmentId);

    if (!assignment || assignment.examMode === "none") {
      return apiError("notFound", 404);
    }

    const canManage =
      isAdmin(user.role) ||
      (isInstructor(user.role) && assignment.instructorId === user.id);

    if (!canManage) {
      return apiError("forbidden", 403);
    }

    let flaggedCount: number;
    try {
      flaggedCount = await Promise.race([
        new Promise<number>((resolve) => {
          resolve(runAndStoreSimilarityCheck(assignmentId));
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Similarity check timed out")), 30_000)
        ),
      ]);
    } catch (error) {
      if (error instanceof Error && error.message.includes("timed out")) {
        return apiError("similarityCheckTimeout", 504);
      }
      throw error;
    }

    return apiSuccess({ flaggedPairs: flaggedCount });
  } catch (error) {
    logger.error({ err: error }, "POST similarity-check error");
    return apiError("serverError", 500);
  }
}
