import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("recruiting candidate isolation implementation", () => {
  it("blocks recruiting candidates from the leaderboard API before shared standings are computed", () => {
    const source = read("src/app/api/v1/contests/[assignmentId]/leaderboard/route.ts");

    expect(source).toContain('if (recruitingAccess.isRecruitingCandidate && !isInstructorView)');
    expect(source).toContain('return apiError("forbidden", 403);');
  });

  it("keeps recruiting candidates out of shared standings on the contest detail page", () => {
    const source = read("src/app/(dashboard)/dashboard/contests/[assignmentId]/page.tsx");

    expect(source).toContain('const isRecruitingCandidate = recruitingAccess.isRecruitingCandidate;');
    expect(source).toContain('{!isRecruitingCandidate && (');
    expect(source).toContain('<LeaderboardTable assignmentId={assignmentId} currentUserId={session.user.id} />');
  });

  it("prevents recruiting candidates from reaching per-problem rankings even via direct routes", () => {
    const detailSource = read("src/app/(dashboard)/dashboard/problems/[id]/page.tsx");
    const rankingsSource = read("src/app/(public)/practice/problems/[id]/rankings/page.tsx");

    expect(detailSource).toContain('{!isRecruitingCandidate && (');
    expect(rankingsSource).toContain('const recruitingAccess = await getRecruitingAccessContext(session.user.id);');
    expect(rankingsSource).toContain('if (recruitingAccess.isRecruitingCandidate) redirect(`/dashboard/problems/${id}`);');
  });
});
