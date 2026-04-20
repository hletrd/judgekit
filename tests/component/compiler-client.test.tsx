import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CompilerClient } from "@/components/code/compiler-client";

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, string | number>) =>
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

  it("supports multiple stdin test-case tabs with per-case names and results", async () => {
    apiFetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            stdout: "case-one",
            stderr: "",
            exitCode: 0,
            executionTimeMs: 5,
            timedOut: false,
            compileOutput: null,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            stdout: "case-two",
            stderr: "",
            exitCode: 0,
            executionTimeMs: 7,
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
      />
    );

    expect(screen.getByText("Test case 1")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/standard input/i), { target: { value: "1 2" } });
    fireEvent.click(screen.getByRole("button", { name: /run code/i }));

    await waitFor(() => {
      expect(screen.getByText("case-one")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /add test case/i }));
    fireEvent.change(screen.getByLabelText(/test case 2/i), { target: { value: "Edge case" } });
    fireEvent.change(screen.getByLabelText(/standard input/i), { target: { value: "5 7" } });
    fireEvent.click(screen.getByRole("button", { name: /run code/i }));

    await waitFor(() => {
      expect(screen.getByText("case-two")).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Edge case" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("tab", { name: /TC 1/i }));
    await waitFor(() => {
      expect(screen.getByText("case-one")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("tab", { name: "Edge case" }));
    await waitFor(() => {
      expect(screen.getByText("case-two")).toBeInTheDocument();
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
