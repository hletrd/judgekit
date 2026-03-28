import { NextRequest } from "next/server";
import { LRUCache } from "lru-cache";
import { getApiUser, unauthorized, isAdmin, isInstructor } from "@/lib/api/auth";
import { apiSuccess, apiError } from "@/lib/api/responses";
import { computeContestAnalytics } from "@/lib/assignments/contest-analytics";
import { sqlite } from "@/lib/db";
import { consumeApiRateLimit } from "@/lib/security/api-rate-limit";
import { logger } from "@/lib/logger";

const analyticsCache = new LRUCache<string, any>({ max: 100, ttl: 60_000 });

type AssignmentRow = {
  groupId: string;
  instructorId: string | null;
  examMode: string;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const user = await getApiUser(request);
    if (!user) return unauthorized();

    const rl = consumeApiRateLimit(request, "analytics");
    if (rl) return rl;

    const { assignmentId } = await params;

    const assignment = sqlite
      .prepare<[string], AssignmentRow>(
        `SELECT a.group_id AS groupId, g.instructor_id AS instructorId, a.exam_mode AS examMode
         FROM assignments a INNER JOIN groups g ON g.id = a.group_id WHERE a.id = ?`
      )
      .get(assignmentId);

    if (!assignment || assignment.examMode === "none") {
      return apiError("notFound", 404);
    }

    const canView =
      isAdmin(user.role) ||
      (isInstructor(user.role) && assignment.instructorId === user.id);

    if (!canView) {
      return apiError("forbidden", 403);
    }

    const cacheKey = assignmentId;
    const cached = analyticsCache.get(cacheKey);
    if (cached) return apiSuccess(cached);

    const analytics = computeContestAnalytics(assignmentId);
    analyticsCache.set(cacheKey, analytics);
    return apiSuccess(analytics);
  } catch (error) {
    logger.error({ err: error }, "GET analytics error");
    return apiError("serverError", 500);
  }
}
