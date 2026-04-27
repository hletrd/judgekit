import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("judge progress implementation", () => {
  it("persists partial test results while a submission is still judging", () => {
    const source = read("src/app/api/v1/judge/poll/route.ts");

    expect(source).toContain("if (Array.isArray(results) && results.length > 0)");
    expect(source).toContain("tx.delete(submissionResults)");
    expect(source).toContain("buildSubmissionResultRows(submissionId, results)");
  });

  it("surfaces judging progress from queue-status polling on the submission detail page", () => {
    const queueRoute = read("src/app/api/v1/submissions/[id]/queue-status/route.ts");
    const client = read("src/components/submissions/submission-detail-client.tsx");

    expect(queueRoute).toContain("gradingTestCase");
    expect(queueRoute).toContain("from(submissionResults)");
    expect(client).toContain('t("judgingProgress", { progress: gradingTestCase ?? "" })');
  });
});
