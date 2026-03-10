import { db } from "@/lib/db";
import { submissions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { canAccessSubmission } from "@/lib/auth/permissions";
import { getResolvedSystemTimeZone } from "@/lib/system-settings";
import { redirect, notFound } from "next/navigation";
import { SubmissionDetailClient } from "./submission-detail-client";

export default async function SubmissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const resolvedParams = await params;
  const submissionId = resolvedParams.id;

  const timeZone = await getResolvedSystemTimeZone();

  const submission = await db.query.submissions.findFirst({
    where: eq(submissions.id, submissionId),
    with: {
      user: {
        columns: { name: true },
      },
      problem: {
        columns: { id: true, title: true },
      },
      results: {
        with: {
          testCase: {
            columns: { sortOrder: true },
          },
        },
      },
    },
  });

  if (!submission) {
    notFound();
  }

  // Access control
  const hasAccess = await canAccessSubmission(
    { userId: submission.userId, assignmentId: submission.assignmentId },
    session.user.id,
    session.user.role
  );

  if (!hasAccess) {
    redirect("/dashboard/submissions");
  }

  return (
    <SubmissionDetailClient
      initialSubmission={{
        id: submission.id,
        assignmentId: submission.assignmentId ?? null,
        language: submission.language,
        status: submission.status ?? "pending",
        sourceCode: submission.sourceCode,
        compileOutput: submission.compileOutput ?? null,
        executionTimeMs: submission.executionTimeMs ?? null,
        memoryUsedKb: submission.memoryUsedKb ?? null,
        score: submission.score ?? null,
        submittedAt: submission.submittedAt ? submission.submittedAt.valueOf() : null,
        user: submission.user
          ? {
              name: submission.user.name,
            }
          : null,
        problem: submission.problem
          ? {
              id: submission.problem.id,
              title: submission.problem.title,
            }
          : null,
        results: submission.results.map((result) => ({
          id: result.id,
          status: result.status,
          executionTimeMs: result.executionTimeMs ?? null,
          memoryUsedKb: result.memoryUsedKb ?? null,
          testCase: result.testCase
            ? {
                sortOrder: result.testCase.sortOrder ?? null,
              }
            : null,
        })),
      }}
      backHref="/dashboard/submissions"
      timeZone={timeZone}
      showDetailedResults={true}
      userRole={session.user.role}
    />
  );
}
