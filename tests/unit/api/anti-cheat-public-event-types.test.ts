import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("anti-cheat public event types", () => {
  it("does not let contestant POSTs forge server-originated event classes", () => {
    const source = read("src/app/api/v1/contests/[assignmentId]/anti-cheat/route.ts");

    expect(source).toContain('export const CLIENT_EVENT_TYPES = [');
    expect(source).toContain('"tab_switch"');
    expect(source).toContain('"copy"');
    expect(source).toContain('"paste"');
    expect(source).toContain('"blur"');
    expect(source).toContain('"contextmenu"');
    expect(source).toContain('"heartbeat"');
    expect(source).not.toContain('"ip_change",');
    expect(source).not.toContain('"code_similarity",');
  });

  it("still keeps server-side code similarity evidence generation in the backend path", () => {
    const source = read("src/lib/assignments/code-similarity.ts");

    expect(source).toContain('eventType: "code_similarity" as const');
  });
});
