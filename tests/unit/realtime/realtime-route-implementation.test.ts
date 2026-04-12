import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("realtime route implementation guards", () => {
  it("checks the multi-instance guard in the submission SSE route", () => {
    const source = read("src/app/api/v1/submissions/[id]/events/route.ts");

    expect(source).toContain('getUnsupportedRealtimeGuard("/api/v1/submissions/[id]/events")');
    expect(source).toContain('return apiError(realtimeGuard.error, 503);');
  });

  it("uses the shared postgresql realtime coordination helpers in the submission SSE route", () => {
    const source = read("src/app/api/v1/submissions/[id]/events/route.ts");

    expect(source).toContain('usesSharedRealtimeCoordination()');
    expect(source).toContain('acquireSharedSseConnectionSlot({');
    expect(source).toContain('releaseSharedSseConnectionSlot(sharedConnectionKey)');
  });

  it("checks the multi-instance guard in the anti-cheat route", () => {
    const source = read("src/app/api/v1/contests/[assignmentId]/anti-cheat/route.ts");

    expect(source).toContain('getUnsupportedRealtimeGuard("/api/v1/contests/[assignmentId]/anti-cheat")');
    expect(source).toContain('return apiError(realtimeGuard.error, 503);');
  });

  it("uses shared heartbeat coordination when the postgresql backend is enabled", () => {
    const source = read("src/app/api/v1/contests/[assignmentId]/anti-cheat/route.ts");

    expect(source).toContain('usesSharedRealtimeCoordination()');
    expect(source).toContain('shouldRecordSharedHeartbeat({ assignmentId, userId: user.id })');
  });
});
