import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { plugins } from "@/lib/db/schema";
import { getAllPluginDefinitions, getPluginDefinition } from "./registry";
import type { PluginState } from "./types";
import { decryptPluginConfigForUse, redactPluginConfigForRead } from "./secrets";

type GetPluginStateOptions = {
  includeSecrets?: boolean;
};

function normalizePluginConfig(
  pluginId: string,
  rawConfig: Record<string, unknown>,
  includeSecrets: boolean
) {
  return includeSecrets
    ? decryptPluginConfigForUse(pluginId, rawConfig)
    : redactPluginConfigForRead(pluginId, rawConfig);
}

export async function getPluginState(
  pluginId: string,
  options: GetPluginStateOptions = {}
): Promise<PluginState | null> {
  const definition = getPluginDefinition(pluginId);
  if (!definition) return null;

  const [row] = await db.select().from(plugins).where(eq(plugins.id, pluginId)).limit(1);
  const includeSecrets = options.includeSecrets === true;
  const rawConfig = (row?.config as Record<string, unknown>) ?? { ...definition.defaultConfig };

  return {
    id: pluginId,
    enabled: row?.enabled ?? false,
    config: normalizePluginConfig(pluginId, rawConfig, includeSecrets),
    definition,
    updatedAt: row?.updatedAt ?? null,
  };
}

export async function getAllPluginStates(
  options: GetPluginStateOptions = {}
): Promise<PluginState[]> {
  const definitions = getAllPluginDefinitions();
  const rows = await db.select().from(plugins);
  const rowMap = new Map(rows.map((r) => [r.id, r]));
  const includeSecrets = options.includeSecrets === true;

  return definitions.map((def) => {
    const row = rowMap.get(def.id);
    const rawConfig = (row?.config as Record<string, unknown>) ?? { ...def.defaultConfig };
    return {
      id: def.id,
      enabled: row?.enabled ?? false,
      config: normalizePluginConfig(def.id, rawConfig, includeSecrets),
      definition: def,
      updatedAt: row?.updatedAt ?? null,
    };
  });
}

export async function isPluginEnabled(pluginId: string): Promise<boolean> {
  const [row] = await db
    .select({ enabled: plugins.enabled })
    .from(plugins)
    .where(eq(plugins.id, pluginId))
    .limit(1);
  return row?.enabled ?? false;
}
