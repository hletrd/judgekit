import { z } from "zod";
import { normalizeOptionalString, trimString } from "@/lib/validators/preprocess";

export const createGroupSchema = z.object({
  name: z.preprocess(trimString, z.string().min(1, "nameRequired").max(100, "nameTooLong")),
  description: z.preprocess(
    normalizeOptionalString,
    z.string().max(500, "descriptionTooLong").optional()
  ),
});

export const groupMembershipSchema = z.object({
  userId: z.preprocess(trimString, z.string().min(1, "studentRequired")),
});

export const updateGroupSchema = createGroupSchema.partial().extend({
  isArchived: z.boolean().optional(),
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;
export type GroupMembershipInput = z.infer<typeof groupMembershipSchema>;
