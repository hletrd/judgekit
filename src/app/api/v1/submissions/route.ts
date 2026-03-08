import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { languageConfigs, problems, submissions } from "@/lib/db/schema";
import { isJudgeLanguage } from "@/lib/judge/languages";
import { and, desc, eq, gt, sql } from "drizzle-orm";
import { getApiUser, unauthorized, isAdmin, csrfForbidden } from "@/lib/api/auth";
import { recordAuditEvent } from "@/lib/audit/events";
import { canAccessProblem } from "@/lib/auth/permissions";
import {
  getStudentAssignmentContextsForProblem,
  validateAssignmentSubmission,
} from "@/lib/assignments/submissions";
import {
  MAX_SOURCE_CODE_SIZE_BYTES,
  SUBMISSION_RATE_LIMIT_MAX_PER_MINUTE,
  SUBMISSION_MAX_PENDING,
  SUBMISSION_GLOBAL_QUEUE_LIMIT,
  isSubmissionStatus,
} from "@/lib/security/constants";
import { generateSubmissionId } from "@/lib/submissions/id";
import { submissionCreateSchema } from "@/lib/validators/api";

export async function GET(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    if (!user) return unauthorized();

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const offset = (page - 1) * limit;
    const problemId = searchParams.get("problemId");
    const status = searchParams.get("status");

    if (status && !isSubmissionStatus(status)) {
      return NextResponse.json({ error: "invalidSubmissionStatus" }, { status: 400 });
    }

    const userFilter = isAdmin(user.role) ? undefined : eq(submissions.userId, user.id);
    const problemFilter = problemId ? eq(submissions.problemId, problemId) : undefined;
    const statusFilter = status ? eq(submissions.status, status) : undefined;
    const filters = [userFilter, problemFilter, statusFilter].flatMap((filter) =>
      filter ? [filter] : []
    );
    const whereClause =
      filters.length === 0 ? undefined : filters.length === 1 ? filters[0] : and(...filters);

    const [totalRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(submissions)
      .where(whereClause);

    const results = await db.query.submissions.findMany({
      where: whereClause,
      columns: {
        id: true,
        userId: true,
        problemId: true,
        assignmentId: true,
        language: true,
        status: true,
        executionTimeMs: true,
        memoryUsedKb: true,
        score: true,
        judgedAt: true,
        submittedAt: true,
      },
      orderBy: [desc(submissions.submittedAt)],
      limit,
      offset,
    });

    return NextResponse.json({ data: results, page, limit, total: Number(totalRow?.count ?? 0) });
  } catch (error) {
    console.error("GET /api/v1/submissions error:", error);
    return NextResponse.json({ error: "submissionLoadFailed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const csrfError = csrfForbidden(request);
    if (csrfError) return csrfError;

    const user = await getApiUser(request);
    if (!user) return unauthorized();

    const parsed = submissionCreateSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "submissionCreateFailed" },
        { status: 400 }
      );
    }

    const { problemId, language, sourceCode } = parsed.data;
    const normalizedAssignmentId = parsed.data.assignmentId ?? null;

    if (!isJudgeLanguage(language)) {
      return NextResponse.json({ error: "languageNotSupported" }, { status: 400 });
    }

    // Submission rate limiting: per-user recent submissions
    const oneMinuteAgo = new Date(Date.now() - 60_000);
    const recentSubmissions = await db
      .select({ count: sql<number>`count(*)` })
      .from(submissions)
      .where(
        and(
          eq(submissions.userId, user.id),
          gt(submissions.submittedAt, oneMinuteAgo)
        )
      )
      .then((rows) => Number(rows[0]?.count ?? 0));

    if (recentSubmissions >= SUBMISSION_RATE_LIMIT_MAX_PER_MINUTE) {
      return NextResponse.json(
        { error: "submissionRateLimited" },
        {
          status: 429,
          headers: { "Retry-After": "60" },
        }
      );
    }

    // Per-user concurrency limit: max pending/judging submissions
    const pendingCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(submissions)
      .where(
        and(
          eq(submissions.userId, user.id),
          sql`${submissions.status} IN ('pending', 'judging', 'queued')`
        )
      )
      .then((rows) => Number(rows[0]?.count ?? 0));

    if (pendingCount >= SUBMISSION_MAX_PENDING) {
      return NextResponse.json(
        { error: "tooManyPendingSubmissions" },
        {
          status: 429,
          headers: { "Retry-After": "10" },
        }
      );
    }

    // Global queue depth limit
    const globalPendingCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(submissions)
      .where(sql`${submissions.status} IN ('pending', 'queued')`)
      .then((rows) => Number(rows[0]?.count ?? 0));

    if (globalPendingCount >= SUBMISSION_GLOBAL_QUEUE_LIMIT) {
      return NextResponse.json(
        { error: "judgeQueueFull" },
        { status: 503, headers: { "Retry-After": "30" } }
      );
    }

    if (Buffer.byteLength(sourceCode, "utf8") > MAX_SOURCE_CODE_SIZE_BYTES) {
      return NextResponse.json(
        {
          error: "sourceCodeTooLarge",
        },
        { status: 413 }
      );
    }

    const problem = await db.query.problems.findFirst({
      where: eq(problems.id, problemId),
      columns: { id: true, title: true },
    });

    if (!problem) {
      return NextResponse.json({ error: "problemNotFound" }, { status: 404 });
    }

    if (!normalizedAssignmentId && user.role === "student") {
      const assignmentContexts = await getStudentAssignmentContextsForProblem(problemId, user.id);

      if (assignmentContexts.length > 0) {
        return NextResponse.json({ error: "assignmentContextRequired" }, { status: 409 });
      }
    }

    if (normalizedAssignmentId) {
      const assignmentValidation = await validateAssignmentSubmission(
        normalizedAssignmentId,
        problemId,
        user.id,
        user.role
      );

      if (!assignmentValidation.ok) {
        return NextResponse.json(
          { error: assignmentValidation.error },
          { status: assignmentValidation.status }
        );
      }
    }

    const hasAccess = await canAccessProblem(problemId, user.id, user.role);

    if (!hasAccess) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const languageConfig = await db.query.languageConfigs.findFirst({
      where: and(
        eq(languageConfigs.language, language),
        eq(languageConfigs.isEnabled, true)
      ),
      columns: {
        id: true,
      },
    });

    if (!languageConfig) {
      return NextResponse.json({ error: "languageNotSupported" }, { status: 400 });
    }

    const id = generateSubmissionId();
    await db.insert(submissions).values({
      id,
      userId: user.id,
      problemId,
      language,
      sourceCode,
      assignmentId: normalizedAssignmentId,
      status: "pending",
      submittedAt: new Date(),
    });

    const submission = await db.query.submissions.findFirst({
      where: eq(submissions.id, id),
    });

    if (submission) {
      recordAuditEvent({
        actorId: user.id,
        actorRole: user.role,
        action: "submission.created",
        resourceType: "submission",
        resourceId: submission.id,
        resourceLabel: submission.id,
        summary: `Created submission ${submission.id} for "${problem.title}"`,
        details: {
          assignmentId: normalizedAssignmentId,
          language,
          problemId: problem.id,
          problemTitle: problem.title,
        },
        request,
      });
    }

    return NextResponse.json({ data: submission }, { status: 201 });
  } catch (error) {
    console.error("POST /api/v1/submissions error:", error);
    return NextResponse.json({ error: "submissionCreateFailed" }, { status: 500 });
  }
}
