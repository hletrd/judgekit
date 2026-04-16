import { count, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { languageConfigs, problems, submissions } from "@/lib/db/schema";

export type HomepageInsights = {
  publicProblemCount: number;
  totalSubmissionCount: number;
  enabledLanguageCount: number;
};

export async function getHomepageInsights(): Promise<HomepageInsights> {
  const [problemRows, submissionRows, languageRows] = await Promise.all([
    db
      .select({ count: count() })
      .from(problems)
      .where(eq(problems.visibility, "public")),
    db
      .select({ count: count() })
      .from(submissions),
    db
      .select({ count: count() })
      .from(languageConfigs)
      .where(eq(languageConfigs.isEnabled, true)),
  ]);

  return {
    publicProblemCount: Number(problemRows[0]?.count ?? 0),
    totalSubmissionCount: Number(submissionRows[0]?.count ?? 0),
    enabledLanguageCount: Number(languageRows[0]?.count ?? 0),
  };
}
