import type { SubmissionStatus } from "@/types";
import { isActiveSubmissionStatus } from "@/lib/submissions/status";

export const ASSIGNMENT_PARTICIPANT_STATUS_VALUES = [
  "not_submitted",
  "in_progress",
  "submitted",
  "pending",
  "queued",
  "judging",
  "accepted",
  "wrong_answer",
  "time_limit",
  "memory_limit",
  "runtime_error",
  "compile_error",
] as const;

export type AssignmentParticipantStatus = (typeof ASSIGNMENT_PARTICIPANT_STATUS_VALUES)[number];

export type AssignmentParticipantStatusParams = {
  latestStatus: SubmissionStatus | null;
  attemptCount: number;
  bestTotalScore: number;
  totalPoints: number;
  examSessionStartedAt?: Date | string | null;
  examSessionPersonalDeadline?: Date | string | null;
  now?: number;
};

function toTimestamp(value: Date | string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const timestamp = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function hasActiveExamSession(
  examSessionPersonalDeadline: Date | string | null | undefined,
  now = Date.now(),
  examSessionStartedAt?: Date | string | null
): boolean {
  if (!examSessionPersonalDeadline) {
    return false;
  }

  const startedAt = toTimestamp(examSessionStartedAt);
  if (startedAt != null && startedAt > now) {
    return false;
  }

  const deadline = toTimestamp(examSessionPersonalDeadline);
  return deadline != null && deadline >= now;
}

export function getAssignmentParticipantStatus({
  latestStatus,
  attemptCount,
  bestTotalScore,
  totalPoints,
  examSessionStartedAt,
  examSessionPersonalDeadline,
  now = Date.now(),
}: AssignmentParticipantStatusParams): AssignmentParticipantStatus {
  if (isActiveSubmissionStatus(latestStatus) || latestStatus === "submitted") {
    return latestStatus as AssignmentParticipantStatus;
  }

  const hasPerfectScore = totalPoints > 0 && bestTotalScore >= totalPoints;
  if (hasPerfectScore) {
    return "accepted";
  }

  if (hasActiveExamSession(examSessionPersonalDeadline, now, examSessionStartedAt)) {
    return "in_progress";
  }

  if (attemptCount <= 0) {
    return "not_submitted";
  }

  if (latestStatus === "accepted" || latestStatus == null) {
    return "submitted";
  }

  return latestStatus;
}
