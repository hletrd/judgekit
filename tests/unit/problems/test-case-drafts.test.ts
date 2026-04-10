import { describe, expect, it } from "vitest";
import {
  createInitialProblemTestCaseDrafts,
  serializeProblemTestCaseDraftsForMutation,
} from "@/lib/problems/test-case-drafts";

describe("problem test case draft helpers", () => {
  it("tracks original values by row identity instead of array position", () => {
    const initial = createInitialProblemTestCaseDrafts([
      { input: "1 2", expectedOutput: "3", isVisible: false },
      { input: "2 3", expectedOutput: "5", isVisible: true },
    ]);

    const reordered = [initial[1], initial[0]].map((draft) => ({ ...draft }));

    const serialized = serializeProblemTestCaseDraftsForMutation(reordered, true);

    expect(serialized).toEqual([
      { input: undefined, expectedOutput: undefined, isVisible: true },
      { input: undefined, expectedOutput: undefined, isVisible: false },
    ]);
  });

  it("keeps full payloads for newly added rows while diffing existing rows", () => {
    const initial = createInitialProblemTestCaseDrafts([
      { input: "1 2", expectedOutput: "3", isVisible: false },
    ]);

    const serialized = serializeProblemTestCaseDraftsForMutation(
      [
        { ...initial[0], expectedOutput: "4" },
        { input: "9 9", expectedOutput: "18", isVisible: false, _key: "new-row" },
      ],
      true
    );

    expect(serialized).toEqual([
      { input: undefined, expectedOutput: "4", isVisible: false },
      { input: "9 9", expectedOutput: "18", isVisible: false },
    ]);
  });
});
