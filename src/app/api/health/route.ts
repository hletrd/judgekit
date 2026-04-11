import { NextRequest, NextResponse } from "next/server";
import { rawQueryOne, rawQueryAll } from "@/lib/db/queries";
import { getAuditEventHealthSnapshot } from "@/lib/audit/events";
import { getApiUser, isAdmin } from "@/lib/api/auth";
import { logger } from "@/lib/logger";
import { getConfiguredSettings } from "@/lib/system-settings-config";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await rawQueryOne("select 1");
    const auditEvents = getAuditEventHealthSnapshot();
    const overallStatus = auditEvents.status === "ok" ? "ok" : "degraded";

    const user = await getApiUser(request);
    const isAdminUser = user && isAdmin(user.role);

    if (isAdminUser) {
      // Gather worker and queue stats for admin view
      const [workerStats] = await rawQueryAll(
        `SELECT
          count(*) FILTER (WHERE status = 'online') AS online,
          count(*) FILTER (WHERE status = 'stale') AS stale,
          count(*) FILTER (WHERE status = 'offline') AS offline
        FROM judge_workers`
      ) as [{ online: string; stale: string; offline: string }];

      const [queueStats] = await rawQueryAll(
        `SELECT count(*) FILTER (WHERE status IN ('pending', 'queued', 'judging')) AS pending
        FROM submissions`
      ) as [{ pending: string }];

      const settings = getConfiguredSettings();

      return NextResponse.json(
        {
          checks: {
            auditEvents: auditEvents.status,
            database: "ok",
          },
          judgeWorkers: {
            online: Number(workerStats?.online ?? 0),
            stale: Number(workerStats?.stale ?? 0),
            offline: Number(workerStats?.offline ?? 0),
          },
          submissionQueue: {
            pending: Number(queueStats?.pending ?? 0),
            limit: settings.submissionGlobalQueueLimit,
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
