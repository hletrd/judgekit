import type { UserRole } from "@/types";
import { ROLE_LEVEL } from "@/lib/security/constants";
import { resolveCapabilities, getRoleLevel } from "@/lib/capabilities/cache";

/**
 * Returns true if `userRole` meets or exceeds `requiredRole` in the privilege
 * hierarchy defined by ROLE_LEVEL (student < instructor < admin < super_admin).
 *
 * Accepts string for custom role compatibility. Unknown roles get level -1.
 */
export function isAtLeastRole(userRole: string, requiredRole: string): boolean {
  return (ROLE_LEVEL[userRole as UserRole] ?? -1) >= (ROLE_LEVEL[requiredRole as UserRole] ?? -1);
}

/**
 * Async version that supports custom roles via the capability cache.
 */
export async function isAtLeastRoleAsync(userRole: string, requiredRole: string): Promise<boolean> {
  const userLevel = await getRoleLevel(userRole);
  const requiredLevel = await getRoleLevel(requiredRole);
  return userLevel >= requiredLevel;
}

/**
 * Returns true for admin or super_admin — the roles that can manage users,
 * see all groups, view audit logs, etc.
 *
 * For custom roles, checks for the `users.view` capability.
 */
export function canManageUsers(role: string): boolean {
  return isAtLeastRole(role, "admin");
}

/**
 * Async version that checks capabilities for custom role support.
 */
export async function canManageUsersAsync(role: string): Promise<boolean> {
  const caps = await resolveCapabilities(role);
  return caps.has("users.view") && caps.has("users.edit");
}

/**
 * Returns true for instructor, admin, or super_admin — roles that can create
 * problems, manage assignments, and view privileged submission data.
 */
export function isInstructorOrAbove(role: string): boolean {
  return isAtLeastRole(role, "instructor");
}

/**
 * Async version that checks capabilities for custom role support.
 */
export async function isInstructorOrAboveAsync(role: string): Promise<boolean> {
  const caps = await resolveCapabilities(role);
  return caps.has("problems.create") || caps.has("submissions.view_all");
}
