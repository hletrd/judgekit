// Database backup route: POST with password re-confirmation for security
// Supports all dialects: SQLite (.sqlite), PostgreSQL/MySQL (JSON export)
import { NextRequest, NextResponse } from "next/server";
import { getApiUser, unauthorized, forbidden, csrfForbidden } from "@/lib/api/auth";
import { consumeApiRateLimit } from "@/lib/security/api-rate-limit";
import { recordAuditEvent } from "@/lib/audit/events";
import { verifyPassword } from "@/lib/security/password-hash";
import { logger } from "@/lib/logger";
import { sqlite, db, activeDialect } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { exportDatabase } from "@/lib/db/export";
import fs from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import os from "os";

export const dynamic = "force-dynamic";

function getDbPath(): string {
  return process.env.DATABASE_PATH
    ? path.resolve(process.env.DATABASE_PATH)
    : path.join(process.cwd(), "data", "judge.db");
}

export async function POST(request: NextRequest) {
  let backupPath: string | null = null;
  try {
    const csrfError = csrfForbidden(request);
    if (csrfError) return csrfError;

    const user = await getApiUser(request);
    if (!user) return unauthorized();
    if (user.role !== "super_admin") return forbidden();

    const rateLimitResponse = await consumeApiRateLimit(request, "admin:backup");
    if (rateLimitResponse) return rateLimitResponse;

    // Require password re-confirmation
    let body: { password?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "invalidRequestBody" }, { status: 400 });
    }

    if (!body.password || typeof body.password !== "string") {
      return NextResponse.json({ error: "passwordRequired" }, { status: 400 });
    }

    // Verify password against stored hash
    const [dbUser] = await db
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!dbUser?.passwordHash) {
      return NextResponse.json({ error: "authenticationFailed" }, { status: 403 });
    }

    const passwordValid = await verifyPassword(body.password, dbUser.passwordHash);
    if (!passwordValid) {
      return NextResponse.json({ error: "invalidPassword" }, { status: 403 });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    if (activeDialect === "sqlite") {
      // SQLite: use native backup API for WAL-consistent snapshot
      const dbPath = getDbPath();
      if (!existsSync(dbPath)) {
        return NextResponse.json({ error: "databaseNotFound" }, { status: 404 });
      }

      const filename = `judgekit-backup-${timestamp}.sqlite`;
      backupPath = path.join(os.tmpdir(), filename);
      await sqlite.backup(backupPath);

      const fileBuffer = await fs.readFile(backupPath);

      recordAuditEvent({
        actorId: user.id,
        actorRole: user.role,
        action: "system_settings.backup_downloaded",
        resourceType: "system_settings",
        resourceId: "database",
        resourceLabel: "Database backup",
        summary: `Downloaded SQLite backup (${(fileBuffer.length / 1024 / 1024).toFixed(1)} MB)`,
        request,
      });

      return new Response(fileBuffer, {
        headers: {
          "Content-Type": "application/x-sqlite3",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    // PostgreSQL / MySQL: export as portable JSON
    const data = await exportDatabase();
    const json = JSON.stringify(data);
    const filename = `judgekit-backup-${timestamp}.json`;

    recordAuditEvent({
      actorId: user.id,
      actorRole: user.role,
      action: "system_settings.backup_downloaded",
      resourceType: "system_settings",
      resourceId: "database",
      resourceLabel: "Database backup",
      summary: `Downloaded ${activeDialect} backup as JSON (${(json.length / 1024 / 1024).toFixed(1)} MB, ${Object.values(data.tables).reduce((s, t) => s + t.rowCount, 0)} rows)`,
      request,
    });

    return new Response(json, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Database backup error");
    return NextResponse.json({ error: "backupFailed" }, { status: 500 });
  } finally {
    if (backupPath) {
      fs.unlink(backupPath).catch(() => {});
    }
  }
}
