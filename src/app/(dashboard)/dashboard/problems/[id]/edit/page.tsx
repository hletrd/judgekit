import { redirect, notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { problems, submissions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import CreateProblemForm from "../../create/create-problem-form";
import { ProblemDeleteButton } from "../problem-delete-button";

export default async function EditProblemPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const problem = await db.query.problems.findFirst({
    where: eq(problems.id, id),
    with: {
      testCases: true,
    },
  });

  if (!problem) {
    notFound();
  }

  const canEdit =
    problem.authorId === session.user.id ||
    session.user.role === "admin" ||
    session.user.role === "super_admin";

  if (!canEdit) {
    redirect(`/dashboard/problems/${problem.id}`);
  }

  const t = await getTranslations("problems");
  const hasSubmissions = Boolean(
    await db.query.submissions.findFirst({
      where: eq(submissions.problemId, problem.id),
      columns: { id: true },
    })
  );
  const sortedTestCases = [...problem.testCases].sort(
    (left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0)
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">{t("editTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("deleteHelpText")}</p>
        </div>
        <ProblemDeleteButton problemId={problem.id} problemTitle={problem.title} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("editDescription")}</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateProblemForm
            mode="edit"
            initialProblem={{
              id: problem.id,
              title: problem.title,
              description: problem.description ?? "",
              timeLimitMs: problem.timeLimitMs ?? 2000,
              memoryLimitMb: problem.memoryLimitMb ?? 256,
              visibility: (problem.visibility ?? "private") as "public" | "private" | "hidden",
              testCases: sortedTestCases.map((testCase) => ({
                input: testCase.input,
                expectedOutput: testCase.expectedOutput,
                isVisible: testCase.isVisible ?? false,
              })),
            }}
            testCasesLocked={hasSubmissions}
          />
        </CardContent>
      </Card>
    </div>
  );
}
