import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("participant timeline view implementation", () => {
  it("renders the shared participant timeline UI surface from its own component", () => {
    const source = read("src/components/contest/participant-timeline-view.tsx");

    expect(source).toContain('export async function ParticipantTimelineView');
    expect(source).toContain('getTranslations("contests.participantAudit")');
    expect(source).toContain("<CodeTimelinePanel");
    expect(source).toContain("<ParticipantAntiCheatTimeline");
  });

  it("keeps the per-problem summary badges and anti-cheat summary in the shared component", () => {
    const source = read("src/components/contest/participant-timeline-view.tsx");

    expect(source).toContain('t("problemSummary.bestScore")');
    expect(source).toContain('t("problemSummary.timeToSolve")');
    expect(source).toContain('t("antiCheatSummary.title")');
    expect(source).toContain("participantTimeline.antiCheatSummary.byType");
  });
});
