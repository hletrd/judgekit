import { getValidatedAuthSecret, getValidatedJudgeAuthToken } from "@/lib/security/env";
import { startRateLimitEviction } from "@/lib/security/rate-limit";
import { startAuditEventPruning } from "@/lib/audit/events";

export async function register() {
  getValidatedAuthSecret();
  getValidatedJudgeAuthToken();

  // Start background maintenance jobs (only runs once per process)
  startRateLimitEviction();
  startAuditEventPruning();
}
