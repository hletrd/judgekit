import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { languageConfigs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getApiUser, unauthorized } from "@/lib/api/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    if (!user) return unauthorized();

    const languages = await db
      .select()
      .from(languageConfigs)
      .where(eq(languageConfigs.isEnabled, true));

    return NextResponse.json({
      data: languages.map((language) => ({
        id: language.id,
        language: language.language,
        displayName: language.displayName,
        standard: language.standard,
        extension: language.extension,
      })),
    });
  } catch (error) {
    console.error("GET /api/v1/languages error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
