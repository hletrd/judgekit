import { NextRequest } from "next/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getApiUser, unauthorized, csrfForbidden, isAdmin, isInstructor } from "@/lib/api/auth";
import { apiSuccess, apiError } from "@/lib/api/responses";
import { getContestAssignment, type ContestAssignmentRow } from "@/lib/assignments/contests";
import { db, sqlite } from "@/lib/db";
import { users, enrollments, contestAccessTokens } from "@/lib/db/schema";
import { and, eq, inArray, like, or, sql } from "drizzle-orm";
import { logger } from "@/lib/logger";

function canManage(user: { id: string; role: string }, assignment: ContestAssignmentRow): boolean {
  return isAdmin(user.role) || (isInstructor(user.role) && assignment.instructorId === user.id);
}

const inviteSchema = z.object({
  username: z.string().min(1).max(255),
});

const searchSchema = z.object({
  q: z.string().min(1).max(100),
});

/**
 * GET - Search users to invite (autocomplete)
 */
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

    const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (!query) return apiSuccess([]);

    // Escape LIKE wildcards in user input
    const escaped = query.toLowerCase().replace(/[%_]/g, "\\$&");
    const likePattern = `%${escaped}%`;
    const results = await db
      .select({
        id: users.id,
        username: users.username,
        name: users.name,
        className: users.className,
      })
      .from(users)
      .where(
        and(
          eq(users.isActive, true),
          or(
            sql`lower(${users.username}) like ${likePattern} escape '\\'`,
            sql`lower(${users.name}) like ${likePattern} escape '\\'`
          )
        )
      )
      .limit(10);

    // Batch enrollment check (avoids N+1 query pattern)
    const userIds = results.map((u) => u.id);
    const enrolledRows = userIds.length > 0
      ? await db
          .select({ userId: enrollments.userId })
          .from(enrollments)
          .where(
            and(
              eq(enrollments.groupId, assignment.groupId),
              inArray(enrollments.userId, userIds)
            )
          )
      : [];
    const enrolledSet = new Set(enrolledRows.map((r) => r.userId));

    const enriched = results.map((u) => ({
      ...u,
      alreadyEnrolled: enrolledSet.has(u.id),
    }));

    return apiSuccess(enriched);
  } catch (error) {
    logger.error({ err: error }, "GET contest invite search error");
    return apiError("serverError", 500);
  }
}

/**
 * POST - Invite a user to the contest by username
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const csrfError = csrfForbidden(request);
    if (csrfError) return csrfError;

    const apiUser = await getApiUser(request);
    if (!apiUser) return unauthorized();
    const { assignmentId } = await params;

    const assignment = getContestAssignment(assignmentId);
    if (!assignment || assignment.examMode === "none") return apiError("notFound", 404);
    if (!canManage(apiUser, assignment)) return apiError("forbidden", 403);

    const body = await request.json();
    const parsed = inviteSchema.safeParse(body);
    if (!parsed.success) return apiError("invalidUsername", 400);

    const targetUser = await db.query.users.findFirst({
      where: eq(users.username, parsed.data.username),
      columns: { id: true, username: true, name: true },
    });

    if (!targetUser) return apiError("userNotFound", 404);

    const execute = sqlite.transaction(() => {
      // Create contest access token if not exists
      const existingToken = db
        .select({ id: contestAccessTokens.id })
        .from(contestAccessTokens)
        .where(
          and(
            eq(contestAccessTokens.assignmentId, assignmentId),
            eq(contestAccessTokens.userId, targetUser.id)
          )
        )
        .get();

      if (!existingToken) {
        db.insert(contestAccessTokens)
          .values({
            id: nanoid(),
            assignmentId,
            userId: targetUser.id,
            redeemedAt: new Date(),
            ipAddress: null, // Instructor-initiated invite; invitee IP not available
          })
          .run();
      }

      // Auto-enroll in group if not already
      const existingEnrollment = db
        .select({ id: enrollments.id })
        .from(enrollments)
        .where(
          and(
            eq(enrollments.groupId, assignment.groupId),
            eq(enrollments.userId, targetUser.id)
          )
        )
        .get();

      if (!existingEnrollment) {
        db.insert(enrollments)
          .values({
            id: nanoid(),
            userId: targetUser.id,
            groupId: assignment.groupId,
            enrolledAt: new Date(),
          })
          .run();
      }
    });

    execute();

    return apiSuccess({
      userId: targetUser.id,
      username: targetUser.username,
      name: targetUser.name,
    });
  } catch (error) {
    logger.error({ err: error }, "POST contest invite error");
    return apiError("inviteFailed", 500);
  }
}
