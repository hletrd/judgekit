import { z } from "zod";
import { ALL_CAPABILITIES } from "@/lib/capabilities/types";

const nameRegex = /^[a-z][a-z0-9_]{1,49}$/;

const capabilityEnum = z.enum(ALL_CAPABILITIES as unknown as [string, ...string[]]);

export const createRoleSchema = z.object({
  name: z
    .string()
    .min(2, "Role name must be at least 2 characters")
    .max(50, "Role name must be at most 50 characters")
    .regex(nameRegex, "Role name must start with a letter and contain only lowercase letters, numbers, and underscores"),
  displayName: z
    .string()
    .min(1, "Display name is required")
    .max(100, "Display name must be at most 100 characters"),
  description: z
    .string()
    .max(500, "Description must be at most 500 characters")
    .optional()
    .nullable(),
  level: z
    .number()
    .int()
    .min(0, "Level must be at least 0")
    .max(2, "Level must be at most 2 (only built-in super_admin can be 3)"),
  capabilities: z
    .array(capabilityEnum)
    .min(0)
    .max(ALL_CAPABILITIES.length),
});

export const updateRoleSchema = z.object({
  displayName: z
    .string()
    .min(1, "Display name is required")
    .max(100, "Display name must be at most 100 characters")
    .optional(),
  description: z
    .string()
    .max(500, "Description must be at most 500 characters")
    .optional()
    .nullable(),
  level: z
    .number()
    .int()
    .min(0, "Level must be at least 0")
    .max(2, "Level must be at most 2")
    .optional(),
  capabilities: z
    .array(capabilityEnum)
    .min(0)
    .max(ALL_CAPABILITIES.length)
    .optional(),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
