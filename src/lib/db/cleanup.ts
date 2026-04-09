import { db } from "@/lib/db";
import { auditEvents, loginEvents } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

const RETENTION_DAYS = parseInt(process.env.AUDIT_RETENTION_DAYS ?? "90", 10);

export async function cleanupOldEvents(): Promise<{
  auditDeleted: number;
  loginDeleted: number;
}> {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

  // Use raw SQL to avoid loading all deleted row IDs into memory
  const auditResult = await db.execute(
    sql`DELETE FROM ${auditEvents} WHERE ${auditEvents.createdAt} < ${cutoff}`
  );
  const loginResult = await db.execute(
    sql`DELETE FROM ${loginEvents} WHERE ${loginEvents.createdAt} < ${cutoff}`
  );

  return {
    auditDeleted: Number(auditResult.rowCount ?? 0),
    loginDeleted: Number(loginResult.rowCount ?? 0),
  };
}
