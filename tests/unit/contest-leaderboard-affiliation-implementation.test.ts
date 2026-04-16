import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("contest leaderboard affiliation implementation", () => {
  it("shows an affiliation column when leaderboard entries include class metadata", () => {
    const source = read("src/components/contest/leaderboard-table.tsx");

    expect(source).toContain("const hasAffiliationColumn = data.entries.some");
    expect(source).toContain('t("affiliation")');
    expect(source).toContain('{entry.className ?? "-"}');
  });
});
