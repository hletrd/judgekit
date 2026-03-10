import { NextResponse } from "next/server";
import { sqlite } from "@/lib/db";
import { getAuditEventHealthSnapshot } from "@/lib/audit/events";
import { createApiHandler } from "@/lib/api/handler";

export const dynamic = "force-dynamic";

export const GET = createApiHandler({
  auth: false,
  handler: async () => {
    try {
      sqlite.prepare("select 1").get();
      const auditEvents = getAuditEventHealthSnapshot();
      const overallStatus = auditEvents.status === "ok" ? "ok" : "degraded";

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
    } catch (error) {
      console.error("GET /api/health error:", error);
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
  },
});
