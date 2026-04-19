import type { UserRole } from "@/types";
import { ROLE_LEVEL } from "@/lib/security/constants";
import { resolveCapabilities, getRoleLevel } from "@/lib/capabilities/cache";

/**
 * Async version that supports custom roles via the capability cache.
 */
export async function isAtLeastRoleAsync(userRole: string, requiredRole: string): Promise<boolean> {
  const userLevel = await getRoleLevel(userRole);
  const requiredLevel = await getRoleLevel(requiredRole);
  return userLevel >= requiredLevel;
}

/**
 * Async version that checks capabilities for custom role support.
 */
export async function canManageUsersAsync(role: string): Promise<boolean> {
  const caps = await resolveCapabilities(role);
  return caps.has("users.view") && caps.has("users.edit");
}

/**
 * Async version that checks capabilities for custom role support.
 */
export async function isInstructorOrAboveAsync(role: string): Promise<boolean> {
  const caps = await resolveCapabilities(role);
  return caps.has("problems.create") || caps.has("submissions.view_all");
}
