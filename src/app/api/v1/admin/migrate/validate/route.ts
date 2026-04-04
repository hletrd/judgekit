import { NextRequest, NextResponse } from "next/server";
import { getApiUser, unauthorized, forbidden, csrfForbidden } from "@/lib/api/auth";
import { validateExport, type JudgeKitExport } from "@/lib/db/export";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const csrfError = csrfForbidden(request);
    if (csrfError) return csrfError;

    const user = await getApiUser(request);
    if (!user) return unauthorized();
    if (user.role !== "super_admin") return forbidden();

    const contentType = request.headers.get("content-type");
    let data: unknown;

    if (contentType?.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "noFileProvided" }, { status: 400 });
      }
      const text = await file.text();
      data = JSON.parse(text);
    } else {
      data = await request.json();
    }

    const errors = validateExport(data);
    const exp = data as JudgeKitExport;

    const tableSummary: Record<string, number> = {};
    if (exp.tables && typeof exp.tables === "object") {
      for (const [name, tableData] of Object.entries(exp.tables)) {
        const rowCount = typeof tableData === "object" && tableData !== null && "rowCount" in tableData
          ? tableData.rowCount
          : undefined;
        tableSummary[name] = typeof rowCount === "number" ? rowCount : 0;
      }
    }

    return NextResponse.json({
      valid: errors.length === 0,
      errors,
      sourceDialect: exp.sourceDialect ?? null,
      exportedAt: exp.exportedAt ?? null,
      tableCount: Object.keys(tableSummary).length,
      totalRows: Object.values(tableSummary).reduce((a, b) => a + b, 0),
      tables: tableSummary,
    });
  } catch (error) {
    logger.error({ err: error }, "Export validation error");
    return NextResponse.json({ error: "validationFailed" }, { status: 500 });
  }
}
