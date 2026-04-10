// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useSourceDraft } from "@/hooks/use-source-draft";

const STORAGE_KEY = "oj:submission-draft:user-1:problem-1";
const PREFERENCE_KEY = "oj:preferred-language:user-1";

describe("useSourceDraft", () => {
  const languages = ["javascript", "python"];

  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("hydrates stored drafts and preferred language after mount without marking the form dirty", async () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        updatedAt: Date.now(),
        latestLanguage: "python",
        drafts: {
          javascript: "console.log(1)",
          python: "print(1)",
        },
      }),
    );
    window.localStorage.setItem(PREFERENCE_KEY, "python");

    const { result } = renderHook(() =>
      useSourceDraft({
        userId: "user-1",
        problemId: "problem-1",
        languages,
        initialLanguage: "javascript",
      }),
    );

    await waitFor(() => expect(result.current.language).toBe("python"));
    expect(result.current.sourceCode).toBe("print(1)");
    expect(result.current.isDirty).toBe(false);
    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });

  it("preserves hydrated drafts when persisting after mount", async () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        updatedAt: Date.now(),
        latestLanguage: "javascript",
        drafts: {
          javascript: "console.log('kept')",
        },
      }),
    );

    const { result } = renderHook(() =>
      useSourceDraft({
        userId: "user-1",
        problemId: "problem-1",
        languages,
        initialLanguage: "python",
      }),
    );

    await waitFor(() => expect(result.current.sourceCode).toBe("console.log('kept')"));

    act(() => {
      result.current.setSourceCode("console.log('updated')");
    });

    await waitFor(() =>
      expect(window.localStorage.getItem(STORAGE_KEY)).toContain("console.log('updated')"),
    );
  });
});
