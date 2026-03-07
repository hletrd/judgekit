import type { SubmissionStatus, UserRole } from "@/types";

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_SOURCE_CODE_SIZE_BYTES = 256 * 1024;

export const LOGIN_RATE_LIMIT_MAX_ATTEMPTS = 5;
export const LOGIN_RATE_LIMIT_WINDOW_MS = 60 * 1000;
export const LOGIN_RATE_LIMIT_BLOCK_MS = 15 * 60 * 1000;

export const USER_ROLES: readonly UserRole[] = [
  "student",
  "instructor",
  "admin",
  "super_admin",
];

export const SUBMISSION_STATUSES: readonly SubmissionStatus[] = [
  "pending",
  "queued",
  "judging",
  "accepted",
  "wrong_answer",
  "time_limit",
  "memory_limit",
  "runtime_error",
  "compile_error",
];

export function isUserRole(value: string): value is UserRole {
  return USER_ROLES.includes(value as UserRole);
}

export function canManageRole(actorRole: UserRole, requestedRole: UserRole) {
  return requestedRole !== "super_admin" || actorRole === "super_admin";
}

export function isSubmissionStatus(value: string): value is SubmissionStatus {
  return SUBMISSION_STATUSES.includes(value as SubmissionStatus);
}
