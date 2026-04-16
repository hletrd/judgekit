import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("public problem editorial rendering implementation", () => {
  it("renders editorials and editorial replies through AssistantMarkdown", () => {
    const source = read("src/app/(public)/practice/problems/[id]/page.tsx");

    expect(source).toContain('import { AssistantMarkdown } from "@/components/assistant-markdown"');
    expect(source).toContain("<AssistantMarkdown content={editorial.content} />");
    expect(source).toContain("<AssistantMarkdown content={post.content} />");
  });

  it("splits problem discussion into question and solution lanes", () => {
    const source = read("src/app/(public)/practice/problems/[id]/page.tsx");

    expect(source).toContain('scopeType="problem"');
    expect(source).toContain('scopeType="solution"');
    expect(source).toContain('t("practice.discussion.questionsTitle")');
    expect(source).toContain('t("practice.discussion.solutionsTitle")');
  });
});
