import type { PlatformMode } from "@/types";

export const DEFAULT_PLATFORM_MODE: PlatformMode = "homework";
export const PLATFORM_MODE_VALUES: PlatformMode[] = [
  "homework",
  "exam",
  "contest",
  "recruiting",
];

export function getPlatformModePolicy(platformMode: PlatformMode) {
  return {
    platformMode,
    labelKey: `platformModes.${platformMode}` as const,
    restrictAiByDefault:
      platformMode === "exam" ||
      platformMode === "contest" ||
      platformMode === "recruiting",
    restrictStandaloneCompiler:
      platformMode === "exam" || platformMode === "recruiting",
  };
}
