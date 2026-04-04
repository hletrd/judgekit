import { db, sqlite, execTransaction } from "@/lib/db";
import { assignments, examSessions, users } from "@/lib/db/schema";
import { and, eq, asc } from "drizzle-orm";
import { nanoid } from "nanoid";

export type ExamSession = {
  id: string;
  assignmentId: string;
  userId: string;
  startedAt: Date;
  personalDeadline: Date;
};

export type ExamSessionWithUser = ExamSession & {
  username: string;
  name: string;
  className: string | null;
};

export async function startExamSession(
  assignmentId: string,
  userId: string,
  ipAddress?: string | null
): Promise<ExamSession> {
  const assignment = await db.query.assignments.findFirst({
    where: eq(assignments.id, assignmentId),
    columns: {
      id: true,
      examMode: true,
      examDurationMinutes: true,
      startsAt: true,
      deadline: true,
    },
  });

  if (!assignment) {
    throw new Error("assignmentNotFound");
  }

  if (assignment.examMode !== "windowed") {
    throw new Error("examModeInvalid");
  }

  if (!assignment.examDurationMinutes || assignment.examDurationMinutes <= 0) {
    throw new Error("examDurationInvalid");
  }

  const now = new Date();

  if (assignment.startsAt && now < assignment.startsAt) {
    throw new Error("assignmentNotStarted");
  }

  if (assignment.deadline && now >= assignment.deadline) {
    throw new Error("assignmentClosed");
  }

  // Check for existing session (idempotent)
  const existing = await db.query.examSessions.findFirst({
    where: and(
      eq(examSessions.assignmentId, assignmentId),
      eq(examSessions.userId, userId)
    ),
  });

  if (existing) {
    return {
      id: existing.id,
      assignmentId: existing.assignmentId,
      userId: existing.userId,
      startedAt: existing.startedAt,
      personalDeadline: existing.personalDeadline,
    };
  }

  const durationMs = (assignment.examDurationMinutes ?? 0) * 60_000;
  const personalDeadlineMs = now.getTime() + durationMs;
  const personalDeadline =
    assignment.deadline && assignment.deadline.getTime() < personalDeadlineMs
      ? assignment.deadline
      : new Date(personalDeadlineMs);

  const id = nanoid();
  const startedAt = now;
  const nowSec = Math.floor(startedAt.getTime() / 1000);
  const personalDeadlineSec = Math.floor(personalDeadline.getTime() / 1000);

  execTransaction(() => {
    const result = sqlite
      .prepare(
        `INSERT OR IGNORE INTO exam_sessions (id, assignment_id, user_id, started_at, personal_deadline, ip_address)
         SELECT ?, ?, ?, ?, ?, ?
         WHERE EXISTS (
           SELECT 1 FROM assignments
           WHERE id = ? AND (starts_at IS NULL OR starts_at <= ?) AND (deadline IS NULL OR deadline > ?)
         )`
      )
      .run(
        id,
        assignmentId,
        userId,
        nowSec,
        personalDeadlineSec,
        ipAddress ?? null,
        assignmentId,
        nowSec,
        nowSec
      );

    const row = sqlite
      .prepare(
        `SELECT id, assignment_id, user_id, started_at, personal_deadline
         FROM exam_sessions
         WHERE assignment_id = ? AND user_id = ?`
      )
      .get(assignmentId, userId) as {
      id: string;
      assignment_id: string;
      user_id: string;
      started_at: number;
      personal_deadline: number;
    } | undefined;

    if (!row) {
      throw new Error("assignmentClosed");
    }

    return row;
  });

  const row = insertAndSelect();

  return {
    id: row.id,
    assignmentId: row.assignment_id,
    userId: row.user_id,
    startedAt: new Date(row.started_at * 1000),
    personalDeadline: new Date(row.personal_deadline * 1000),
  };
}

export async function getExamSession(
  assignmentId: string,
  userId: string
): Promise<ExamSession | null> {
  const session = await db.query.examSessions.findFirst({
    where: and(
      eq(examSessions.assignmentId, assignmentId),
      eq(examSessions.userId, userId)
    ),
  });

  if (!session) return null;

  return {
    id: session.id,
    assignmentId: session.assignmentId,
    userId: session.userId,
    startedAt: session.startedAt,
    personalDeadline: session.personalDeadline,
  };
}

export async function getExamSessionsForAssignment(
  assignmentId: string
): Promise<ExamSessionWithUser[]> {
  const rows = await db
    .select({
      id: examSessions.id,
      assignmentId: examSessions.assignmentId,
      userId: examSessions.userId,
      startedAt: examSessions.startedAt,
      personalDeadline: examSessions.personalDeadline,
      username: users.username,
      name: users.name,
      className: users.className,
    })
    .from(examSessions)
    .innerJoin(users, eq(examSessions.userId, users.id))
    .where(eq(examSessions.assignmentId, assignmentId))
    .orderBy(asc(examSessions.startedAt));

  return rows.map((row) => ({
    id: row.id,
    assignmentId: row.assignmentId,
    userId: row.userId,
    startedAt: row.startedAt,
    personalDeadline: row.personalDeadline,
    username: row.username,
    name: row.name,
    className: row.className,
  }));
}
