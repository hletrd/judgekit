import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProblemDescription } from "@/components/problem-description";

vi.mock("@/components/code/copy-code-button", () => ({
  CopyCodeButton: ({ value }: { value: string }) => (
    <button data-testid="copy-code-button" data-value={value} type="button">
      Copy code
    </button>
  ),
}));

const mockSanitizeHtml = vi.fn((html: string) => `sanitized:${html}`);
vi.mock("@/lib/security/sanitize-html", () => ({
  sanitizeHtml: (html: string) => mockSanitizeHtml(html),
}));

describe("ProblemDescription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSanitizeHtml.mockImplementation((html: string) => `sanitized:${html}`);
  });

  it("renders markdown content", () => {
    render(<ProblemDescription description="Hello **world**" />);

    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText("world", { selector: "strong" })).toBeInTheDocument();
  });

  it("applies className to the container element", () => {
    const { container } = render(
      <ProblemDescription description="Some text" className="my-custom-class" />
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("my-custom-class");
    expect(wrapper.className).toContain("problem-description");
  });

  it("renders a copy button for markdown code blocks", () => {
    const { container } = render(
      <ProblemDescription description={"```js\nconst answer = 42;\n```"} />
    );

    expect(container.querySelector("code")?.textContent).toBe("const answer = 42;\n");
    expect(screen.getByTestId("copy-code-button")).toHaveAttribute(
      "data-value",
      "const answer = 42;"
    );
  });

  it("uses sanitized HTML path when legacyHtmlDescription matches trimmed description", () => {
    const html = "<p>Hello world</p>";
    const { container } = render(
      <ProblemDescription description={html} legacyHtmlDescription={html} />
    );

    expect(screen.queryByTestId("copy-code-button")).not.toBeInTheDocument();
    expect(container.firstChild).toHaveAttribute(
      "class",
      expect.stringContaining("problem-description")
    );
  });

  it("calls sanitizeHtml for legacy HTML content", () => {
    const html = "<p>Legacy content</p>";

    render(<ProblemDescription description={html} legacyHtmlDescription={html} />);

    expect(mockSanitizeHtml).toHaveBeenCalledWith(html);
  });

  it("uses ReactMarkdown when legacyHtmlDescription does not match description", () => {
    render(
      <ProblemDescription
        description="# Markdown Title"
        legacyHtmlDescription="<h1>HTML Title</h1>"
      />
    );

    expect(screen.getByText("Markdown Title", { selector: "h1" })).toBeInTheDocument();
  });

  it("uses ReactMarkdown when legacyHtmlDescription is null", () => {
    render(<ProblemDescription description="Some markdown" legacyHtmlDescription={null} />);

    expect(screen.getByText("Some markdown")).toBeInTheDocument();
  });

  it("uses ReactMarkdown when legacyHtmlDescription is undefined", () => {
    render(<ProblemDescription description="Some markdown" />);

    expect(screen.getByText("Some markdown")).toBeInTheDocument();
  });

  it("applies className to container in legacy HTML mode", () => {
    const html = "<p>Legacy</p>";
    const { container } = render(
      <ProblemDescription
        description={html}
        legacyHtmlDescription={html}
        className="extra-class"
      />
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("extra-class");
  });
});
