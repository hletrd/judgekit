import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { problems, languageConfigs } from "@/lib/db/schema";
import { getJudgeLanguageDefinition } from "@/lib/judge/languages";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { canAccessProblem } from "@/lib/auth/permissions";
import { sanitizeHtml } from "@/lib/security/sanitize-html";
import { ProblemSubmissionForm } from "./problem-submission-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function ProblemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const resolvedParams = await params;
  const problemId = resolvedParams.id;

  const t = await getTranslations("problems");
  const tCommon = await getTranslations("common");
  
  const problem = await db.query.problems.findFirst({
    where: eq(problems.id, problemId),
    with: {
      author: {
        columns: { name: true }
      }
    }
  });

  if (!problem) {
    notFound();
  }

  // Fetch languages
  const langs = await db.select().from(languageConfigs).where(eq(languageConfigs.isEnabled, true));
  const enabledLanguages = langs.flatMap((language) => {
    const definition = getJudgeLanguageDefinition(language.language);

    if (!definition) {
      return [];
    }

    return [{
      id: language.id,
      language: definition.language,
      displayName: definition.displayName,
      standard: definition.standard,
    }];
  });

  const hasAccess = await canAccessProblem(problem.id, session.user.id, session.user.role);

  if (!hasAccess) {
    redirect("/dashboard/problems");
  }

  const safeDescription = problem.description ? sanitizeHtml(problem.description) : null;
  const canEdit =
    problem.authorId === session.user.id ||
    session.user.role === "admin" ||
    session.user.role === "super_admin";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <div>
          <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
            <h2 className="text-3xl font-bold">{problem.title}</h2>
            {canEdit && (
              <Link href={`/dashboard/problems/${problem.id}/edit`}>
                <Button variant="outline">{tCommon("edit")}</Button>
              </Link>
            )}
          </div>
          <div className="mb-4 flex gap-2 text-sm text-muted-foreground">
            <Badge variant="outline">{t("badges.timeLimit", { value: problem.timeLimitMs ?? 2000 })}</Badge>
            <Badge variant="outline">{t("badges.memoryLimit", { value: problem.memoryLimitMb ?? 256 })}</Badge>
            <Badge variant="secondary">{t("badges.author", { name: problem.author?.name || tCommon("system") })}</Badge>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{t("descriptionTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="prose dark:prose-invert max-w-none">
            {safeDescription ? (
              <div dangerouslySetInnerHTML={{ __html: safeDescription }} />
            ) : (
              <p>{t("noDescription")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <Card className="sticky top-6">
          <CardHeader>
            <CardTitle>{t("submitSolution")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ProblemSubmissionForm
              problemId={problem.id}
              languages={enabledLanguages}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
