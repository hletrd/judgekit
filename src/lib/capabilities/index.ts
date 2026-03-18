export {
  ALL_CAPABILITIES,
  CAPABILITY_GROUPS,
  BUILTIN_ROLE_NAMES,
  isBuiltinRole,
  isCapability,
  type Capability,
  type CapabilityGroup,
  type BuiltinRoleName,
  type RoleRecord,
} from "./types";

export {
  DEFAULT_ROLE_CAPABILITIES,
  DEFAULT_ROLE_LEVELS,
  DEFAULT_ROLE_DISPLAY_NAMES,
} from "./defaults";

export {
  hasCapability,
  hasAnyCapability,
  hasAllCapabilities,
  resolveUserCapabilities,
} from "./checker";

export {
  resolveCapabilities,
  getRoleLevel,
  getAllRoleLevels,
  getAllCachedRoles,
  invalidateRoleCache,
  isValidRole,
} from "./cache";
