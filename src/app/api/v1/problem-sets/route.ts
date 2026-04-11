import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/responses";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { problemSets } from "@/lib/db/schema";
import { recordAuditEvent } from "@/lib/audit/events";
import { createProblemSet } from "@/lib/problem-sets/management";
import { problemSetMutationSchema } from "@/lib/validators/problem-sets";
import { createApiHandler } from "@/lib/api/handler";

export const GET = createApiHandler({
  auth: {
    capabilities: [
      "problem_sets.create",
      "problem_sets.edit",
      "problem_sets.delete",
      "problem_sets.assign_groups",
    ],
    requireAllCapabilities: false,
  },
  handler: async () => {
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
  auth: { capabilities: ["problem_sets.create"] },
  rateLimit: "problem-sets:create",
  handler: async (req: NextRequest, { user }) => {
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
