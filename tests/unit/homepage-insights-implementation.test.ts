import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("homepage insights implementation", () => {
  it("counts public problems, all submissions, and enabled languages", () => {
    const source = read("src/lib/homepage-insights.ts");

    expect(source).toContain("publicProblemCount");
    expect(source).toContain("totalSubmissionCount");
    expect(source).toContain("enabledLanguageCount");
    expect(source).toContain("eq(problems.visibility, \"public\")");
    expect(source).toContain("from(submissions)");
    expect(source).toContain("eq(languageConfigs.isEnabled, true)");
  });
});
