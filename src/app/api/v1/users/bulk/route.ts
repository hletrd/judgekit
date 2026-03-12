import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api/responses";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getApiUser, unauthorized, forbidden, isAdmin, csrfForbidden } from "@/lib/api/auth";
import { recordAuditEvent } from "@/lib/audit/events";
import { nanoid } from "nanoid";
import { hash } from "bcryptjs";
import { generateSecurePassword } from "@/lib/auth/generated-password";
import { bulkUserCreateSchema } from "@/lib/validators/bulk-users";
import { consumeApiRateLimit } from "@/lib/security/api-rate-limit";
import { validateRoleChange } from "@/lib/users/core";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const csrfError = csrfForbidden(request);
    if (csrfError) return csrfError;

    const rateLimitResponse = consumeApiRateLimit(request, "users:bulk-create");
    if (rateLimitResponse) return rateLimitResponse;

    const user = await getApiUser(request);
    if (!user) return unauthorized();
    if (!isAdmin(user.role)) return forbidden();

    const body = await request.json();
    const parsed = bulkUserCreateSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "invalidInput", 400);
    }

    const { users: userList } = parsed.data;

    // Validate role escalation for each user
    for (const entry of userList) {
      if (entry.role && entry.role !== "student") {
        const roleError = validateRoleChange(user.role, entry.role);
        if (roleError) {
          return apiError(roleError, 403);
        }
      }
    }

    // Check for duplicate usernames within the request itself
    const requestUsernames = userList.map((u) => u.username);
    const uniqueRequestUsernames = new Set(requestUsernames);
    if (uniqueRequestUsernames.size !== requestUsernames.length) {
      return apiError("duplicateUsernamesInRequest", 400);
    }

    // Check existing usernames in DB
    const existingUsers = await db.query.users.findMany({
      columns: { username: true },
    });
    const existingUsernameSet = new Set(existingUsers.map((u) => u.username));

    type CreatedEntry = { username: string; name: string; generatedPassword: string };
    type FailedEntry = { username: string; reason: string };

    const created: CreatedEntry[] = [];
    const failed: FailedEntry[] = [];
    const toInsert: Array<{
      id: string;
      username: string;
      name: string;
      email: string | null;
      className: string | null;
      passwordHash: string;
      role: "student" | "instructor";
      generatedPassword: string;
    }> = [];

    // Prepare all inserts in parallel, collecting failures for duplicates
    const filteredItems = userList.filter((item) => {
      if (existingUsernameSet.has(item.username)) {
        failed.push({ username: item.username, reason: "usernameInUse" });
        return false;
      }
      return true;
    });

    const preparedEntries = await Promise.all(
      filteredItems.map(async (item) => {
        const generatedPassword = generateSecurePassword();
        const passwordHash = await hash(generatedPassword, 12);
        const id = nanoid();
        const normalizedEmail = item.email && item.email.trim() !== "" ? item.email.trim() : null;
        const normalizedClassName =
          item.className && item.className.trim() !== "" ? item.className.trim() : null;

        return {
          id,
          username: item.username,
          name: item.name,
          email: normalizedEmail,
          className: normalizedClassName,
          passwordHash,
          role: item.role ?? ("student" as const),
          generatedPassword,
        };
      })
    );

    toInsert.push(...preparedEntries);

    // Insert all valid users in a single transaction
    if (toInsert.length > 0) {
      await db.transaction(async (tx) => {
        for (const entry of toInsert) {
          await tx.insert(users).values({
            id: entry.id,
            username: entry.username,
            email: entry.email,
            name: entry.name,
            className: entry.className,
            passwordHash: entry.passwordHash,
            role: entry.role,
            isActive: true,
            mustChangePassword: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      });

      for (const entry of toInsert) {
        created.push({
          username: entry.username,
          name: entry.name,
          generatedPassword: entry.generatedPassword,
        });
      }
    }

    // Record audit event for the bulk operation
    recordAuditEvent({
      actorId: user.id,
      actorRole: user.role,
      action: "user.bulk_created_api",
      resourceType: "user",
      resourceLabel: `bulk:${created.length}`,
      summary: `Bulk created ${created.length} user(s) via API (${failed.length} failed)`,
      details: {
        createdCount: created.length,
        failedCount: failed.length,
        failedUsernames: failed.map((f) => f.username),
      },
      request,
    });

    const response = NextResponse.json(
      {
        created,
        failed,
        createdCount: created.length,
        failedCount: failed.length,
      },
      { status: 201 }
    );
    response.headers.set("Cache-Control", "no-store, no-cache");
    response.headers.set("Pragma", "no-cache");
    return response;
  } catch (error) {
    logger.error({ err: error }, "POST /api/v1/users/bulk error");
    return apiError("internalServerError", 500);
  }
}
