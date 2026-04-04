import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/responses";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { problemSets } from "@/lib/db/schema";
import { recordAuditEvent } from "@/lib/audit/events";
import { createProblemSet } from "@/lib/problem-sets/management";
import { problemSetMutationSchema } from "@/lib/validators/problem-sets";
import { createApiHandler, isAdmin, forbidden } from "@/lib/api/handler";
import { isUserRole } from "@/lib/security/constants";

export const GET = createApiHandler({
  handler: async (_req: NextRequest, { user }) => {
    if (!isUserRole(user.role)) return forbidden();

    // Admins/instructors see all; students don't access this endpoint
    if (!isAdmin(user.role) && user.role !== "instructor") return forbidden();

    const allSets = await db.query.problemSets.findMany({
      orderBy: [desc(problemSets.createdAt)],
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

    return apiSuccess(allSets);
  },
});

export const POST = createApiHandler({
  rateLimit: "problem-sets:create",
  handler: async (req: NextRequest, { user }) => {
    if (!isUserRole(user.role)) return forbidden();
    if (!isAdmin(user.role) && user.role !== "instructor") return forbidden();

    const body = await req.json();
    const parsed = problemSetMutationSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "problemSetCreateFailed", 400);
    }

    const id = await createProblemSet(parsed.data, user.id);

    const created = await db.query.problemSets.findFirst({
      where: (ps, { eq }) => eq(ps.id, id),
      with: {
        problems: {
          with: {
            problem: {
              columns: { id: true, title: true },
            },
          },
        },
        groupAccess: true,
      },
    });

    if (created) {
      recordAuditEvent({
        actorId: user.id,
        actorRole: user.role,
        action: "problem_set.created",
        resourceType: "problem_set",
        resourceId: created.id,
        resourceLabel: created.name,
        summary: `Created problem set "${created.name}"`,
        details: {
          problemCount: created.problems.length,
        },
        request: req,
      });
    }

    return apiSuccess(created, { status: 201 });
  },
});
