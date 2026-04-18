import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("participant audit page implementation", () => {
  it("shows the code timeline panel in the participant audit/timeline surface", () => {
    const source = read("src/app/(dashboard)/dashboard/contests/[assignmentId]/participant/[userId]/page.tsx");

    expect(source).toContain('import { CodeTimelinePanel } from "@/components/contest/code-timeline-panel";');
    expect(source).toContain("<CodeTimelinePanel");
    expect(source).toContain("assignmentId={assignmentId}");
    expect(source).toContain("userId={userId}");
    expect(source).toContain("userName={student.name}");
  });

  it("shows exam-session and contest-access metadata in the participant header", () => {
    const source = read("src/app/(dashboard)/dashboard/contests/[assignmentId]/participant/[userId]/page.tsx");

    expect(source).toContain("db.query.examSessions.findFirst");
    expect(source).toContain("db.query.contestAccessTokens.findFirst");
    expect(source).toContain('t("header.examStarted")');
    expect(source).toContain('t("header.personalDeadline")');
    expect(source).toContain('t("header.contestAccess")');
  });
});
