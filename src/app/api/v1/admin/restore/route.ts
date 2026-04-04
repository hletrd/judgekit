// Database restore route: supports SQLite file restore and JSON import for all dialects
import { NextRequest, NextResponse } from "next/server";
import { getApiUser, unauthorized, forbidden, csrfForbidden } from "@/lib/api/auth";
import { consumeApiRateLimit } from "@/lib/security/api-rate-limit";
import { recordAuditEvent } from "@/lib/audit/events";
import { logger } from "@/lib/logger";
import { activeDialect } from "@/lib/db";
import { importDatabase } from "@/lib/db/import";
import { validateExport, type JudgeKitExport } from "@/lib/db/export";
import fs from "fs/promises";
import { existsSync } from "fs";
import path from "path";

function getDbPath(): string {
  return process.env.DATABASE_PATH
    ? path.resolve(process.env.DATABASE_PATH)
    : path.join(process.cwd(), "data", "judge.db");
}

export async function POST(request: NextRequest) {
  try {
    const csrfError = csrfForbidden(request);
    if (csrfError) return csrfError;

    const user = await getApiUser(request);
    if (!user) return unauthorized();
    if (user.role !== "super_admin") return forbidden();

    const rateLimitError = await consumeApiRateLimit(request, "admin:restore");
    if (rateLimitError) return rateLimitError;

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "noFileProvided" }, { status: 400 });
    }

    // Validate file size (max 500MB)
    if (file.size > 500 * 1024 * 1024) {
      return NextResponse.json({ error: "fileTooLarge" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Detect file type: SQLite binary or JSON export
    const SQLITE_MAGIC = Buffer.from("SQLite format 3\0", "ascii");
    const isSqliteFile = buffer.length >= 16 && buffer.subarray(0, 16).equals(SQLITE_MAGIC);
    const isJsonFile = file.name?.endsWith(".json") || (!isSqliteFile && buffer[0] === 0x7B); // '{'

    if (isSqliteFile && activeDialect === "sqlite") {
      return await restoreSqlite(request, user, buffer);
    }

    if (isJsonFile) {
      return await restoreFromJson(request, user, buffer);
    }

    if (isSqliteFile && activeDialect !== "sqlite") {
      return NextResponse.json(
        { error: "sqliteRestoreNotSupported", message: `Cannot restore a SQLite file to ${activeDialect}. Use the JSON export format instead.` },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "unsupportedFileFormat" }, { status: 400 });
  } catch (error) {
    logger.error({ err: error }, "Database restore error");
    return NextResponse.json({ error: "restoreFailed" }, { status: 500 });
  }
}

/**
 * Restore from a JudgeKit JSON export (works for all dialects).
 */
async function restoreFromJson(
  request: NextRequest,
  user: { id: string; role: string },
  buffer: Buffer
) {
  let data: JudgeKitExport;
  try {
    data = JSON.parse(buffer.toString("utf-8"));
  } catch {
    return NextResponse.json({ error: "invalidJsonFile" }, { status: 400 });
  }

  const errors = validateExport(data);
  if (errors.length > 0) {
    return NextResponse.json({ error: "invalidExport", details: errors }, { status: 400 });
  }

  recordAuditEvent({
    actorId: user.id,
    actorRole: user.role,
    action: "system_settings.database_restored",
    resourceType: "system_settings",
    resourceId: "database",
    resourceLabel: "Database restore",
    summary: `Restoring from JSON export (source: ${data.sourceDialect}, ${(buffer.length / 1024 / 1024).toFixed(1)} MB)`,
    request,
  });

  const result = await importDatabase(data);

  if (!result.success) {
    return NextResponse.json({
      error: "restoreFailed",
      details: result.errors,
      partial: result.tableResults,
    }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: "Database restored from JSON export.",
    tablesImported: result.tablesImported,
    totalRowsImported: result.totalRowsImported,
  });
}

/**
 * Restore from a native SQLite backup file (SQLite dialect only).
 */
async function restoreSqlite(
  request: NextRequest,
  user: { id: string; role: string },
  buffer: Buffer
) {
  const Database = (await import("better-sqlite3")).default;

  // Schema validation: open uploaded file in read-only mode
  const REQUIRED_TABLES = [
    "users", "submissions", "problems", "test_cases",
    "groups", "assignments", "enrollments", "roles",
  ];

  const os = await import("os");
  const tempValidationPath = path.join(os.tmpdir(), `judgekit-restore-validate-${Date.now()}.sqlite`);
  try {
    await fs.writeFile(tempValidationPath, buffer);
    const testDb = new Database(tempValidationPath, { readonly: true });
    try {
      const rows = testDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];
      const tableNames = new Set(rows.map((r) => r.name));
      const missing = REQUIRED_TABLES.filter((t) => !tableNames.has(t));
      if (missing.length > 0) {
        return NextResponse.json(
          { error: "invalidDatabaseSchema", details: { missingTables: missing } },
          { status: 400 }
        );
      }
    } finally {
      testDb.close();
    }
  } finally {
    await fs.unlink(tempValidationPath).catch(() => {});
  }

  const dbPath = getDbPath();

  // Create automatic backup before restore
  const backupTimestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = `${dbPath}.pre-restore-${backupTimestamp}`;

  if (existsSync(dbPath)) {
    const { sqlite: sqliteConn } = await import("@/lib/db");
    try {
      await sqliteConn.backup(backupPath);
    } catch {
      await fs.copyFile(dbPath, backupPath);
    }
  }

  logger.info({ backupPath }, "Pre-restore backup saved");

  recordAuditEvent({
    actorId: user.id,
    actorRole: user.role,
    action: "system_settings.database_restored",
    resourceType: "system_settings",
    resourceId: "database",
    resourceLabel: "Database restore",
    summary: `Restored SQLite database from upload (${(buffer.length / 1024 / 1024).toFixed(1)} MB). Pre-restore backup saved.`,
    request,
  });

  // Close the live SQLite connection before overwriting
  const { sqlite: sqliteConn2 } = await import("@/lib/db");
  try {
    sqliteConn2.close();
  } catch (closeErr) {
    logger.warn({ err: closeErr }, "Failed to close SQLite connection before restore");
  }

  // Remove orphaned WAL and SHM files
  for (const ext of ["-wal", "-shm"]) {
    await fs.unlink(dbPath + ext).catch(() => {});
  }

  // Write the new database file
  const tempPath = dbPath + ".restore-tmp";
  await fs.writeFile(tempPath, buffer);
  await fs.rename(tempPath, dbPath);

  // Schedule process restart
  setTimeout(() => {
    logger.info("Restarting process after database restore");
    process.exit(0);
  }, 500);

  return NextResponse.json({
    success: true,
    message: "Database restored. The server will restart automatically.",
  });
}
