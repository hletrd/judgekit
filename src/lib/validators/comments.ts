import { z } from "zod";

export const commentCreateSchema = z.object({
  content: z.string().min(1).max(2000).trim(),
});
