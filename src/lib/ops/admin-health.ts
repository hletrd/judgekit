import { getAuditEventHealthSnapshot } from "@/lib/audit/events";
import { rawQueryOne } from "@/lib/db/queries";
import { logger } from "@/lib/logger";
import { getConfiguredSettings } from "@/lib/system-settings-config";

type WorkerStatsRow = {
  online?: string | number | null;
  stale?: string | number | null;
  offline?: string | number | null;
};

type QueueStatsRow = {
  pending?: string | number | null;
};

export type AdminHealthSnapshot = {
  checks: {
    auditEvents: "ok" | "degraded";
    database: "ok" | "error";
  };
  judgeWorkers: {
    online: number;
    stale: number;
    offline: number;
  };
  submissionQueue: {
    pending: number;
    limit: number;
  };
  status: "ok" | "degraded" | "error";
  timestamp: string;
  details?: {
    auditEvents: {
      failedWrites: number;
      lastFailureAt: string | null;
    };
  };
  error?: "healthCheckFailed";
};

function toCount(value: string | number | null | undefined) {
  return Number(value ?? 0);
}

function buildSnapshotBase() {
  const settings = getConfiguredSettings();
  const auditEvents = getAuditEventHealthSnapshot();
  const timestamp = new Date().toISOString();

  return {
    auditEvents,
    settings,
    timestamp,
  };
}

export async function getAdminHealthSnapshot(): Promise<AdminHealthSnapshot> {
  const { auditEvents, settings, timestamp } = buildSnapshotBase();

  try {
    await rawQueryOne("select 1");

    const workerStats = await rawQueryOne<WorkerStatsRow>(
      `SELECT
        count(*) FILTER (WHERE status = 'online') AS online,
        count(*) FILTER (WHERE status = 'stale') AS stale,
        count(*) FILTER (WHERE status = 'offline') AS offline
      FROM judge_workers`
    );

    const queueStats = await rawQueryOne<QueueStatsRow>(
      `SELECT count(*) FILTER (WHERE status IN ('pending', 'queued', 'judging')) AS pending
      FROM submissions`
    );

    return {
      checks: {
        auditEvents: auditEvents.status,
        database: "ok",
      },
      judgeWorkers: {
        online: toCount(workerStats?.online),
        stale: toCount(workerStats?.stale),
        offline: toCount(workerStats?.offline),
      },
      submissionQueue: {
        pending: toCount(queueStats?.pending),
        limit: settings.submissionGlobalQueueLimit,
      },
      status: auditEvents.status === "ok" ? "ok" : "degraded",
      timestamp,
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
    };
  } catch (error) {
    logger.error({ err: error }, "Admin health snapshot failed");

    return {
      checks: {
        auditEvents: auditEvents.status,
        database: "error",
      },
      judgeWorkers: {
        online: 0,
        stale: 0,
        offline: 0,
      },
      submissionQueue: {
        pending: 0,
        limit: settings.submissionGlobalQueueLimit,
      },
      status: "error",
      timestamp,
      error: "healthCheckFailed",
    };
  }
}
