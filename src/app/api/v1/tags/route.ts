import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { tags } from "@/lib/db/schema";
import { asc, sql } from "drizzle-orm";
import { apiSuccess } from "@/lib/api/responses";
import { escapeLikePattern } from "@/lib/db/like";
import { parsePositiveInt } from "@/lib/validators/query-params";
import { createApiHandler } from "@/lib/api/handler";

export const GET = createApiHandler({
  rateLimit: "tags:read",
  handler: async (req: NextRequest) => {
    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get("q")?.trim() ?? "";
    const limit = Math.min(parsePositiveInt(searchParams.get("limit"), 50), 100);

    const whereClause = query
      ? sql`${tags.name} LIKE ${`%${escapeLikePattern(query)}%`} ESCAPE '\\'`
      : undefined;

    const results = await db
      .select({ id: tags.id, name: tags.name, color: tags.color })
      .from(tags)
      .where(whereClause)
      .orderBy(asc(tags.name))
      .limit(limit);

    return apiSuccess(results);
  },
});
