import { asc, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { problems } from "@/lib/db/schema";
import { PublicProblemList } from "../_components/public-problem-list";

function summarizeDescription(markdown: string | null | undefined) {
  if (!markdown) return "";
  return markdown.replace(/[#*_`>\-]/g, " ").replace(/\s+/g, " ").trim().slice(0, 180);
}

export default async function PracticePage() {
  const t = await getTranslations("publicShell");

  const publicProblems = await db.query.problems.findMany({
    where: eq(problems.visibility, "public"),
    with: {
      author: {
        columns: { name: true },
      },
      problemTags: {
        with: {
          tag: {
            columns: { name: true, color: true },
          },
        },
      },
    },
    orderBy: [asc(problems.sequenceNumber), asc(problems.createdAt)],
    limit: 60,
  });

  return (
    <PublicProblemList
      title={t("practice.catalogTitle")}
      description={t("practice.catalogDescription")}
      noProblemsLabel={t("practice.noProblems")}
      openProblemLabel={t("practice.openProblem")}
      problems={publicProblems.map((problem) => ({
        id: problem.id,
        title: problem.title,
        summary: summarizeDescription(problem.description),
        authorName: problem.author?.name ?? t("practice.unknownAuthor"),
        tags: problem.problemTags.map((entry) => ({
          name: entry.tag.name,
          color: entry.tag.color,
        })),
      }))}
    />
  );
}
