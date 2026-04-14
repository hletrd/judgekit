import { describe, expect, it } from "vitest";
import { discussionPostCreateSchema, discussionThreadCreateSchema } from "@/lib/validators/discussions";

describe("discussionThreadCreateSchema", () => {
  it("accepts a general thread without a problem id", () => {
    const parsed = discussionThreadCreateSchema.parse({
      scopeType: "general",
      title: "  Need help with DP ",
      content: "  How should I think about this? ",
    });

    expect(parsed.title).toBe("Need help with DP");
    expect(parsed.content).toBe("How should I think about this?");
    expect(parsed.problemId).toBeUndefined();
  });

  it("requires a problem id for problem-scoped threads", () => {
    const result = discussionThreadCreateSchema.safeParse({
      scopeType: "problem",
      title: "Question",
      content: "Need clarification",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("discussionProblemRequired");
  });
});

describe("discussionPostCreateSchema", () => {
  it("trims reply content", () => {
    const parsed = discussionPostCreateSchema.parse({ content: "  Thanks!  " });
    expect(parsed.content).toBe("Thanks!");
  });
});
