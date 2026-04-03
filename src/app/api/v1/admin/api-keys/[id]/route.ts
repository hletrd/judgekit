import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createApiHandler, isAdmin } from "@/lib/api/handler";
import { apiSuccess, apiError } from "@/lib/api/responses";
import { recordAuditEvent } from "@/lib/audit/events";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

export const PATCH = createApiHandler({
  schema: updateSchema,
  handler: async (req: NextRequest, { user, params, body }) => {
    if (!isAdmin(user.role)) return apiError("forbidden", 403);

    const { id } = params;
    const existing = await db.query.apiKeys.findFirst({ where: eq(apiKeys.id, id) });
    if (!existing) return apiError("notFound", 404, "ApiKey");

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name !== undefined) updates.name = body.name;
    if (body.isActive !== undefined) updates.isActive = body.isActive;
    if (body.expiresAt !== undefined) updates.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;

    await db.update(apiKeys).set(updates).where(eq(apiKeys.id, id)).run();

    recordAuditEvent({
      actorId: user.id,
      actorRole: user.role,
      action: "api_key.updated",
      resourceType: "api_key",
      resourceId: id,
      resourceLabel: existing.name,
      summary: `Updated API key "${existing.name}"`,
      details: body,
      request: req,
    });

    return apiSuccess({ id });
  },
});

export const DELETE = createApiHandler({
  handler: async (req: NextRequest, { user, params }) => {
    if (!isAdmin(user.role)) return apiError("forbidden", 403);

    const { id } = params;
    const existing = await db.query.apiKeys.findFirst({ where: eq(apiKeys.id, id) });
    if (!existing) return apiError("notFound", 404, "ApiKey");

    await db.delete(apiKeys).where(eq(apiKeys.id, id)).run();

    recordAuditEvent({
      actorId: user.id,
      actorRole: user.role,
      action: "api_key.deleted",
      resourceType: "api_key",
      resourceId: id,
      resourceLabel: existing.name,
      summary: `Deleted API key "${existing.name}"`,
      request: req,
    });

    return apiSuccess({ id });
  },
});
