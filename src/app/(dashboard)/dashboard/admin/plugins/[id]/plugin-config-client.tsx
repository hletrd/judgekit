"use client";
/* eslint-disable react-hooks/static-components -- plugin admin components are lazily prebuilt at module scope */

import { lazy, Suspense, useCallback, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { updatePluginConfig } from "@/lib/actions/plugins";
import { getAllPluginDefinitions } from "@/lib/plugins/registry";
import type { PluginAdminProps } from "@/lib/plugins/types";

interface PluginConfigClientProps {
  pluginId: string;
  config: Record<string, unknown>;
}

const ADMIN_COMPONENTS = new Map<
  string,
  ReturnType<typeof lazy<ComponentType<PluginAdminProps>>>
>(
  getAllPluginDefinitions().map((definition) => [
    definition.id,
    lazy(definition.getAdminComponent),
  ])
);

export function PluginConfigClient({ pluginId, config }: PluginConfigClientProps) {
  const router = useRouter();
  const t = useTranslations("plugins");

  const AdminComponent = ADMIN_COMPONENTS.get(pluginId) ?? null;

  const handleSave = useCallback(async (newConfig: Record<string, unknown>) => {
    const result = await updatePluginConfig(pluginId, newConfig);
    if (result.success) {
      toast.success(t("chatWidget.configSaved"));
      router.refresh();
    } else {
      toast.error(t("chatWidget.configError"));
    }
    return result;
  }, [pluginId, router, t]);

  if (!AdminComponent) return null;

  return (
    <Suspense fallback={<div className="animate-pulse h-96 bg-muted rounded-lg" />}>
      <AdminComponent
        pluginId={pluginId}
        config={config}
        onSave={handleSave}
      />
    </Suspense>
  );
}
