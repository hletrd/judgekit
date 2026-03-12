import { NextRequest, NextResponse } from "next/server";
import { apiSuccess, apiError, apiPaginated } from "@/lib/api/responses";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { getApiUser, unauthorized, forbidden, isAdmin, csrfForbidden } from "@/lib/api/auth";
import { recordAuditEvent } from "@/lib/audit/events";
import { nanoid } from "nanoid";
import { hash } from "bcryptjs";
import { generateSecurePassword } from "@/lib/auth/generated-password";
import { safeUserSelect } from "@/lib/db/selects";
import { assertUserRole, isUserRole } from "@/lib/security/constants";
import { userCreateSchema } from "@/lib/validators/profile";
import { consumeApiRateLimit } from "@/lib/security/api-rate-limit";
import { parsePagination } from "@/lib/api/pagination";
import {
  isUsernameTaken,
  isEmailTaken,
  validateAndHashPassword,
  validateRoleChange,
} from "@/lib/users/core";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    if (!user) return unauthorized();
    if (!isAdmin(user.role)) return forbidden();

    const searchParams = request.nextUrl.searchParams;
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
  } catch (error) {
    logger.error({ err: error }, "GET /api/v1/users error");
    return apiError("internalServerError", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const csrfError = csrfForbidden(request);
    if (csrfError) return csrfError;

    const rateLimitResponse = consumeApiRateLimit(request, "users:create");
    if (rateLimitResponse) return rateLimitResponse;

    const user = await getApiUser(request);
    if (!user) return unauthorized();
    if (!isAdmin(user.role)) return forbidden();

    const parsed = userCreateSchema.safeParse(await request.json());

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
    const passwordHash = await hash(passwordToHash, 12);
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
        request,
      });
    }

    const response = apiSuccess({ user: created, passwordGenerated: password === undefined }, { status: 201 });
    response.headers.set("Cache-Control", "no-store, no-cache");
    return response;
  } catch (error) {
    logger.error({ err: error }, "POST /api/v1/users error");
    return apiError("internalServerError", 500);
  }
}
