import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { getAllPluginStates } from "@/lib/plugins/data";
import { PluginToggle } from "./plugin-toggle";

export default async function AdminPluginsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin" && session.user.role !== "super_admin") redirect("/dashboard");

  const t = await getTranslations("plugins");
  const plugins = await getAllPluginStates();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      {plugins.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noPlugins")}</p>
      ) : (
        <div className="space-y-4">
          {plugins.map((plugin) => (
            <Card key={plugin.id}>
              <CardHeader>
                <CardTitle>{t(plugin.definition.nameKey)}</CardTitle>
                <CardDescription>{t(plugin.definition.descriptionKey)}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <PluginToggle pluginId={plugin.id} enabled={plugin.enabled} />
                  <Link href={`/dashboard/admin/plugins/${plugin.id}`}>
                    <Button variant="outline" size="sm">{t("configure")}</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
