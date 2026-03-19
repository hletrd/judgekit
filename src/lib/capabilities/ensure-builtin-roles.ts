import { db } from "@/lib/db";
import { roles } from "@/lib/db/schema";
import { nanoid } from "nanoid";
import { BUILTIN_ROLE_NAMES } from "./types";
import {
  DEFAULT_ROLE_CAPABILITIES,
  DEFAULT_ROLE_LEVELS,
  DEFAULT_ROLE_DISPLAY_NAMES,
} from "./defaults";

/**
 * Ensure all built-in roles exist in the database.
 * Creates missing ones with default capabilities.
 * Safe to call multiple times — only inserts what's missing.
 */
export async function ensureBuiltinRoles(): Promise<void> {
  const existingRoles = await db
    .select({ name: roles.name })
    .from(roles);
  const existingNames = new Set(existingRoles.map((r) => r.name));

  for (const roleName of BUILTIN_ROLE_NAMES) {
    if (existingNames.has(roleName)) continue;

    await db.insert(roles).values({
      id: nanoid(),
      name: roleName,
      displayName: DEFAULT_ROLE_DISPLAY_NAMES[roleName],
      description: null,
      isBuiltin: true,
      level: DEFAULT_ROLE_LEVELS[roleName],
      capabilities: DEFAULT_ROLE_CAPABILITIES[roleName] as string[],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}
