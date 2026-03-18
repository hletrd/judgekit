/**
 * Capability checking functions.
 *
 * These operate on a Set<string> of capabilities, typically resolved
 * from the role cache.
 */

import type { Capability } from "./types";
import { resolveCapabilities } from "./cache";

/**
 * Check if a capability set includes a specific capability.
 */
export function hasCapability(capabilities: ReadonlySet<string>, cap: Capability): boolean {
  return capabilities.has(cap);
}

/**
 * Check if a capability set includes ANY of the given capabilities.
 */
export function hasAnyCapability(
  capabilities: ReadonlySet<string>,
  caps: readonly Capability[]
): boolean {
  return caps.some((cap) => capabilities.has(cap));
}

/**
 * Check if a capability set includes ALL of the given capabilities.
 */
export function hasAllCapabilities(
  capabilities: ReadonlySet<string>,
  caps: readonly Capability[]
): boolean {
  return caps.every((cap) => capabilities.has(cap));
}

/**
 * Resolve a user's role name to a Set of capabilities.
 * For SSR pages that need to pass capabilities to client components.
 */
export async function resolveUserCapabilities(role: string): Promise<Set<string>> {
  return resolveCapabilities(role);
}
