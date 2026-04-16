import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PublicLanguagesPage from "@/app/(public)/languages/page";

const { getJudgeSystemSnapshotMock, getResolvedSystemSettingsMock } = vi.hoisted(() => ({
  getJudgeSystemSnapshotMock: vi.fn(),
  getResolvedSystemSettingsMock: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

vi.mock("next-intl/server", () => ({
  getLocale: async () => "en",
  getTranslations: async (namespace: string) => (key: string, values?: Record<string, number>) => {
    const translations: Record<string, Record<string, string>> = {
      common: {
        appName: "JudgeKit",
        appDescription: "Online judge",
      },
      publicShell: {
        "languages.title": "Judge Environments & Compilation Options",
        "languages.description": "Detailed runtime and compiler information.",
        "languages.featuredTitle": "Featured environments",
        "languages.featuredDescription": "Major language families.",
        "languages.allLanguages": "All enabled languages",
        "languages.allLanguagesDescription": "Full catalog.",
        "languages.language": "Language",
        "languages.extension": "Extension",
        "languages.runtime": "Runtime",
        "languages.compiler": "Compiler",
        "languages.compileCommand": "Compile command",
        "languages.runCommand": "Run command",
        "languages.variantCount": `${values?.count ?? 0} variants`,
        "languages.additionalLanguages": `…and ${values?.count ?? 0} more languages`,
        "languages.noLanguages": "No languages are currently enabled.",
        "languages.backToHome": "Back to home",
      },
    };

    return translations[namespace]?.[key] ?? key;
  },
}));

vi.mock("@/lib/judge/dashboard-data", () => ({
  getJudgeSystemSnapshot: getJudgeSystemSnapshotMock,
}));

vi.mock("@/lib/system-settings", () => ({
  getResolvedSystemSettings: getResolvedSystemSettingsMock,
}));

describe("PublicLanguagesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getResolvedSystemSettingsMock.mockResolvedValue({
      siteTitle: "JudgeKit",
      siteDescription: "Online judge",
    });
  });

  it("renders featured environments and the full catalog", async () => {
    getJudgeSystemSnapshotMock.mockResolvedValue({
      onlineWorkerCount: 2,
      activeJudgeTasks: 0,
      totalWorkerCapacity: 8,
      architectureSummary: "x86_64",
      additionalLanguageCount: 2,
      featuredEnvironments: [
        {
          key: "cpp-family",
          title: "C / C++",
          runtime: "GCC / Clang",
          compiler: "g++ / clang++",
          variants: ["C17", "C++23"],
          languageCount: 4,
        },
      ],
      allLanguages: [
        {
          id: "cpp23",
          label: "C++23",
          extension: ".cpp",
          runtime: "GCC 14",
          compiler: "g++",
          compileCommand: "g++ -std=c++23 main.cpp",
          runCommand: "./main",
        },
      ],
    });

    render(await PublicLanguagesPage());

    expect(screen.getByRole("heading", { name: "Judge Environments & Compilation Options" })).toBeInTheDocument();
    expect(screen.getByText("Featured environments")).toBeInTheDocument();
    expect(screen.getByText("C / C++")).toBeInTheDocument();
    expect(screen.getByText("4 variants")).toBeInTheDocument();
    expect(screen.getByText("…and 2 more languages")).toBeInTheDocument();
    expect(screen.getAllByText("C++23")).toHaveLength(2);
    expect(screen.getByText("g++ -std=c++23 main.cpp")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "/");
  });

  it("renders an empty-state message when no languages are enabled", async () => {
    getJudgeSystemSnapshotMock.mockResolvedValue({
      onlineWorkerCount: 0,
      activeJudgeTasks: 0,
      totalWorkerCapacity: 0,
      architectureSummary: "unknown",
      additionalLanguageCount: 0,
      featuredEnvironments: [],
      allLanguages: [],
    });

    render(await PublicLanguagesPage());

    expect(screen.getByText("No languages are currently enabled.")).toBeInTheDocument();
  });
});
