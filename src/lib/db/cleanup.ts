import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditEvents, loginEvents } from "@/lib/db/schema";
import { lt } from "drizzle-orm";

const RETENTION_DAYS = parseInt(process.env.AUDIT_RETENTION_DAYS ?? "90", 10);

export async function cleanupOldEvents(): Promise<{
  auditDeleted: number;
  loginDeleted: number;
}> {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const [auditCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(auditEvents)
    .where(lt(auditEvents.createdAt, cutoff));

  await db.delete(auditEvents).where(lt(auditEvents.createdAt, cutoff));

  const [loginCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(loginEvents)
    .where(lt(loginEvents.createdAt, cutoff));

  await db.delete(loginEvents).where(lt(loginEvents.createdAt, cutoff));

  return {
    auditDeleted: Number(auditCount?.count ?? 0),
    loginDeleted: Number(loginCount?.count ?? 0),
  };
}
