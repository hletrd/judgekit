import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("submission queue status implementation", () => {
  it("adds a queue-status API route that counts earlier queued submissions", () => {
    const source = read("src/app/api/v1/submissions/[id]/queue-status/route.ts");

    expect(source).toContain("const QUEUED_STATUSES = [\"pending\", \"queued\"]");
    expect(source).toContain("lt(submissions.submittedAt, submission.submittedAt ?? new Date(0))");
    expect(source).toContain("queuePosition");
  });

  it("shows queue/judging copy on the submission detail page while a submission is live", () => {
    const source = read("src/app/(dashboard)/dashboard/submissions/[id]/submission-detail-client.tsx");

    expect(source).toContain("/api/v1/submissions/${submission.id}/queue-status");
    expect(source).toContain('t("queueAhead", { count: queuePosition ?? 0 })');
    expect(source).toContain('t("judgingInProgress")');
  });
});
