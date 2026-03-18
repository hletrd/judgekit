import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { resolveCapabilities } from "@/lib/capabilities/cache";
import {
  DEFAULT_SYSTEM_TIME_ZONE,
  getResolvedSystemSettings,
  getSystemSettings,
} from "@/lib/system-settings";
import { SystemSettingsForm } from "./system-settings-form";
import { DatabaseBackupRestore } from "./database-backup-restore";

export default async function AdminSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const caps = await resolveCapabilities(session.user.role);
  if (!caps.has("system.settings")) redirect("/dashboard");

  const t = await getTranslations("admin.settings");
  const tCommon = await getTranslations("common");
  const resolvedSettings = await getResolvedSystemSettings({
    siteTitle: tCommon("appName"),
    siteDescription: tCommon("appDescription"),
  });
  const storedSettings = await getSystemSettings();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("siteCardTitle")}</CardTitle>
          <CardDescription>{t("siteCardDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <SystemSettingsForm
            initialSiteTitle={storedSettings?.siteTitle ?? ""}
            initialSiteDescription={storedSettings?.siteDescription ?? ""}
            initialTimeZone={storedSettings?.timeZone ?? ""}
            defaultSiteTitle={tCommon("appName")}
            defaultSiteDescription={tCommon("appDescription")}
            defaultTimeZone={DEFAULT_SYSTEM_TIME_ZONE}
            currentSiteTitle={resolvedSettings.siteTitle}
            currentSiteDescription={resolvedSettings.siteDescription}
            currentTimeZone={resolvedSettings.timeZone}
            initialAiAssistantEnabled={'aiAssistantEnabled' in (storedSettings ?? {}) ? (storedSettings as any).aiAssistantEnabled ?? true : true}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("backupTitle")}</CardTitle>
          <CardDescription>{t("backupDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <DatabaseBackupRestore isSuperAdmin={caps.has("system.backup")} />
        </CardContent>
      </Card>
    </div>
  );
}
