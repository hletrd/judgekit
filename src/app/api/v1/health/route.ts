import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();
  let dbStatus: "ok" | "error" = "ok";

  try {
    if (pool) {
      const result = await pool.query("SELECT 1");
      dbStatus = result.rows.length > 0 ? "ok" : "error";
    }
  } catch {
    dbStatus = "error";
  }

  const status = dbStatus === "ok" ? "ok" : "degraded";

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION ?? "unknown",
      db: dbStatus,
      uptime: Math.floor(process.uptime()),
      responseTimeMs: Date.now() - start,
    },
    { status: status === "ok" ? 200 : 503 }
  );
}
