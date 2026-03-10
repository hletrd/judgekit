"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { buildServerActionAuditContext, recordAuditEvent } from "@/lib/audit/events";
import { db } from "@/lib/db";
import { systemSettings } from "@/lib/db/schema";
import { GLOBAL_SETTINGS_ID } from "@/lib/system-settings";
import { isTrustedServerActionOrigin } from "@/lib/security/server-actions";
import {
  type SystemSettingsInput,
  systemSettingsSchema,
} from "@/lib/validators/system-settings";

type UpdateSystemSettingsResult = {
  success: boolean;
  error?: string;
};

export async function updateSystemSettings(
  input: SystemSettingsInput
): Promise<UpdateSystemSettingsResult> {
  if (!(await isTrustedServerActionOrigin())) {
    return { success: false, error: "unauthorized" };
  }

  const session = await auth();

  if (!session?.user || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
    return { success: false, error: "unauthorized" };
  }

  const parsedInput = systemSettingsSchema.safeParse(input);
  if (!parsedInput.success) {
    return {
      success: false,
      error: parsedInput.error.issues[0]?.message ?? "updateError",
    };
  }

  const { siteTitle, siteDescription, timeZone } = parsedInput.data;

  await db
    .insert(systemSettings)
    .values({
      id: GLOBAL_SETTINGS_ID,
      siteTitle: siteTitle ?? null,
      siteDescription: siteDescription ?? null,
      timeZone: timeZone ?? null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: systemSettings.id,
      set: {
        siteTitle: siteTitle ?? null,
        siteDescription: siteDescription ?? null,
        timeZone: timeZone ?? null,
        updatedAt: new Date(),
      },
    });

  const auditContext = await buildServerActionAuditContext("/dashboard/admin/settings");
  recordAuditEvent({
    actorId: session.user.id,
    actorRole: session.user.role,
    action: "system_settings.updated",
    resourceType: "system_settings",
    resourceId: GLOBAL_SETTINGS_ID,
    resourceLabel: "Global settings",
    summary: "Updated global system settings",
    details: {
      siteTitle: siteTitle ?? null,
      siteDescription: siteDescription ?? null,
      timeZone: timeZone ?? null,
    },
    context: auditContext,
  });

  revalidatePath("/", "layout");
  revalidatePath("/login");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/admin/settings");

  return { success: true };
}
