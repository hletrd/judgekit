import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CHECKED_FILES = [
  "src/app/api/v1/plugins/chat-widget/chat/route.ts",
  "src/lib/actions/language-configs.ts",
  "src/lib/actions/user-management.ts",
  "src/lib/actions/system-settings.ts",
  "src/lib/actions/tag-management.ts",
];

describe("server-action rate limit usage", () => {
  it("awaits checkServerActionRateLimit at all known call sites", () => {
    const violations: string[] = [];

    for (const relativePath of CHECKED_FILES) {
      const source = readFileSync(join(process.cwd(), relativePath), "utf8");
      const lines = source.split("\n");

      lines.forEach((line, index) => {
        if (
          line.includes("checkServerActionRateLimit(") &&
          !line.includes("await checkServerActionRateLimit(")
        ) {
          violations.push(`${relativePath}:${index + 1}`);
        }
      });
    }

    expect(violations).toEqual([]);
  });
});
