import { NextResponse } from "next/server";
import { sqlite } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    sqlite.prepare("select 1").get();

    return NextResponse.json(
      {
        checks: {
          database: "ok",
        },
        status: "ok",
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("GET /api/health error:", error);

    return NextResponse.json(
      {
        checks: {
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
}
