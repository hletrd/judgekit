import type { z } from "zod";
import type { ComponentType } from "react";

export interface PluginAdminProps {
  pluginId: string;
  config: Record<string, unknown>;
  onSave: (config: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>;
}

export interface PluginWidgetProps {
  config?: Record<string, unknown>;
}

export interface PluginDefinition {
  id: string;
  nameKey: string;
  descriptionKey: string;
  configSchema: z.ZodSchema;
  defaultConfig: Record<string, unknown>;
  secretConfigKeys?: string[];
  getAdminComponent: () => Promise<{ default: ComponentType<PluginAdminProps> }>;
  getWidgetComponent?: () => Promise<{ default: ComponentType<PluginWidgetProps> }>;
}

export interface PluginState {
  id: string;
  enabled: boolean;
  config: Record<string, unknown>;
  definition: PluginDefinition;
  updatedAt: Date | null;
}
