import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { getValidatedJudgeAuthToken } from "@/lib/security/env";

function parseBearerToken(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice(7);
}

export function isJudgeAuthorized(request: NextRequest) {
  const providedToken = parseBearerToken(request.headers.get("authorization"));

  if (!providedToken) {
    return false;
  }

  const expectedToken = getValidatedJudgeAuthToken();
  const providedBuffer = Buffer.from(providedToken);
  const expectedBuffer = Buffer.from(expectedToken);

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, expectedBuffer);
}
