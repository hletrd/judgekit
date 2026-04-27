import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("submission comment visibility implementation", () => {
  it("renders the comment section regardless of assignment scope so scoped reviewers can comment on coursework submissions", () => {
    const source = read("src/components/submissions/submission-detail-client.tsx");

    expect(source).toContain("<CommentSection");
    expect(source).toContain("submissionId={submission.id}");
    expect(source).toContain("canComment={canComment}");
    expect(source).not.toContain("!submission.assignmentId && (");
  });
});
