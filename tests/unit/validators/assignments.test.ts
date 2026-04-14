import { describe, expect, it } from "vitest";
import { assignmentMutationSchema } from "@/lib/validators/assignments";

const validPayload = {
  title: " Homework 1 ",
  description: " Introductory exercises ",
  startsAt: 100,
  deadline: 200,
  lateDeadline: 300,
  latePenalty: 20,
  problems: [
    {
      problemId: " problem-1 ",
      points: 50,
    },
    {
      problemId: "problem-2",
      points: 50,
    },
  ],
};

describe("assignmentMutationSchema", () => {
  it("normalizes whitespace for title, description, and problem IDs", () => {
    const parsed = assignmentMutationSchema.parse(validPayload);

    expect(parsed.title).toBe("Homework 1");
    expect(parsed.description).toBe("Introductory exercises");
    expect(parsed.problems[0]?.problemId).toBe("problem-1");
    expect(parsed.visibility).toBe("private");
  });

  it("rejects duplicate problems", () => {
    const result = assignmentMutationSchema.safeParse({
      ...validPayload,
      problems: [
        { problemId: "problem-1", points: 50 },
        { problemId: "problem-1", points: 25 },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("assignmentProblemDuplicate");
  });

  it("rejects invalid schedules", () => {
    const startsAfterDeadline = assignmentMutationSchema.safeParse({
      ...validPayload,
      startsAt: 300,
      deadline: 200,
    });
    const lateDeadlineBeforeDeadline = assignmentMutationSchema.safeParse({
      ...validPayload,
      deadline: 300,
      lateDeadline: 200,
    });

    expect(startsAfterDeadline.success).toBe(false);
    expect(startsAfterDeadline.error?.issues[0]?.message).toBe("assignmentScheduleInvalid");
    expect(lateDeadlineBeforeDeadline.success).toBe(false);
    expect(lateDeadlineBeforeDeadline.error?.issues[0]?.message).toBe(
      "assignmentLateDeadlineInvalid"
    );
  });
});
