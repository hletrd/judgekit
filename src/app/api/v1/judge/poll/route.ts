import { NextRequest, NextResponse } from "next/server";
import { db, sqlite } from "@/lib/db";
import { problems, submissions, submissionResults, testCases } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { recordAuditEvent } from "@/lib/audit/events";
import { isJudgeAuthorized } from "@/lib/judge/auth";
import { isSubmissionStatus } from "@/lib/security/constants";

const IN_PROGRESS_STATUSES = new Set(["queued", "judging"]);

type ClaimedSubmissionRow = {
  id: string;
  userId: string;
  problemId: string;
  assignmentId: string | null;
  language: string;
  sourceCode: string;
  status: string | null;
  compileOutput: string | null;
  executionTimeMs: number | null;
  memoryUsedKb: number | null;
  score: number | null;
  judgedAt: number | null;
  submittedAt: number;
};

export async function GET(request: NextRequest) {
  try {
    if (!isJudgeAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const claimed = sqlite
      .prepare(
        `
          UPDATE submissions
          SET status = 'queued'
          WHERE id = (
            SELECT id
            FROM submissions
            WHERE status = 'pending'
            ORDER BY submitted_at ASC
            LIMIT 1
          )
          RETURNING
            id,
            user_id AS userId,
            problem_id AS problemId,
            assignment_id AS assignmentId,
            language,
            source_code AS sourceCode,
            status,
            compile_output AS compileOutput,
            execution_time_ms AS executionTimeMs,
            memory_used_kb AS memoryUsedKb,
            score,
            judged_at AS judgedAt,
            submitted_at AS submittedAt
        `
      )
      .get() as ClaimedSubmissionRow | undefined;

    if (!claimed) {
      return NextResponse.json({ data: null });
    }

    recordAuditEvent({
      action: "submission.claimed_for_judging",
      actorRole: "system",
      resourceType: "submission",
      resourceId: claimed.id,
      resourceLabel: claimed.id,
      summary: `Claimed submission ${claimed.id} for judging`,
      details: {
        assignmentId: claimed.assignmentId,
        language: claimed.language,
        problemId: claimed.problemId,
        status: claimed.status,
      },
      request,
    });

    const problem = await db.query.problems.findFirst({
      where: eq(problems.id, claimed.problemId),
      columns: {
        timeLimitMs: true,
        memoryLimitMb: true,
      },
    });

    if (!problem) {
      return NextResponse.json({ error: "Problem not found" }, { status: 500 });
    }

    // Fetch test cases for the problem
    const cases = await db
      .select()
      .from(testCases)
      .where(eq(testCases.problemId, claimed.problemId))
      .orderBy(asc(testCases.sortOrder));

    return NextResponse.json({
      data: {
        ...claimed,
        timeLimitMs: problem.timeLimitMs,
        memoryLimitMb: problem.memoryLimitMb,
        testCases: cases,
      },
    });
  } catch (error) {
    console.error("GET /api/v1/judge/poll error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isJudgeAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { submissionId, status, compileOutput, results } = body;

    if (!submissionId || typeof submissionId !== "string") {
      return NextResponse.json({ error: "submissionId is required" }, { status: 400 });
    }
    if (!status || typeof status !== "string") {
      return NextResponse.json({ error: "status is required" }, { status: 400 });
    }
    if (!isSubmissionStatus(status)) {
      return NextResponse.json({ error: "Invalid submission status" }, { status: 400 });
    }

    const submission = await db.query.submissions.findFirst({
      where: eq(submissions.id, submissionId),
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    if (IN_PROGRESS_STATUSES.has(status)) {
      await db
        .update(submissions)
        .set({
          status,
        })
        .where(eq(submissions.id, submissionId));

      const updatedInProgress = await db.query.submissions.findFirst({
        where: eq(submissions.id, submissionId),
      });

      recordAuditEvent({
        action: "submission.status_updated",
        actorRole: "system",
        resourceType: "submission",
        resourceId: submission.id,
        resourceLabel: submission.id,
        summary: `Marked submission ${submission.id} as ${status}`,
        details: {
          previousStatus: submission.status,
          status,
        },
        request,
      });

      return NextResponse.json({ data: updatedInProgress });
    }

    let score: number | null = null;
    let maxExecutionTimeMs: number | null = null;
    let maxMemoryUsedKb: number | null = null;

    if (Array.isArray(results) && results.length > 0) {
      const passed = results.filter((r: { status: string }) => r.status === "accepted").length;
      score = (passed / results.length) * 100;

      const times = results
        .map((r: { executionTimeMs?: number }) => r.executionTimeMs)
        .filter((t): t is number => typeof t === "number");
      if (times.length > 0) maxExecutionTimeMs = Math.max(...times);

      const mems = results
        .map((r: { memoryUsedKb?: number }) => r.memoryUsedKb)
        .filter((m): m is number => typeof m === "number");
      if (mems.length > 0) maxMemoryUsedKb = Math.max(...mems);
    }

    // Update submission
    await db
      .update(submissions)
      .set({
        status,
        compileOutput: compileOutput ?? null,
        score,
        executionTimeMs: maxExecutionTimeMs,
        memoryUsedKb: maxMemoryUsedKb,
        judgedAt: new Date(),
      })
      .where(eq(submissions.id, submissionId));

    await db.delete(submissionResults).where(eq(submissionResults.submissionId, submissionId));

    // Insert per-test-case results
    if (Array.isArray(results) && results.length > 0) {
      const rows = results.map((r: {
        testCaseId: string;
        status: string;
        actualOutput?: string;
        executionTimeMs?: number;
        memoryUsedKb?: number;
      }) => ({
        id: nanoid(),
        submissionId,
        testCaseId: r.testCaseId,
        status: r.status,
        actualOutput: r.actualOutput ?? null,
        executionTimeMs: r.executionTimeMs ?? null,
        memoryUsedKb: r.memoryUsedKb ?? null,
      }));

      await db.insert(submissionResults).values(rows);
    }

    const updated = await db.query.submissions.findFirst({
      where: eq(submissions.id, submissionId),
    });

    recordAuditEvent({
      action: "submission.judged",
      actorRole: "system",
      resourceType: "submission",
      resourceId: submission.id,
      resourceLabel: submission.id,
      summary: `Recorded final verdict ${status} for submission ${submission.id}`,
      details: {
        compileOutputPresent: Boolean(compileOutput),
        previousStatus: submission.status,
        resultCount: Array.isArray(results) ? results.length : 0,
        score,
        status,
      },
      request,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("POST /api/v1/judge/poll error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
