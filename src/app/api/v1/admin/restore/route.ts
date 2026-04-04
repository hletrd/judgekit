// Database restore route: JSON import for PostgreSQL
import { NextRequest, NextResponse } from "next/server";
import { getApiUser, unauthorized, forbidden, csrfForbidden } from "@/lib/api/auth";
import { consumeApiRateLimit } from "@/lib/security/api-rate-limit";
import { recordAuditEvent } from "@/lib/audit/events";
import { logger } from "@/lib/logger";
import { importDatabase } from "@/lib/db/import";
import { validateExport, type JudgeKitExport } from "@/lib/db/export";

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

    // Must be a JSON export file
    const isJsonFile = file.name?.endsWith(".json") || buffer[0] === 0x7B; // '{'
    if (!isJsonFile) {
      return NextResponse.json(
        { error: "unsupportedFileFormat", message: "Only JSON export files are supported. Use the JSON export format." },
        { status: 400 }
      );
    }

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
  } catch (error) {
    logger.error({ err: error }, "Database restore error");
    return NextResponse.json({ error: "restoreFailed" }, { status: 500 });
  }
}
