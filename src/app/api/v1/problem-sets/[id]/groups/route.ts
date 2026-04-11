import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/responses";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { problemSets } from "@/lib/db/schema";
import { recordAuditEvent } from "@/lib/audit/events";
import {
  assignProblemSetToGroups,
  removeProblemSetFromGroup,
} from "@/lib/problem-sets/management";
import { problemSetGroupAssignSchema } from "@/lib/validators/problem-sets";
import { createApiHandler, forbidden, notFound } from "@/lib/api/handler";

export const POST = createApiHandler({
  auth: { capabilities: ["problem_sets.assign_groups"] },
  rateLimit: "problem-sets:assign",
  handler: async (req: NextRequest, { user, params }) => {
    const { id } = params;
    const existing = await db.query.problemSets.findFirst({
      where: eq(problemSets.id, id),
      columns: { id: true, name: true, createdBy: true },
    });

    if (!existing) return notFound("ProblemSet");

    if (user.role === "instructor" && existing.createdBy !== user.id) {
      return forbidden();
    }

    const body = await req.json();
    const parsed = problemSetGroupAssignSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "problemSetAssignFailed", 400);
    }

    await assignProblemSetToGroups(id, parsed.data.groupIds);

    const updated = await db.query.problemSets.findFirst({
      where: eq(problemSets.id, id),
      with: {
        groupAccess: {
          with: {
            group: {
              columns: { id: true, name: true },
            },
          },
        },
      },
    });

    recordAuditEvent({
      actorId: user.id,
      actorRole: user.role,
      action: "problem_set.groups_assigned",
      resourceType: "problem_set",
      resourceId: existing.id,
      resourceLabel: existing.name,
      summary: `Assigned problem set "${existing.name}" to ${parsed.data.groupIds.length} group(s)`,
      details: {
        groupIds: parsed.data.groupIds,
      },
      request: req,
    });

    return apiSuccess(updated);
  },
});

export const DELETE = createApiHandler({
  auth: { capabilities: ["problem_sets.assign_groups"] },
  rateLimit: "problem-sets:unassign",
  handler: async (req: NextRequest, { user, params }) => {
    const { id } = params;
    const existing = await db.query.problemSets.findFirst({
      where: eq(problemSets.id, id),
      columns: { id: true, name: true, createdBy: true },
    });

    if (!existing) return notFound("ProblemSet");

    if (user.role === "instructor" && existing.createdBy !== user.id) {
      return forbidden();
    }

    const body = await req.json();
    const groupId = body?.groupId;

    if (!groupId || typeof groupId !== "string") {
      return apiError("problemSetGroupRequired", 400);
    }

    await removeProblemSetFromGroup(id, groupId);

    recordAuditEvent({
      actorId: user.id,
      actorRole: user.role,
      action: "problem_set.group_removed",
      resourceType: "problem_set",
      resourceId: existing.id,
      resourceLabel: existing.name,
      summary: `Removed group from problem set "${existing.name}"`,
      details: { groupId },
      request: req,
    });

    return apiSuccess({ id, groupId });
  },
});
