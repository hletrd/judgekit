import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/responses";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { problemSets } from "@/lib/db/schema";
import { recordAuditEvent } from "@/lib/audit/events";
import { updateProblemSet, deleteProblemSet } from "@/lib/problem-sets/management";
import { problemSetMutationSchema } from "@/lib/validators/problem-sets";
import { createApiHandler, isAdmin, forbidden, notFound } from "@/lib/api/handler";
import { isUserRole } from "@/lib/security/constants";

export const GET = createApiHandler({
  handler: async (_req: NextRequest, { user, params }) => {
    if (!isUserRole(user.role)) return forbidden();
    if (!isAdmin(user.role) && user.role !== "instructor") return forbidden();

    const { id } = params;
    const ps = await db.query.problemSets.findFirst({
      where: eq(problemSets.id, id),
      with: {
        problems: {
          with: {
            problem: {
              columns: { id: true, title: true },
            },
          },
        },
        groupAccess: {
          with: {
            group: {
              columns: { id: true, name: true },
            },
          },
        },
        creator: {
          columns: { id: true, name: true, username: true },
        },
      },
    });

    if (!ps) return notFound("ProblemSet");
    return apiSuccess(ps);
  },
});

export const PATCH = createApiHandler({
  rateLimit: "problem-sets:update",
  handler: async (req: NextRequest, { user, params }) => {
    if (!isUserRole(user.role)) return forbidden();
    if (!isAdmin(user.role) && user.role !== "instructor") return forbidden();

    const { id } = params;
    const existing = await db.query.problemSets.findFirst({
      where: eq(problemSets.id, id),
      columns: { id: true, name: true, createdBy: true },
    });

    if (!existing) return notFound("ProblemSet");

    // Instructors can only edit their own problem sets
    if (user.role === "instructor" && existing.createdBy !== user.id) {
      return forbidden();
    }

    const body = await req.json();
    const parsed = problemSetMutationSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "problemSetUpdateFailed", 400);
    }

    await updateProblemSet(id, parsed.data);

    const updated = await db.query.problemSets.findFirst({
      where: eq(problemSets.id, id),
      with: {
        problems: {
          with: {
            problem: {
              columns: { id: true, title: true },
            },
          },
        },
        groupAccess: {
          with: {
            group: {
              columns: { id: true, name: true },
            },
          },
        },
      },
    });

    if (updated) {
      recordAuditEvent({
        actorId: user.id,
        actorRole: user.role,
        action: "problem_set.updated",
        resourceType: "problem_set",
        resourceId: updated.id,
        resourceLabel: updated.name,
        summary: `Updated problem set "${updated.name}"`,
        details: {
          problemCount: updated.problems.length,
        },
        request: req,
      });
    }

    return apiSuccess(updated);
  },
});

export const DELETE = createApiHandler({
  rateLimit: "problem-sets:delete",
  handler: async (req: NextRequest, { user, params }) => {
    if (!isUserRole(user.role)) return forbidden();
    if (!isAdmin(user.role) && user.role !== "instructor") return forbidden();

    const { id } = params;
    const existing = await db.query.problemSets.findFirst({
      where: eq(problemSets.id, id),
      columns: { id: true, name: true, createdBy: true },
    });

    if (!existing) return notFound("ProblemSet");

    if (user.role === "instructor" && existing.createdBy !== user.id) {
      return forbidden();
    }

    await deleteProblemSet(id);

    recordAuditEvent({
      actorId: user.id,
      actorRole: user.role,
      action: "problem_set.deleted",
      resourceType: "problem_set",
      resourceId: existing.id,
      resourceLabel: existing.name,
      summary: `Deleted problem set "${existing.name}"`,
      request: req,
    });

    return apiSuccess({ id });
  },
});
