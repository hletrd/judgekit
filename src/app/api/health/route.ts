import { NextRequest, NextResponse } from "next/server";
import { getApiUser, isAdmin } from "@/lib/api/auth";
import { getAdminHealthSnapshot } from "@/lib/ops/admin-health";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const snapshot = await getAdminHealthSnapshot();
  const user = await getApiUser(request).catch(() => null);
  const isAdminUser = user && isAdmin(user.role);

  if (isAdminUser) {
    return NextResponse.json(snapshot, {
      headers: {
        "Cache-Control": "no-store",
      },
      status: snapshot.status === "error" ? 503 : 200,
    });
  }

  return NextResponse.json(
    { status: snapshot.status === "ok" ? "ok" : "error" },
    {
      headers: {
        "Cache-Control": "no-store",
      },
      status: snapshot.status === "error" ? 503 : 200,
    }
  );
}
