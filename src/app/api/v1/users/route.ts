import { NextRequest } from "next/server";
import { apiSuccess, apiError, apiPaginated } from "@/lib/api/responses";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { forbidden, isAdmin } from "@/lib/api/handler";
import { recordAuditEvent } from "@/lib/audit/events";
import { nanoid } from "nanoid";
import { hashPassword } from "@/lib/security/password-hash";
import { generateSecurePassword } from "@/lib/auth/generated-password";
import { safeUserSelect } from "@/lib/db/selects";
import { assertUserRole, isUserRole } from "@/lib/security/constants";
import { userCreateSchema } from "@/lib/validators/profile";
import { parsePagination } from "@/lib/api/pagination";
import {
  isUsernameTaken,
  isEmailTaken,
  validateAndHashPassword,
  validateRoleChange,
} from "@/lib/users/core";
import { createApiHandler } from "@/lib/api/handler";

export const GET = createApiHandler({
  handler: async (req: NextRequest, { user }) => {
    if (!isAdmin(user.role)) return forbidden();

    const searchParams = req.nextUrl.searchParams;
    const { page, limit, offset } = parsePagination(searchParams);
    const role = searchParams.get("role");

    if (role && !isUserRole(role)) {
      return apiError("invalidRole", 400);
    }

    const whereClause = role ? eq(users.role, assertUserRole(role)) : undefined;

    const [totalRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(whereClause);

    const results = await db
      .select(safeUserSelect)
      .from(users)
      .where(whereClause)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    return apiPaginated(results, page, limit, Number(totalRow?.count ?? 0));
  },
});

export const POST = createApiHandler({
  rateLimit: "users:create",
  handler: async (req: NextRequest, { user }) => {
    if (!isAdmin(user.role)) return forbidden();

    const parsed = userCreateSchema.safeParse(await req.json());

    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "createUserFailed", 400);
    }

    const { username, email, name, className, password, role } = parsed.data;
    const normalizedEmail = email ?? null;
    const normalizedClassName = className ?? null;
    const requestedRole = role.trim() || "student";

    const roleError = validateRoleChange(user.role, requestedRole);
    if (roleError === "invalidRole") {
      return apiError("invalidRole", 400);
    }
    if (roleError) {
      return apiError(roleError, 403);
    }

    if (password) {
      const passwordResult = await validateAndHashPassword(password);
      if (passwordResult.error) {
        return apiError(passwordResult.error, 400);
      }
    }

    if (await isUsernameTaken(username)) {
      return apiError("usernameInUse", 409);
    }

    if (normalizedEmail && await isEmailTaken(normalizedEmail)) {
      return apiError("emailInUse", 409);
    }

    const generatedPassword = generateSecurePassword();
    const passwordToHash = password ?? generatedPassword;
    const passwordHash = await hashPassword(passwordToHash);
    const id = nanoid();

    const [created] = await db.insert(users).values({
      id,
      username,
      email: normalizedEmail,
      name,
      className: normalizedClassName,
      passwordHash,
      role: assertUserRole(requestedRole),
      isActive: true,
      mustChangePassword: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning(safeUserSelect);

    if (created) {
      recordAuditEvent({
        actorId: user.id,
        actorRole: user.role,
        action: "user.created_api",
        resourceType: "user",
        resourceId: created.id,
        resourceLabel: created.username,
        summary: `Created user @${created.username} via API`,
        details: {
          role: created.role,
          usedGeneratedPassword: !password,
        },
        request: req,
      });
    }

    const response = apiSuccess({ user: created, passwordGenerated: password === undefined }, { status: 201 });
    response.headers.set("Cache-Control", "no-store, no-cache");
    return response;
  },
});
