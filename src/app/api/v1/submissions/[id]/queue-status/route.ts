import { NextRequest } from "next/server";
import { and, count, eq, inArray, lt } from "drizzle-orm";
import { createApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/responses";
import { db } from "@/lib/db";
import { submissions } from "@/lib/db/schema";
import { forbidden, notFound } from "@/lib/api/auth";
import { canAccessSubmission } from "@/lib/auth/permissions";

const QUEUED_STATUSES = ["pending", "queued"] as const;

export const GET = createApiHandler({
  handler: async (_req: NextRequest, { user, params }) => {
    const { id } = params;

    const submission = await db.query.submissions.findFirst({
      where: eq(submissions.id, id),
      columns: {
        id: true,
        userId: true,
        assignmentId: true,
        status: true,
        submittedAt: true,
      },
    });

    if (!submission) {
      return notFound("Submission");
    }

    const hasAccess = await canAccessSubmission(submission, user.id, user.role);
    if (!hasAccess) {
      return forbidden();
    }

    let queuePosition: number | null = null;

    if (submission.status && QUEUED_STATUSES.includes(submission.status as (typeof QUEUED_STATUSES)[number])) {
      const [row] = await db
        .select({ count: count() })
        .from(submissions)
        .where(
          and(
            inArray(submissions.status, [...QUEUED_STATUSES]),
            lt(submissions.submittedAt, submission.submittedAt ?? new Date(0)),
          ),
        );

      queuePosition = Number(row?.count ?? 0);
    } else if (submission.status === "judging") {
      queuePosition = 0;
    }

    return apiSuccess({
      status: submission.status ?? "pending",
      queuePosition,
      estimatedWaitSeconds: null,
      gradingTestCase: null,
    });
  },
});
