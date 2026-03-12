import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/lib/db";
import { getAuditEventHealthSnapshot } from "@/lib/audit/events";
import { getApiUser, isAdmin } from "@/lib/api/auth";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    sqlite.prepare("select 1").get();
    const auditEvents = getAuditEventHealthSnapshot();
    const overallStatus = auditEvents.status === "ok" ? "ok" : "degraded";

    const user = await getApiUser(request);
    const isAdminUser = user && isAdmin(user.role);

    if (isAdminUser) {
      return NextResponse.json(
        {
          checks: {
            auditEvents: auditEvents.status,
            database: "ok",
          },
          status: overallStatus,
          timestamp: new Date().toISOString(),
          ...(auditEvents.failedWrites > 0
            ? {
                details: {
                  auditEvents: {
                    failedWrites: auditEvents.failedWrites,
                    lastFailureAt: auditEvents.lastFailureAt,
                  },
                },
              }
            : {}),
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    return NextResponse.json(
      { status: overallStatus === "ok" ? "ok" : "error" },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    logger.error({ err: error }, "GET /api/health error");

    const user = await getApiUser(request).catch(() => null);
    const isAdminUser = user && isAdmin(user.role);

    if (isAdminUser) {
      const auditEvents = getAuditEventHealthSnapshot();
      return NextResponse.json(
        {
          checks: {
            auditEvents: auditEvents.status,
            database: "error",
          },
          error: "healthCheckFailed",
          status: "error",
          timestamp: new Date().toISOString(),
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
          status: 503,
        }
      );
    }

    return NextResponse.json(
      { status: "error" },
      {
        headers: {
          "Cache-Control": "no-store",
        },
        status: 503,
      }
    );
  }
}
