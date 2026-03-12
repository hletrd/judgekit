import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, sqlite } from "@/lib/db";
import { problems, testCases } from "@/lib/db/schema";
import type { ProblemMutationInput } from "@/lib/validators/problem-management";
import { sanitizeHtml } from "@/lib/security/sanitize-html";

function mapTestCases(problemId: string, values: ProblemMutationInput["testCases"]) {
  return values.map((testCase, index) => ({
    id: nanoid(),
    problemId,
    input: testCase.input,
    expectedOutput: testCase.expectedOutput,
    isVisible: testCase.isVisible,
    sortOrder: index,
  }));
}

export function createProblemWithTestCases(input: ProblemMutationInput, authorId: string) {
  const id = nanoid();
  const now = new Date();

  const execute = sqlite.transaction(() => {
    db.insert(problems)
      .values({
        id,
        title: input.title,
        description: sanitizeHtml(input.description),
        timeLimitMs: input.timeLimitMs,
        memoryLimitMb: input.memoryLimitMb,
        visibility: input.visibility,
        authorId,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    const mappedTestCases = mapTestCases(id, input.testCases);
    if (mappedTestCases.length > 0) {
      db.insert(testCases).values(mappedTestCases).run();
    }
  });

  execute();

  return id;
}

export function updateProblemWithTestCases(problemId: string, input: ProblemMutationInput) {
  const now = new Date();

  const execute = sqlite.transaction(() => {
    db.update(problems)
      .set({
        title: input.title,
        description: sanitizeHtml(input.description),
        timeLimitMs: input.timeLimitMs,
        memoryLimitMb: input.memoryLimitMb,
        visibility: input.visibility,
        updatedAt: now,
      })
      .where(eq(problems.id, problemId))
      .run();

    db.delete(testCases).where(eq(testCases.problemId, problemId)).run();

    const mappedTestCases = mapTestCases(problemId, input.testCases);
    if (mappedTestCases.length > 0) {
      db.insert(testCases).values(mappedTestCases).run();
    }
  });

  execute();
}
