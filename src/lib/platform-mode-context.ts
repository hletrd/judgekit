import { and, eq } from "drizzle-orm";
import type { PlatformMode } from "@/types";
import { db } from "@/lib/db";
import { assignments, recruitingInvitations } from "@/lib/db/schema";
import { getPlatformModePolicy } from "@/lib/platform-mode";
import { getResolvedPlatformMode, getSystemSettings } from "@/lib/system-settings";

export type PlatformModeContextOptions = {
  userId?: string | null;
  assignmentId?: string | null;
};

async function hasRedeemedRecruitingAccess({
  userId,
  assignmentId,
}: PlatformModeContextOptions): Promise<boolean> {
  if (!userId) return false;

  const invitation = await db.query.recruitingInvitations.findFirst({
    where: assignmentId
      ? and(
          eq(recruitingInvitations.userId, userId),
          eq(recruitingInvitations.assignmentId, assignmentId),
          eq(recruitingInvitations.status, "redeemed")
        )
      : and(
          eq(recruitingInvitations.userId, userId),
          eq(recruitingInvitations.status, "redeemed")
        ),
    columns: { id: true },
  });

  return Boolean(invitation);
}

async function getAssignmentPlatformMode(
  assignmentId: string | null | undefined,
  globalMode: PlatformMode
): Promise<PlatformMode | null> {
  if (!assignmentId) return null;

  const assignment = await db.query.assignments.findFirst({
    where: eq(assignments.id, assignmentId),
    columns: { examMode: true },
  });

  if (!assignment || assignment.examMode === "none") {
    return null;
  }

  return globalMode === "exam" ? "exam" : "contest";
}

export async function getEffectivePlatformMode(
  options: PlatformModeContextOptions = {}
): Promise<PlatformMode> {
  const globalMode = await getResolvedPlatformMode();

  if (globalMode === "recruiting") {
    return "recruiting";
  }

  if (await hasRedeemedRecruitingAccess(options)) {
    return "recruiting";
  }

  const assignmentMode = await getAssignmentPlatformMode(options.assignmentId, globalMode);
  if (assignmentMode) {
    return assignmentMode;
  }

  return globalMode;
}

export async function isAiAssistantEnabledForContext(
  options: PlatformModeContextOptions = {}
): Promise<boolean> {
  const effectiveMode = await getEffectivePlatformMode(options);
  if (getPlatformModePolicy(effectiveMode).restrictAiByDefault) {
    return false;
  }

  const settings = await getSystemSettings();
  return settings?.aiAssistantEnabled ?? true;
}
