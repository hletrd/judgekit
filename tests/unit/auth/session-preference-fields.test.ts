import { describe, expect, it } from "vitest";
import { AUTH_PREFERENCE_FIELDS } from "@/lib/auth/types";

/**
 * Verify that mapTokenToSession covers all AUTH_PREFERENCE_FIELDS.
 *
 * This test reads the source code to confirm that the programmatic loop
 * over AUTH_PREFERENCE_FIELDS is present in mapTokenToSession. If someone
 * reverts the loop back to manual per-field assignment, this test will
 * still pass as long as the loop is present — but it also verifies that
 * the AUTH_PREFERENCE_FIELDS list is non-empty and that the specific
 * fields we know about are included.
 */
describe("mapTokenToSession field completeness", () => {
  it("AUTH_PREFERENCE_FIELDS contains all expected preference fields", () => {
    const expectedFields = [
      "preferredLanguage",
      "preferredTheme",
      "shareAcceptedSolutions",
      "acceptedSolutionsAnonymous",
      "editorTheme",
      "editorFontSize",
      "editorFontFamily",
      "lectureMode",
      "lectureFontScale",
      "lectureColorScheme",
    ];

    for (const field of expectedFields) {
      expect(AUTH_PREFERENCE_FIELDS).toContain(field);
    }
    expect(AUTH_PREFERENCE_FIELDS).toHaveLength(expectedFields.length);
  });

  it("mapTokenToSession uses AUTH_PREFERENCE_FIELDS loop instead of manual assignments", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const source = readFileSync(join(process.cwd(), "src/lib/auth/config.ts"), "utf8");

    // The mapTokenToSession function should iterate over AUTH_PREFERENCE_FIELDS
    // instead of manually assigning each field. This ensures new fields are
    // automatically included.
    const mapTokenFn = source.match(
      /function mapTokenToSession\([\s\S]*?\n\}/
    );
    expect(mapTokenFn).not.toBeNull();

    // The loop must be present
    expect(mapTokenFn![0]).toContain("for (const field of AUTH_PREFERENCE_FIELDS)");

    // Manual per-field assignments should NOT be present (these were the old pattern)
    expect(mapTokenFn![0]).not.toContain("session.user.preferredLanguage = token.preferredLanguage");
    expect(mapTokenFn![0]).not.toContain("session.user.editorTheme = token.editorTheme");
    expect(mapTokenFn![0]).not.toContain("session.user.lectureMode = token.lectureMode");
  });
});
