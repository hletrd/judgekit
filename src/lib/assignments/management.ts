import { and, eq, or } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, sqlite } from "@/lib/db";
import {
  assignmentProblems,
  assignments,
  problemGroupAccess,
  problems,
} from "@/lib/db/schema";
import type { AssignmentMutationInput } from "@/lib/validators/assignments";
import type { UserRole } from "@/types";

type AssignmentManagerProblem = {
  id: string;
  title: string;
  authorId: string | null;
  visibility: string | null;
};

export function canManageGroupResources(
  groupInstructorId: string | null,
  userId: string,
  role: UserRole
) {
  return role === "super_admin" || role === "admin" || groupInstructorId === userId;
}

export async function getManageableProblemsForGroup(
  groupId: string,
  userId: string,
  role: UserRole
): Promise<AssignmentManagerProblem[]> {
  if (role === "super_admin" || role === "admin") {
    return db
      .select({
        id: problems.id,
        title: problems.title,
        authorId: problems.authorId,
        visibility: problems.visibility,
      })
      .from(problems);
  }

  return db
    .selectDistinct({
      id: problems.id,
      title: problems.title,
      authorId: problems.authorId,
      visibility: problems.visibility,
    })
    .from(problems)
    .leftJoin(
      problemGroupAccess,
      and(eq(problemGroupAccess.problemId, problems.id), eq(problemGroupAccess.groupId, groupId))
    )
    .where(
      or(
        eq(problems.authorId, userId),
        eq(problems.visibility, "public"),
        eq(problemGroupAccess.groupId, groupId)
      )
    );
}

function mapAssignmentProblems(
  assignmentId: string,
  values: AssignmentMutationInput["problems"]
) {
  return values.map((problem, index) => ({
    id: nanoid(),
    assignmentId,
    problemId: problem.problemId,
    points: problem.points,
    sortOrder: index,
  }));
}

function syncGroupAccessRows(groupId: string) {
  const requiredRows = db
    .select({ problemId: assignmentProblems.problemId })
    .from(assignmentProblems)
    .innerJoin(assignments, eq(assignments.id, assignmentProblems.assignmentId))
    .where(eq(assignments.groupId, groupId))
    .all();
  const requiredProblemIds = new Set(requiredRows.map((row) => row.problemId));
  const existingRows = db
    .select({ id: problemGroupAccess.id, problemId: problemGroupAccess.problemId })
    .from(problemGroupAccess)
    .where(eq(problemGroupAccess.groupId, groupId))
    .all();
  const existingProblemIds = new Set(existingRows.map((row) => row.problemId));
  const rowsToInsert = [...requiredProblemIds]
    .filter((problemId) => !existingProblemIds.has(problemId))
    .map((problemId) => ({
      id: nanoid(),
      groupId,
      problemId,
    }));

  if (rowsToInsert.length > 0) {
    db.insert(problemGroupAccess).values(rowsToInsert).run();
  }

  for (const row of existingRows) {
    if (!requiredProblemIds.has(row.problemId)) {
      db.delete(problemGroupAccess).where(eq(problemGroupAccess.id, row.id)).run();
    }
  }
}

export function createAssignmentWithProblems(
  groupId: string,
  input: AssignmentMutationInput
) {
  const id = nanoid();
  const now = new Date();

  const execute = sqlite.transaction(() => {
    db.insert(assignments)
      .values({
        id,
        groupId,
        title: input.title,
        description: input.description ?? null,
        startsAt: input.startsAt ? new Date(input.startsAt) : null,
        deadline: input.deadline ? new Date(input.deadline) : null,
        lateDeadline: input.lateDeadline ? new Date(input.lateDeadline) : null,
        latePenalty: input.latePenalty,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    db.insert(assignmentProblems).values(mapAssignmentProblems(id, input.problems)).run();
    syncGroupAccessRows(groupId);
  });

  execute();

  return id;
}

export function updateAssignmentWithProblems(
  assignmentId: string,
  input: AssignmentMutationInput
) {
  const now = new Date();

  const execute = sqlite.transaction(() => {
    const assignment = db
      .select({ groupId: assignments.groupId })
      .from(assignments)
      .where(eq(assignments.id, assignmentId))
      .get();

    if (!assignment) {
      throw new Error("Assignment not found");
    }

    db.update(assignments)
      .set({
        title: input.title,
        description: input.description ?? null,
        startsAt: input.startsAt ? new Date(input.startsAt) : null,
        deadline: input.deadline ? new Date(input.deadline) : null,
        lateDeadline: input.lateDeadline ? new Date(input.lateDeadline) : null,
        latePenalty: input.latePenalty,
        updatedAt: now,
      })
      .where(eq(assignments.id, assignmentId))
      .run();

    db.delete(assignmentProblems).where(eq(assignmentProblems.assignmentId, assignmentId)).run();
    db.insert(assignmentProblems)
      .values(mapAssignmentProblems(assignmentId, input.problems))
      .run();

    syncGroupAccessRows(assignment.groupId);
  });

  execute();
}

export function deleteAssignmentWithProblems(assignmentId: string) {
  const execute = sqlite.transaction(() => {
    const assignment = db
      .select({ groupId: assignments.groupId })
      .from(assignments)
      .where(eq(assignments.id, assignmentId))
      .get();

    if (!assignment) {
      return;
    }

    db.delete(assignmentProblems).where(eq(assignmentProblems.assignmentId, assignmentId)).run();
    db.delete(assignments).where(eq(assignments.id, assignmentId)).run();
    syncGroupAccessRows(assignment.groupId);
  });

  execute();
}
