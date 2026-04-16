import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StructuredProblemStatement } from "@/components/problem/structured-problem-statement";

vi.mock("@/components/code/copy-code-button", () => ({
  CopyCodeButton: ({ value }: { value: string }) => (
    <button data-testid="copy-code-button" data-value={value} type="button">
      Copy code
    </button>
  ),
}));

describe("StructuredProblemStatement", () => {
  it("renders recognized statement sections in separate cards and preserves example copy buttons", () => {
    render(
      <StructuredProblemStatement
        description={`문제 설명입니다.

## 입력
첫 줄에 N이 주어진다.

## 출력
정답을 출력한다.

### 예제 입력 1
\`\`\`
1
\`\`\`

### 예제 출력 1
\`\`\`
2
\`\`\`
`}
      />
    );

    expect(screen.getByText("문제 설명입니다.")).toBeInTheDocument();
    expect(screen.getByText("입력")).toBeInTheDocument();
    expect(screen.getByText("첫 줄에 N이 주어진다.")).toBeInTheDocument();
    expect(screen.getByText("출력")).toBeInTheDocument();
    expect(screen.getByText("정답을 출력한다.")).toBeInTheDocument();
    expect(screen.getByText("예제 입력 1")).toBeInTheDocument();
    expect(screen.getByText("예제 출력 1")).toBeInTheDocument();

    const buttons = screen.getAllByTestId("copy-code-button");
    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toHaveAttribute("data-value", "1");
    expect(buttons[1]).toHaveAttribute("data-value", "2");
  });
});
