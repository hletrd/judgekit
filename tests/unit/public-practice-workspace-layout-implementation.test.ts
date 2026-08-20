import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("public practice workspace layout implementation", () => {
  it("uses a workspace-style split layout for signed-in users on the public problem tab", () => {
    const source = read("src/app/(public)/practice/problems/[id]/page.tsx");

    expect(source).toContain('grid grid-cols-1 gap-6 lg:grid-cols-2');
    expect(source).toContain('id="public-submit-panel"');
    expect(source).toContain('layout="inline"');
    // 09e27f53 deliberately removed the header "Submit Solution" jump-link
    // because it duplicated the inline submit panel rendered right below;
    // the inline form is the single submission path for signed-in users.
    // Pinned as an absence so the duplicate CTA cannot come back unnoticed.
    expect(source).not.toContain('Link href="#public-submit-panel"');
  });

  it("moves my submissions into the right-hand workspace column instead of a dedicated tab", () => {
    const source = read("src/app/(public)/practice/problems/[id]/page.tsx");

    expect(source).not.toContain('TabsTrigger value="my-submissions"');
    expect(source).toContain('{t("practice.mySubmissionsTab")}');
  });
});
