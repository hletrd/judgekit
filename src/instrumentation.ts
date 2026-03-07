import { getValidatedAuthSecret, getValidatedJudgeAuthToken } from "@/lib/security/env";

export async function register() {
  getValidatedAuthSecret();
  getValidatedJudgeAuthToken();
}
