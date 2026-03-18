import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/responses";
import { db } from "@/lib/db";
import { roles, users } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { getApiUser, unauthorized, forbidden, csrfForbidden } from "@/lib/api/auth";
import { resolveCapabilities, invalidateRoleCache } from "@/lib/capabilities/cache";
import { recordAuditEvent } from "@/lib/audit/events";
import { updateRoleSchema } from "@/lib/validators/roles";
import { withUpdatedAt } from "@/lib/db/helpers";
import { logger } from "@/lib/logger";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getApiUser(request);
    if (!user) return unauthorized();

    const caps = await resolveCapabilities(user.role);
    if (!caps.has("users.manage_roles")) return forbidden();

    const { id } = await params;
    const role = await db
      .select()
      .from(roles)
      .where(eq(roles.id, id))
      .then((rows) => rows[0] ?? null);

    if (!role) {
      return apiError("notFound", 404, "role");
    }

    // Count users with this role
    const [countRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.role, role.name));

    return apiSuccess({ ...role, userCount: countRow?.count ?? 0 });
  } catch (error) {
    logger.error({ err: error }, "Failed to get role");
    return apiError("internalError", 500);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getApiUser(request);
    if (!user) return unauthorized();

    const caps = await resolveCapabilities(user.role);
    if (!caps.has("users.manage_roles")) return forbidden();

    const csrfError = csrfForbidden(request);
    if (csrfError) return csrfError;

    const { id } = await params;
    const role = await db
      .select()
      .from(roles)
      .where(eq(roles.id, id))
      .then((rows) => rows[0] ?? null);

    if (!role) {
      return apiError("notFound", 404, "role");
    }

    const body = await request.json();
    const parsed = updateRoleSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "validationError", 400);
    }

    const updates = parsed.data;

    // super_admin capabilities cannot be reduced
    if (role.name === "super_admin" && updates.capabilities) {
      return apiError("cannotReduceSuperAdminCapabilities", 403);
    }

    // Built-in roles: name cannot be changed (name is not in update schema)
    // Built-in roles: level cannot be changed
    if (role.isBuiltin && updates.level !== undefined && updates.level !== role.level) {
      return apiError("cannotChangeBuiltinRoleLevel", 403);
    }

    const updateData: Record<string, unknown> = {};
    if (updates.displayName !== undefined) updateData.displayName = updates.displayName;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.level !== undefined) updateData.level = updates.level;
    if (updates.capabilities !== undefined) updateData.capabilities = updates.capabilities;

    if (Object.keys(updateData).length === 0) {
      return apiError("noChanges", 400);
    }

    await db
      .update(roles)
      .set(withUpdatedAt(updateData))
      .where(eq(roles.id, id));

    invalidateRoleCache();

    recordAuditEvent({
      actorId: user.id,
      actorRole: user.role,
      action: "update",
      resourceType: "role",
      resourceId: id,
      resourceLabel: role.name,
      summary: `Updated role "${role.displayName}"`,
      details: JSON.stringify(updates),
      request,
    });

    const updated = await db
      .select()
      .from(roles)
      .where(eq(roles.id, id))
      .then((rows) => rows[0]);

    return apiSuccess(updated);
  } catch (error) {
    logger.error({ err: error }, "Failed to update role");
    return apiError("internalError", 500);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getApiUser(request);
    if (!user) return unauthorized();

    const caps = await resolveCapabilities(user.role);
    if (!caps.has("users.manage_roles")) return forbidden();

    const csrfError = csrfForbidden(request);
    if (csrfError) return csrfError;

    const { id } = await params;
    const role = await db
      .select()
      .from(roles)
      .where(eq(roles.id, id))
      .then((rows) => rows[0] ?? null);

    if (!role) {
      return apiError("notFound", 404, "role");
    }

    // Cannot delete built-in roles
    if (role.isBuiltin) {
      return apiError("cannotDeleteBuiltinRole", 403);
    }

    // Cannot delete role with assigned users
    const [countRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.role, role.name));

    if ((countRow?.count ?? 0) > 0) {
      return apiError("roleHasUsers", 409);
    }

    await db.delete(roles).where(eq(roles.id, id));

    invalidateRoleCache();

    recordAuditEvent({
      actorId: user.id,
      actorRole: user.role,
      action: "delete",
      resourceType: "role",
      resourceId: id,
      resourceLabel: role.name,
      summary: `Deleted custom role "${role.displayName}"`,
      request,
    });

    return apiSuccess({ deleted: true });
  } catch (error) {
    logger.error({ err: error }, "Failed to delete role");
    return apiError("internalError", 500);
  }
}
