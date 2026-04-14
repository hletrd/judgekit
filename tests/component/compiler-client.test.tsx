import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CompilerClient } from "@/app/(dashboard)/dashboard/compiler/compiler-client";

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, string>) =>
    values?.defaultValue ?? key,
}));

vi.mock("sonner", () => ({
  toast: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/components/code/code-editor", () => ({
  CodeEditor: ({ language, value }: { language: string; value: string }) => (
    <div data-testid="code-editor" data-language={language}>
      {value}
    </div>
  ),
}));

vi.mock("@/components/language-selector", () => ({
  LanguageSelector: ({ value }: { value: string }) => (
    <div data-testid="language-selector">{value}</div>
  ),
}));

vi.mock("@/lib/api/client", () => ({
  apiFetch: apiFetchMock,
}));

describe("CompilerClient", () => {
  const languages = [
    { id: "1", language: "python", displayName: "Python", standard: null, extension: ".py" },
    { id: "2", language: "javascript", displayName: "JavaScript", standard: null, extension: ".js" },
  ];

  beforeEach(() => {
    window.localStorage.clear();
    apiFetchMock.mockReset();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("hydrates the saved compiler language after mount", async () => {
    window.localStorage.setItem("compiler:language", "javascript");

    render(
      <CompilerClient
        languages={languages}
        title="Compiler"
        description="Run code"
        preferredLanguage="python"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("language-selector")).toHaveTextContent("javascript");
      expect(screen.getByTestId("code-editor")).toHaveAttribute("data-language", "javascript");
    });
  });

  it("uses a custom run endpoint when provided", async () => {
    apiFetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          stdout: "3\\n",
          stderr: "",
          exitCode: 0,
          executionTimeMs: 5,
          timedOut: false,
          compileOutput: null,
        },
      }),
    });

    render(
      <CompilerClient
        languages={languages}
        title="Compiler"
        description="Run code"
        preferredLanguage="python"
        runEndpoint="/api/v1/playground/run"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /run code/i }));

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenCalledWith(
        "/api/v1/playground/run",
        expect.objectContaining({ method: "POST" })
      );
    });
  });
});
